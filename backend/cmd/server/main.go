package main

import (
	"context"
	"log"

	"os"
	"github.com/gin-gonic/gin"
	"github.com/bintang/remake-dsp-backend/internal/api/router"
	"github.com/bintang/remake-dsp-backend/internal/config"
	"github.com/bintang/remake-dsp-backend/internal/db"
	"github.com/bintang/remake-dsp-backend/internal/grpc"
	"github.com/bintang/remake-dsp-backend/internal/syncengine"
	"github.com/bintang/remake-dsp-backend/internal/metrics"
)

func main() {
	// SECURITY: Set Gin to release mode in production to hide debug info
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	cfg := config.LoadConfig()

	ctx := context.Background()

	// Initialize DB (optional exit on fail since db may not be running yet locally)
	pool, err := db.NewPostgresDB(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("Warning: Failed to connect to DB, continuing without DB for now. Error: %v", err)
	} else {
		defer pool.Close()
		db.RunMigrations(ctx, pool)
	}

	r := router.SetupRouter(pool, cfg)

	// Start Sync Engine & Scheduler
	agentManager := syncengine.NewAgentManager()
	engine := syncengine.NewEngine(pool)
	engine.SetAgentManager(agentManager)
	
	scheduler := syncengine.NewScheduler(pool, engine)
	go scheduler.Start(ctx)

	// Start gRPC Server for Master-Agent coordination
	go grpc.StartGRPCServer(cfg, pool, agentManager)

	// Start Metrics Collector (if DB is available)
	if pool != nil {
		collector := metrics.NewCollector(pool)
		go collector.Start(ctx)
	}

	protocol := "HTTP"
	if cfg.TLSEnabled {
		protocol = "HTTPS"
	}
	log.Printf("Starting %s Dashboard server on port %s", protocol, cfg.Port)
	if cfg.TLSEnabled {
		log.Printf("TLS is enabled. Serving over HTTPS...")
		if err := r.RunTLS(":"+cfg.Port, cfg.TLSCertPath, cfg.TLSKeyPath); err != nil {
			log.Fatalf("Server failed to start with TLS: %v", err)
		}
	} else {
		if err := r.Run(":" + cfg.Port); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}
}
