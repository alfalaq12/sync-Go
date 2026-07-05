package syncengine

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/bintang/remake-dsp-backend/internal/agent/proto"
	"github.com/bintang/remake-dsp-backend/internal/drivers"
	"github.com/bintang/remake-dsp-backend/internal/utils"
	"golang.org/x/sync/errgroup"
)

type dataChunk struct {
	columns []string
	rows    [][]any
}

type Engine struct {
	db           *pgxpool.Pool
	agentManager *AgentManager
}

func NewEngine(db *pgxpool.Pool) *Engine {
	return &Engine{db: db}
}

func (e *Engine) SetAgentManager(am *AgentManager) {
	e.agentManager = am
}

func (e *Engine) getSetting(ctx context.Context, key string, defaultVal string) string {
	if e.db == nil {
		return defaultVal
	}
	var val string
	err := e.db.QueryRow(ctx, "SELECT value FROM S_SETTINGS WHERE key = $1", key).Scan(&val)
	if err != nil {
		return defaultVal
	}
	return val
}

func (e *Engine) getSettingInt(ctx context.Context, key string, defaultVal int) int {
	str := e.getSetting(ctx, key, "")
	if str == "" {
		return defaultVal
	}
	var val int
	_, err := fmt.Sscanf(str, "%d", &val)
	if err != nil {
		return defaultVal
	}
	return val
}

