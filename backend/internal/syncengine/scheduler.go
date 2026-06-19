package syncengine

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Scheduler struct {
	db      *pgxpool.Pool
	engine  *Engine
	cron    *cron.Cron
	entries map[int]cron.EntryID
	mu      sync.Mutex
}

func NewScheduler(db *pgxpool.Pool, engine *Engine) *Scheduler {
	return &Scheduler{
		db:      db,
		engine:  engine,
		cron:    cron.New(cron.WithSeconds()), // Support precision if needed
		entries: make(map[int]cron.EntryID),
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	log.Println("Starting background Job Scheduler...")
	if s.db == nil {
		log.Println("Scheduler: Database connection is nil, scheduler will not start.")
		return
	}
	s.cron.Start()

	// Initial load and then periodic refresh every minute
	s.RefreshJobs(ctx)
	
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.RefreshJobs(ctx)
			}
		}
	}()
}

func (s *Scheduler) RefreshJobs(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(ctx, `
		SELECT m_schema_job_id, cron_expression, status 
		FROM M_SCHEMA_JOBS 
		WHERE cron_expression IS NOT NULL AND cron_expression != '' AND status = 'active'
	`)
	if err != nil {
		log.Printf("Scheduler: Failed to fetch scheduled jobs: %v", err)
		return
	}
	defer rows.Close()

	activeJobs := make(map[int]string)
	for rows.Next() {
		var id int
		var cronExpr, status string
		if err := rows.Scan(&id, &cronExpr, &status); err == nil {
			activeJobs[id] = cronExpr
		}
	}

	// Remove no longer scheduled or changed jobs
	for id, entryID := range s.entries {
		if expr, ok := activeJobs[id]; !ok || expr == "" {
			s.cron.Remove(entryID)
			delete(s.entries, id)
			log.Printf("Scheduler: Removed job %d from schedule", id)
		}
	}

	// Add or update jobs
	for id, expr := range activeJobs {
		if _, exists := s.entries[id]; !exists {
			jobID := id // capture for closure
			entryID, err := s.cron.AddFunc(expr, func() {
				s.TriggerJob(id)
			})
			if err != nil {
				log.Printf("Scheduler: Invalid cron expression '%s' for job %d: %v", expr, id, err)
				continue
			}
			s.entries[id] = entryID
			log.Printf("Scheduler: Scheduled job %d with expression '%s'", jobID, expr)
		}
	}
}

func (s *Scheduler) TriggerJob(networkID int) {
	log.Printf("Scheduler: Triggering scheduled execution for Network #%d", networkID)
	if s.db == nil {
		log.Println("Scheduler: Database connection is nil, cannot trigger job.")
		return
	}
	
	ctx := context.Background()

	// 1. Create a new Execution Record (SD_JOBS)
	var schemaID int
	var sNode, tNode *int
	var name string
	err := s.db.QueryRow(ctx, `
		SELECT schema_id, source_node_id, target_node_id, notes 
		FROM M_SCHEMA_JOBS WHERE m_schema_job_id = $1
	`, networkID).Scan(&schemaID, &sNode, &tNode, &name)
	if err != nil {
		log.Printf("Scheduler: Failed to find network info for %d: %v", networkID, err)
		return
	}

	jobName := fmt.Sprintf("AUTO_%s_Net%d", time.Now().Format("20060102_1504"), networkID)
	
	var id int
	err = s.db.QueryRow(ctx, `
		INSERT INTO SD_JOBS (name, network_id, schema_id, source_node_id, target_node_id, job_type, status, progress)
		VALUES ($1, $2, $3, $4, $5, 'CRON', 'pending', 0) RETURNING id
	`, jobName, networkID, schemaID, sNode, tNode).Scan(&id)
	if err != nil {
		log.Printf("Scheduler: Failed to create job record: %v", err)
		return
	}

	// 2. Execute it
	go func() {
		err := s.engine.ExecuteSync(ctx, id)
		if err != nil {
			log.Printf("Scheduler: Job %d execution failed: %v", id, err)
			_, _ = s.db.Exec(ctx, "UPDATE SD_JOBS SET status = 'failed', error_message = $1 WHERE id = $2", err.Error(), id)
		}
	}()
}
