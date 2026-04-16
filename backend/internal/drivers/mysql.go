package drivers

import (
	"database/sql"
	"fmt"
	"strings"
	"context"

	_ "github.com/go-sql-driver/mysql"
)

type MySQLDriver struct{}

func (d *MySQLDriver) getDSN(c ConnectionConfig) string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		c.Username, c.Password, c.Host, c.Port, c.Database)
}

func (d *MySQLDriver) TestConnection(ctx context.Context, c ConnectionConfig) error {
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return err
	}
	defer db.Close()
	return db.Ping()
}

func (d *MySQLDriver) Extract(ctx context.Context, c ConnectionConfig, query string) ([]map[string]interface{}, error) {
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			var val interface{}
			b, ok := values[i].([]byte)
			if ok {
				val = string(b)
			} else {
				val = values[i]
			}
			rowMap[col] = val
		}
		results = append(results, rowMap)
	}

	return results, nil
}

func (d *MySQLDriver) Load(ctx context.Context, c ConnectionConfig, table string, data []map[string]interface{}, truncate bool) (int64, error) {
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return 0, err
	}
	defer db.Close()

	if truncate {
		_, err = db.ExecContext(ctx, fmt.Sprintf("TRUNCATE TABLE %s", table))
		if err != nil {
			return 0, err
		}
	}

	if len(data) == 0 {
		return 0, nil
	}

	columns := []string{}
	for k := range data[0] {
		columns = append(columns, k)
	}

	count := int64(0)
	for _, row := range data {
		placeholders := []string{}
		values := []interface{}{}
		for _, col := range columns {
			placeholders = append(placeholders, "?")
			values = append(values, row[col])
		}

		query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			table, strings.Join(columns, ","), strings.Join(placeholders, ","))

		_, err = db.ExecContext(ctx, query, values...)
		if err != nil {
			return count, err
		}
		count++
	}

	return count, nil
}

func (d *MySQLDriver) ExecuteQuery(ctx context.Context, c ConnectionConfig, query string) error {
	if query == "" {
		return nil
	}
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.ExecContext(ctx, query)
	return err
}

func (d *MySQLDriver) StreamExtract(ctx context.Context, c ConnectionConfig, query string, chunkSize int, handler func(columns []string, chunk [][]any) error) error {
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return err
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return err
	}

	chunk := make([][]any, 0, chunkSize)
	for rows.Next() {
		values := make([]any, len(columns))
		valuePtrs := make([]any, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return err
		}

		// Convert []byte to string for MySQL driver compatibility
		finalValues := make([]any, len(columns))
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				finalValues[i] = string(b)
			} else {
				finalValues[i] = v
			}
		}

		chunk = append(chunk, finalValues)

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

func (d *MySQLDriver) StreamLoad(ctx context.Context, c ConnectionConfig, table string, columns []string, chunk [][]any, upsertKeys []string) (int64, error) {
	if table == "" || len(chunk) == 0 {
		return 0, nil
	}
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return 0, err
	}
	defer db.Close()

	// Build Bulk Insert Query
	// INSERT INTO table (col1, col2) VALUES (?,?), (?,?), ...
	rowPlaceholder := "(" + strings.Repeat("?,", len(columns))
	rowPlaceholder = rowPlaceholder[:len(rowPlaceholder)-1] + ")"
	
	placeholders := make([]string, len(chunk))
	for i := range chunk {
		placeholders[i] = rowPlaceholder
	}

	flatValues := make([]any, 0, len(chunk)*len(columns))
	for _, row := range chunk {
		flatValues = append(flatValues, row...)
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES %s",
		table, strings.Join(columns, ","), strings.Join(placeholders, ","))

	// Handle UPSERT (MySQL: ON DUPLICATE KEY UPDATE)
	if len(upsertKeys) > 0 {
		updateParts := []string{}
		for _, col := range columns {
			isKey := false
			for _, key := range upsertKeys {
				if strings.EqualFold(col, key) {
					isKey = true
					break
				}
			}
			if !isKey {
				// Use VALUES(col) for compatibility with older MySQL versions
				updateParts = append(updateParts, fmt.Sprintf("%s = VALUES(%s)", col, col))
			}
		}
		if len(updateParts) > 0 {
			query += " ON DUPLICATE KEY UPDATE " + strings.Join(updateParts, ", ")
		}
	}

	res, err := db.ExecContext(ctx, query, flatValues...)
	if err != nil {
		return 0, err
	}

	affected, _ := res.RowsAffected()
	return affected, nil
}

func (d *MySQLDriver) TruncateTarget(ctx context.Context, c ConnectionConfig, table string) error {
	db, err := sql.Open("mysql", d.getDSN(c))
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.ExecContext(ctx, fmt.Sprintf("TRUNCATE TABLE %s", table))
	return err
}
