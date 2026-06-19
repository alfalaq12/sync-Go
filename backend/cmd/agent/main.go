package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"crypto/tls"
	"crypto/x509"
	"io/ioutil"
	"log"
	"os"
	"time"

	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
	"github.com/bintang/remake-dsp-backend/internal/drivers"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

type AgentConfig struct {
	MasterAddr   string
	Token        string
	NodeCode     string
	LocalDriver  string
	LocalDBURL  string
	TLSEnabled  bool
	TLSCACert   string
	TLSClientCert string
	TLSClientKey  string
}

var cfg AgentConfig

func main() {
	flag.StringVar(&cfg.MasterAddr, "master", "localhost:50051", "Master gRPC address")
	flag.StringVar(&cfg.Token, "token", "agent-secret-123", "Agent secret token")
	flag.StringVar(&cfg.NodeCode, "node", "LOCAL_AGENT_01", "Unique Node Code")
	flag.StringVar(&cfg.LocalDriver, "db-driver", "postgres", "Local DB Driver (postgres/mysql/mssql)")
	flag.StringVar(&cfg.LocalDBURL, "db-url", "", "Local Connection String / DSN")
	flag.BoolVar(&cfg.TLSEnabled, "tls", true, "Enable TLS")
	flag.StringVar(&cfg.TLSCACert, "ca", "certs/ca.crt", "CA Certificate file")
	flag.StringVar(&cfg.TLSClientCert, "cert", "certs/client.crt", "Client Certificate file")
	flag.StringVar(&cfg.TLSClientKey, "key", "certs/client.key", "Client Key file")
	flag.Parse()

	if val := os.Getenv("MASTER_ADDR"); val != "" { cfg.MasterAddr = val }
	if val := os.Getenv("TOKEN"); val != "" { cfg.Token = val }
	if val := os.Getenv("NODE_CODE"); val != "" { cfg.NodeCode = val }
	if val := os.Getenv("DB_DRIVER"); val != "" { cfg.LocalDriver = val }
	if val := os.Getenv("DB_URL"); val != "" { cfg.LocalDBURL = val }
	if val := os.Getenv("TLS_ENABLED"); val == "true" { cfg.TLSEnabled = true } else if val == "false" { cfg.TLSEnabled = false }
	if val := os.Getenv("TLS_CA_PATH"); val != "" { cfg.TLSCACert = val }
	if val := os.Getenv("TLS_CERT_PATH"); val != "" { cfg.TLSClientCert = val }
	if val := os.Getenv("TLS_KEY_PATH"); val != "" { cfg.TLSClientKey = val }

	if cfg.LocalDBURL == "" {
		log.Fatalf("Error: --db-url is required. Example: postgres://user:pass@localhost:5432/dbname")
	}

	log.Printf("Sync-Go Agent [%s] starting. Connecting to Master at %s...", cfg.NodeCode, cfg.MasterAddr)

	var dialOpts []grpc.DialOption

	if cfg.TLSEnabled {
		log.Printf("Loading TLS certificates for mTLS...")
		// 1. Load Client Cert & Key
		certificate, err := tls.LoadX509KeyPair(cfg.TLSClientCert, cfg.TLSClientKey)
		if err != nil {
			log.Fatalf("could not load client key pair: %s", err)
		}

		// 2. Load CA Cert for Server Verification
		certPool := x509.NewCertPool()
		ca, err := ioutil.ReadFile(cfg.TLSCACert)
		if err != nil {
			log.Fatalf("could not read ca certificate: %s", err)
		}
		if ok := certPool.AppendCertsFromPEM(ca); !ok {
			log.Fatalf("failed to append ca certs")
		}

		tlsConfig := &tls.Config{
			Certificates: []tls.Certificate{certificate},
			RootCAs:      certPool,
			// Since we use self-signed 'localhost', we might need this if using IP addresses / tunnels
			InsecureSkipVerify: true, // Only if hostname doesn't match
		}

		dialOpts = append(dialOpts, grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)))
		log.Println("gRPC Agent TLS enabled (mTLS)")
	} else {
		log.Printf("WARNING: Connecting in INSECURE mode")
		dialOpts = append(dialOpts, grpc.WithDefaultCallOptions()) // Placeholder
		// Note: grpc.WithInsecure is deprecated, using insecure credentials instead if needed
	}

	conn, err := grpc.Dial(cfg.MasterAddr, dialOpts...)
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

	// Start background heartbeat sender to prevent tunnel timeout and keep database status online
	go func() {
		ticker := time.NewTicker(8 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-stream.Context().Done():
				return
			case <-ticker.C:
				err := stream.Send(&proto.Heartbeat{
					AgentToken: token,
					NodeCode:   nodeCode,
					Status:     "online",
				})
				if err != nil {
					log.Printf("Failed to send heartbeat: %v", err)
					return
				}
			}
		}
	}()

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
