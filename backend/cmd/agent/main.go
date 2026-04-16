package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
	"github.com/bintang/remake-dsp-backend/internal/drivers"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AgentConfig struct {
	MasterAddr   string
	Token        string
	NodeCode     string
	LocalDriver  string
	LocalDBURL   string
}

var cfg AgentConfig

func main() {
	flag.StringVar(&cfg.MasterAddr, "master", "localhost:50051", "Master gRPC address")
	flag.StringVar(&cfg.Token, "token", "agent-secret-123", "Agent secret token")
	flag.StringVar(&cfg.NodeCode, "node", "LOCAL_AGENT_01", "Unique Node Code")
	flag.StringVar(&cfg.LocalDriver, "db-driver", "postgres", "Local DB Driver (postgres/mysql/mssql)")
	flag.StringVar(&cfg.LocalDBURL, "db-url", "", "Local Connection String / DSN")
	flag.Parse()

	if cfg.LocalDBURL == "" {
		log.Fatalf("Error: --db-url is required. Example: postgres://user:pass@localhost:5432/dbname")
	}

	log.Printf("Sync-Go Agent [%s] starting. Connecting to Master at %s...", cfg.NodeCode, cfg.MasterAddr)

	conn, err := grpc.Dial(cfg.MasterAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect to master: %v", err)
	}
	defer conn.Close()

	client := proto.NewSyncAgentClient(conn)

	for {
		err := runSession(client, cfg.Token, cfg.NodeCode)
		if err != nil {
			log.Printf("Session closed with error: %v. Retrying in 5s...", err)
			time.Sleep(5 * time.Second)
		}
	}
}

func runSession(client proto.SyncAgentClient, token, nodeCode string) error {
	ctx := context.Background()
	stream, err := client.Session(ctx)
	if err != nil {
		return err
	}

	// 1. Send Handshake
	err = stream.Send(&proto.Heartbeat{
		AgentToken: token,
		NodeCode:   nodeCode,
		Status:     "IDLE",
	})
	if err != nil {
		return err
	}

	log.Printf("Agent registered successfully. Local Driver: %s. Waiting for commands...", cfg.LocalDriver)

	// 2. Listen for commands
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		switch msg.Cmd {
		case proto.ControlMessage_START_SYNC:
			log.Printf("Received START_SYNC for Job %s (Query: %s)", msg.JobId, "...")
			go handleSyncJob(client, msg)
		case proto.ControlMessage_PING:
			log.Printf("Heartbeat check from Master")
		}
	}
}

type JobPayload struct {
	Query     string `json:"query"`
	BatchSize int    `json:"batch_size"`
}

func handleSyncJob(client proto.SyncAgentClient, msg *proto.ControlMessage) {
	var payload JobPayload
	if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
		log.Printf("Failed to parse sync payload: %v", err)
		return
	}

	log.Printf("[Job %s] Starting extraction...", msg.JobId)
	
	// Initialize local driver
	drv, err := drivers.GetDriver(cfg.LocalDriver)
	if err != nil {
		log.Printf("[Job %s] Driver error: %v", msg.JobId, err)
		return
	}

	pushStream, err := client.PushData(context.Background())
	if err != nil {
		log.Printf("[Job %s] Failed to open push stream: %v", msg.JobId, err)
		return
	}

	drvConfig := drivers.ConnectionConfig{
		Database: cfg.LocalDBURL, // Driver interprets this as DSN or URL
	}

	// Extract in chunks and push
	err = drv.StreamExtract(context.Background(), drvConfig, payload.Query, payload.BatchSize, func(columns []string, chunk [][]any) error {
		log.Printf("[Job %s] Pushing batch of %d rows...", msg.JobId, len(chunk))
		
		protoRows := make([]*proto.Row, len(chunk))
		for i, r := range chunk {
			vals := make([]string, len(r))
			for j, v := range r {
				vals[j] = fmt.Sprintf("%v", v) // Simple string conversion for prototype
			}
			protoRows[i] = &proto.Row{Values: vals}
		}

		batch := &proto.DataBatch{
			JobId:     msg.JobId,
			TableName: "DISTRIBUTED_EXTRACT",
			Columns:   columns,
			Rows:      protoRows,
		}

		return pushStream.Send(batch)
	})

	if err != nil {
		log.Printf("[Job %s] Extraction/Push failed: %v", msg.JobId, err)
	}

	result, err := pushStream.CloseAndRecv()
	if err != nil {
		log.Printf("[Job %s] Finalization failed: %v", msg.JobId, err)
	} else {
		log.Printf("[Job %s] Distributed sync completed. Master Ack: %v", msg.JobId, result.Success)
	}
}
