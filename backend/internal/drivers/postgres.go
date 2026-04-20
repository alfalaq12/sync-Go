package drivers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"net/url"
)

type PostgresDriver struct{}

func (d *PostgresDriver) getConnString(c ConnectionConfig) string {
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(c.Username, c.Password),
		Host:   fmt.Sprintf("%s:%d", c.Host, c.Port),
		Path:   c.Database,
		RawQuery: "sslmode=disable",
	}
	return u.String()
}

func (d *PostgresDriver) TestConnection(ctx context.Context, c ConnectionConfig) error {
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	return conn.Ping(ctx)
}

func (d *PostgresDriver) Extract(ctx context.Context, c ConnectionConfig, query string) ([]map[string]interface{}, error) {
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return nil, err
	}
	defer conn.Close(ctx)

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescriptions := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}

		rowMap := make(map[string]interface{})
		for i, fd := range fieldDescriptions {
			rowMap[string(fd.Name)] = values[i]
		}
		results = append(results, rowMap)
	}

	return results, nil
}

func (d *PostgresDriver) Load(ctx context.Context, c ConnectionConfig, table string, data []map[string]interface{}, truncate bool) (int64, error) {
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return 0, err
	}
	defer conn.Close(ctx)

	if truncate && table != "" {
		_, err = conn.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", pgx.Identifier{table}.Sanitize()))
		if err != nil {
			return 0, fmt.Errorf("truncate failed: %v", err)
		}
	}

	if len(data) == 0 {
		return 0, nil
	}

	// Dynamic Insert Builder
	columns := []string{}
	for k := range data[0] {
		columns = append(columns, k)
	}

	count := int64(0)
	for _, row := range data {
		placeholders := []string{}
		values := []interface{}{}
		for i, col := range columns {
			placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
			values = append(values, row[col])
		}

		query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			table, strings.Join(columns, ","), strings.Join(placeholders, ","))

		_, err = conn.Exec(ctx, query, values...)
		if err != nil {
			// Continue on error for other rows, or stop?
			// For now, stop and report.
			return count, err
		}
		count++
	}

	return count, nil
}

func (d *PostgresDriver) ExecuteQuery(ctx context.Context, c ConnectionConfig, query string) error {
	if query == "" {
		return nil
	}
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	_, err = conn.Exec(ctx, query)
	return err
}

func (d *PostgresDriver) StreamExtract(ctx context.Context, c ConnectionConfig, query string, chunkSize int, handler func(columns []string, chunk [][]any) error) error {
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	fieldDescriptions := rows.FieldDescriptions()
	var columns []string
	for _, fd := range fieldDescriptions {
		columns = append(columns, string(fd.Name))
	}

	var chunk [][]any
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return err
		}

		rowCopy := make([]any, len(values))
		copy(rowCopy, values)

		chunk = append(chunk, rowCopy)

		if len(chunk) >= chunkSize {
			if err := handler(columns, chunk); err != nil {
				return err
			}
			chunk = make([][]any, 0, chunkSize)
		}
	}

	if len(chunk) > 0 {
		return handler(columns, chunk)
	}

	return rows.Err()
}

func (d *PostgresDriver) StreamLoad(ctx context.Context, c ConnectionConfig, table string, columns []string, chunk [][]any, upsertKeys []string) (int64, error) {
	if table == "" {
		return 0, nil
	}
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return 0, err
	}
	defer conn.Close(ctx)

	// If no upsert keys, use standard CopyFrom for maximum performance
	if len(upsertKeys) == 0 {
		copyCount, err := conn.CopyFrom(
			ctx,
			pgx.Identifier{table},
			columns,
			pgx.CopyFromRows(chunk),
		)
		return copyCount, err
	}

	// ADVANCED UPSERT LOGIC (Senior Engineer Implementation)
	// We use a temporary table and then a merge-insert to handle conflicts.
	tx, err := conn.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to start upsert transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	// Temporary table for staging
	tempTable := fmt.Sprintf("stg_%s_%d", table, time.Now().UnixNano()%10000)
	sanitizedTable := pgx.Identifier{table}.Sanitize()
	sanitizedTemp := pgx.Identifier{tempTable}.Sanitize()

	// 1. Create temp table with same schema as target
	_, err = tx.Exec(ctx, fmt.Sprintf("CREATE TEMPORARY TABLE %s (LIKE %s INCLUDING DEFAULTS) ON COMMIT DROP", sanitizedTemp, sanitizedTable))
	if err != nil {
		return 0, fmt.Errorf("failed to create staging table: %v", err)
	}

	// 2. Data ingest to temp table
	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{tempTable},
		columns,
		pgx.CopyFromRows(chunk),
	)
	if err != nil {
		return 0, fmt.Errorf("failed to ingest into staging table: %v", err)
	}

	// 3. Build ON CONFLICT query
	updateSets := []string{}
	for _, col := range columns {
		isKey := false
		for _, key := range upsertKeys {
			if strings.EqualFold(col, key) {
				isKey = true
				break
			}
		}
		if !isKey {
			updateSets = append(updateSets, fmt.Sprintf("%s = EXCLUDED.%s", col, col))
		}
	}

	upsertQuery := fmt.Sprintf(
		"INSERT INTO %s (%s) SELECT %s FROM %s ON CONFLICT (%s) DO ",
		sanitizedTable,
		strings.Join(columns, ", "),
		strings.Join(columns, ", "),
		sanitizedTemp,
		strings.Join(upsertKeys, ", "),
	)

	if len(updateSets) > 0 {
		upsertQuery += "UPDATE SET " + strings.Join(updateSets, ", ")
	} else {
		upsertQuery += "NOTHING"
	}

	tag, err := tx.Exec(ctx, upsertQuery)
	if err != nil {
		return 0, fmt.Errorf("upsert operation failed: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit upsert: %v", err)
	}

	return tag.RowsAffected(), nil
}

func (d *PostgresDriver) TruncateTarget(ctx context.Context, c ConnectionConfig, table string) error {
	if table == "" {
		return fmt.Errorf("cannot truncate: table name is empty")
	}
	conn, err := pgx.Connect(ctx, d.getConnString(c))
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	_, err = conn.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", pgx.Identifier{table}.Sanitize()))
	return err
}
