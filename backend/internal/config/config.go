package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort             string
	AppEnv              string
	PostgresURL         string
	PostgresMaxConns    int
	PostgresMinConns    int
	RedisURL            string
	RedisPoolSize       int
	JWTSecret           string
	JWTExpiration       time.Duration
	WorkerBatchSize     int
	WorkerFlushInterval time.Duration
}

func LoadConfig() *Config {
	_ = godotenv.Load() // optional .env file

	return &Config{
		AppPort:             getEnv("APP_PORT", "8080"),
		AppEnv:              getEnv("APP_ENV", "production"),
		PostgresURL:         getEnv("POSTGRES_URL", "postgres://cbt_user:cbt_pass@localhost:5432/cbt_db?sslmode=disable"),
		PostgresMaxConns:    getEnvAsInt("POSTGRES_MAX_CONNS", 100),
		PostgresMinConns:    getEnvAsInt("POSTGRES_MIN_CONNS", 10),
		RedisURL:            getEnv("REDIS_URL", "localhost:6379"),
		RedisPoolSize:       getEnvAsInt("REDIS_POOL_SIZE", 300),
		JWTSecret:           getEnv("JWT_SECRET", "super-cbt-secret-key-high-concurrency-2026"),
		JWTExpiration:       time.Duration(getEnvAsInt("JWT_EXPIRATION_HOURS", 24)) * time.Hour,
		WorkerBatchSize:     getEnvAsInt("WORKER_BATCH_SIZE", 500),
		WorkerFlushInterval: time.Duration(getEnvAsInt("WORKER_FLUSH_INTERVAL_MS", 2000)) * time.Millisecond,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}