// ExecuteSync runs an ETL job for a specific job ID
func (e *Engine) ExecuteSync(ctx context.Context, jobID int) error {
	if e.db == nil {
		return fmt.Errorf("database pool is not initialized")
	}

	// 1. Enforce Max Concurrent Jobs configuration
	maxJobs := e.getSettingInt(ctx, "cons_max_jobs", 10)
	var runningCount int
	_ = e.db.QueryRow(ctx, "SELECT COUNT(*) FROM SD_JOBS WHERE status = 'running'").Scan(&runningCount)
	if runningCount >= maxJobs {
		e.LogToDB(ctx, jobID, nil, "WARNING", "Engine", fmt.Sprintf("Execution deferred: system-wide concurrent jobs limit reached (%d/%d)", runningCount, maxJobs))
		return fmt.Errorf("concurrent jobs execution limit reached (%d)", maxJobs)
	}

	// 2. Load Job, Network, and Schema info
	var networkID int
	var schemaID, sourceNodeID, targetNodeID *int
	var lastSyncValue *string
	var isSourceDistributed *bool
	var sourceNodeCode *string
	
	err := e.db.QueryRow(ctx, `
		SELECT j.network_id, j.schema_id, j.source_node_id, j.target_node_id, n.last_sync_value, 
		       sn.is_distributed, sn.node_code
		FROM SD_JOBS j
		JOIN M_SCHEMA_JOBS n ON j.network_id = n.m_schema_job_id
		LEFT JOIN M_NODE sn ON j.source_node_id = sn.m_node_id
		WHERE j.id = $1
	`, jobID).Scan(&networkID, &schemaID, &sourceNodeID, &targetNodeID, &lastSyncValue, &isSourceDistributed, &sourceNodeCode)
	if err != nil {
		e.LogToDB(ctx, jobID, nil, "ERROR", "Engine", fmt.Sprintf("Failed to load job: %v", err))
		return fmt.Errorf("failed to load job: %v", err)
	}

	if schemaID == nil {
		e.LogToDB(ctx, jobID, nil, "ERROR", "Engine", "No Schema (Table Mapping) assigned to this job/network. Please select a schema in the network configuration.")
		return fmt.Errorf("no schema assigned to this job")
	}

	e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Engine", fmt.Sprintf("Starting synchronization job #%d", jobID))

	// 2. Load Network Connection Details
	var net drivers.ConnectionConfig
	var target drivers.ConnectionConfig
	var sCredPass, tCredPass *string
	
	err = e.db.QueryRow(ctx, `
		SELECT n.source_driver, n.source_host, n.source_port, n.source_database, n.source_username, n.source_password, n.source_path,
		       c1.password_encrypted,
		       n.target_driver, n.target_host, n.target_port, n.target_database, n.target_username, n.target_password, n.target_path,
		       c2.password_encrypted
		FROM M_SCHEMA_JOBS n
		LEFT JOIN M_CREDENTIALS c1 ON n.source_credential_id = c1.m_credential_id
		LEFT JOIN M_CREDENTIALS c2 ON n.target_credential_id = c2.m_credential_id
		WHERE n.m_schema_job_id = $1
	`, networkID).Scan(
		&net.Driver, &net.Host, &net.Port, &net.Database, &net.Username, &net.Password, &net.Path, &sCredPass,
		&target.Driver, &target.Host, &target.Port, &target.Database, &target.Username, &target.Password, &target.Path, &tCredPass,
	)
	if err != nil {
		e.LogToDB(ctx, jobID, sourceNodeID, "ERROR", "Engine", fmt.Sprintf("Failed to load network config: %v", err))
		return fmt.Errorf("failed to load network config: %v", err)
	}

	log.Printf("[DEBUG] net.Password before decrypt: %q", net.Password)
	// Overwrite with centralized credentials if present
	if sCredPass != nil && *sCredPass != "" {
		decrypted, err := utils.Decrypt(*sCredPass)
		if err == nil {
			net.Password = decrypted
			log.Printf("[DEBUG] net.Password after sCredPass decrypt: %q", net.Password)
		} else {
			e.LogToDB(ctx, jobID, sourceNodeID, "WARNING", "Engine", "Failed to decrypt source credential, falling back to manual password")
		}
	} else if net.Password != "" {
		decrypted, err := utils.Decrypt(net.Password)
		log.Printf("[DEBUG] net.Password manual decrypt err: %v", err)
		if err == nil {
			net.Password = decrypted
			log.Printf("[DEBUG] net.Password after manual decrypt: %q", net.Password)
		}
	}

	log.Printf("[DEBUG] target.Password before decrypt: %q", target.Password)
	if tCredPass != nil && *tCredPass != "" {
		decrypted, err := utils.Decrypt(*tCredPass)
		if err == nil {
			target.Password = decrypted
			log.Printf("[DEBUG] target.Password after tCredPass decrypt: %q", target.Password)
		} else {
			e.LogToDB(ctx, jobID, sourceNodeID, "WARNING", "Engine", "Failed to decrypt target credential, falling back to manual password")
		}
	} else if target.Password != "" {
		decrypted, err := utils.Decrypt(target.Password)
		log.Printf("[DEBUG] target.Password manual decrypt err: %v", err)
		if err == nil {
			target.Password = decrypted
			log.Printf("[DEBUG] target.Password after manual decrypt: %q", target.Password)
		}
	}

	// 3. Load Schema Query Rules
	rows, err := e.db.Query(ctx, `
		SELECT source_query, target_table, truncate_before, batch_size,
		       extract_pre_query, extract_post_query, upload_pre_query, upload_post_query,
		       sync_method, upsert_keys, incremental_column
		FROM M_SCHEMA_DETAILS WHERE schema_id = $1 ORDER BY sort_order ASC
	`, schemaID)
	if err != nil {
		e.LogToDB(ctx, jobID, sourceNodeID, "ERROR", "Engine", fmt.Sprintf("Failed to load schema queries: %v", err))
		return fmt.Errorf("failed to load schema queries: %v", err)
	}
	defer rows.Close()

	// 4. Update Job started time
	_, _ = e.db.Exec(ctx, "UPDATE SD_JOBS SET started_at = NOW(), status = 'running', progress = 5 WHERE id = $1", jobID)

	sourceDriver, err := drivers.GetDriver(net.Driver)
	if err != nil {
		e.LogToDB(ctx, jobID, sourceNodeID, "ERROR", "Engine", fmt.Sprintf("Source driver '%s' not found: %v", net.Driver, err))
		return err
	}
	targetDriver, err := drivers.GetDriver(target.Driver)
	if err != nil {
		e.LogToDB(ctx, jobID, targetNodeID, "ERROR", "Engine", fmt.Sprintf("Target driver '%s' not found: %v", target.Driver, err))
		return err
	}

	// 5. Test initial network path connections with timeout (default 300 seconds)
	timeoutSecs := e.getSettingInt(ctx, "cons_query_timeout", 300)
	handshakeCtx, cancelHandshake := context.WithTimeout(ctx, time.Duration(timeoutSecs)*time.Second)
	defer cancelHandshake()

	if isSourceDistributed == nil || !*isSourceDistributed || e.agentManager == nil {
		e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Engine", "Verifying source network connection path...")
		if err := sourceDriver.TestConnection(handshakeCtx, net); err != nil {
			e.LogToDB(ctx, jobID, sourceNodeID, "ERROR", "Engine", fmt.Sprintf("Source connection handshake failed: %v", err))
			return fmt.Errorf("source connection failure: %v", err)
		}
	} else {
		e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Engine", "Skipping local source handshake for distributed node")
	}

	e.LogToDB(ctx, jobID, targetNodeID, "INFO", "Engine", "Verifying target destination connection path...")
	if err := targetDriver.TestConnection(handshakeCtx, target); err != nil {
		e.LogToDB(ctx, jobID, targetNodeID, "ERROR", "Engine", fmt.Sprintf("Target connection handshake failed: %v", err))
		return fmt.Errorf("target connection failure: %v", err)
	}

	totalExtracted := int64(0)
	totalUploaded := int64(0)

	// 5. Execute each query rule
	for rows.Next() {
		var sqPtr, ttPtr, epqPtr, epotqPtr, upqPtr, upotqPtr *string
		var syncMethodPtr, upsertKeysRawPtr, incColPtr *string
		var trunc bool
		var batchSize int
		
		if err := rows.Scan(&sqPtr, &ttPtr, &trunc, &batchSize, &epqPtr, &epotqPtr, &upqPtr, &upotqPtr, &syncMethodPtr, &upsertKeysRawPtr, &incColPtr); err != nil {
			e.LogToDB(ctx, jobID, sourceNodeID, "ERROR", "Engine", fmt.Sprintf("Failed to scan schema details: %v", err))
			return err
		}

		getString := func(ptr *string) string {
			if ptr == nil {
				return ""
			}
			return *ptr
		}

		sq := getString(sqPtr)
		tt := getString(ttPtr)
		epq := getString(epqPtr)
		epotq := getString(epotqPtr)
		upq := getString(upqPtr)
		upotq := getString(upotqPtr)
		syncMethod := getString(syncMethodPtr)
		upsertKeysRaw := getString(upsertKeysRawPtr)
		incCol := getString(incColPtr)
		if batchSize <= 0 {
			batchSize = 50000 // default optimal buffer for 7M+ row sync
		}

		upsertKeys := []string{}
		if syncMethod == "UPSERT" && upsertKeysRaw != "" {
			upsertKeys = strings.Split(upsertKeysRaw, ",")
			for i := range upsertKeys {
				upsertKeys[i] = strings.TrimSpace(upsertKeys[i])
			}
		}

		e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "ETL", fmt.Sprintf("Processing pipeline segment for table: %s", tt))

		// A. Pre-queries
		if epq != "" {
			if isSourceDistributed == nil || !*isSourceDistributed || e.agentManager == nil {
				_ = sourceDriver.ExecuteQuery(ctx, net, epq)
			} else {
				e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "ETL", "Skipping source pre-query (epq) for distributed node (not supported yet)")
			}
		}
		if upq != "" {
			_ = targetDriver.ExecuteQuery(ctx, target, upq)
		}

		// B. Truncate Target
		if trunc {
			if tt == "" {
				e.LogToDB(ctx, jobID, targetNodeID, "WARNING", "Truncate", "Skip truncate: target_table name is empty")
			} else {
				e.LogToDB(ctx, jobID, targetNodeID, "INFO", "Truncate", fmt.Sprintf("Truncating table: %s", tt))
				if err := targetDriver.TruncateTarget(ctx, target, tt); err != nil {
					msg := fmt.Sprintf("Truncate failed on table %s: %v", tt, err)
					e.LogToDB(ctx, jobID, targetNodeID, "ERROR", "Truncate", msg)
					return fmt.Errorf("%s", msg)
				}
			}
		}

		// C. Handle Incremental Logic
		if syncMethod == "INCREMENTAL" && incCol != "" && lastSyncValue != nil && *lastSyncValue != "" {
			e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Incremental", fmt.Sprintf("Filtering source data using %s > %s", incCol, *lastSyncValue))
			// Simple injection for demonstration - in production use a better SQL builder/parser
			if !strings.Contains(strings.ToUpper(sq), "WHERE") {
				sq += fmt.Sprintf(" WHERE %s > '%s'", incCol, *lastSyncValue)
			} else {
				sq += fmt.Sprintf(" AND %s > '%s'", incCol, *lastSyncValue)
			}
		}

		// D. Pipelined Stream Extract & Load
		if isSourceDistributed != nil && *isSourceDistributed && e.agentManager != nil {
			nodeCodeStr := ""
			if sourceNodeCode != nil {
				nodeCodeStr = *sourceNodeCode
			}
			e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Distributed", fmt.Sprintf("Dispatching extraction to remote agent: %s", nodeCodeStr))
			
			// Setup receiver channel
			dataCh := make(chan *proto.DataBatch, 100)
			defer e.agentManager.CleanupJob(fmt.Sprintf("%d", jobID))

			// Build payload for agent (JSON containing SQ and net config)
			payloadObj := struct {
				Query     string                   `json:"query"`
				BatchSize int                      `json:"batch_size"`
				Config    drivers.ConnectionConfig `json:"config"`
			}{
				Query:     sq,
				BatchSize: batchSize,
				Config:    net,
			}
			payloadBytes, _ := json.Marshal(payloadObj)
			payload := string(payloadBytes)

			err = e.agentManager.DispatchSync(ctx, nodeCodeStr, fmt.Sprintf("%d", jobID), payload, dataCh)
			if err != nil {
				return err
			}
			
			// Listener loop for remote data chunks
			for {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case batch, ok := <-dataCh:
					if !ok {
						// Channel closed - agent finished sending batches
						goto JobFinished
					}

					// Process the batch
					if len(batch.Rows) > 0 {
						// Convert protobuf rows to [][]any
						chunk := make([][]any, len(batch.Rows))
						for i, r := range batch.Rows {
							row := make([]any, len(r.Values))
							for j, v := range r.Values {
								row[j] = deserializeValue(v)
							}
							chunk[i] = row
						}

						// Load into target
						affected, err := targetDriver.StreamLoad(ctx, target, tt, batch.Columns, chunk, upsertKeys)
						if err != nil {
							msg := fmt.Sprintf("Remote Batch Load failed on table %s: %v", tt, err)
							e.LogToDB(ctx, jobID, targetNodeID, "ERROR", "Distributed", msg)
							return fmt.Errorf("%s", msg)
						}
						totalUploaded += affected
						
						// Update progress based on chunks (log only for now)
						e.LogToDB(ctx, jobID, targetNodeID, "INFO", "Distributed", fmt.Sprintf("Processed batch of %d rows for %s", len(batch.Rows), tt))
					}
				}
			}
		JobFinished:
			e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Distributed", "Remote agent finished extraction session.")
			continue 
		}

		e.LogToDB(ctx, jobID, sourceNodeID, "INFO", "Pipeline", fmt.Sprintf("Starting pipelined transfer for table: %s (Strategy: %s)", tt, syncMethod))
		
		var chunkCount int64
		var maxIncValue string

		// Initialize errgroup for pipeline management
		g, groupCtx := errgroup.WithContext(ctx)
		// Buffered channel: Increased buffer to 16 to feed multiple workers
		chunkChan := make(chan dataChunk, 16)

		// 1. PRODUCER GOROUTINE: Extraction
		g.Go(func() error {
			defer close(chunkChan)
			return sourceDriver.StreamExtract(groupCtx, net, sq, batchSize, func(columns []string, chunk [][]any) error {
				if syncMethod == "INCREMENTAL" && incCol != "" {
					incColIdx := -1
					for i, col := range columns {
						if strings.EqualFold(col, incCol) {
							incColIdx = i
							break
						}
					}
					if incColIdx != -1 {
						for _, row := range chunk {
							valStr := fmt.Sprintf("%v", row[incColIdx])
							if valStr > maxIncValue {
								maxIncValue = valStr
							}
						}
					}
				}

				select {
				case <-groupCtx.Done():
					return groupCtx.Err()
				case chunkChan <- dataChunk{columns: columns, rows: chunk}:
					return nil
				}
			})
		})

		// 2. CONSUMER GOROUTINES: Loading (Worker Pool)
		workerCount := e.getSettingInt(ctx, "cons_worker_threads", 4)
		for i := 0; i < workerCount; i++ {
			g.Go(func() error {
				for pkg := range chunkChan {
					affected, err := targetDriver.StreamLoad(groupCtx, target, tt, pkg.columns, pkg.rows, upsertKeys)
					if err != nil {
						return fmt.Errorf("load failure: %v", err)
					}
					atomic.AddInt64(&chunkCount, affected)
					
					// Real-time progress tracking
					e.LogToDB(groupCtx, jobID, targetNodeID, "INFO", "StreamFlow", fmt.Sprintf("Pipelined chunk of %d rows to target by worker", affected))
					_, _ = e.db.Exec(groupCtx, `
						UPDATE SD_JOBS SET 
							rows_extracted = rows_extracted + $1, 
							rows_uploaded = rows_uploaded + $2,
							progress = LEAST(progress + 1, 98)
						WHERE id = $3
					`, len(pkg.rows), affected, jobID)
				}
				return nil
			})
		}

		if err := g.Wait(); err != nil {
			e.LogToDB(ctx, jobID, sourceNodeID, "ERROR", "Engine", fmt.Sprintf("Data pipeline collapsed: %v", err))
			return err
		}

		totalExtracted += chunkCount
		totalUploaded += chunkCount
		e.LogToDB(ctx, jobID, targetNodeID, "INFO", "StreamFlow", fmt.Sprintf("Successfully completed stream transfer of %d total rows", chunkCount))

		// E. Post-queries
		if epotq != "" {
			_ = sourceDriver.ExecuteQuery(ctx, net, epotq)
		}
		if upotq != "" {
			_ = targetDriver.ExecuteQuery(ctx, target, upotq)
		}

		// F. Update High-Water Mark for Incremental
		if syncMethod == "INCREMENTAL" && maxIncValue != "" {
			e.LogToDB(ctx, jobID, nil, "INFO", "Incremental", fmt.Sprintf("Updating high-water mark to: %s", maxIncValue))
			_, _ = e.db.Exec(ctx, "UPDATE M_SCHEMA_JOBS SET last_sync_value = $1 WHERE m_schema_job_id = $2", maxIncValue, networkID)
			lastSyncValue = &maxIncValue // Update local state for subsequent segments in the same schema if needed
		}
	}

	// 6. Complete Job
	_, _ = e.db.Exec(ctx, `
		UPDATE SD_JOBS SET 
			status = 'completed', 
			progress = 100, 
			completed_at = NOW(),
			records_processed = $1
		WHERE id = $2
	`, totalUploaded, jobID)

	e.LogToDB(ctx, jobID, nil, "INFO", "Engine", fmt.Sprintf("Synchronization job #%d completed successfully. Total rows processed: %d", jobID, totalUploaded))
	log.Printf("[Job %d] Sync completed successfully. Total rows: %d", jobID, totalUploaded)
	return nil
}

