package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsHandler struct {
	db *pgxpool.Pool
}

func NewStatsHandler(db *pgxpool.Pool) *StatsHandler {
	return &StatsHandler{db: db}
}

type MetricPoint struct {
	Time  string  `json:"time"`
	Value float64 `json:"value"`
}

type MultiMetricPoint struct {
	Time string  `json:"time"`
	Cpu  float64 `json:"cpu"`
	Ram  float64 `json:"ram"`
}

func (h *StatsHandler) GetMetrics(c *gin.Context) {
	timeRange := c.DefaultQuery("range", "24h")
	
	var interval string
	var limit int
	
	switch timeRange {
	case "7d":
		interval = "4 hours"
		limit = 42 // (7 * 24) / 4
	case "30d":
		interval = "1 day"
		limit = 30
	default: // 24h
		interval = "15 minutes"
		limit = 96 // (24 * 60) / 15
	}

	// Query for CPU and RAM grouped by interval
	query := fmt.Sprintf(`
		WITH time_slots AS (
			SELECT generate_series(
				NOW() - INTERVAL '%s', 
				NOW(), 
				INTERVAL '%s'
			) AS slot
		)
		SELECT 
			TO_CHAR(ts.slot, 'HH24:MI') as time_label,
			COALESCE(AVG(CASE WHEN m.metric_type = 'master_cpu' THEN m.value END), 0) as cpu,
			COALESCE(AVG(CASE WHEN m.metric_type = 'master_ram' THEN m.value END), 0) as ram
		FROM time_slots ts
		LEFT JOIN S_METRICS m ON m.recorded_at >= ts.slot AND m.recorded_at < ts.slot + INTERVAL '%s'
		GROUP BY ts.slot
		ORDER BY ts.slot ASC
		LIMIT %d
	`, timeRange, interval, interval, limit)

	rows, err := h.db.Query(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metrics"})
		return
	}
	defer rows.Close()

	var results []MultiMetricPoint
	for rows.Next() {
		var p MultiMetricPoint
		if err := rows.Scan(&p.Time, &p.Cpu, &p.Ram); err == nil {
			results = append(results, p)
		}
	}

	c.JSON(http.StatusOK, results)
}

func (h *StatsHandler) GetVolumeStats(c *gin.Context) {
	timeRange := c.DefaultQuery("range", "30d")
	
	var groupFormat string
	var interval string
	
	switch timeRange {
	case "24h":
		groupFormat = "HH24:00"
		interval = "24 hours"
	case "7d":
		groupFormat = "Dy"
		interval = "7 days"
	default: // 30d
		groupFormat = "DD"
		interval = "30 days"
	}

	query := fmt.Sprintf(`
		WITH time_series AS (
			SELECT generate_series(
				CURRENT_DATE - INTERVAL '%s' + INTERVAL '1 day', 
				CURRENT_DATE, 
				INTERVAL '1 day'
			) AS day
		)
		SELECT 
			TO_CHAR(ts.day, '%s') as label,
			COALESCE(SUM(m.value), 0) as volume
		FROM time_series ts
		LEFT JOIN S_METRICS m ON m.metric_type = 'sync_volume' 
			AND m.recorded_at::date = ts.day::date
		GROUP BY ts.day
		ORDER BY ts.day ASC
	`, interval, groupFormat)

	rows, err := h.db.Query(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch volume stats"})
		return
	}
	defer rows.Close()

	var results []gin.H
	for rows.Next() {
		var label string
		var volume float64
		if err := rows.Scan(&label, &volume); err == nil {
			// Estimation: 1 row = 0.001 MB (1 KB)
			// So total MB = rows * 0.001
			results = append(results, gin.H{
				"day": label,
				"volume": volume * 0.001, // Convert to MB
			})
		}
	}

	c.JSON(http.StatusOK, results)
}
