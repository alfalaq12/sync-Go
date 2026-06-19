package grpc

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"io/ioutil"
	"log"
	"net"
	"time"

	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
	"github.com/bintang/remake-dsp-backend/internal/api/handlers"
	"github.com/bintang/remake-dsp-backend/internal/config"
	"github.com/bintang/remake-dsp-backend/internal/syncengine"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// StartGRPCServer initializes the gRPC service for Master-Agent coordination.

func StartGRPCServer(cfg *config.Config, db *pgxpool.Pool, manager *syncengine.AgentManager) {
	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	var opts []grpc.ServerOption

	if cfg.TLSEnabled {
		log.Printf("Loading TLS certificates for mTLS...")
		// 1. Load Server Cert & Key
		certificate, err := tls.LoadX509KeyPair(cfg.TLSCertPath, cfg.TLSKeyPath)
		if err != nil {
			log.Fatalf("could not load server key pair: %s", err)
		}

		// 2. Load CA Cert for Client Verification (mTLS)
		certPool := x509.NewCertPool()
		ca, err := ioutil.ReadFile(cfg.TLSCAPath)
		if err != nil {
			log.Fatalf("could not read ca certificate: %s", err)
		}
		if ok := certPool.AppendCertsFromPEM(ca); !ok {
			log.Fatalf("failed to append ca certs")
		}

		tlsConfig := &tls.Config{
			ClientAuth:   tls.RequireAndVerifyClientCert,
			Certificates: []tls.Certificate{certificate},
			ClientCAs:    certPool,
		}

		creds := credentials.NewTLS(tlsConfig)
		opts = append(opts, grpc.Creds(creds))
		log.Println("gRPC Server TLS enabled (mTLS)")
	} else {
		log.Println("WARNING: gRPC Server starting in INSECURE mode")
	}

	s := grpc.NewServer(opts...)
	
	// Register the new SyncAgent service
	proto.RegisterSyncAgentServer(s, &handlers.AgentGRPCServer{
		Manager: manager,
		DB:      db,
	})

	// Start background worker to mark stale nodes as offline
	if db != nil {
		go startNodeStatusCleaner(db)
	}

	log.Printf("gRPC Master Server listening on :%s", cfg.GRPCPort)
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
