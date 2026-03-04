package config

import "os"

type Config struct {
	Port             string
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	RedisHost        string
	RedisPort        string
	RedisPassword    string
	JWTSecret        string
	JWTAccessExpiry  string
	JWTRefreshExpiry string
	SessionTimeout   string
}

func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8001"),
		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnv("POSTGRES_PORT", "5432"),
		PostgresUser:     getEnv("POSTGRES_USER", "edulms"),
		PostgresPassword: getEnv("POSTGRES_PASSWORD", "edulms_secret"),
		PostgresDB:       getEnv("POSTGRES_DB", "edulms"),
		RedisHost:        getEnv("REDIS_HOST", "localhost"),
		RedisPort:        getEnv("REDIS_PORT", "6379"),
		RedisPassword:    getEnv("REDIS_PASSWORD", ""),
		JWTSecret:        getEnv("JWT_SECRET", "default-secret"),
		JWTAccessExpiry:  getEnv("JWT_ACCESS_EXPIRY", "15m"),
		JWTRefreshExpiry: getEnv("JWT_REFRESH_EXPIRY", "168h"),
		SessionTimeout:   getEnv("SESSION_TIMEOUT", "30m"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
