package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bintang/remake-dsp-backend/internal/config"
	"golang.org/x/crypto/bcrypt"
)

const cookieName = "sync_go_token"
const tokenExpiry = 2 * time.Hour // Reduced from 24h for security

type AuthHandler struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

func NewAuthHandler(db *pgxpool.Pool, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  string `json:"user"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	// DB-backed authentication
	var passwordHash string
	var role string
	err := h.db.QueryRow(c.Request.Context(),
		"SELECT password_hash, role FROM S_USERS WHERE username = $1", req.Username).Scan(&passwordHash, &role)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Compare bcrypt hash
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Update last login
	_, err = h.db.Exec(c.Request.Context(), "UPDATE S_USERS SET last_login = NOW() WHERE username = $1", req.Username)
	if err != nil {
		log.Printf("Failed to update last login for user %s: %v", req.Username, err)
		// We don't return error here because login is still successful
	}

	now := time.Now()

	// Generate JWT token with improved claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  req.Username,
		"role": role,
		"iat":  now.Unix(),                    // Issued at — enables token age validation
		"jti":  uuid.New().String(),           // JWT ID — enables token revocation/blacklisting
		"exp":  now.Add(tokenExpiry).Unix(),   // Reduced to 2 hours (was 24h)
	})

	tokenString, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		log.Printf("Failed to sign token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Set JWT as HttpOnly cookie — JavaScript cannot access this, preventing XSS token theft
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		cookieName,                     // name
		tokenString,                    // value
		int(tokenExpiry.Seconds()),     // maxAge (2 hours)
		"/",                            // path
		"",                             // domain (auto)
		true,                           // secure — hardened for HTTPS
		true,                           // httpOnly — this is the key security improvement
	)

	// Return user info (but NOT the token — it's in the cookie now)
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    req.Username,
		"role":    role,
	})
}

// Logout clears the auth cookie
func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(cookieName, "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
