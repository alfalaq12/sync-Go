package main

import (
	"context"
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

	if _, err := pool.Exec(ctx, "TRUNCATE TABLE M_GROUPS CASCADE; TRUNCATE TABLE M_ROLES CASCADE;"); err != nil {
		log.Fatalf("Truncate failed: %v", err)
	}
	log.Println("Successfully truncated M_GROUPS and M_ROLES")
}
