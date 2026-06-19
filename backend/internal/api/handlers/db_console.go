package handlers

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DBConsoleHandler struct {
	db *pgxpool.Pool
}

func NewDBConsoleHandler(db *pgxpool.Pool) *DBConsoleHandler {
	return &DBConsoleHandler{db: db}
}

// POST /api/v1/system/db-console/query
func (h *DBConsoleHandler) ExecuteQuery(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{
			"status": "offline_mode",
			"error":  "Database connection is not available on this node.",
		})
		return
	}

	var req struct {
		Query string `json:"query"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Query) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query cannot be empty"})
		return
	}

	query := strings.TrimSpace(req.Query)

	// Security Check: Only allow SELECT statements
	// Prevent accidental or malicious mutations through the console
	lowerQuery := strings.ToLower(query)
	disallowedKeywords := []string{
		"insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "create ", "grant ", "revoke ",
	}
	
	isSelectOnly := true
	for _, kw := range disallowedKeywords {
		if strings.Contains(lowerQuery, kw) {
			isSelectOnly = false
			break
		}
	}
	
	// Double check with regex to make sure it starts with SELECT
	match, _ := regexp.MatchString(`(?i)^\s*select\s+`, query)
	if !isSelectOnly || !match {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "For security reasons, only SELECT queries are allowed in the Web DB Console.",
		})
		return
	}

	// Safety: enforce a LIMIT if not present
	if !strings.Contains(lowerQuery, "limit ") {
		query = query + " LIMIT 500"
	}

	// Start timer
	startTime := time.Now()

	// Execute query with a 10-second timeout context
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.db.Query(ctx, query)
	
	// Ensure we calculate duration after execution
	durationMs := time.Since(startTime).Milliseconds()

	if err != nil {
		// Log the failed query
		logMsg := fmt.Sprintf("[DB_CONSOLE] Failed query execution: %s (Error: %v)", query, err)
		_, _ = h.db.Exec(context.Background(), `
			INSERT INTO JOB_LOG (node_id, level, source, message) 
			VALUES (1000, 'ERROR', 'DB_CONSOLE', $1)
		`, logMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"error":       fmt.Sprintf("Query execution failed: %v", err),
			"duration_ms": durationMs,
		})
		return
	}
	defer rows.Close()

	// Get column descriptions
	fieldDescriptions := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		columns[i] = string(fd.Name)
	}

	// Fetch results
	var resultRows []map[string]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error reading row data: %v", err)})
			return
		}
		
		rowMap := make(map[string]interface{})
		for i, val := range values {
			rowMap[columns[i]] = val
		}
		resultRows = append(resultRows, rowMap)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error iterating rows: %v", err)})
		return
	}

	// Log the successful query for audit trailing
	logMsg := fmt.Sprintf("[DB_CONSOLE] Executed SELECT query returning %d rows in %d ms: %s", len(resultRows), durationMs, query)
	if len(query) > 100 {
		logMsg = fmt.Sprintf("[DB_CONSOLE] Executed SELECT query returning %d rows in %d ms: %s...", len(resultRows), durationMs, query[:97])
	}
	
	_, _ = h.db.Exec(context.Background(), `
		INSERT INTO JOB_LOG (node_id, level, source, message) 
		VALUES (1000, 'INFO', 'DB_CONSOLE', $1)
	`, logMsg)

	// Return data
	c.JSON(http.StatusOK, gin.H{
		"columns":     columns,
		"rows":        resultRows,
		"row_count":   len(resultRows),
		"duration_ms": durationMs,
		"timestamp":   time.Now().Format(time.RFC3339),
	})
}
