package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/bintang/remake-dsp-backend/internal/drivers"
	"github.com/bintang/remake-dsp-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NetworkHandler struct {
	db *pgxpool.Pool
}

func NewNetworkHandler(db *pgxpool.Pool) *NetworkHandler {
	return &NetworkHandler{db: db}
}

type NetworkResponse struct {
	ID                 int     `json:"id"`
	SchemaID           *int    `json:"schema_id"`
	SourceNodeID       *int    `json:"source_node_id"`
	TargetNodeID       *int    `json:"target_node_id"`
	SourceDriver       *string `json:"source_driver"`
	SourceResourceType *string `json:"source_resource_type"`
	SourceHost         *string `json:"source_host"`
	SourcePort         *int    `json:"source_port"`
	SourceDatabase     *string `json:"source_database"`
	SourceUsername     *string `json:"source_username"`
	SourcePassword     *string `json:"source_password"`
	SourceCredentialID *int    `json:"source_credential_id"`
	SourcePath         *string `json:"source_path"`
	SourceCharset      *string `json:"source_charset"`
	SourceCSVHeader    *bool   `json:"source_csv_header"`
	SourceCSVSeparator *string `json:"source_csv_separator"`
	SourceCSVExtension *string `json:"source_csv_extension"`
	TargetDriver       *string `json:"target_driver"`
	TargetResourceType *string `json:"target_resource_type"`
	TargetHost         *string `json:"target_host"`
	TargetPort         *int    `json:"target_port"`
	TargetDatabase     *string `json:"target_database"`
	TargetUsername     *string `json:"target_username"`
	TargetPassword     *string `json:"target_password"`
	TargetCredentialID *int    `json:"target_credential_id"`
	TargetPath         *string `json:"target_path"`
	ScheduleEngine     *string `json:"schedule_engine"`
	CronExpression     *string `json:"cron_expression"`
	LastSyncValue      *string `json:"last_sync_value"`
	Notes              *string `json:"notes"`
	Owner              *string `json:"owner"`
	Status             *string `json:"status"`
	CreatedAt          *string `json:"created_at"`
	UpdatedAt          *string `json:"updated_at"`
}

