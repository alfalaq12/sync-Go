package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NodeHandler struct {
	db *pgxpool.Pool
}

func NewNodeHandler(db *pgxpool.Pool) *NodeHandler {
	return &NodeHandler{db: db}
}

type NodeResponse struct {
	ID             int     `json:"id"`
	NodeCode       string  `json:"node_code"`
	NodeName       *string `json:"node_name"`
	Hostname       *string `json:"hostname"`
	IPAddress      *string `json:"ip_address"`
	ConnectionMode *string `json:"connection_mode"`
	Status         *string `json:"status"`
	Notes          *string `json:"notes"`
	BandwidthLimit *int    `json:"bandwidth_limit"`
	EnableTimeSync *bool   `json:"enable_time_sync"`
	OfflineMode    *bool   `json:"offline_mode"`
	ClonedNode     *bool   `json:"cloned_node"`
	AgentVersion   *string `json:"agent_version"`
	Owner          *string `json:"owner"`
	IsDistributed  *bool   `json:"is_distributed"`
	AgentToken     *string `json:"agent_token"`
	BatchSize      *int    `json:"batch_size"`
	LastSeen       *string `json:"last_seen"`
	CreatedAt      *string `json:"created_at"`
	UpdatedAt      *string `json:"updated_at"`
}

func (h *NodeHandler) ListNodes(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT m_node_id, node_code, node_name, hostname, ip_address, connection_mode, status, notes,
		       bandwidth_limit, enable_time_sync, offline_mode, cloned_node, agent_version, owner,
		       is_distributed, agent_token,
		       TO_CHAR(last_seen, 'YYYY-MM-DD HH24:MI:SS') as last_seen,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM M_NODE ORDER BY m_node_id ASC
	`)
	if err != nil {
		fmt.Printf("Error in ListNodes Query: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var nodes []NodeResponse
	for rows.Next() {
		var n NodeResponse
		if err := rows.Scan(&n.ID, &n.NodeCode, &n.NodeName, &n.Hostname, &n.IPAddress, &n.ConnectionMode,
			&n.Status, &n.Notes, &n.BandwidthLimit, &n.EnableTimeSync, &n.OfflineMode,
			&n.ClonedNode, &n.AgentVersion, &n.Owner, &n.IsDistributed, &n.AgentToken,
			&n.BatchSize, &n.LastSeen, &n.CreatedAt, &n.UpdatedAt); err != nil {
			fmt.Printf("Error in ListNodes Scan: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		nodes = append(nodes, n)
	}

	if nodes == nil {
		nodes = []NodeResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"data": nodes, "total": len(nodes)})
}

type CreateNodeRequest struct {
	NodeCode       string `json:"node_code"`
	NodeName       string `json:"node_name"`
	Hostname       string `json:"hostname"`
	IPAddress      string `json:"ip_address"`
	ConnectionMode string `json:"connection_mode"`
	Notes          string `json:"notes"`
	BandwidthLimit *int   `json:"bandwidth_limit"`
	EnableTimeSync *bool  `json:"enable_time_sync"`
	OfflineMode    *bool  `json:"offline_mode"`
	ClonedNode     *bool  `json:"cloned_node"`
	Owner          string `json:"owner"`
	IsDistributed  bool   `json:"is_distributed"`
	AgentToken     string `json:"agent_token"`
	BatchSize      int    `json:"batch_size"`
}

func (h *NodeHandler) CreateNode(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var req CreateNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ConnectionMode == "" {
		req.ConnectionMode = "direct"
	}
	if req.Owner == "" {
		req.Owner = "admin"
	}

	enableTimeSync := true
	if req.EnableTimeSync != nil {
		enableTimeSync = *req.EnableTimeSync
	}
	offlineMode := false
	if req.OfflineMode != nil {
		offlineMode = *req.OfflineMode
	}
	clonedNode := false
	if req.ClonedNode != nil {
		clonedNode = *req.ClonedNode
	}

	var nodeID int
	// If NodeCode is empty, we will set it after getting the insert ID
	nodeCode := req.NodeCode
	if nodeCode == "" {
		nodeCode = "PENDING_AUTO"
	}

	err := h.db.QueryRow(c.Request.Context(), `
		INSERT INTO M_NODE (node_code, node_name, hostname, ip_address, connection_mode, status, notes,
		                    bandwidth_limit, enable_time_sync, offline_mode, cloned_node, owner,
		                    is_distributed, agent_token, batch_size)
		VALUES ($1, $2, $3, $4, $5, 'offline', $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING m_node_id
	`, nodeCode, req.NodeName, req.Hostname, req.IPAddress, req.ConnectionMode, req.Notes,
		req.BandwidthLimit, enableTimeSync, offlineMode, clonedNode, req.Owner, 
		req.IsDistributed, req.AgentToken, req.BatchSize).Scan(&nodeID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create node: %v", err)})
		return
	}

	// Update NodeCode if it was auto-generated
	if req.NodeCode == "" {
		nodeCode = fmt.Sprintf("nodes_id_%d", nodeID)
		_, _ = h.db.Exec(c.Request.Context(), "UPDATE M_NODE SET node_code = $1 WHERE m_node_id = $2", nodeCode, nodeID)
		if req.NodeName == "" {
			_, _ = h.db.Exec(c.Request.Context(), "UPDATE M_NODE SET node_name = $1 WHERE m_node_id = $2", nodeCode, nodeID)
		}
	}

	c.JSON(http.StatusCreated, gin.H{"id": nodeID, "node_code": nodeCode, "message": "Node created successfully"})
}

func (h *NodeHandler) GetNode(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var n NodeResponse
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT m_node_id, node_code, node_name, hostname, ip_address, connection_mode, status, notes,
		       bandwidth_limit, enable_time_sync, offline_mode, cloned_node, agent_version, owner,
		       is_distributed, agent_token, batch_size,
		       TO_CHAR(last_seen, 'YYYY-MM-DD HH24:MI:SS') as last_seen,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
		FROM M_NODE WHERE m_node_id = $1
	`, id).Scan(&n.ID, &n.NodeCode, &n.NodeName, &n.Hostname, &n.IPAddress, &n.ConnectionMode,
		&n.Status, &n.Notes, &n.BandwidthLimit, &n.EnableTimeSync, &n.OfflineMode,
		&n.ClonedNode, &n.AgentVersion, &n.Owner, &n.IsDistributed, &n.AgentToken, &n.BatchSize,
		&n.LastSeen, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Node not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": n})
}

func (h *NodeHandler) UpdateNode(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	var req CreateNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	enableTimeSync := true
	if req.EnableTimeSync != nil {
		enableTimeSync = *req.EnableTimeSync
	}
	offlineMode := false
	if req.OfflineMode != nil {
		offlineMode = *req.OfflineMode
	}
	clonedNode := false
	if req.ClonedNode != nil {
		clonedNode = *req.ClonedNode
	}

	tag, err := h.db.Exec(c.Request.Context(), `
		UPDATE M_NODE SET node_code=$1, node_name=$2, hostname=$3, ip_address=$4, connection_mode=$5, notes=$6,
		       bandwidth_limit=$7, enable_time_sync=$8, offline_mode=$9, cloned_node=$10, owner=$11,
		       is_distributed=$12, agent_token=$13, batch_size=$14, updated_at=NOW()
		WHERE m_node_id=$15
	`, req.NodeCode, req.NodeName, req.Hostname, req.IPAddress, req.ConnectionMode, req.Notes,
		req.BandwidthLimit, enableTimeSync, offlineMode, clonedNode, req.Owner, 
		req.IsDistributed, req.AgentToken, req.BatchSize, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Node not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Node updated successfully"})
}

func (h *NodeHandler) DeleteNode(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	id := c.Param("id")
	tag, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_NODE WHERE m_node_id=$1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Node not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Node deleted successfully"})
}
