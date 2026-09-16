package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
)

// AppConfig adalah satu-satunya sumber kebenaran konfigurasi aplikasi.
// Semua os.Getenv() dikumpulkan di sini — tidak ada lagi pemanggilan
// os.Getenv() tersebar di seluruh codebase.
//
// Pola ini (centralized config struct) adalah standar Go industri:
// - Mudah ditest (inject mock config)
// - Mudah di-audit (satu file = semua konfigurasi)
// - Fail-fast: validasi saat startup, bukan saat runtime
type AppConfig struct {
	// ── Server ────────────────────────────────────────
	Port    string
	Env     string
	AppURL  string
	IsProd  bool

	// ── Database ──────────────────────────────────────
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBMaxOpen  int
	DBMaxIdle  int

	// ── JWT ───────────────────────────────────────────
	JWTSecret        string
	JWTAccessExpire  time.Duration
	JWTRefreshExpire time.Duration

	// ── MinIO ─────────────────────────────────────────
	MinIOEndpoint  string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOBucket    string
	MinIOUseSSL    bool

	// ── SMTP ──────────────────────────────────────────
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	// ── CORS ──────────────────────────────────────────
	CORSExtraOrigins []string

	// ── Rate limiting ──────────────────────────────────
	LoginMaxAttempts int
	LoginWindowSec   int
}

// Load membaca env vars, validasi, dan mengembalikan AppConfig.
// Panggil sekali di main(), lalu inject ke seluruh aplikasi.
func Load() (*AppConfig, error) {
	cfg := &AppConfig{
		// ── Server
		Port:   getEnv("PORT", "8080"),
		Env:    getEnv("APP_ENV", "development"),
		AppURL: getEnv("APP_URL", "http://localhost:3000"),

		// ── Database
		DBHost:     requireEnv("DB_HOST"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     requireEnv("DB_USER"),
		DBPassword: requireEnv("DB_PASSWORD"),
		DBName:     requireEnv("DB_NAME"),
		DBMaxOpen:  getEnvInt("DB_MAX_OPEN", 25),
		DBMaxIdle:  getEnvInt("DB_MAX_IDLE", 10),

		// ── JWT
		JWTSecret: requireEnv("JWT_SECRET"),

		// ── MinIO
		MinIOEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinIOBucket:    getEnv("MINIO_BUCKET", "pusri-documents"),
		MinIOUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",

		// ── SMTP
		SMTPHost: getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort: getEnvInt("SMTP_PORT", 587),
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASS", ""),
		SMTPFrom: getEnv("SMTP_FROM", ""),

		// ── Rate limiting
		LoginMaxAttempts: getEnvInt("LOGIN_MAX_ATTEMPTS", 10),
		LoginWindowSec:   getEnvInt("LOGIN_WINDOW_SEC", 60),
	}

	cfg.IsProd = cfg.Env == "production"

	// SSL mode database
	if cfg.IsProd {
		cfg.DBSSLMode = getEnv("DB_SSL_MODE", "require")
	} else {
		cfg.DBSSLMode = getEnv("DB_SSL_MODE", "disable")
	}

	// JWT durations
	var err error
	accessExpire := getEnv("JWT_ACCESS_EXPIRE", "15m")
	if cfg.JWTAccessExpire, err = time.ParseDuration(accessExpire); err != nil {
		return nil, fmt.Errorf("JWT_ACCESS_EXPIRE tidak valid: %w", err)
	}
	refreshExpire := getEnv("JWT_REFRESH_EXPIRE", "168h")
	if cfg.JWTRefreshExpire, err = time.ParseDuration(refreshExpire); err != nil {
		return nil, fmt.Errorf("JWT_REFRESH_EXPIRE tidak valid: %w", err)
	}

	// Validasi keamanan
	if len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET terlalu pendek (minimum 32 karakter, saat ini %d)", len(cfg.JWTSecret))
	}
	if cfg.IsProd && cfg.AppURL == "http://localhost:3000" {
		log.Println("[WARN] APP_URL masih localhost di environment production")
	}

	// CORS extra origins
	extra := getEnv("CORS_EXTRA_ORIGINS", "")
	if extra != "" {
		for _, o := range splitTrim(extra, ",") {
			if o != "" {
				cfg.CORSExtraOrigins = append(cfg.CORSExtraOrigins, o)
			}
		}
	}

	return cfg, nil
}

// DSN membangun PostgreSQL connection string dari config.
func (c *AppConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort, c.DBSSLMode,
	)
}

// AllowedOrigins mengembalikan semua origin yang diizinkan untuk CORS dan WebSocket.
func (c *AppConfig) AllowedOrigins() []string {
	defaults := []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"http://127.0.0.1:3000",
	}
	seen := make(map[string]bool)
	var result []string
	for _, o := range append(defaults, append([]string{c.AppURL}, c.CORSExtraOrigins...)...) {
		if o != "" && !seen[o] {
			seen[o] = true
			result = append(result, o)
		}
	}
	return result
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("[STARTUP] Environment variable '%s' wajib diisi — periksa file .env", key)
	}
	return v
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func splitTrim(s, sep string) []string {
	var result []string
	for _, part := range splitByRune(s, []rune(sep)[0]) {
		trimmed := trimSpace(part)
		result = append(result, trimmed)
	}
	return result
}

func splitByRune(s string, r rune) []string {
	var parts []string
	start := 0
	for i, c := range s {
		if c == r {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	return append(parts, s[start:])
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
