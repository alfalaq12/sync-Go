package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/bintang/remake-dsp-backend/internal/syncengine"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type JobHandler struct {
	db     *pgxpool.Pool
	engine *syncengine.Engine
}

func NewJobHandler(db *pgxpool.Pool, engine *syncengine.Engine) *JobHandler {
	return &JobHandler{db: db, engine: engine}
}

type JobResponse struct {
	ID               int      `json:"id"`
	STJobID          *string  `json:"st_job_id"`
	Name             string   `json:"name"`
	NetworkID        *int     `json:"network_id"`
	SchemaID         *int     `json:"schema_id"`
	SourceNodeID     *int     `json:"source_node_id"`
	TargetNodeID     *int     `json:"target_node_id"`
	JobType          *string  `json:"job_type"`
	Status           *string  `json:"status"`
	Progress         *int     `json:"progress"`
	RecordsProcessed *int64   `json:"records_processed"`
	RecordsTotal     *int64   `json:"records_total"`
	RowsExtracted    *int64   `json:"rows_extracted"`
	RowsUploaded     *int64   `json:"rows_uploaded"`
	ErrorMessage     *string  `json:"error_message"`
	DurationSeconds  *float64 `json:"duration_seconds"`
	StartedAt        *string  `json:"started_at"`
	CompletedAt      *string  `json:"completed_at"`
	CreatedAt        *string  `json:"created_at"`
	UpdatedAt        *string  `json:"updated_at"`
}

func (h *JobHandler) ListJobs(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT id, st_job_id, name, network_id, schema_id, source_node_id, target_node_id, job_type, status, progress,
		       records_processed, records_total, rows_extracted, rows_uploaded, error_message,
		       CASE
		         WHEN started_at IS NOT NULL AND completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - started_at))
		         WHEN started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - started_at))
		         ELSE NULL
		       END as duration_seconds,
		       TO_CHAR(started_at, 'YYYY-MM-DD HH24:MI:SS') as started_at,
		       TO_CHAR(completed_at, 'YYYY-MM-DD HH24:MI:SS') as completed_at,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM SD_JOBS ORDER BY id DESC
	`)
	if err != nil {
		log.Printf("Failed to list jobs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch job list"})
		return
	}
	defer rows.Close()

	var jobs []JobResponse
	for rows.Next() {
		var j JobResponse
		if err := rows.Scan(&j.ID, &j.STJobID, &j.Name, &j.NetworkID, &j.SchemaID, &j.SourceNodeID, &j.TargetNodeID,
			&j.JobType, &j.Status, &j.Progress, &j.RecordsProcessed, &j.RecordsTotal,
			&j.RowsExtracted, &j.RowsUploaded, &j.ErrorMessage, &j.DurationSeconds,
			&j.StartedAt, &j.CompletedAt, &j.CreatedAt, &j.UpdatedAt); err != nil {
			log.Printf("Failed to scan job row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal data processing error"})
			return
		}
		jobs = append(jobs, j)
	}

	if jobs == nil {
		jobs = []JobResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"data": jobs, "total": len(jobs)})
}

type CreateJobRequest struct {
	Name         string `json:"name" binding:"required"`
	SourceNodeID int    `json:"source_node_id" binding:"required"`
	TargetNodeID int    `json:"target_node_id" binding:"required"`
	NetworkID    *int   `json:"network_id"`
	SchemaID     *int   `json:"schema_id"`
	JobType      string `json:"job_type"`
}

func (h *JobHandler) CreateJob(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var req CreateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.JobType == "" {
		req.JobType = "ETL"
	}

	var id int
	err := h.db.QueryRow(c.Request.Context(), `
		INSERT INTO SD_JOBS (name, source_node_id, target_node_id, network_id, schema_id, job_type, status, progress)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0) RETURNING id
	`, req.Name, req.SourceNodeID, req.TargetNodeID, req.NetworkID, req.SchemaID, req.JobType).Scan(&id)
	if err != nil {
		log.Printf("Failed to create job: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save job to database"})
		return
	}

	// Fetch NodeCode for legacy STJobID prefix format
	nodePrefix := "MASTER"
	_ = h.db.QueryRow(c.Request.Context(), "SELECT node_code FROM M_NODE WHERE m_node_id = $1", req.SourceNodeID).Scan(&nodePrefix)
	
	stJobID := fmt.Sprintf("%s/%d", nodePrefix, id)
	_, _ = h.db.Exec(c.Request.Context(), "UPDATE SD_JOBS SET st_job_id = $1 WHERE id = $2", stJobID, id)

	c.JSON(http.StatusCreated, gin.H{"id": id, "st_job_id": stJobID, "message": "Job created successfully"})
}

func (h *JobHandler) GetJob(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var j JobResponse
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT id, st_job_id, name, network_id, schema_id, source_node_id, target_node_id, job_type, status, progress,
		       records_processed, records_total, rows_extracted, rows_uploaded, error_message,
		       CASE
		         WHEN started_at IS NOT NULL AND completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - started_at))
		         WHEN started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - started_at))
		         ELSE NULL
		       END as duration_seconds,
		       TO_CHAR(started_at, 'YYYY-MM-DD HH24:MI:SS') as started_at,
		       TO_CHAR(completed_at, 'YYYY-MM-DD HH24:MI:SS') as completed_at,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM SD_JOBS WHERE id = $1
	`, id).Scan(&j.ID, &j.STJobID, &j.Name, &j.NetworkID, &j.SchemaID, &j.SourceNodeID, &j.TargetNodeID,
		&j.JobType, &j.Status, &j.Progress, &j.RecordsProcessed, &j.RecordsTotal,
		&j.RowsExtracted, &j.RowsUploaded, &j.ErrorMessage, &j.DurationSeconds,
		&j.StartedAt, &j.CompletedAt, &j.CreatedAt, &j.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": j})
}

