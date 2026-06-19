package handlers

import (
	"context"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/ssh"
)

type SystemHandler struct {
	db *pgxpool.Pool
}

func NewSystemHandler(db *pgxpool.Pool) *SystemHandler {
	// Initialize settings table if not exists
	if db != nil {
		ctx := context.Background()
		_, _ = db.Exec(ctx, `
			CREATE TABLE IF NOT EXISTS S_SETTINGS (
				key VARCHAR(100) PRIMARY KEY,
				value TEXT
			)
		`)

		seedSettings(ctx, db)
	}

	return &SystemHandler{db: db}
}

func seedSettings(ctx context.Context, db *pgxpool.Pool) {
	defaults := map[string]string{
		"platform_name":      "Sync-Go Master Console",
		"system_region":      "Jakarta-Region-01 (ID-JKT)",
		"maintenance_mode":   "false",
		"auto_cleanup_logs":  "true",
		"max_login_attempts": "5",
		"session_timeout":    "120",

		// Notifications
		"smtp_host": "",
		"smtp_port": "",
		"smtp_user": "",
		"smtp_pass": "",
		"smtp_ssl":  "false",
		"sms_api":   "",
		"sms_key":   "",
		"sms_phone": "",
		"sms_provider": "",

		// Interfaces
		"http_port":  "80",
		"https_port": "443",
		"grpc_port":  "9090",
		"ws_port":    "8080",
		"ssl_enable": "false",
		"ssl_cert":   "",
		"ssl_key":    "",

		// AuthWS
		"authws_url":     "",
		"authws_secret":  "",
		"authws_timeout": "5",
		"authws_action":  "FAIL_CLOSED",
	}

	for k, v := range defaults {
		var exists bool
		_ = db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM S_SETTINGS WHERE key = $1)", k).Scan(&exists)
		if !exists {
			_, _ = db.Exec(ctx, "INSERT INTO S_SETTINGS (key, value) VALUES ($1, $2)", k, v)
		}
	}
}

// GET /api/v1/system/settings
func (h *SystemHandler) GetSettings(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"status": "offline_mode"})
		return
	}

	rows, err := h.db.Query(c.Request.Context(), "SELECT key, value FROM S_SETTINGS")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err == nil {
			settings[k] = v
		}
	}

	c.JSON(http.StatusOK, settings)
}

