package router

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bintang/remake-dsp-backend/internal/api/handlers"
	"github.com/bintang/remake-dsp-backend/internal/api/middleware"
	"github.com/bintang/remake-dsp-backend/internal/config"
	"github.com/bintang/remake-dsp-backend/internal/syncengine"
	"time"
)

func SetupRouter(db *pgxpool.Pool, cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Init engine
	syncEngine := syncengine.NewEngine(db)

	// Init handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	nodeHandler := handlers.NewNodeHandler(db)
	jobHandler := handlers.NewJobHandler(db, syncEngine)
	schemaHandler := handlers.NewSchemaHandler(db)
	networkHandler := handlers.NewNetworkHandler(db)
	logHandler := handlers.NewLogHandler(db)
	credentialHandler := handlers.NewCredentialHandler(db)
	userHandler := handlers.NewUserHandler(db)

	// Public routes
	public := r.Group("/api/v1")
	{
		public.POST("/login", middleware.RateLimiter(5, time.Minute), authHandler.Login)
	}

	// Protected routes
	protected := r.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware(cfg), middleware.RBACMiddleware())
	{
		protected.GET("/dashboard", func(c *gin.Context) {
			userID := c.GetString("userID")
			c.JSON(200, gin.H{"message": "Welcome to the DSP Dashboard", "user": userID})
		})

		// Node endpoints
		protected.GET("/nodes", nodeHandler.ListNodes)
		protected.POST("/nodes", nodeHandler.CreateNode)
		protected.GET("/nodes/:id", nodeHandler.GetNode)
		protected.PUT("/nodes/:id", nodeHandler.UpdateNode)
		protected.DELETE("/nodes/:id", nodeHandler.DeleteNode)

		// Job endpoints
		protected.GET("/jobs", jobHandler.ListJobs)
		protected.POST("/jobs", jobHandler.CreateJob)
		protected.GET("/jobs/:id", jobHandler.GetJob)
		protected.DELETE("/jobs/:id", jobHandler.DeleteJob)
		protected.POST("/jobs/:id/start", jobHandler.StartJob)
		protected.POST("/jobs/:id/abort", jobHandler.AbortJob)
		protected.POST("/jobs/:id/reset", jobHandler.ResetJob)

		// Schema endpoints
		protected.GET("/schemas", schemaHandler.ListSchemas)
		protected.POST("/schemas", schemaHandler.CreateSchema)
		protected.GET("/schemas/:id", schemaHandler.GetSchema)
		protected.PUT("/schemas/:id", schemaHandler.UpdateSchema)
		protected.DELETE("/schemas/:id", schemaHandler.DeleteSchema)

		// Network endpoints
		protected.GET("/networks", networkHandler.ListNetworks)
		protected.POST("/networks", networkHandler.CreateNetwork)
		protected.GET("/networks/:id", networkHandler.GetNetwork)
		protected.PUT("/networks/:id", networkHandler.UpdateNetwork)
		protected.DELETE("/networks/:id", networkHandler.DeleteNetwork)
		protected.POST("/networks/:id/test-source", networkHandler.TestSourceConnection)
		protected.POST("/networks/:id/test-target", networkHandler.TestTargetConnection)
		protected.POST("/networks/test-adhoc", networkHandler.TestConnectionAdhoc)

		// Log endpoints
		protected.GET("/logs", logHandler.ListLogs)

		// Credential endpoints
		protected.GET("/credentials", credentialHandler.ListCredentials)
		protected.POST("/credentials", credentialHandler.CreateCredential)
		protected.PUT("/credentials/:id", credentialHandler.UpdateCredential)
		protected.DELETE("/credentials/:id", credentialHandler.DeleteCredential)

		// User Management endpoints
		protected.GET("/users", userHandler.ListUsers)
		protected.POST("/users", userHandler.CreateUser)
		protected.PUT("/users/:id", userHandler.UpdateUser)
		protected.DELETE("/users/:id", userHandler.DeleteUser)

		protected.GET("/groups", userHandler.ListGroups)
		protected.POST("/groups", userHandler.CreateGroup)
		protected.PUT("/groups/:id", userHandler.UpdateGroup)
		protected.DELETE("/groups/:id", userHandler.DeleteGroup)

		protected.GET("/roles", userHandler.ListRoles)
		protected.POST("/roles", userHandler.CreateRole)
		protected.PUT("/roles/:id", userHandler.UpdateRole)
		protected.DELETE("/roles/:id", userHandler.DeleteRole)

		protected.GET("/policies", userHandler.ListPolicies)
		protected.POST("/policies", userHandler.CreatePolicy)
		protected.PUT("/policies/:id", userHandler.UpdatePolicy)
		protected.DELETE("/policies/:id", userHandler.DeletePolicy)
	}

	return r
}
