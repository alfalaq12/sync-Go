package config

import (
	"os"
)

type Config struct {
	Port        string
	GRPCPort    string
	DatabaseURL string
	JWTSecret   string
	AgentID     string // used by agent
	MasterAddr  string // used by agent
}

func LoadConfig() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		GRPCPort:    getEnv("GRPC_PORT", "9090"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:B1ntang12!!@localhost:5432/dsp?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "supersecret-dsp-key-change-in-production"),
		AgentID:     getEnv("AGENT_ID", "agent-default"),
		MasterAddr:  getEnv("MASTER_ADDR", "127.0.0.1:9090"),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
