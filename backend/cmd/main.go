package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"pusri-backend/internal/config"
	"pusri-backend/internal/middleware"
	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"
	"pusri-backend/internal/routes"
	"pusri-backend/internal/services"
	"pusri-backend/pkg/database"
	"pusri-backend/pkg/email"
	"pusri-backend/pkg/storage"
	ws "pusri-backend/pkg/websocket"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// ── 1. Load env file (opsional — bisa juga lewat env sistem)
	if err := godotenv.Load(); err != nil {
		log.Println("[STARTUP] .env tidak ditemukan, pakai env sistem")
	}

	// ── 2. Load & validasi konfigurasi (fail-fast jika ada yang kurang)
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[STARTUP] Konfigurasi tidak valid: %v", err)
	}
	log.Printf("[STARTUP] env=%s | port=%s | appURL=%s", cfg.Env, cfg.Port, cfg.AppURL)

	// ── 3. Koneksi database
	database.Connect(cfg)

	// ── 4. AutoMigrate model
	db := database.Get()
	if err := db.AutoMigrate(
		&models.User{},
		&models.Document{},
		&models.DocumentVersion{},
		&models.RevisionHistory{},
		&models.Notification{},
		&models.Annotation{},
	); err != nil {
		log.Fatalf("[STARTUP] AutoMigrate gagal: %v", err)
	}
	log.Println("[STARTUP] AutoMigrate selesai")

	// ── 5. Inisialisasi storage dan services eksternal
	storage.InitMinio(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey,
		cfg.MinIOBucket, cfg.MinIOUseSSL)
	email.Init(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)

	// ── 6. WebSocket hub
	go ws.GetHub().Run()

	// ── 7. Bangun semua dependency secara eksplisit (Dependency Injection)
	//       Urutan: repository → service → handler → route
	//       Tidak ada lagi inisialisasi tersembunyi di dalam konstruktor.
	userRepo := repository.NewUserRepository(db)
	docRepo  := repository.NewDocumentRepository(db)
	annRepo  := repository.NewAnnotationRepository(db)

	authSvc := services.NewAuthService(userRepo, cfg)
	docSvc  := services.NewDocumentService(docRepo, userRepo, cfg)
	annSvc  := services.NewAnnotationService(annRepo, docRepo)

	// Inisialisasi singleton di middleware (hanya dipanggil sekali)
	middleware.InitAuthMiddleware(userRepo)
	// WebSocket origin whitelist dari config
	ws.InitAllowedOrigins(cfg.AllowedOrigins())

	// ── 8. Setup Gin engine
	if cfg.IsProd {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	allowedOrigins := cfg.AllowedOrigins()
	log.Printf("[STARTUP] CORS allowed origins: %v", allowedOrigins)

	r.Use(securityHeaders(cfg.IsProd))
	r.Use(corsMiddleware(allowedOrigins))

	r.GET("/ws", ws.NewHandleWebSocket(cfg.JWTSecret))

	// ── 9. Pasang semua route dengan dependency lengkap
	routes.SetupRoutes(r,
		loginRateLimiter(cfg.LoginMaxAttempts, time.Duration(cfg.LoginWindowSec)*time.Second),
		authSvc, docSvc, annSvc,
		userRepo, docRepo,
		&jwtSecretProvider{secret: cfg.JWTSecret},
	)

	// ── 10. Jalankan server
	log.Printf("[STARTUP] Server siap di http://0.0.0.0:%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("[STARTUP] Server gagal: %v", err)
	}
}

// ─── jwtSecretProvider memenuhi interface yang diharapkan routes.SetupRoutes ──

type jwtSecretProvider struct{ secret string }

func (p *jwtSecretProvider) JWTSecret() string { return p.secret }

// ─── Rate limiter ─────────────────────────────────────────────────────────────

type rateBucket struct {
	count   int
	resetAt time.Time
	mu      sync.Mutex
}

func loginRateLimiter(maxAttempts int, window time.Duration) gin.HandlerFunc {
	buckets := make(map[string]*rateBucket)
	var mu sync.Mutex

	// Goroutine cleanup bucket kadaluarsa setiap 5 menit
	go func() {
		for range time.Tick(5 * time.Minute) {
			mu.Lock()
			now := time.Now()
			for ip, b := range buckets {
				b.mu.Lock()
				if now.After(b.resetAt) {
					delete(buckets, ip)
				}
				b.mu.Unlock()
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		mu.Lock()
		b, ok := buckets[ip]
		if !ok {
			b = &rateBucket{resetAt: time.Now().Add(window)}
			buckets[ip] = b
		}
		mu.Unlock()

		b.mu.Lock()
		defer b.mu.Unlock()

		if time.Now().After(b.resetAt) {
			b.count = 0
			b.resetAt = time.Now().Add(window)
		}
		if b.count >= maxAttempts {
			retryAfter := int(time.Until(b.resetAt).Seconds()) + 1
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Terlalu banyak percobaan login. Coba lagi dalam 1 menit.",
			})
			c.Abort()
			return
		}
		b.count++
		c.Next()
	}
}

// ─── CORS middleware ──────────────────────────────────────────────────────────

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := originSet[origin]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Access-Control-Allow-Credentials", "true")
				c.Header("Vary", "Origin")
			}
		}
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// ─── Security headers ─────────────────────────────────────────────────────────

func securityHeaders(isProd bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		c.Header("Server", "")
		if isProd {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}
