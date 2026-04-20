package metrics

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

type Collector struct {
	db *pgxpool.Pool
}

func NewCollector(db *pgxpool.Pool) *Collector {
	return &Collector{db: db}
}

func (c *Collector) Start(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	log.Println("Metrics Collector started (60s interval)")

	for {
		select {
		case <-ctx.Done():
			log.Println("Metrics Collector stopping...")
			return
		case <-ticker.C:
			c.collect(ctx)
		}
	}
}

func (c *Collector) collect(ctx context.Context) {
	// 1. Collect CPU Usage
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		c.saveMetric(ctx, "master_cpu", cpuPercent[0])
	}

	// 2. Collect RAM Usage
	vMem, err := mem.VirtualMemory()
	if err == nil {
		c.saveMetric(ctx, "master_ram", vMem.UsedPercent)
	}

	// 3. Collect Sync Volume (Total rows uploaded today)
	volume, err := c.getDailySyncVolume(ctx)
	if err == nil {
		c.saveMetric(ctx, "sync_volume", float64(volume))
	}

	// 4. Basic Cleanup - Delete metrics older than 30 days
	c.cleanup(ctx)
}

func (c *Collector) saveMetric(ctx context.Context, metricType string, value float64) {
	_, err := c.db.Exec(ctx, 
		"INSERT INTO S_METRICS (metric_type, value) VALUES ($1, $2)", 
		metricType, value,
	)
	if err != nil {
		log.Printf("Failed to save metric %s: %v", metricType, err)
	}
}

func (c *Collector) getDailySyncVolume(ctx context.Context) (int64, error) {
	var total int64
	// Aggregate total rows_uploaded for today from SD_JOBS
	err := c.db.QueryRow(ctx, 
		"SELECT COALESCE(SUM(rows_uploaded), 0) FROM SD_JOBS WHERE updated_at >= CURRENT_DATE",
	).Scan(&total)
	return total, err
}

func (c *Collector) cleanup(ctx context.Context) {
	// Keep 30 days of data
	_, err := c.db.Exec(ctx, "DELETE FROM S_METRICS WHERE recorded_at < NOW() - INTERVAL '30 days'")
	if err != nil {
		log.Printf("Failed to cleanup metrics: %v", err)
	}
}
