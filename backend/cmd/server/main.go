package main

import (
	"context"
	"log"

	"github.com/bintang/remake-dsp-backend/internal/api/router"
	"github.com/bintang/remake-dsp-backend/internal/config"
	"github.com/bintang/remake-dsp-backend/internal/db"
	"github.com/bintang/remake-dsp-backend/internal/grpc"
	"github.com/bintang/remake-dsp-backend/internal/syncengine"
)

func main() {
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

	// Start gRPC Server for Master-Agent communication
	go grpc.StartGRPCServer(cfg.GRPCPort, pool, agentManager)

	log.Printf("Starting HTTP Dashboard server on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
