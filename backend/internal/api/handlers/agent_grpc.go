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

	// PROD SECURITY: Verify agent_token and node_code against DB
	var dbToken string
	err = s.DB.QueryRow(stream.Context(), "SELECT agent_token FROM M_NODE WHERE node_code = $1", first.NodeCode).Scan(&dbToken)
	if err != nil || dbToken != first.AgentToken {
		log.Printf("Security Violation: Unauthorized agent connection attempt from %s", first.NodeCode)
		return fmt.Errorf("authentication failed: invalid node_code or agent_token")
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
