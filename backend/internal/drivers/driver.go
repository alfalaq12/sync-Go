package drivers

import (
	"context"
)

// ConnectionConfig holds all possible fields for different drivers
type ConnectionConfig struct {
	Driver       string
	Host         string
	Port         int
	Database     string
	Username     string
	Password     string
	Path         string // For CSV/FTP
	ResourceType string 
	Charset      string
	CSVHeader    bool
	CSVSeparator string
}

// Driver is the interface that all database/file connectors must implement
type Driver interface {
	// TestConnection verifies if the credentials work
	TestConnection(ctx context.Context, config ConnectionConfig) error
	
	// Extract pulls data from source based on a query
	Extract(ctx context.Context, config ConnectionConfig, query string) ([]map[string]interface{}, error)
	
	// Load pushes data into target table
	// returns number of rows affected
	Load(ctx context.Context, config ConnectionConfig, table string, data []map[string]interface{}, truncate bool) (int64, error)
	
	// ExecuteQuery runs a command without returning rows (pre/post queries)
	ExecuteQuery(ctx context.Context, config ConnectionConfig, query string) error
	// StreamExtract pulls data and sends chunks of rows to a handler function to avoid out-of-memory errors on large datasets.
	StreamExtract(ctx context.Context, config ConnectionConfig, query string, chunkSize int, handler func(columns []string, chunk [][]any) error) error

	// StreamLoad pushes a chunk of data into a target table efficiently using bulk inserts.
	// if upsertKeys is provided, it performs an UPSERT instead of a simple INSERT.
	StreamLoad(ctx context.Context, config ConnectionConfig, table string, columns []string, chunk [][]any, upsertKeys []string) (int64, error)

	// TruncateTarget efficiently clears the target table before a fresh load.
	TruncateTarget(ctx context.Context, config ConnectionConfig, table string) error
}
