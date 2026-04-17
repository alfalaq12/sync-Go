package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/bintang/remake-dsp-backend/internal/config"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("userID", claims["sub"])
			if role, exists := claims["role"]; exists {
				c.Set("userRole", role)
			} else {
				c.Set("userRole", "admin") // default fallback if missing
			}
		}

		c.Next()
	}
}

// RBACMiddleware enforces role-based access control policies
func RBACMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role not identified"})
			c.Abort()
			return
		}

		userRole := strings.ToLower(fmt.Sprintf("%v", role))

		// If user is a Viewer, they can only perform GET (Read) operations.
		// OPTIONS are already handled by CORS middleware before this, but we allow them anyway.
		if userRole == "viewer" || userRole == "view" {
			if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodOptions {
				c.JSON(http.StatusForbidden, gin.H{
					"error": "Forbidden: You have 'Viewer' role and cannot perform modifications (CRUD).",
				})
				c.Abort()
				return
			}
		}

		// Proceed for other roles/methods
		c.Next()
	}
}
