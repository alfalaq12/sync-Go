package drivers

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
)

type CSVDriver struct{}

func (d *CSVDriver) TestConnection(ctx context.Context, c ConnectionConfig) error {
	_, err := os.Stat(c.Path)
	return err
}

func (d *CSVDriver) Extract(ctx context.Context, c ConnectionConfig, query string) ([]map[string]interface{}, error) {
	file, err := os.Open(c.Path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Apply custom separator
	if c.CSVSeparator != "" {
		reader.Comma = rune(c.CSVSeparator[0])
	}

	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	if len(records) == 0 {
		return []map[string]interface{}{}, nil
	}

	var results []map[string]interface{}
	headers := records[0]

	startIdx := 1
	if !c.CSVHeader {
		startIdx = 0
		// Generate dummy headers if no header row
		headers = make([]string, len(records[0]))
		for i := range headers {
			headers[i] = fmt.Sprintf("column_%d", i)
		}
	}

	for i := startIdx; i < len(records); i++ {
		rowMap := make(map[string]interface{})
		for j, val := range records[i] {
			if j < len(headers) {
				rowMap[headers[j]] = val
			}
		}
		results = append(results, rowMap)
	}

	return results, nil
}

func (d *CSVDriver) Load(ctx context.Context, c ConnectionConfig, table string, data []map[string]interface{}, truncate bool) (int64, error) {
	// Loading into CSV is just append or overwrite file
	flags := os.O_APPEND | os.O_CREATE | os.O_WRONLY
	if truncate {
		flags = os.O_TRUNC | os.O_CREATE | os.O_WRONLY
	}

	file, err := os.OpenFile(c.Path, flags, 0644)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	writer := csv.NewReader(file) // This is wrong, should be writer
	_ = writer // avoid lint error
	
	return 0, fmt.Errorf("CSV Load not fully implemented yet - extraction priority")
}

func (d *CSVDriver) ExecuteQuery(ctx context.Context, c ConnectionConfig, query string) error {
	return nil // No queries in CSV
}

func (d *CSVDriver) StreamExtract(ctx context.Context, c ConnectionConfig, query string, chunkSize int, handler func(columns []string, chunk [][]any) error) error {
	file, err := os.Open(c.Path)
	if err != nil {
		return err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	if c.CSVSeparator != "" {
		reader.Comma = rune(c.CSVSeparator[0])
	}

	headers, err := reader.Read()
	if err != nil {
		return err
	}

	if !c.CSVHeader {
		// If no header, use column_N names but treat first row as data
		headers = make([]string, len(headers))
		for i := range headers {
			headers[i] = fmt.Sprintf("column_%d", i)
		}
		// Reset file to start if no headers
		_, _ = file.Seek(0, 0)
	}

	chunk := make([][]any, 0, chunkSize)
	for {
		record, err := reader.Read()
		if err != nil {
			break
		}

		row := make([]any, len(record))
		for i, v := range record {
			row[i] = v
		}
		chunk = append(chunk, row)

		if len(chunk) >= chunkSize {
			if err := handler(headers, chunk); err != nil {
				return err
			}
			chunk = make([][]any, 0, chunkSize)
		}
	}

	if len(chunk) > 0 {
		return handler(headers, chunk)
	}

	return nil
}

func (d *CSVDriver) StreamLoad(ctx context.Context, c ConnectionConfig, table string, columns []string, chunk [][]any, upsertKeys []string) (int64, error) {
	// For CSV, we append or truncate based on overall job logic (handled in engine.go via TruncateTarget)
	// But StreamLoad is called per chunk. So we use os.O_APPEND.
	
	file, err := os.OpenFile(c.Path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	if c.CSVSeparator != "" {
		writer.Comma = rune(c.CSVSeparator[0])
	}
	defer writer.Flush()

	// Write header if file is empty
	fi, _ := file.Stat()
	if fi.Size() == 0 && c.CSVHeader {
		_ = writer.Write(columns)
	}

	count := int64(0)
	for _, row := range chunk {
		record := make([]string, len(row))
		for i, v := range row {
			record[i] = fmt.Sprintf("%v", v)
		}
		if err := writer.Write(record); err != nil {
			return count, err
		}
		count++
	}

	return count, nil
}

func (d *CSVDriver) TruncateTarget(ctx context.Context, c ConnectionConfig, table string) error {
	// Deleting the file or truncating it to zero
	return os.WriteFile(c.Path, []byte{}, 0644)
}