func (h *NetworkHandler) ListNetworks(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT n.m_schema_job_id, n.schema_id, n.source_node_id, n.target_node_id,
		       n.source_driver, n.target_driver, n.schedule_engine, n.cron_expression,
		       n.notes, n.owner, n.status,
		       TO_CHAR(n.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(n.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM M_SCHEMA_JOBS n ORDER BY n.updated_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var networks []map[string]interface{}
	for rows.Next() {
		var id int
		var schemaID, sourceNodeID, targetNodeID *int
		var sourceDriver, targetDriver, scheduleEngine, cronExpr, notes, owner, status, createdAt, updatedAt *string
		if err := rows.Scan(&id, &schemaID, &sourceNodeID, &targetNodeID,
			&sourceDriver, &targetDriver, &scheduleEngine, &cronExpr,
			&notes, &owner, &status, &createdAt, &updatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		networks = append(networks, map[string]interface{}{
			"id":              fmt.Sprintf("%d", id),
			"schema_id":       schemaID,
			"source_node_id":  sourceNodeID,
			"target_node_id":  targetNodeID,
			"source_driver":   sourceDriver,
			"target_driver":   targetDriver,
			"schedule_engine": scheduleEngine,
			"cron_expression": cronExpr,
			"notes":           notes,
			"owner":           owner,
			"status":          status,
			"created_at":      createdAt,
			"updated_at":      updatedAt,
		})
	}

	if networks == nil {
		networks = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{"data": networks, "total": len(networks)})
}

type CreateNetworkRequest struct {
	SchemaID           *int   `json:"schema_id"`
	SourceNodeID       *int   `json:"source_node_id"`
	TargetNodeID       *int   `json:"target_node_id"`
	SourceDriver       string `json:"source_driver"`
	SourceResourceType string `json:"source_resource_type"`
	SourceHost         string `json:"source_host"`
	SourcePort         *int   `json:"source_port"`
	SourceDatabase     string `json:"source_database"`
	SourceUsername     string `json:"source_username"`
	SourcePassword     string `json:"source_password"`
	SourceCredentialID *int   `json:"source_credential_id"`
	SourcePath         string `json:"source_path"`
	SourceCharset      string `json:"source_charset"`
	SourceCSVHeader    *bool  `json:"source_csv_header"`
	SourceCSVSeparator string `json:"source_csv_separator"`
	SourceCSVExtension string `json:"source_csv_extension"`
	TargetDriver       string `json:"target_driver"`
	TargetResourceType string `json:"target_resource_type"`
	TargetHost         string `json:"target_host"`
	TargetPort         *int   `json:"target_port"`
	TargetDatabase     string `json:"target_database"`
	TargetUsername     string `json:"target_username"`
	TargetPassword     string `json:"target_password"`
	TargetCredentialID *int   `json:"target_credential_id"`
	TargetPath         string `json:"target_path"`
	ScheduleEngine     string `json:"schedule_engine"`
	CronExpression     string `json:"cron_expression"`
	Notes              string `json:"notes"`
	Owner              string `json:"owner"`
}

func (h *NetworkHandler) CreateNetwork(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var req CreateNetworkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Owner == "" {
		req.Owner = "admin"
	}

	var id int
	err := h.db.QueryRow(c.Request.Context(), `
		INSERT INTO M_SCHEMA_JOBS (schema_id, source_node_id, target_node_id,
		    source_driver, source_resource_type, source_host, source_port, source_database,
		    source_username, source_password, source_credential_id, source_path, source_charset,
		    source_csv_header, source_csv_separator, source_csv_extension,
		    target_driver, target_resource_type, target_host, target_port,
		    target_database, target_username, target_password, target_credential_id, target_path,
		    schedule_engine, cron_expression, notes, owner)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
		RETURNING m_schema_job_id
	`, req.SchemaID, req.SourceNodeID, req.TargetNodeID,
		req.SourceDriver, req.SourceResourceType, req.SourceHost, req.SourcePort, req.SourceDatabase,
		req.SourceUsername, req.SourcePassword, req.SourceCredentialID, req.SourcePath, req.SourceCharset,
		req.SourceCSVHeader, req.SourceCSVSeparator, req.SourceCSVExtension,
		req.TargetDriver, req.TargetResourceType, req.TargetHost, req.TargetPort,
		req.TargetDatabase, req.TargetUsername, req.TargetPassword, req.TargetCredentialID, req.TargetPath,
		req.ScheduleEngine, req.CronExpression, req.Notes, req.Owner).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create network: %v", err)})
		return
	}

	// ─── AUTO CREATE JOB ───────────────────────────────────────────────
	// Fetch node code for the prefix
	nodePrefix := "MASTER"
	if req.SourceNodeID != nil {
		_ = h.db.QueryRow(c.Request.Context(), "SELECT node_code FROM M_NODE WHERE m_node_id = $1", *req.SourceNodeID).Scan(&nodePrefix)
	}

	jobName := fmt.Sprintf("ETL_ID%v_to_ID%v_Net%d", req.SourceNodeID, req.TargetNodeID, id)
	if req.SourceNodeID == nil && req.TargetNodeID == nil {
		jobName = fmt.Sprintf("ETL_Topology_%d", id)
	}

	var numericJobID int
	errJob := h.db.QueryRow(c.Request.Context(), `
		INSERT INTO SD_JOBS (name, source_node_id, target_node_id, network_id, schema_id, job_type, status, progress)
		VALUES ($1, $2, $3, $4, $5, 'ETL', 'pending', 0)
		RETURNING id
	`, jobName, req.SourceNodeID, req.TargetNodeID, id, req.SchemaID).Scan(&numericJobID)
	
	if errJob == nil {
		stJobID := fmt.Sprintf("%s/%d", nodePrefix, numericJobID)
		_, _ = h.db.Exec(c.Request.Context(), "UPDATE SD_JOBS SET st_job_id = $1 WHERE id = $2", stJobID, numericJobID)
	} else {
		fmt.Printf("Warning: Failed to auto-create job for network %d: %v\n", id, errJob)
	}
	// ───────────────────────────────────────────────────────────────────

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Network topology saved and Pipeline Job initialized successfully!"})
}

func (h *NetworkHandler) GetNetwork(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var n NetworkResponse
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT m_schema_job_id, schema_id, source_node_id, target_node_id,
		       source_driver, source_resource_type, source_host, source_port, source_database,
		       source_username, source_password, source_credential_id, source_path, source_charset,
		       source_csv_header, source_csv_separator, source_csv_extension,
		       target_driver, target_resource_type, target_host, target_port,
		       target_database, target_username, target_password, target_credential_id, target_path,
		       schedule_engine, cron_expression, last_sync_value, notes, owner, status,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM M_SCHEMA_JOBS WHERE m_schema_job_id = $1
	`, id).Scan(&n.ID, &n.SchemaID, &n.SourceNodeID, &n.TargetNodeID,
		&n.SourceDriver, &n.SourceResourceType, &n.SourceHost, &n.SourcePort, &n.SourceDatabase,
		&n.SourceUsername, &n.SourcePassword, &n.SourceCredentialID, &n.SourcePath, &n.SourceCharset,
		&n.SourceCSVHeader, &n.SourceCSVSeparator, &n.SourceCSVExtension,
		&n.TargetDriver, &n.TargetResourceType, &n.TargetHost, &n.TargetPort,
		&n.TargetDatabase, &n.TargetUsername, &n.TargetPassword, &n.TargetCredentialID, &n.TargetPath,
		&n.ScheduleEngine, &n.CronExpression, &n.LastSyncValue, &n.Notes, &n.Owner, &n.Status, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Network topology not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": n})
}

func (h *NetworkHandler) UpdateNetwork(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var req CreateNetworkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[DEBUG] Updating Network ID %s: SourceDB='%s', TargetDB='%s'", id, req.SourceDatabase, req.TargetDatabase)

	tag, err := h.db.Exec(c.Request.Context(), `
		UPDATE M_SCHEMA_JOBS SET schema_id=$1, source_node_id=$2, target_node_id=$3,
		    source_driver=$4, source_resource_type=$5, source_host=$6, source_port=$7, source_database=$8,
		    source_username=$9, source_password=$10, source_credential_id=$11, source_path=$12, source_charset=$13,
		    source_csv_header=$14, source_csv_separator=$15, source_csv_extension=$16,
		    target_driver=$17, target_resource_type=$18, target_host=$19, target_port=$20,
		    target_database=$21, target_username=$22, target_password=$23, target_credential_id=$24, target_path=$25,
		    schedule_engine=$26, cron_expression=$27, notes=$28, owner=$29, updated_at=NOW()
		WHERE m_schema_job_id=$30
	`, req.SchemaID, req.SourceNodeID, req.TargetNodeID,
		req.SourceDriver, req.SourceResourceType, req.SourceHost, req.SourcePort, req.SourceDatabase,
		req.SourceUsername, req.SourcePassword, req.SourceCredentialID, req.SourcePath, req.SourceCharset,
		req.SourceCSVHeader, req.SourceCSVSeparator, req.SourceCSVExtension,
		req.TargetDriver, req.TargetResourceType, req.TargetHost, req.TargetPort,
		req.TargetDatabase, req.TargetUsername, req.TargetPassword, req.TargetCredentialID, req.TargetPath,
		req.ScheduleEngine, req.CronExpression, req.Notes, req.Owner, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Network topology not found"})
		return
	}

	// ─── AUTO UPDATE/CREATE JOB ─────────────────────────────────────────
	nodePrefix := "MASTER"
	if req.SourceNodeID != nil {
		_ = h.db.QueryRow(c.Request.Context(), "SELECT node_code FROM M_NODE WHERE m_node_id = $1", *req.SourceNodeID).Scan(&nodePrefix)
	}

	jobName := fmt.Sprintf("ETL_ID%v_to_ID%v_Net%s", req.SourceNodeID, req.TargetNodeID, id)
	if req.SourceNodeID == nil && req.TargetNodeID == nil {
		jobName = fmt.Sprintf("ETL_Topology_%s", id)
	}

	// Upsert job for this network
	var numericJobID int
	errJob := h.db.QueryRow(c.Request.Context(), `
		INSERT INTO SD_JOBS (name, source_node_id, target_node_id, network_id, schema_id, job_type, status, progress)
		VALUES ($1, $2, $3, CAST($4 AS INT), $5, 'ETL', 'pending', 0)
		ON CONFLICT (network_id) DO UPDATE 
		SET name = EXCLUDED.name, 
		    source_node_id = EXCLUDED.source_node_id, 
		    target_node_id = EXCLUDED.target_node_id, 
		    schema_id = EXCLUDED.schema_id,
		    updated_at = NOW()
		RETURNING id;
	`, jobName, req.SourceNodeID, req.TargetNodeID, id, req.SchemaID).Scan(&numericJobID)
 
	if errJob == nil {
		stJobID := fmt.Sprintf("%s/%d", nodePrefix, numericJobID)
		_, _ = h.db.Exec(c.Request.Context(), "UPDATE SD_JOBS SET st_job_id = $1 WHERE id = $2", stJobID, numericJobID)
	} else {
		fmt.Printf("Warning: Failed to sync job for network %s: %v\n", id, errJob)
	}
	// ───────────────────────────────────────────────────────────────────

	c.JSON(http.StatusOK, gin.H{"message": "Network topology saved and Pipeline Job updated!"})
}

func (h *NetworkHandler) DeleteNetwork(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	tag, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_SCHEMA_JOBS WHERE m_schema_job_id=$1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Network topology not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Network topology deleted successfully"})
}

// TestSourceConnection and TestTargetConnection now perform real Pings using the driver framework.
func (h *NetworkHandler) TestSourceConnection(c *gin.Context) {
	h.runConnectionTest(c, "source")
}

func (h *NetworkHandler) TestTargetConnection(c *gin.Context) {
	h.runConnectionTest(c, "target")
}

func (h *NetworkHandler) runConnectionTest(c *gin.Context, side string) {
	id := c.Param("id")
	ctx := c.Request.Context()

	var n drivers.ConnectionConfig
	var credPass *string

	query := fmt.Sprintf(`
		SELECT n.%s_driver, n.%s_host, n.%s_port, n.%s_database, n.%s_username, n.%s_password, n.%s_path,
		       cr.password_encrypted
		FROM M_SCHEMA_JOBS n
		LEFT JOIN M_CREDENTIALS cr ON n.%s_credential_id = cr.m_credential_id
		WHERE n.m_schema_job_id = $1
	`, side, side, side, side, side, side, side, side)

	err := h.db.QueryRow(ctx, query, id).Scan(
		&n.Driver, &n.Host, &n.Port, &n.Database, &n.Username, &n.Password, &n.Path, &credPass,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Network configuration not found"})
		return
	}

	// Handle encrypted credentials if applicable
	if credPass != nil && *credPass != "" {
		if dec, err := utils.Decrypt(*credPass); err == nil {
			n.Password = dec
		}
	}

	driver, err := drivers.GetDriver(n.Driver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	start := time.Now()
	testErr := driver.TestConnection(ctx, n)
	latency := time.Since(start)

	if testErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("Connectivity Failure: %v", testErr),
			"latency": fmt.Sprintf("%v", latency.Truncate(time.Millisecond)),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("%s connectivity test successful", side),
		"latency": fmt.Sprintf("%v", latency.Truncate(time.Millisecond)),
	})
}

func (h *NetworkHandler) TestConnectionAdhoc(c *gin.Context) {
	// Use a unified struct to avoid double-reading the body stream
	var complexReq struct {
		CreateNetworkRequest
		Type string `json:"type"`
	}
	
	if err := c.ShouldBindJSON(&complexReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid request payload", "message": err.Error()})
		return
	}

	req := complexReq.CreateNetworkRequest
	side := "source"
	if complexReq.Type == "target" {
		side = "target"
	}

	var d drivers.ConnectionConfig
	if side == "source" {
		d = drivers.ConnectionConfig{
			Driver: req.SourceDriver, Host: req.SourceHost, Database: req.SourceDatabase,
			Username: req.SourceUsername, Password: req.SourcePassword, Path: req.SourcePath,
		}
		if req.SourcePort != nil {
			d.Port = *req.SourcePort
		}
	} else {
		d = drivers.ConnectionConfig{
			Driver: req.TargetDriver, Host: req.TargetHost, Database: req.TargetDatabase,
			Username: req.TargetUsername, Password: req.TargetPassword, Path: req.TargetPath,
		}
		if req.TargetPort != nil {
			d.Port = *req.TargetPort
		}
	}

	driver, err := drivers.GetDriver(d.Driver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	start := time.Now()
	testErr := driver.TestConnection(c.Request.Context(), d)
	latency := time.Since(start)

	if testErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("Adhoc Verification Failed: %v", testErr),
			"latency": fmt.Sprintf("%v", latency.Truncate(time.Millisecond)),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Adhoc verification successful",
		"latency": fmt.Sprintf("%v", latency.Truncate(time.Millisecond)),
	})
}