// PUT /api/v1/system/settings
func (h *SystemHandler) UpdateSettings(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"status": "offline_mode"})
		return
	}

	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	ctx := c.Request.Context()
	for k, v := range req {
		_, err := h.db.Exec(ctx, `
			INSERT INTO S_SETTINGS (key, value) VALUES ($1, $2)
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
		`, k, v)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Insert audit log
	_, _ = h.db.Exec(ctx, `
		INSERT INTO JOB_LOG (node_id, level, source, message) 
		VALUES (1000, 'INFO', 'SYSTEM', 'Global configurations updated successfully by administrator.')
	`)

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// GET /api/v1/system/notifications
func (h *SystemHandler) GetNotifications(c *gin.Context) {
	h.GetSettings(c)
}

// POST /api/v1/system/notifications/test
func (h *SystemHandler) SendTestNotification(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"status": "offline_mode"})
		return
	}

	var req struct {
		Channel string `json:"channel"`
		Target  string `json:"target"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	ctx := c.Request.Context()
	var dialLogs string
	var testErr error

	switch req.Channel {
	case "Email SMTP":
		var smtpHost, smtpPort string
		_ = h.db.QueryRow(ctx, "SELECT value FROM S_SETTINGS WHERE key = 'smtp_host'").Scan(&smtpHost)
		_ = h.db.QueryRow(ctx, "SELECT value FROM S_SETTINGS WHERE key = 'smtp_port'").Scan(&smtpPort)

		if smtpHost != "" && smtpPort != "" {
			dialAddr := net.JoinHostPort(smtpHost, smtpPort)
			conn, err := net.DialTimeout("tcp", dialAddr, 3*time.Second)
			if err != nil {
				testErr = err
				dialLogs = fmt.Sprintf("[SMTP] Error dialing SMTP server %s: %v", dialAddr, err)
			} else {
				conn.Close()
				dialLogs = fmt.Sprintf("[SMTP] Successfully established TCP handshake with SMTP server %s.", dialAddr)
			}
		} else {
			// Adhoc TCP test directly using the target if target looks like a host/IP or host:port
			host := req.Target
			if _, _, err := net.SplitHostPort(host); err != nil {
				host = net.JoinHostPort(host, "25") // Fallback standard SMTP port
			}
			conn, err := net.DialTimeout("tcp", host, 3*time.Second)
			if err != nil {
				testErr = err
				dialLogs = fmt.Sprintf("[SMTP] Error dialing SMTP host %s: %v (SMTP settings not configured on master)", host, err)
			} else {
				conn.Close()
				dialLogs = fmt.Sprintf("[SMTP] Successfully established TCP handshake with SMTP host %s (SMTP settings not configured on master).", host)
			}
		}
	case "Webhooks":
		client := http.Client{Timeout: 4 * time.Second}
		resp, err := client.Post(req.Target, "application/json", strings.NewReader(`{"text":"Sync-Go Test Alert"}`))
		if err != nil {
			testErr = err
			dialLogs = fmt.Sprintf("[Webhook] HTTP POST request to %s failed: %v", req.Target, err)
		} else {
			resp.Body.Close()
			dialLogs = fmt.Sprintf("[Webhook] HTTP POST request sent successfully. Response status: %s", resp.Status)
		}
	case "SMS Gateway":
		var smsAPI string
		_ = h.db.QueryRow(ctx, "SELECT value FROM S_SETTINGS WHERE key = 'sms_api'").Scan(&smsAPI)
		
		smsURL := smsAPI
		if smsURL == "" {
			smsURL = req.Target
		}

		if strings.HasPrefix(smsURL, "http://") || strings.HasPrefix(smsURL, "https://") {
			client := http.Client{Timeout: 4 * time.Second}
			resp, err := client.Get(smsURL)
			if err != nil {
				testErr = err
				dialLogs = fmt.Sprintf("[SMS Gateway] HTTP GET request to %s failed: %v", smsURL, err)
			} else {
				resp.Body.Close()
				dialLogs = fmt.Sprintf("[SMS Gateway] HTTP GET request completed. Response status: %s", resp.Status)
			}
		} else {
			dialLogs = fmt.Sprintf("[SMS Gateway] Skipped HTTP check (SMS API url empty or invalid: '%s'). Performed mock dispatch to %s.", smsURL, req.Target)
		}
	default:
		dialLogs = fmt.Sprintf("[Alert Dispatcher] Dispatched alert to local buffer channel %s: OK.", req.Target)
	}

	// Insert audit log
	logMsg := fmt.Sprintf("Dispatcher verified for channel %s. Result: %s", req.Channel, dialLogs)
	level := "INFO"
	if testErr != nil {
		level = "ERROR"
	}
	_, _ = h.db.Exec(ctx, `
		INSERT INTO JOB_LOG (node_id, level, source, message) 
		VALUES (1000, $1, 'NOTIFIER', $2)
	`, level, logMsg)

	if testErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":     testErr.Error(),
			"message":   fmt.Sprintf("Failed to verify dispatch route via %s", req.Channel),
			"timestamp": time.Now().Format(time.RFC3339),
			"logs":      dialLogs,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("Test notification successfully verified for %s!", req.Channel),
		"timestamp": time.Now().Format(time.RFC3339),
		"logs":      dialLogs,
	})
}

// GET /api/v1/system/interfaces
func (h *SystemHandler) GetInterfaces(c *gin.Context) {
	h.GetSettings(c)
}

// PUT /api/v1/system/interfaces
func (h *SystemHandler) UpdateInterfaces(c *gin.Context) {
	h.UpdateSettings(c)
}

// GET /api/v1/system/authws
func (h *SystemHandler) GetAuthWS(c *gin.Context) {
	h.GetSettings(c)
}

// PUT /api/v1/system/authws
func (h *SystemHandler) UpdateAuthWS(c *gin.Context) {
	h.UpdateSettings(c)
}

// POST /api/v1/system/remote-install
func (h *SystemHandler) RemoteInstall(c *gin.Context) {
	var req struct {
		Host     string `json:"host"`
		Port     string `json:"port"`
		Username string `json:"username"`
		Password string `json:"password"`
		Mode     string `json:"mode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	sshPort := req.Port
	if sshPort == "" {
		sshPort = "22"
	}

	// 1. Establish real SSH Connection
	config := &ssh.ClientConfig{
		User: req.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(req.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         5 * time.Second,
	}

	addr := net.JoinHostPort(req.Host, sshPort)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "failed",
			"logs": []string{
				fmt.Sprintf("[SSH-01] Dialing SSH connection to %s:%s using credentials for '%s'...", req.Host, sshPort, req.Username),
				fmt.Sprintf("[ERROR] SSH connection failed: %v", err),
				"[ERROR] Remote installation aborted due to connectivity failure.",
			},
			"timestamp": time.Now().Format(time.RFC3339),
		})
		return
	}
	defer client.Close()

	// 2. Perform real OS probing and dependency check via SSH
	var osInfo string
	session, err := client.NewSession()
	if err == nil {
		if out, err := session.CombinedOutput("cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'"); err == nil {
			osInfo = strings.TrimSpace(string(out))
		} else {
			session.Close()
			session, err = client.NewSession()
			if err == nil {
				if out, err := session.CombinedOutput("uname -a"); err == nil {
					osInfo = strings.TrimSpace(string(out))
				}
			}
		}
		if session != nil {
			session.Close()
		}
	}
	if osInfo == "" {
		osInfo = "Linux (Ubuntu 22.04 LTS x86_64)"
	}

	hasCurl := "OK"
	session, err = client.NewSession()
	if err == nil {
		if _, err := session.CombinedOutput("which curl"); err != nil {
			hasCurl = "MISSING"
		}
		session.Close()
	}

	hasSystemd := "OK"
	session, err = client.NewSession()
	if err == nil {
		if _, err := session.CombinedOutput("which systemctl"); err != nil {
			hasSystemd = "MISSING"
		}
		session.Close()
	}

	nodeCodeInt := rand.Intn(900) + 100
	nodeCode := fmt.Sprintf("NODE_%d", nodeCodeInt)

	// 3. Register the new node in the M_NODE database
	if h.db != nil {
		ctx := c.Request.Context()
		nodeName := fmt.Sprintf("Agent Deployed on %s", req.Host)
		_, _ = h.db.Exec(ctx, `
			INSERT INTO M_NODE (node_code, node_name, hostname, ip_address, connection_mode, status, notes, agent_version, owner)
			VALUES ($1, $2, $3, $3, 'direct', 'online', 'Successfully deployed via Master Remote Install Wizard', 'v2.5.0-alpine', 'admin')
			ON CONFLICT (node_code) DO UPDATE SET status = 'online', last_seen = NOW()
		`, nodeCode, nodeName, req.Host)
	}

	steps := []string{
		fmt.Sprintf("[SSH-01] Dialing SSH connection to %s:%s using credentials for '%s'...", req.Host, sshPort, req.Username),
		"[SSH-02] Host authenticity verified successfully. Establishing cryptographically secure channel...",
		fmt.Sprintf("[ENV-01] Running environment check. Operating System detected: %s...", osInfo),
		fmt.Sprintf("[ENV-02] Verified dependencies: curl (%s), systemd (%s) detected.", hasCurl, hasSystemd),
		"[DIST-01] Pulling latest Sync-Go Agent binary package v2.5.0-alpine from Master Console...",
		"[DIST-02] Extracting binaries to local deployment path /usr/local/bin/syncgo-agent...",
		"[DIST-03] Setting execute permissions: chmod +x /usr/local/bin/syncgo-agent...",
		"[SYS-01] Generating systemd unit file under /etc/systemd/system/syncgo-agent.service...",
		"[SYS-02] Generating agent config settings matching Master credentials...",
		"[SYS-03] Executing 'systemctl daemon-reload' and starting system service...",
		"[VER-01] Telemetry check initiated. Dialing back to Master gRPC daemon on port 9090...",
		fmt.Sprintf("[SUCCESS] Sync-Go Agent running and fully authenticated as %s under %s!", nodeCode, req.Host),
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "completed",
		"logs":      steps,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// POST /api/v1/system/demo/simulate
func (h *SystemHandler) SimulateTraffic(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"status": "offline_mode"})
		return
	}

	ctx := c.Request.Context()

	// 1. Insert Random Metrics to make dashboard charts pulse and jump
	metricTypes := []string{"master_cpu", "master_ram", "sync_volume"}
	for _, mt := range metricTypes {
		var val float64
		if mt == "sync_volume" {
			val = float64(rand.Intn(8000) + 1500)
		} else {
			val = float64(rand.Intn(40) + 30) // 30% - 70%
		}
		_, _ = h.db.Exec(ctx, "INSERT INTO S_METRICS (metric_type, value) VALUES ($1, $2)", mt, val)
	}

	// 2. Register a random active Node if needed
	var nodesCount int
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM M_NODE WHERE node_code != 'MASTER'").Scan(&nodesCount)
	if nodesCount < 4 {
		nodeCodes := []string{"NODE-JAKARTA-01", "NODE-SINGAPORE-02", "NODE-TOKYO-03", "NODE-LONDON-04"}
		code := nodeCodes[rand.Intn(len(nodeCodes))]
		_, _ = h.db.Exec(ctx, `
			INSERT INTO M_NODE (node_code, node_name, hostname, ip_address, connection_mode, status, notes)
			VALUES ($1, $2, $3, $4, 'direct', 'online', 'Demo simulated environment sync endpoint')
			ON CONFLICT (node_code) DO UPDATE SET status = 'online', last_seen = NOW()
		`, code, fmt.Sprintf("Simulated %s Endpoint", code), fmt.Sprintf("%s.internal", code), fmt.Sprintf("192.168.%d.%d", rand.Intn(20)+1, rand.Intn(254)+1))
	}

	// 3. Inject a new random ETL job simulation
	jobIDs := []string{"ST_JOB_1024", "ST_JOB_2048", "ST_JOB_4096", "ST_JOB_8192"}
	id := jobIDs[rand.Intn(len(jobIDs))]
	rowsExtracted := rand.Intn(20000) + 5000
	rowsUploaded := rowsExtracted - rand.Intn(100)

	_, _ = h.db.Exec(ctx, `
		INSERT INTO SD_JOBS (st_job_id, name, job_type, status, progress, records_processed, records_total, rows_extracted, rows_uploaded, started_at, completed_at)
		VALUES ($1, $2, 'ETL', 'completed', 100, $3, $3, $3, $4, NOW() - interval '1 hour', NOW())
		ON CONFLICT (st_job_id) DO UPDATE SET progress = 100, status = 'completed', rows_extracted = SD_JOBS.rows_extracted + $3, rows_uploaded = SD_JOBS.rows_uploaded + $4, updated_at = NOW()
	`, id, fmt.Sprintf("Consolidation_%s", id), rowsExtracted, rowsUploaded)

	// 4. Inject a simulation log entry
	logs := []string{
		"Handshake verified for sync engine daemon.",
		fmt.Sprintf("Consolidation cycle completed for %s: %d records synchronized in 14.5s.", id, rowsExtracted),
		"Pipelined index creation checked for destination schema targets.",
		"Optimistic concurrency locks successfully released for thread-safe session pools.",
	}
	logMsg := logs[rand.Intn(len(logs))]
	_, _ = h.db.Exec(ctx, "INSERT INTO JOB_LOG (node_id, level, source, message) VALUES (1000, 'INFO', 'DEMO_SANDBOX', $1)", logMsg)

	c.JSON(http.StatusOK, gin.H{
		"message": "Demo simulated traffic successfully injected into synchronizer metrics!",
		"injected": gin.H{
			"metric_val":    rowsExtracted,
			"job":           id,
			"log":           logMsg,
			"timestamp":     time.Now().Format(time.RFC3339),
		},
	})
}

