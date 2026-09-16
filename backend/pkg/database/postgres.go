package database

import (
	"log"
	"time"

	"pusri-backend/internal/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var db *gorm.DB

// Connect menginisialisasi koneksi DB menggunakan AppConfig.
// Menerima config eksplisit — tidak lagi membaca os.Getenv() sendiri.
func Connect(cfg *config.AppConfig) {
	logLevel := logger.Info
	if cfg.IsProd {
		logLevel = logger.Warn
	}

	gormDB, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger:      logger.Default.LogMode(logLevel),
		PrepareStmt: true,
	})
	if err != nil {
		log.Fatalf("[DB] Gagal koneksi: %v", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		log.Fatalf("[DB] Gagal ambil sql.DB: %v", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DBMaxOpen)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdle)
	sqlDB.SetConnMaxLifetime(1 * time.Hour)
	sqlDB.SetConnMaxIdleTime(30 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("[DB] Ping gagal: %v", err)
	}

	db = gormDB
	log.Printf("[DB] Terkoneksi (sslmode=%s, maxOpen=%d, maxIdle=%d)",
		cfg.DBSSLMode, cfg.DBMaxOpen, cfg.DBMaxIdle)
}

// Get mengembalikan instance *gorm.DB yang sudah diinisialisasi.
// Akan panic jika dipanggil sebelum Connect().
func Get() *gorm.DB {
	if db == nil {
		log.Fatal("[DB] Get() dipanggil sebelum Connect()")
	}
	return db
}

// Ping memeriksa apakah koneksi DB masih aktif (dipakai health check).
func Ping() error {
	sqlDB, err := Get().DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
