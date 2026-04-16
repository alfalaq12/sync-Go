package main

import (
	"context"
	"fmt"
	"log"

	"github.com/bintang/remake-dsp-backend/internal/config"
	"github.com/bintang/remake-dsp-backend/internal/db"
)

func main() {
	cfg := config.LoadConfig()
	ctx := context.Background()

	pool, err := db.NewPostgresDB(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer pool.Close()

	// Drop all old tables
	tables := []string{
		"system_logs", "jobs", "sync_networks", "schema_queries", "sync_schemas", "nodes", "users",
	}
	for _, t := range tables {
		_, err := pool.Exec(ctx, fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", t))
		if err != nil {
			log.Printf("Failed to drop %s: %v", t, err)
		} else {
			log.Printf("Dropped table: %s", t)
		}
	}

	// Now run fresh migrations
	db.RunMigrations(ctx, pool)

	fmt.Println("\n✅ Database reset and re-migrated successfully!")
}
