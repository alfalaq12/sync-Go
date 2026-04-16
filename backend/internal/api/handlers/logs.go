package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LogHandler struct {
	db *pgxpool.Pool
}

func NewLogHandler(db *pgxpool.Pool) *LogHandler {
	return &LogHandler{db: db}
}

type LogResponse struct {
	ID        int     `json:"id"`
	NodeID    *string `json:"node_id"`
	Level     *string `json:"level"`
	Source    *string `json:"source"`
	Message   *string `json:"message"`
	CreatedAt *string `json:"created_at"`
}

func (h *LogHandler) ListLogs(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	limit := c.DefaultQuery("limit", "100")

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT id, node_id, level, source, message,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
		FROM JOB_LOG ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []LogResponse
	for rows.Next() {
		var l LogResponse
		if err := rows.Scan(&l.ID, &l.NodeID, &l.Level, &l.Source, &l.Message, &l.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		logs = append(logs, l)
	}

	if logs == nil {
		logs = []LogResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"data": logs, "total": len(logs)})
}
