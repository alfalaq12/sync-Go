package handlers

import (
	"log"
	"net/http"

	"github.com/bintang/remake-dsp-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CredentialHandler struct {
	db *pgxpool.Pool
}

func NewCredentialHandler(db *pgxpool.Pool) *CredentialHandler {
	return &CredentialHandler{db: db}
}

type CredentialResponse struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Username  string `json:"username"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

func (h *CredentialHandler) ListCredentials(c *gin.Context) {
	rows, err := h.db.Query(c.Request.Context(), `
		SELECT m_credential_id, name, username, notes,
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS'),
		       TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS')
		FROM M_CREDENTIALS ORDER BY name ASC
	`)
	if err != nil {
		log.Printf("Failed to list credentials: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch credentials"})
		return
	}
	defer rows.Close()

	var creds []CredentialResponse
	for rows.Next() {
		var cr CredentialResponse
		if err := rows.Scan(&cr.ID, &cr.Name, &cr.Username, &cr.Notes, &cr.CreatedAt, &cr.UpdatedAt); err != nil {
			log.Printf("Failed to scan credential: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process database records"})
			return
		}
		creds = append(creds, cr)
	}

	if creds == nil {
		creds = []CredentialResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"data": creds})
}

type CreateCredentialRequest struct {
	Name     string `json:"name" binding:"required"`
	Username string `json:"username"`
	Password string `json:"password" binding:"required"`
	Notes    string `json:"notes"`
}

func (h *CredentialHandler) CreateCredential(c *gin.Context) {
	var req CreateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encrypted, err := utils.Encrypt(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption failed"})
		return
	}

	var id int
	err = h.db.QueryRow(c.Request.Context(), `
		INSERT INTO M_CREDENTIALS (name, username, password_encrypted, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING m_credential_id
	`, req.Name, req.Username, encrypted, req.Notes).Scan(&id)

	if err != nil {
		log.Printf("Failed to create credential: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save credential to database"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Credential created successfully"})
}

func (h *CredentialHandler) UpdateCredential(c *gin.Context) {
	id := c.Param("id")
	var req CreateCredentialRequest // Reuse request struct
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encrypted, err := utils.Encrypt(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption failed"})
		return
	}

	tag, err := h.db.Exec(c.Request.Context(), `
		UPDATE M_CREDENTIALS SET name=$1, username=$2, password_encrypted=$3, notes=$4, updated_at=NOW()
		WHERE m_credential_id=$5
	`, req.Name, req.Username, encrypted, req.Notes, id)

	if err != nil {
		log.Printf("Failed to update credential %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update internal record"})
		return
	}

	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Credential not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Credential updated successfully"})
}

func (h *CredentialHandler) DeleteCredential(c *gin.Context) {
	id := c.Param("id")
	
	// Check if used in M_SCHEMA_JOBS
	var count int
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT COUNT(*) FROM M_SCHEMA_JOBS WHERE source_credential_id = $1 OR target_credential_id = $1
	`, id).Scan(&count)
	
	if err != nil {
		log.Printf("Failed to check credential usage %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify credential status before deletion"})
		return
	}
	
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Credential is still in use by active network jobs and cannot be deleted"})
		return
	}

	tag, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_CREDENTIALS WHERE m_credential_id=$1", id)
	if err != nil {
		log.Printf("Failed to delete credential %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deletion command failed"})
		return
	}

	if tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Credential not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Credential deleted successfully"})
}