func (e *Engine) LogToDB(ctx context.Context, jobID int, nodeID *int, level, source, message string) {
	_, err := e.db.Exec(ctx, `
		INSERT INTO JOB_LOG (job_id, node_id, level, source, message)
		VALUES ($1, $2, $3, $4, $5)
	`, jobID, nodeID, level, source, message)
	if err != nil {
		log.Printf("Failed to write system log to DB: %v", err)
	}
}

func deserializeValue(s string) any {
	if s == "__DSP_NULL__" {
		return nil
	}
	if strings.HasPrefix(s, "__DSP_TIME__:") {
		t, _ := time.Parse(time.RFC3339Nano, s[13:])
		return t
	}
	if strings.HasPrefix(s, "__DSP_BYTES__:") {
		b, _ := base64.StdEncoding.DecodeString(s[14:])
		return b
	}
	if strings.HasPrefix(s, "__DSP_BOOL__:") {
		return s[13:] == "true"
	}
	if strings.HasPrefix(s, "__DSP_INT__:") {
		i, _ := strconv.ParseInt(s[12:], 10, 64)
		return i // Return int64 to support both INT4 and INT8 (bigint) natively
	}
	if strings.HasPrefix(s, "__DSP_FLOAT__:") {
		f, _ := strconv.ParseFloat(s[14:], 64)
		return f
	}
	return s
}

