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

	// mTLS Configuration
	TLSEnabled  bool
	TLSCertPath string
	TLSKeyPath  string
	TLSCAPath   string
}

func LoadConfig() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		GRPCPort:    getEnv("GRPC_PORT", "9090"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:B1ntang12!!@localhost:5432/dsp?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "supersecret-dsp-key-change-in-production"),
		AgentID:     getEnv("AGENT_ID", "agent-default"),
		MasterAddr:  getEnv("MASTER_ADDR", "127.0.0.1:9090"),

		TLSEnabled:  getEnv("TLS_ENABLED", "true") == "true",
		TLSCertPath: findCertPath(getEnv("TLS_CERT_PATH", "certs/server.crt")),
		TLSKeyPath:  findCertPath(getEnv("TLS_KEY_PATH", "certs/server.key")),
		TLSCAPath:   findCertPath(getEnv("TLS_CA_PATH", "certs/ca.crt")),
	}
}

func findCertPath(defaultPath string) string {
	// If path exists as is, return it
	if _, err := os.Stat(defaultPath); err == nil {
		return defaultPath
	}
	// Fallback to ../certs if we are inside backend/
	fallbackPath := "../" + defaultPath
	if _, err := os.Stat(fallbackPath); err == nil {
		return fallbackPath
	}
	return defaultPath
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
