package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"github.com/bintang/remake-dsp-backend/internal/utils"
)

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) {
	if pool == nil {
		log.Println("Skipping migrations: no database connection")
		return
	}

	queries := []string{
		// FORCE RESET (Opsi A) - Comment out to prevent data loss in production
		// `DROP TABLE IF EXISTS JOB_LOG CASCADE`,
		// `DROP TABLE IF EXISTS SD_JOBS CASCADE`,
		// `DROP TABLE IF EXISTS M_SCHEMA_JOBS CASCADE`,
		// `DROP TABLE IF EXISTS M_SCHEMA_DETAILS CASCADE`,
		// `DROP TABLE IF EXISTS M_SCHEMA CASCADE`,
		// `DROP TABLE IF EXISTS M_CREDENTIALS CASCADE`,
		// `DROP TABLE IF EXISTS M_NODE CASCADE`,
		// `DROP TABLE IF EXISTS S_USERS CASCADE`,

		// Users table
		`CREATE TABLE IF NOT EXISTS S_USERS (
			id SERIAL PRIMARY KEY,
			username VARCHAR(100) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(50) DEFAULT 'admin',
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		// Groups
		`CREATE TABLE IF NOT EXISTS M_GROUPS (
			m_group_id SERIAL PRIMARY KEY,
			name VARCHAR(200) UNIQUE NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		// Roles
		`CREATE TABLE IF NOT EXISTS M_ROLES (
			m_role_id SERIAL PRIMARY KEY,
			name VARCHAR(200) UNIQUE NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		// Policies
		`CREATE TABLE IF NOT EXISTS M_POLICIES (
			m_policy_id SERIAL PRIMARY KEY,
			name VARCHAR(200) UNIQUE NOT NULL,
			policy_type VARCHAR(50) DEFAULT 'permission',
			content TEXT,
			description TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		// Credentials - M_CREDENTIALS
		`CREATE TABLE IF NOT EXISTS M_CREDENTIALS (
			m_credential_id SERIAL PRIMARY KEY,
			name VARCHAR(200) UNIQUE NOT NULL,
			username VARCHAR(200),
			password_encrypted TEXT,
			notes TEXT,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		// Nodes - M_NODE
		`CREATE TABLE IF NOT EXISTS M_NODE (
			m_node_id SERIAL PRIMARY KEY,
			node_code VARCHAR(100) UNIQUE NOT NULL,
			node_name VARCHAR(200),
			hostname VARCHAR(100),
			ip_address VARCHAR(50),
			connection_mode VARCHAR(20) DEFAULT 'direct',
			status VARCHAR(20) DEFAULT 'offline',
			notes TEXT,
			bandwidth_limit INT,
			enable_time_sync BOOLEAN DEFAULT true,
			offline_mode BOOLEAN DEFAULT false,
			cloned_node BOOLEAN DEFAULT false,
			agent_version VARCHAR(50),
			owner VARCHAR(100) DEFAULT 'admin',
			is_distributed BOOLEAN DEFAULT false,
			agent_token VARCHAR(255),
			batch_size INT DEFAULT 1000,
			last_connect TIMESTAMP,
			last_seen TIMESTAMP DEFAULT NOW(),
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		// Sync Schemas - M_SCHEMA
		`CREATE TABLE IF NOT EXISTS M_SCHEMA (
			m_schema_id SERIAL PRIMARY KEY,
			name VARCHAR(200) NOT NULL,
			owner VARCHAR(100) DEFAULT 'admin',
			description TEXT,
			notes TEXT,
			status VARCHAR(30) DEFAULT 'active',
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		// Schema Query Rules - M_SCHEMA_DETAILS
		`CREATE TABLE IF NOT EXISTS M_SCHEMA_DETAILS (
			m_schema_details_id SERIAL PRIMARY KEY,
			schema_id INT NOT NULL REFERENCES M_SCHEMA(m_schema_id) ON DELETE CASCADE,
			source_query TEXT,
			target_table VARCHAR(200),
			truncate_before BOOLEAN DEFAULT false,
			batch_size INT DEFAULT 5000,
			extract_pre_query TEXT,
			extract_post_query TEXT,
			upload_pre_query TEXT,
			upload_post_query TEXT,
			sync_method VARCHAR(20) DEFAULT 'INSERT',
			upsert_keys VARCHAR(255),
			incremental_column VARCHAR(100) DEFAULT 'updated_at',
			sort_order INT DEFAULT 0,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		// Sync Networks / Topologies - M_SCHEMA_JOBS
		`CREATE TABLE IF NOT EXISTS M_SCHEMA_JOBS (
			m_schema_job_id SERIAL PRIMARY KEY,
			schema_id INT REFERENCES M_SCHEMA(m_schema_id) ON DELETE SET NULL,
			source_node_id INT REFERENCES M_NODE(m_node_id) ON DELETE SET NULL,
			target_node_id INT REFERENCES M_NODE(m_node_id) ON DELETE SET NULL,
			source_driver VARCHAR(50),
			source_resource_type VARCHAR(50),
			source_host VARCHAR(200),
			source_port INT,
			source_database VARCHAR(200),
			source_username VARCHAR(200),
			source_password VARCHAR(500),
			source_credential_id INT REFERENCES M_CREDENTIALS(m_credential_id) ON DELETE SET NULL,
			source_path VARCHAR(500),
			source_charset VARCHAR(50),
			source_csv_header BOOLEAN DEFAULT false,
			source_csv_separator VARCHAR(10),
			source_csv_extension VARCHAR(20),
			target_driver VARCHAR(50),
			target_resource_type VARCHAR(50),
			target_host VARCHAR(200),
			target_port INT,
			target_database VARCHAR(200),
			target_username VARCHAR(200),
			target_password VARCHAR(500),
			target_credential_id INT REFERENCES M_CREDENTIALS(m_credential_id) ON DELETE SET NULL,
			target_path VARCHAR(500),
			schedule_engine VARCHAR(100),
			cron_expression VARCHAR(100),
			last_sync_value TEXT,
			notes TEXT,
			owner VARCHAR(100) DEFAULT 'admin',
			status VARCHAR(30) DEFAULT 'active',
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		// Jobs - SD_JOBS
		`CREATE TABLE IF NOT EXISTS SD_JOBS (
			id SERIAL PRIMARY KEY,
			st_job_id VARCHAR(100) UNIQUE,
			name VARCHAR(200) NOT NULL,
			network_id INT UNIQUE REFERENCES M_SCHEMA_JOBS(m_schema_job_id) ON DELETE SET NULL,
			schema_id INT REFERENCES M_SCHEMA(m_schema_id) ON DELETE SET NULL,
			source_node_id INT REFERENCES M_NODE(m_node_id),
			target_node_id INT REFERENCES M_NODE(m_node_id),
			job_type VARCHAR(50) DEFAULT 'ETL',
			status VARCHAR(30) DEFAULT 'pending',
			progress INT DEFAULT 0,
			records_processed BIGINT DEFAULT 0,
			records_total BIGINT DEFAULT 0,
			rows_extracted BIGINT DEFAULT 0,
			rows_uploaded BIGINT DEFAULT 0,
			error_message TEXT,
			started_at TIMESTAMP,
			completed_at TIMESTAMP,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		// System Logs - JOB_LOG
		`CREATE TABLE IF NOT EXISTS JOB_LOG (
			id SERIAL PRIMARY KEY,
			node_id INT, -- Refers to m_node_id now
			job_id INT,
			level VARCHAR(10) DEFAULT 'INFO',
			source VARCHAR(100),
			message TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		// Set sequences to start at 1000 for legacy compatibility
		`ALTER SEQUENCE IF EXISTS S_USERS_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS M_NODE_m_node_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS M_SCHEMA_m_schema_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS M_SCHEMA_DETAILS_m_schema_details_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS M_SCHEMA_JOBS_m_schema_job_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS M_CREDENTIALS_m_credential_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS SD_JOBS_id_seq RESTART WITH 1000`,
		`ALTER SEQUENCE IF EXISTS JOB_LOG_id_seq RESTART WITH 1000`,

		// Add missing columns to existing tables for compatibility
		`ALTER TABLE M_NODE ADD COLUMN IF NOT EXISTS node_code VARCHAR(100)`,
		`ALTER TABLE M_NODE ADD COLUMN IF NOT EXISTS node_name VARCHAR(200)`,
		`ALTER TABLE M_NODE ADD COLUMN IF NOT EXISTS connection_mode VARCHAR(20) DEFAULT 'direct'`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_m_node_node_code ON M_NODE(node_code)`,

		`ALTER TABLE SD_JOBS ADD COLUMN IF NOT EXISTS st_job_id VARCHAR(100)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_sd_jobs_st_job_id ON SD_JOBS(st_job_id)`,

		// Credentials migration support
		`ALTER TABLE M_SCHEMA_JOBS ADD COLUMN IF NOT EXISTS source_credential_id INT REFERENCES M_CREDENTIALS(m_credential_id) ON DELETE SET NULL`,
		`ALTER TABLE M_SCHEMA_JOBS ADD COLUMN IF NOT EXISTS target_credential_id INT REFERENCES M_CREDENTIALS(m_credential_id) ON DELETE SET NULL`,
		`ALTER TABLE M_SCHEMA_JOBS ADD COLUMN IF NOT EXISTS cron_expression VARCHAR(100)`,
		`ALTER TABLE M_SCHEMA_JOBS ADD COLUMN IF NOT EXISTS last_sync_value TEXT`,
		`ALTER TABLE M_SCHEMA_DETAILS ADD COLUMN IF NOT EXISTS sync_method VARCHAR(20) DEFAULT 'INSERT'`,
		`ALTER TABLE M_SCHEMA_DETAILS ADD COLUMN IF NOT EXISTS upsert_keys VARCHAR(255)`,
		`ALTER TABLE M_SCHEMA_DETAILS ADD COLUMN IF NOT EXISTS incremental_column VARCHAR(100) DEFAULT 'updated_at'`,
		
		// Distributed Agent Columns
		`ALTER TABLE M_NODE ADD COLUMN IF NOT EXISTS is_distributed BOOLEAN DEFAULT false`,
		`ALTER TABLE M_NODE ADD COLUMN IF NOT EXISTS agent_token VARCHAR(255)`,
		`ALTER TABLE M_NODE ADD COLUMN IF NOT EXISTS batch_size INT DEFAULT 1000`,
	}

	for _, q := range queries {
		log.Printf("Executing migration: %s", q)
		_, err := pool.Exec(ctx, q)
		if err != nil {
			log.Printf("Migration error on [%s]: %v", q, err)
		} else {
			log.Printf("Migration successful: %s", q)
		}
	}

	// Seed default data
	seedDefaultData(ctx, pool)
	
	// Migrate existing passwords to centralized credentials
	migrateExistingCredentials(ctx, pool)

	// 3. Fix Sequences (Prevent SQLSTATE 23505 if IDs get out of sync)
	_, _ = pool.Exec(ctx, "SELECT setval('job_log_id_seq', (SELECT COALESCE(MAX(id), 1) FROM JOB_LOG))")

	log.Println("Database migrations completed successfully.")
}

func seedDefaultData(ctx context.Context, pool *pgxpool.Pool) {
	// 1. Master Node
	var nodeCount int
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM M_NODE WHERE node_code = 'MASTER'").Scan(&nodeCount)
	if err == nil && nodeCount == 0 {
		_, err = pool.Exec(ctx, "ALTER SEQUENCE IF EXISTS M_NODE_m_node_id_seq RESTART WITH 1000")
		_, err = pool.Exec(ctx, `
			INSERT INTO M_NODE (node_code, node_name, connection_mode, status, notes)
			VALUES ('MASTER', 'MASTER HOST', 'direct', 'online', 'Primary Master Synchronization Node')
		`)
		if err == nil {
			log.Println("Master node (1000 - MASTER HOST) seeded.")
		}
	}

	// 2. Admin User
	var userCount int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM S_USERS WHERE username = 'admin'").Scan(&userCount)
	if err == nil && userCount == 0 {
		_, err = pool.Exec(ctx, "ALTER SEQUENCE IF EXISTS S_USERS_id_seq RESTART WITH 1000")
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		_, err = pool.Exec(ctx, "INSERT INTO S_USERS (username, password_hash, role) VALUES ($1, $2, $3)", "admin", string(hash), "admin")
		if err == nil {
			log.Println("Default admin user created (admin/admin123) with ID 1000")
		}
	}

	// 3. Groups & Roles (Left empty by default so clients can configure their own)
}

func migrateExistingCredentials(ctx context.Context, pool *pgxpool.Pool) {
	log.Println("Starting password-to-credential migration...")

	// 1. Fetch all unique (host, username, password) from M_SCHEMA_JOBS
	rows, err := pool.Query(ctx, `
		SELECT DISTINCT source_host, source_username, source_password FROM M_SCHEMA_JOBS WHERE source_password IS NOT NULL AND source_password != ''
		UNION
		SELECT DISTINCT target_host, target_username, target_password FROM M_SCHEMA_JOBS WHERE target_password IS NOT NULL AND target_password != ''
	`)
	if err != nil {
		log.Printf("Migration failed to fetch unique credentials: %v", err)
		return
	}
	defer rows.Close()

	type cred struct {
		host, user, pass string
	}
	var creds []cred
	for rows.Next() {
		var c cred
		if err := rows.Scan(&c.host, &c.user, &c.pass); err == nil {
			creds = append(creds, c)
		}
	}

	for _, c := range creds {
		encryptedBody, err := utils.Encrypt(c.pass)
		if err != nil {
			log.Printf("Encryption failed for cred %s@%s: %v", c.user, c.host, err)
			continue
		}

		credName := fmt.Sprintf("AutoImported_%s@%s", c.user, c.host)
		
		var credID int
		err = pool.QueryRow(ctx, `
			INSERT INTO M_CREDENTIALS (name, username, password_encrypted, notes)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (name) DO UPDATE SET password_encrypted = EXCLUDED.password_encrypted
			RETURNING m_credential_id
		`, credName, c.user, encryptedBody, "Automatically migrated from job configurations").Scan(&credID)

		if err != nil {
			log.Printf("Failed to insert/update credential %s: %v", credName, err)
			continue
		}

		// Update M_SCHEMA_JOBS that match this host/user/pass
		_, _ = pool.Exec(ctx, `
			UPDATE M_SCHEMA_JOBS 
			SET source_credential_id = $1 
			WHERE source_host = $2 AND source_username = $3 AND source_password = $4 AND source_credential_id IS NULL
		`, credID, c.host, c.user, c.pass)

		_, _ = pool.Exec(ctx, `
			UPDATE M_SCHEMA_JOBS 
			SET target_credential_id = $1 
			WHERE target_host = $2 AND target_username = $3 AND target_password = $4 AND target_credential_id IS NULL
		`, credID, c.host, c.user, c.pass)
	}

	log.Println("Credential migration completed.")
}
