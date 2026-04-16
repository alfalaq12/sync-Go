package grpc

import (
	"context"
	"log"
	"net"
	"time"

	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
	"github.com/bintang/remake-dsp-backend/internal/api/handlers"
	"github.com/bintang/remake-dsp-backend/internal/syncengine"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
)

// StartGRPCServer initializes the gRPC service for Master-Agent coordination.

func StartGRPCServer(port string, db *pgxpool.Pool, manager *syncengine.AgentManager) {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	
	s := grpc.NewServer()
	
	// Register the new SyncAgent service
	proto.RegisterSyncAgentServer(s, &handlers.AgentGRPCServer{
		Manager: manager,
	})

	// Start background worker to mark stale nodes as offline
	if db != nil {
		go startNodeStatusCleaner(db)
	}

	log.Printf("gRPC Master Server listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func startNodeStatusCleaner(db *pgxpool.Pool) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Mark nodes as offline if they haven't been seen in the last 20 seconds
		query := `
			UPDATE M_NODE 
			SET status = 'offline' 
			WHERE status != 'offline' 
			AND last_seen < NOW() - INTERVAL '20 seconds'
		`
		tag, err := db.Exec(context.Background(), query)
		if err != nil {
			log.Printf("Error cleaning stale nodes: %v", err)
			continue
		}
		
		if tag.RowsAffected() > 0 {
			log.Printf("Marked %d stale nodes as offline", tag.RowsAffected())
		}
	}
}
