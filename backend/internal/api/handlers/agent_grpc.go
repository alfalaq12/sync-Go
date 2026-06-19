package handlers

import (
	"fmt"
	"io"
	"log"

	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
	"github.com/bintang/remake-dsp-backend/internal/syncengine"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AgentGRPCServer struct {
	proto.UnimplementedSyncAgentServer
	Manager *syncengine.AgentManager
	DB      *pgxpool.Pool
}

func (s *AgentGRPCServer) Session(stream proto.SyncAgent_SessionServer) error {
	// 1. Handshake / Authentication
	first, err := stream.Recv()
	if err != nil {
		return err
	}

	// PROD SECURITY: Verify agent_token and node_code against DB. Auto-register if not exists.
	var dbToken string
	err = s.DB.QueryRow(stream.Context(), "SELECT agent_token FROM M_NODE WHERE node_code = $1", first.NodeCode).Scan(&dbToken)
	if err != nil {
		log.Printf("Agent node %s not found in database. Auto-registering...", first.NodeCode)
		
		// Dynamically get the count of nodes starting with "MASTER HOST"
		var hostCount int
		err = s.DB.QueryRow(stream.Context(), "SELECT COUNT(*) FROM M_NODE WHERE node_name LIKE 'MASTER HOST%'").Scan(&hostCount)
		if err != nil {
			hostCount = 1
		}
		nodeName := fmt.Sprintf("MASTER HOST %d", hostCount)

		// Auto-register the node
		_, err = s.DB.Exec(stream.Context(), `
			INSERT INTO M_NODE (node_code, node_name, connection_mode, status, is_distributed, agent_token, last_seen)
			VALUES ($1, $2, 'distributed', 'online', true, $3, NOW())
			ON CONFLICT (node_code) DO NOTHING
		`, first.NodeCode, nodeName, first.AgentToken)
		if err != nil {
			log.Printf("Auto-registration failed for node %s: %v", first.NodeCode, err)
			return fmt.Errorf("authentication failed: unable to auto-register node")
		}
		log.Printf("Agent auto-registered successfully: %s with name %s", first.NodeCode, nodeName)
		dbToken = first.AgentToken
	}

	if dbToken != first.AgentToken {
		log.Printf("Security Violation: Unauthorized agent connection attempt from %s (Token mismatch)", first.NodeCode)
		return fmt.Errorf("authentication failed: invalid agent_token")
	}

	log.Printf("Agent authenticated: %s", first.NodeCode)

	agent := &syncengine.RemoteAgent{
		Token:    first.AgentToken,
		NodeCode: first.NodeCode,
		Control:  stream,
		Status:   "IDLE",
		ResultCh: make(chan *proto.SyncResult, 1),
	}

	s.Manager.Register(agent)
	defer s.Manager.Unregister(first.NodeCode)

	// Keep stream alive for heartbeats
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		log.Printf("Heartbeat from %s: %s", first.NodeCode, msg.Status)

		// Update node status and last_seen in database to prevent status cleaner from marking it offline
		if s.DB != nil {
			_, dbErr := s.DB.Exec(stream.Context(), 
				"UPDATE M_NODE SET status = $1, last_seen = NOW() WHERE node_code = $2", 
				msg.Status, first.NodeCode)
			if dbErr != nil {
				log.Printf("Failed to update heartbeat in DB for node %s: %v", first.NodeCode, dbErr)
			}
		}
	}

	return nil
}

func (s *AgentGRPCServer) PushData(stream proto.SyncAgent_PushDataServer) error {
	var lastJobID string
	for {
		batch, err := stream.Recv()
		if err == io.EOF {
			if lastJobID != "" {
				if ch, ok := s.Manager.GetJobChannel(lastJobID); ok {
					close(ch)
				}
			}
			return stream.SendAndClose(&proto.SyncResult{Success: true})
		}
		if err != nil {
			return err
		}

		lastJobID = batch.JobId
		// PROD LOGIC: Route the batch to the correct active job channel
		ch, ok := s.Manager.GetJobChannel(batch.JobId)
		if !ok {
			log.Printf("Warning: Dropped batch for Job %s - No active listener found", batch.JobId)
			continue
		}

		ch <- batch
	}
}