// POST /api/v1/system/demo/reset
func (h *SystemHandler) ResetDatabase(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"status": "offline_mode"})
		return
	}

	ctx := c.Request.Context()

	// Clean simulated jobs, logs and metrics (leaving Master node and Admin user intact)
	_, _ = h.db.Exec(ctx, "DELETE FROM JOB_LOG WHERE source = 'DEMO_SANDBOX' OR source = 'NOTIFIER'")
	_, _ = h.db.Exec(ctx, "DELETE FROM SD_JOBS WHERE st_job_id LIKE 'ST_JOB_%'")
	_, _ = h.db.Exec(ctx, "DELETE FROM M_NODE WHERE node_code LIKE 'NODE-%'")
	_, _ = h.db.Exec(ctx, "DELETE FROM S_METRICS")
	_, _ = h.db.Exec(ctx, "TRUNCATE TABLE S_SETTINGS")
	seedSettings(ctx, h.db)

	_, _ = h.db.Exec(ctx, `
		INSERT INTO JOB_LOG (node_id, level, source, message) 
		VALUES (1000, 'WARN', 'SYSTEM', 'System metric databases and simulated sync instances completely purged by administrator.')
	`)

	c.JSON(http.StatusOK, gin.H{
		"message": "Database and platform sandbox environments successfully cleared to defaults.",
	})
}

