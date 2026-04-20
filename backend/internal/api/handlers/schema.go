package handlers

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SchemaHandler struct {
	db *pgxpool.Pool
}

func NewSchemaHandler(db *pgxpool.Pool) *SchemaHandler {
	return &SchemaHandler{db: db}
}

type SchemaResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Owner       *string `json:"owner"`
	Description *string `json:"description"`
	Notes       *string `json:"notes"`
	Status      *string `json:"status"`
	CreatedAt   *string `json:"created_at"`
	UpdatedAt   *string `json:"updated_at"`
}

type SchemaQueryResponse struct {
	ID               int     `json:"id"`
	SchemaID         int     `json:"schema_id"`
	SourceQuery      *string `json:"source_query"`
	TargetTable      *string `json:"target_table"`
	TruncateBefore   *bool   `json:"truncate_before"`
	BatchSize        *int    `json:"batch_size"`
	ExtractPreQuery  *string `json:"extract_pre_query"`
	ExtractPostQuery *string `json:"extract_post_query"`
	UploadPreQuery   *string `json:"upload_pre_query"`
	UploadPostQuery  *string `json:"upload_post_query"`
	SyncMethod       *string `json:"sync_method"`
	UpsertKeys       *string `json:"upsert_keys"`
	IncrementalCol   *string `json:"incremental_column"`
	SortOrder        *int    `json:"sort_order"`
}

type SchemaDetailResponse struct {
	SchemaResponse
	Queries      []SchemaQueryResponse `json:"queries"`
	QueriesCount int                   `json:"queries_count"`
}

func (h *SchemaHandler) ListSchemas(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT s.m_schema_id, s.name, s.owner, s.description, s.notes, s.status,
		       TO_CHAR(s.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(s.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at,
		       (SELECT COUNT(*) FROM M_SCHEMA_DETAILS WHERE schema_id = s.m_schema_id) as queries_count
		FROM M_SCHEMA s ORDER BY s.updated_at DESC
	`)
	if err != nil {
		log.Printf("Failed to list schemas: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve schema list"})
		return
	}
	defer rows.Close()

	var schemas []map[string]interface{}
	for rows.Next() {
		var s SchemaResponse
		var queriesCount int
		if err := rows.Scan(&s.ID, &s.Name, &s.Owner, &s.Description, &s.Notes, &s.Status, &s.CreatedAt, &s.UpdatedAt, &queriesCount); err != nil {
			log.Printf("Failed to scan schema row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process database records"})
			return
		}
		schemas = append(schemas, map[string]interface{}{
			"id":            fmt.Sprintf("%d", s.ID),
			"name":          s.Name,
			"owner":         s.Owner,
			"description":   s.Description,
			"notes":         s.Notes,
			"status":        s.Status,
			"created_at":    s.CreatedAt,
			"updated_at":    s.UpdatedAt,
			"queries_count": queriesCount,
		})
	}

	if schemas == nil {
		schemas = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"data": schemas, "total": len(schemas)})
}

type CreateSchemaRequest struct {
	Name        string               `json:"name" binding:"required"`
	Owner       string               `json:"owner"`
	Description string               `json:"description"`
	Notes       string               `json:"notes"`
	Queries     []CreateQueryRequest `json:"queries"`
}

type CreateQueryRequest struct {
	SourceQuery      string `json:"source_query"`
	TargetTable      string `json:"target_table"`
	TruncateBefore   bool   `json:"truncate_before"`
	BatchSize        int    `json:"batch_size"`
	ExtractPreQuery  string `json:"extract_pre_query"`
	ExtractPostQuery string `json:"extract_post_query"`
	UploadPreQuery   string `json:"upload_pre_query"`
	UploadPostQuery  string `json:"upload_post_query"`
	SyncMethod       string `json:"sync_method"`
	UpsertKeys       string `json:"upsert_keys"`
	IncrementalCol   string `json:"incremental_column"`
	SortOrder        int    `json:"sort_order"`
}

func (h *SchemaHandler) CreateSchema(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var req CreateSchemaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.Owner == "" {
		req.Owner = "admin"
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		log.Printf("Failed to begin transaction for CreateSchema: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal database error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var schemaID int
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO M_SCHEMA (name, owner, description, notes)
		VALUES ($1, $2, $3, $4) RETURNING m_schema_id
	`, req.Name, req.Owner, req.Description, req.Notes).Scan(&schemaID)
	if err != nil {
		log.Printf("Failed to create schema: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create schema"})
		return
	}

	for i, q := range req.Queries {
		sortOrder := q.SortOrder
		if sortOrder == 0 {
			sortOrder = i + 1
		}
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO M_SCHEMA_DETAILS (schema_id, source_query, target_table, truncate_before, batch_size,
			            extract_pre_query, extract_post_query, upload_pre_query, upload_post_query, 
			            sync_method, upsert_keys, incremental_column, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`, schemaID, q.SourceQuery, q.TargetTable, q.TruncateBefore, q.BatchSize,
			q.ExtractPreQuery, q.ExtractPostQuery, q.UploadPreQuery, q.UploadPostQuery, 
			q.SyncMethod, q.UpsertKeys, q.IncrementalCol, sortOrder)
		if err != nil {
			log.Printf("Failed to create query rule: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save schema rules"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		log.Printf("Failed to commit CreateSchema transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize schema creation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": schemaID, "message": "Schema created successfully"})
}

func (h *SchemaHandler) GetSchema(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var s SchemaResponse
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT m_schema_id, name, owner, description, notes, status,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM M_SCHEMA WHERE m_schema_id = $1
	`, id).Scan(&s.ID, &s.Name, &s.Owner, &s.Description, &s.Notes, &s.Status, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Schema not found"})
		return
	}

	// Fetch queries
	rows, err := h.db.Query(c.Request.Context(), `
		SELECT m_schema_details_id, schema_id, source_query, target_table, truncate_before, batch_size,
		       extract_pre_query, extract_post_query, upload_pre_query, upload_post_query, 
		       sync_method, upsert_keys, incremental_column, sort_order
		FROM M_SCHEMA_DETAILS WHERE schema_id = $1 ORDER BY sort_order ASC
	`, id)
	if err != nil {
		log.Printf("Failed to fetch schema queries for id %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch schema details"})
		return
	}
	defer rows.Close()

	var queries []SchemaQueryResponse
	for rows.Next() {
		var q SchemaQueryResponse
		if err := rows.Scan(&q.ID, &q.SchemaID, &q.SourceQuery, &q.TargetTable, &q.TruncateBefore, &q.BatchSize,
			&q.ExtractPreQuery, &q.ExtractPostQuery, &q.UploadPreQuery, &q.UploadPostQuery, 
			&q.SyncMethod, &q.UpsertKeys, &q.IncrementalCol, &q.SortOrder); err != nil {
			log.Printf("Failed to scan query row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Data processing error"})
			return
		}
		queries = append(queries, q)
	}
	if queries == nil {
		queries = []SchemaQueryResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"data": SchemaDetailResponse{
		SchemaResponse: s,
		Queries:        queries,
		QueriesCount:   len(queries),
	}})
}

