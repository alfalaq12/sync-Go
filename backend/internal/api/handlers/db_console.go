package handlers

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/bintang/remake-dsp-backend/internal/drivers"
	"github.com/bintang/remake-dsp-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DBConsoleHandler struct {
	db *pgxpool.Pool
}

func NewDBConsoleHandler(db *pgxpool.Pool) *DBConsoleHandler {
	return &DBConsoleHandler{db: db}
}

// GET /api/v1/system/db-console/sources
func (h *DBConsoleHandler) GetDBConsoleSources(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"sources": []map[string]interface{}{}})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	query := `
		SELECT m_schema_job_id, name, 'source' as type, source_driver as driver, source_host as host, source_database as database 
		FROM M_SCHEMA_JOBS 
		WHERE source_driver IS NOT NULL AND source_host IS NOT NULL AND source_driver != 'csv'
		UNION ALL
		SELECT m_schema_job_id, name, 'target' as type, target_driver as driver, target_host as host, target_database as database 
		FROM M_SCHEMA_JOBS 
		WHERE target_driver IS NOT NULL AND target_host IS NOT NULL AND target_driver != 'csv'
		ORDER BY name ASC, type ASC
	`

	rows, err := h.db.Query(ctx, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch data sources"})
		return
	}
	defer rows.Close()

	var sources []map[string]interface{}
	for rows.Next() {
		var id int
		var name, typ, driver, host, db string
		if err := rows.Scan(&id, &name, &typ, &driver, &host, &db); err == nil {
			sources = append(sources, map[string]interface{}{
				"ref":      fmt.Sprintf("%s:%d", typ, id),
				"name":     fmt.Sprintf("%s (%s)", name, strings.ToUpper(typ)),
				"driver":   driver,
				"host":     host,
				"database": db,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"sources": sources})
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
		Query         string `json:"query"`
		ConnectionRef string `json:"connection_ref"` // empty or "internal", "source:ID", "target:ID"
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
	var durationMs int64

	// Determine connection type
	ref := strings.TrimSpace(req.ConnectionRef)
	if ref == "" || ref == "internal" {
		// ==========================================
		// INTERNAL DATABASE EXECUTION
		// ==========================================
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		rows, err := h.db.Query(ctx, query)
		durationMs = time.Since(startTime).Milliseconds()

		if err != nil {
			logMsg := fmt.Sprintf("[DB_CONSOLE] Failed internal query: %s (Error: %v)", query, err)
			_, _ = h.db.Exec(context.Background(), "INSERT INTO JOB_LOG (node_id, level, source, message) VALUES (1000, 'ERROR', 'DB_CONSOLE', $1)", logMsg)
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Query execution failed: %v", err), "duration_ms": durationMs})
			return
		}
		defer rows.Close()

		fieldDescriptions := rows.FieldDescriptions()
		columns := make([]string, len(fieldDescriptions))
		for i, fd := range fieldDescriptions {
			columns[i] = string(fd.Name)
		}

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

		logMsg := fmt.Sprintf("[DB_CONSOLE] Internal SELECT query returning %d rows in %d ms: %s", len(resultRows), durationMs, query)
		if len(query) > 100 { logMsg = fmt.Sprintf("[DB_CONSOLE] Internal SELECT query returning %d rows in %d ms: %s...", len(resultRows), durationMs, query[:97]) }
		_, _ = h.db.Exec(context.Background(), "INSERT INTO JOB_LOG (node_id, level, source, message) VALUES (1000, 'INFO', 'DB_CONSOLE', $1)", logMsg)

		c.JSON(http.StatusOK, gin.H{"columns": columns, "rows": resultRows, "row_count": len(resultRows), "duration_ms": durationMs, "timestamp": time.Now().Format(time.RFC3339)})
		return
	}

	// ==========================================
	// EXTERNAL DATABASE EXECUTION
	// ==========================================
	parts := strings.Split(ref, ":")
	if len(parts) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection reference format"})
		return
	}
	
	targetType := parts[0]
	jobIdStr := parts[1]
	jobId, err := strconv.Atoi(jobIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection job ID"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	var driverName, host, database, username, encryptedPassword string
	var port int
	var credentialId *int

	// Fetch connection config
	switch targetType {
	case "source":
		err = h.db.QueryRow(ctx, "SELECT source_driver, source_host, source_port, source_database, source_username, source_password, source_credential_id FROM M_SCHEMA_JOBS WHERE m_schema_job_id = $1", jobId).Scan(&driverName, &host, &port, &database, &username, &encryptedPassword, &credentialId)
	case "target":
		err = h.db.QueryRow(ctx, "SELECT target_driver, target_host, target_port, target_database, target_username, target_password, target_credential_id FROM M_SCHEMA_JOBS WHERE m_schema_job_id = $1", jobId).Scan(&driverName, &host, &port, &database, &username, &encryptedPassword, &credentialId)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown connection target type"})
		return
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection configuration not found"})
		return
	}

	// If credential ID is provided, override password from M_CREDENTIALS
	if credentialId != nil {
		var credEncrypted string
		err = h.db.QueryRow(ctx, "SELECT password_encrypted FROM M_CREDENTIALS WHERE m_credential_id = $1", *credentialId).Scan(&credEncrypted)
		if err == nil && credEncrypted != "" {
			encryptedPassword = credEncrypted
		}
	}

	// Decrypt password
	password := encryptedPassword
	if encryptedPassword != "" {
		decrypted, err := utils.Decrypt(encryptedPassword)
		if err == nil {
			password = decrypted
		}
	}

	driver, err := drivers.GetDriver(driverName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Driver '%s' is not supported for external querying", driverName)})
		return
	}

	config := drivers.ConnectionConfig{
		Driver:   driverName,
		Host:     host,
		Port:     port,
		Database: database,
		Username: username,
		Password: password,
	}

	// Use StreamExtract to get columns and first chunk
	var extColumns []string
	var extRows [][]any
	chunkFound := false

	err = driver.StreamExtract(ctx, config, query, 500, func(cols []string, chunk [][]any) error {
		if !chunkFound {
			extColumns = cols
			extRows = chunk
			chunkFound = true
		}
		// Return an error to stop streaming after first chunk (since it's a console we just want max 500 rows)
		return fmt.Errorf("STOP_STREAM")
	})

	durationMs = time.Since(startTime).Milliseconds()

	// If err is STOP_STREAM, it means we successfully got our chunk and stopped
	if err != nil && err.Error() != "STOP_STREAM" && !strings.Contains(err.Error(), "STOP_STREAM") {
		logMsg := fmt.Sprintf("[DB_CONSOLE] Failed external query (%s): %s (Error: %v)", ref, query, err)
		_, _ = h.db.Exec(context.Background(), "INSERT INTO JOB_LOG (node_id, level, source, message) VALUES (1000, 'ERROR', 'DB_CONSOLE', $1)", logMsg)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("External query execution failed: %v", err), "duration_ms": durationMs})
		return
	}

	// Convert chunk [][]any to []map[string]interface{}
	var resultRows []map[string]interface{}
	for _, rowVals := range extRows {
		rowMap := make(map[string]interface{})
		for i, val := range rowVals {
			if i < len(extColumns) {
				rowMap[extColumns[i]] = val
			}
		}
		resultRows = append(resultRows, rowMap)
	}

	logMsg := fmt.Sprintf("[DB_CONSOLE] External SELECT query (%s) returning %d rows in %d ms: %s", ref, len(resultRows), durationMs, query)
	if len(query) > 100 { logMsg = fmt.Sprintf("[DB_CONSOLE] External SELECT query (%s) returning %d rows in %d ms: %s...", ref, len(resultRows), durationMs, query[:97]) }
	_, _ = h.db.Exec(context.Background(), "INSERT INTO JOB_LOG (node_id, level, source, message) VALUES (1000, 'INFO', 'DB_CONSOLE', $1)", logMsg)

	c.JSON(http.StatusOK, gin.H{
		"columns":     extColumns,
		"rows":        resultRows,
		"row_count":   len(resultRows),
		"duration_ms": durationMs,
		"timestamp":   time.Now().Format(time.RFC3339),
	})
}