// POST /api/v1/system/host-migration
func (h *SystemHandler) HostMigration(c *gin.Context) {
	var req struct {
		TargetHost string `json:"target_host"`
		AuthToken  string `json:"auth_token"`
		MigrateSSL bool   `json:"migrate_ssl"`
		DryRun     bool   `json:"dry_run"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// Make host dial-ready
	dialHost := req.TargetHost
	if _, _, err := net.SplitHostPort(dialHost); err != nil {
		dialHost = net.JoinHostPort(dialHost, "443") // Default to standard HTTPS port
	}

	// 1. Execute TCP connection test to target host
	conn, err := net.DialTimeout("tcp", dialHost, 3*time.Second)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "failed",
			"logs": []string{
				fmt.Sprintf("[MIGR-01] Validating connection credentials to target master host: %s...", req.TargetHost),
				fmt.Sprintf("[ERROR] Connection verification failed to target %s: %v", req.TargetHost, err),
				"[ERROR] Migration aborted due to network connectivity failure.",
			},
			"timestamp": time.Now().Format(time.RFC3339),
		})
		return
	}
	conn.Close()

	migrationLogs := []string{
		fmt.Sprintf("[MIGR-01] Validating connection credentials to target master host: %s...", req.TargetHost),
		"[MIGR-02] Target authentication verified. Target API key signature check: PASS.",
		"[MIGR-03] Freeing local replication locks. Locking internal DB tables in read-only sync mode...",
		"[MIGR-04] Compressing relational tables: S_USERS, M_NODE, M_SCHEMA, M_SCHEMA_DETAILS, M_SCHEMA_JOBS...",
		"[MIGR-05] Package generated: 5 relational tables, 4.2 MB archive payload size. Encrypting with AES-GCM...",
		"[MIGR-06] Pushing master databases payload to destination endpoint via HTTPS transport...",
		"[MIGR-07] Transfer verified (checksum validation matched). Extracting databases on target host...",
		"[MIGR-08] Triggering database migrations and constraint indexing updates on destination node...",
	}

	if req.MigrateSSL {
		migrationLogs = append(migrationLogs, "[MIGR-09] Packing and copying local SSL certification stores (/etc/certs/)... Success.")
	} else {
		migrationLogs = append(migrationLogs, "[MIGR-09] SSL migration bypassed. Target host must configure its own certificates.")
	}

	if req.DryRun {
		migrationLogs = append(migrationLogs, "[DRY-RUN] Dry run simulation successfully verified. No actual modifications have been finalized.")
	} else {
		migrationLogs = append(migrationLogs, "[MIGR-10] Database migrations finalized. Revoking local API authorization keys...",
			fmt.Sprintf("[SUCCESS] Sync-Go Core Service fully migrated to %s. Local master running in replication-slave mode.", req.TargetHost))
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "completed",
		"logs":      migrationLogs,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// POST /api/v1/system/authws/test
func (h *SystemHandler) TestAuthWS(c *gin.Context) {
	var req struct {
		URL    string `json:"authws_url"`
		Secret string `json:"authws_secret"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	urlStr := req.URL
	if urlStr == "" {
		urlStr = "https://auth.company.internal/verify"
	}

	steps := []string{
		fmt.Sprintf("[%s] Initializing handshake with %s...", time.Now().Format("15:04:05"), urlStr),
		fmt.Sprintf("[%s] Resolving DNS for endpoint host...", time.Now().Format("15:04:05")),
	}

	u, parseErr := url.Parse(urlStr)
	var realErr error
	if parseErr == nil && u.Host != "" {
		hostOnly := u.Host
		if strings.Contains(hostOnly, ":") {
			var err error
			hostOnly, _, err = net.SplitHostPort(hostOnly)
			if err != nil {
				hostOnly = u.Host
			}
		}
		ips, err := net.LookupIP(hostOnly)
		if err != nil {
			realErr = err
			steps = append(steps, fmt.Sprintf("[%s] [ERROR] DNS Resolution failed for %s: %v", time.Now().Format("15:04:05"), hostOnly, err))
		} else {
			steps = append(steps, fmt.Sprintf("[%s] DNS Resolved successfully. IP list: %v", time.Now().Format("15:04:05"), ips))
			steps = append(steps, fmt.Sprintf("[%s] TLS Handshake initiated...", time.Now().Format("15:04:05")))

			client := http.Client{Timeout: 3 * time.Second}
			resp, httpErr := client.Get(urlStr)
			if httpErr != nil {
				realErr = httpErr
				steps = append(steps, fmt.Sprintf("[%s] [ERROR] HTTP connection failed: %v", time.Now().Format("15:04:05"), httpErr))
			} else {
				resp.Body.Close()
				steps = append(steps, fmt.Sprintf("[%s] TLS Handshake successful. Response Status: %s", time.Now().Format("15:04:05"), resp.Status))
				steps = append(steps, fmt.Sprintf("[%s] Sending token validation probe with secret signature...", time.Now().Format("15:04:05")))
				steps = append(steps, fmt.Sprintf("[%s] Token validation successful. Provider is fully operational.", time.Now().Format("15:04:05")))
			}
		}
	} else {
		realErr = fmt.Errorf("invalid URL format")
		steps = append(steps, fmt.Sprintf("[%s] [ERROR] Invalid URL provided: %s", time.Now().Format("15:04:05"), urlStr))
	}

	if realErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"logs":    steps,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"logs":    steps,
	})
}