func (h *SchemaHandler) UpdateSchema(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var req CreateSchemaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		log.Printf("Failed to begin transaction for UpdateSchema: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal update error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	tag, err := tx.Exec(c.Request.Context(), `
		UPDATE M_SCHEMA SET name=$1, owner=$2, description=$3, notes=$4, updated_at=NOW()
		WHERE m_schema_id=$5
	`, req.Name, req.Owner, req.Description, req.Notes, id)
	if err != nil {
		log.Printf("Failed to update schema %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Schema update failed"})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Schema not found"})
		return
	}

	// Delete old queries and re-insert
	_, _ = tx.Exec(c.Request.Context(), "DELETE FROM M_SCHEMA_DETAILS WHERE schema_id = $1", id)
	for i, q := range req.Queries {
		sortOrder := q.SortOrder
		if sortOrder == 0 {
			sortOrder = i + 1
		}
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO M_SCHEMA_DETAILS (schema_id, source_query, target_table, truncate_before, batch_size,
			            extract_pre_query, extract_post_query, upload_pre_query, upload_post_query, 
			            sync_method, upsert_keys, incremental_column, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`, id, q.SourceQuery, q.TargetTable, q.TruncateBefore, q.BatchSize,
			q.ExtractPreQuery, q.ExtractPostQuery, q.UploadPreQuery, q.UploadPostQuery, 
			q.SyncMethod, q.UpsertKeys, q.IncrementalCol, sortOrder)
		if err != nil {
			log.Printf("Failed to update query for schema %s: %v", id, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update query rules"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		log.Printf("Failed to commit UpdateSchema transaction for id %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize updates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Schema updated successfully"})
}

func (h *SchemaHandler) DeleteSchema(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	tag, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_SCHEMA WHERE m_schema_id=$1", id)
	if err != nil {
		log.Printf("Failed to delete schema %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deletion command failed"})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Schema not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Schema deleted successfully"})
}
