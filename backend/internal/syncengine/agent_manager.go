package syncengine

import (
	"context"
	"fmt"
	"sync"
	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
)

type RemoteAgent struct {
	Token    string
	NodeCode string
	Control  proto.SyncAgent_SessionServer
	Status   string
	JobMap   map[string]chan *proto.DataBatch // key: JobId
	ResultCh chan *proto.SyncResult           // For receiving completion status
}

type AgentManager struct {
	mu     sync.RWMutex
	agents map[string]*RemoteAgent // key: NodeCode
	jobs   map[string]chan *proto.DataBatch // key: JobId
}

func NewAgentManager() *AgentManager {
	return &AgentManager{
		agents: make(map[string]*RemoteAgent),
		jobs:   make(map[string]chan *proto.DataBatch),
	}
}

func (m *AgentManager) Register(agent *RemoteAgent) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.agents[agent.NodeCode] = agent
}

func (m *AgentManager) Unregister(nodeCode string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.agents, nodeCode)
}

func (m *AgentManager) GetAgent(nodeCode string) (*RemoteAgent, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	a, ok := m.agents[nodeCode]
	return a, ok
}

func (m *AgentManager) DispatchSync(ctx context.Context, nodeCode string, jobID string, payload string, dataCh chan *proto.DataBatch) error {
	agent, ok := m.GetAgent(nodeCode)
	if !ok {
		return fmt.Errorf("agent %s not connected", nodeCode)
	}

	m.mu.Lock()
	m.jobs[jobID] = dataCh
	m.mu.Unlock()

	err := agent.Control.Send(&proto.ControlMessage{
		Cmd:     proto.ControlMessage_START_SYNC,
		Payload: payload,
		JobId:   jobID,
	})
	if err != nil {
		m.Unregister(nodeCode)
		return fmt.Errorf("failed to send command to agent: %v", err)
	}

	return nil
}

func (m *AgentManager) GetJobChannel(jobID string) (chan *proto.DataBatch, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ch, ok := m.jobs[jobID]
	return ch, ok
}

func (m *AgentManager) CleanupJob(jobID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.jobs, jobID)
}