func (h *JobHandler) DeleteJob(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	tag, err := h.db.Exec(c.Request.Context(), "DELETE FROM SD_JOBS WHERE id=$1", id)
	if err != nil {
		log.Printf("Failed to delete job %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deletion command failed"})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job deleted successfully"})
}

func (h *JobHandler) StartJob(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	idInt, _ := strconv.Atoi(id)
	tag, err := h.db.Exec(c.Request.Context(), `
		UPDATE SD_JOBS SET status='running', started_at=NOW(), progress=0, error_message=NULL, updated_at=NOW()
		WHERE id=$1 AND status IN ('pending', 'failed', 'completed')
	`, idInt)
	if err != nil {
		log.Printf("Failed to start job %d: %v", idInt, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database update failed on job start"})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job not found or already running"})
		return
	}

	// Dispatch the actual sync engine in a goroutine
	go func() {
		ctx := context.Background()
		err := h.engine.ExecuteSync(ctx, idInt)
		if err != nil {
			log.Printf("[Job %d] Failed: %v", idInt, err)
			msg := fmt.Sprintf("CRITICAL FAILURE: %v", err)
			// Log to DB explicitly since engine might have exited early
			h.engine.LogToDB(ctx, idInt, nil, "ERROR", "Orchestrator", msg)
			_, _ = h.db.Exec(context.Background(), `
				UPDATE SD_JOBS SET status='failed', error_message=$1, completed_at=NOW(), updated_at=NOW()
				WHERE id=$2
			`, err.Error(), idInt)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Job started successfully"})
}

func (h *JobHandler) AbortJob(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	tag, err := h.db.Exec(c.Request.Context(), `
		UPDATE SD_JOBS SET status='aborted', error_message='Job aborted by user', updated_at=NOW()
		WHERE id=$1 AND status='running'
	`, id)
	if err != nil {
		log.Printf("Failed to abort job %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Abort command failed"})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job not found or not running"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job aborted successfully"})
}

func (h *JobHandler) ResetJob(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	tag, err := h.db.Exec(c.Request.Context(), `
		UPDATE SD_JOBS SET status='pending', progress=0, records_processed=0, records_total=0,
		       rows_extracted=0, rows_uploaded=0, error_message=NULL,
		       started_at=NULL, completed_at=NULL, updated_at=NOW()
		WHERE id=$1
	`, id)
	if err != nil {
		log.Printf("Failed to reset job %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Reset command failed"})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Job reset successfully"})
}
