package main

import (
	"fmt"
	"log"
	"time"

	"pusri-backend/internal/config"
	"pusri-backend/internal/models"
	"pusri-backend/pkg/database"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	log.Println("🌱 Seeding database SIMSKBDN — Pupuk Sriwidjaja Palembang")

	if err := godotenv.Load(); err != nil {
		log.Println(".env tidak ditemukan, pakai env sistem")
	}

	// Pakai AppConfig yang baru — bukan ConnectDB() lama
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Config tidak valid: %v", err)
	}
	database.Connect(cfg)
	db := database.Get()

	db.AutoMigrate(
		&models.User{},
		&models.Document{}, &models.DocumentVersion{},
		&models.RevisionHistory{}, &models.Notification{},
		&models.Annotation{},
	)

	// ── Bersihkan semua data lama ─────────────────────────────────────────
	for _, t := range []string{
		"annotations", "notifications", "revision_histories",
		"document_versions", "documents", "users",
	} {
		db.Exec("DELETE FROM " + t)
	}

	hash := func(pw string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pw), 12)
		return string(h)
	}
	ptr := func(t time.Time) *time.Time { return &t }

	// ── USERS ──────────────────────────────────────────────────────────────
	users := []models.User{
		{Name: "Budi Santoso",  Email: "buyer@pusri.com",   Password: hash("password123"), Role: models.RoleBuyer,   CompanyName: "PT Tani Makmur Sejahtera", PhoneNumber: "6281234567890", IsActive: true},
		{Name: "Siti Rahayu",   Email: "siti@buyer.com",    Password: hash("password123"), Role: models.RoleBuyer,   CompanyName: "CV Pupuk Nusantara",       PhoneNumber: "6289876543210", IsActive: true},
		{Name: "Ahmad Fauzi",   Email: "ahmad@buyer.com",   Password: hash("password123"), Role: models.RoleBuyer,   CompanyName: "PT Agro Mandiri",          PhoneNumber: "6285555666777", IsActive: true},
		{Name: "Dewi Lestari",  Email: "dewi@buyer.com",    Password: hash("password123"), Role: models.RoleBuyer,   CompanyName: "Koperasi Tani Bersama",    PhoneNumber: "6281111222333", IsActive: true},
		{Name: "Hendra Wijaya", Email: "finance@pusri.com", Password: hash("password123"), Role: models.RoleFinance, CompanyName: "PT Pusri", PhoneNumber: "6282222333444", IsActive: true},
		{Name: "Maya Putri",    Email: "maya@finance.com",  Password: hash("password123"), Role: models.RoleFinance, CompanyName: "PT Pusri", PhoneNumber: "6283333444555", IsActive: true},
		{Name: "Rizki Pratama", Email: "ap2@pusri.com",     Password: hash("password123"), Role: models.RoleAP2,     CompanyName: "PT Pusri", PhoneNumber: "6285555666777", IsActive: true},
		{Name: "Sari Dewi",     Email: "ap2b@pusri.com",    Password: hash("password123"), Role: models.RoleAP2,     CompanyName: "PT Pusri", PhoneNumber: "6286666777888", IsActive: true},
		{Name: "Admin Pusri",   Email: "admin@pusri.com",   Password: hash("password123"), Role: models.RoleAdmin,   CompanyName: "PT Pusri", PhoneNumber: "6284444555666", IsActive: true},
	}
	for i := range users {
		db.Create(&users[i])
	}
	getUser := func(email string) models.User {
		var u models.User
		db.Where("email = ?", email).First(&u)
		return u
	}
	budi   := getUser("buyer@pusri.com")
	siti   := getUser("siti@buyer.com")
	ahmad  := getUser("ahmad@buyer.com")
	dewi   := getUser("dewi@buyer.com")
	hendra := getUser("finance@pusri.com")
	admin  := getUser("admin@pusri.com")
	log.Printf("  ✓ %d users dibuat", len(users))

	// ── HELPER buat dokumen + versi + riwayat ─────────────────────────────
	type DocInput struct {
		BuyerID     uuid.UUID
		Status      models.DocumentStatus
		Title       string
		SKBDNNum    string
		Contract    string
		Bank        string
		Goods       string
		Tonnage     float64
		PPT         float64
		Country     string
		Issue       time.Time
		Expired     time.Time
		UploadNote  string
		VersionType models.VersionType
	}

	makeDoc := func(d DocInput) {
		now := time.Now()
		doc := models.Document{
			BuyerID: d.BuyerID, DocType: models.DocTypeDraft,
			Title: d.Title, SKBDNNumber: d.SKBDNNum, ContractNumber: d.Contract,
			IssuingBank: d.Bank, GoodsType: d.Goods,
			Tonnage: d.Tonnage, PricePerTon: d.PPT, TotalPrice: d.Tonnage * d.PPT,
			CountryOfOrigin: d.Country,
			DateOfIssue: ptr(d.Issue), ExpiredDate: ptr(d.Expired),
			Status: d.Status, CurrentVersion: 1,
		}
		if err := db.Create(&doc).Error; err != nil {
			log.Printf("  ✗ gagal buat dok %s: %v", d.Title, err)
			return
		}
		vt := d.VersionType
		if vt == "" { vt = models.VersionDraftInitial }
		db.Create(&models.DocumentVersion{
			DocumentID: doc.ID, VersionNumber: 1, VersionType: vt,
			FilePath: fmt.Sprintf("uploads/seed/%s_v1.pdf", doc.SKBDNNumber),
			FileName: fmt.Sprintf("%s_v1.pdf", doc.SKBDNNumber),
			FileSize: 458752, MimeType: "application/pdf", IsCurrent: true,
			UploadNotes: d.UploadNote, UploadedBy: d.BuyerID,
			UploadedAt: now.Add(-72 * time.Hour),
		})
		db.Create(&models.RevisionHistory{
			DocumentID: doc.ID, CreatedBy: d.BuyerID, FromStatus: "",
			ToStatus: models.StatusDraftSubmitted,
			Notes: "Dokumen SKBDN dikirim oleh Buyer", VersionRef: 1,
			CreatedAt: now.Add(-72 * time.Hour),
		})
		addH := func(from, to models.DocumentStatus, actor uuid.UUID, notes string, hoursAgo float64) {
			db.Create(&models.RevisionHistory{
				DocumentID: doc.ID, CreatedBy: actor, FromStatus: from, ToStatus: to,
				Notes: notes, VersionRef: 1,
				CreatedAt: now.Add(-time.Duration(hoursAgo * float64(time.Hour))),
			})
		}
		switch d.Status {
		case models.StatusDraftUnderReview:
			addH(models.StatusDraftSubmitted, models.StatusDraftUnderReview, admin.ID, "Diteruskan ke Keuangan", 48)
		case models.StatusDraftApproved:
			addH(models.StatusDraftSubmitted, models.StatusDraftUnderReview, admin.ID, "Diteruskan ke Keuangan", 48)
			addH(models.StatusDraftUnderReview, models.StatusDraftApproved, hendra.ID, "Draft SKBDN disetujui, silakan upload Final", 24)
		case models.StatusRevisionRequested:
			addH(models.StatusDraftSubmitted, models.StatusDraftUnderReview, admin.ID, "Diteruskan ke Keuangan", 48)
			addH(models.StatusDraftUnderReview, models.StatusRevisionRequested, hendra.ID, "Nomor kontrak perlu diperbaiki", 12)
		case models.StatusApproved:
			addH(models.StatusDraftSubmitted, models.StatusDraftUnderReview, admin.ID, "Diteruskan", 72)
			addH(models.StatusDraftUnderReview, models.StatusDraftApproved, hendra.ID, "Draft disetujui", 60)
			addH(models.StatusDraftApproved, models.StatusFinalSubmitted, d.BuyerID, "Final diupload", 48)
			addH(models.StatusFinalSubmitted, models.StatusFinalUnderReview, hendra.ID, "Sedang direview", 36)
			addH(models.StatusFinalUnderReview, models.StatusApproved, hendra.ID, "Final SKBDN disetujui ✓", 24)
			db.Model(&doc).Update("approved_at", now.Add(-24*time.Hour))
		case models.StatusDisbursed:
			addH(models.StatusDraftSubmitted, models.StatusDraftUnderReview, admin.ID, "Diteruskan", 120)
			addH(models.StatusDraftUnderReview, models.StatusDraftApproved, hendra.ID, "Draft disetujui", 108)
			addH(models.StatusDraftApproved, models.StatusFinalSubmitted, d.BuyerID, "Final diupload", 96)
			addH(models.StatusFinalSubmitted, models.StatusFinalUnderReview, hendra.ID, "Mulai review", 84)
			addH(models.StatusFinalUnderReview, models.StatusApproved, hendra.ID, "Final disetujui", 72)
			addH(models.StatusApproved, models.StatusDisbursed, admin.ID, fmt.Sprintf("Dicairkan Rp %.0f", doc.TotalPrice), 48)
			db.Model(&doc).Updates(map[string]interface{}{
				"approved_at":  now.Add(-72 * time.Hour),
				"disbursed_at": now.Add(-48 * time.Hour),
			})
		}
	}

	y := 2026
	docs := []DocInput{
		{budi.ID,  models.StatusDisbursed,       "SKBDN Urea Granul 500 Ton Q2-2026",  "SKBDN-2026-0001", "KTR-2026-001", "Bank Mandiri",     "Urea Granul 46%",       500,  4500000, "Indonesia", time.Date(y, 1, 10, 0,0,0,0,time.UTC), time.Date(y, 7, 10, 0,0,0,0,time.UTC), "Draft SKBDN Q2", ""},
		{siti.ID,  models.StatusFinalUnderReview, "SKBDN NPK Phonska 200 Ton",          "SKBDN-2026-0002", "KTR-2026-002", "BNI",              "NPK Phonska 15-15-15",  200,  7800000, "Indonesia", time.Date(y, 2,  5, 0,0,0,0,time.UTC), time.Date(y, 8,  5, 0,0,0,0,time.UTC), "Batch pertama NPK", ""},
		{ahmad.ID, models.StatusDraftApproved,    "SKBDN ZA 300 Ton Periode Tanam",     "SKBDN-2026-0003", "KTR-2026-003", "Bank BCA",         "ZA (Amonium Sulfat)",   300,  3200000, "Indonesia", time.Date(y, 2, 15, 0,0,0,0,time.UTC), time.Date(y, 9, 15, 0,0,0,0,time.UTC), "Persiapan tanam padi", ""},
		{dewi.ID,  models.StatusDraftSubmitted,   "SKBDN SP-36 150 Ton Jawa Tengah",    "SKBDN-2026-0004", "KTR-2026-004", "Bank Jateng",      "SP-36 Superfosfat",     150,  5600000, "Indonesia", time.Date(y, 3,  1, 0,0,0,0,time.UTC), time.Date(y, 9,  1, 0,0,0,0,time.UTC), "Distribusi Jawa Tengah", ""},
		{budi.ID,  models.StatusApproved,         "SKBDN Urea 400 Ton Sumatera",        "SKBDN-2026-0005", "KTR-2026-005", "Bank Sumsel Babel", "Urea Granul 46%",       400,  4500000, "Indonesia", time.Date(y, 3, 10, 0,0,0,0,time.UTC), time.Date(y, 9, 10, 0,0,0,0,time.UTC), "Distribusi Sumatera Selatan", ""},
		{siti.ID,  models.StatusDraftSubmitted,   "SKBDN NPK Kebomas 250 Ton",          "SKBDN-2026-0006", "KTR-2026-006", "Bank Mandiri",     "NPK Kebomas 12-12-17",  250,  8200000, "Indonesia", time.Date(y, 3, 20, 0,0,0,0,time.UTC), time.Date(y,10, 20, 0,0,0,0,time.UTC), "Batch kedua NPK", ""},
		{ahmad.ID, models.StatusRevisionRequested,"SKBDN Petroganik 1000 Ton",          "SKBDN-2026-0007", "KTR-2026-007", "Bank BRI",         "Petroganik Organik",   1000,  1800000, "Indonesia", time.Date(y, 3, 25, 0,0,0,0,time.UTC), time.Date(y, 6, 16, 0,0,0,0,time.UTC), "Order pupuk organik besar", ""},
		{dewi.ID,  models.StatusDraftUnderReview, "SKBDN Urea 250 Ton Lampung",         "SKBDN-2026-0008", "KTR-2026-008", "Bank Lampung",     "Urea Granul 46%",       250,  4500000, "Indonesia", time.Date(y, 4,  1, 0,0,0,0,time.UTC), time.Date(y, 9, 22, 0,0,0,0,time.UTC), "Draft awal dari bank", ""},
	}
	for _, d := range docs { makeDoc(d) }
	log.Printf("  ✓ %d dokumen SKBDN dibuat dengan riwayat lengkap", len(docs))

	// ── NOTIFIKASI SEED ──────────────────────────────────────────────────
	notifs := []models.Notification{
		{UserID: budi.ID,   Title: "✅ SKBDN Dicairkan",   Message: "SKBDN Urea Granul 500 Ton Q2-2026 telah dicairkan.",               NotifType: "success", IsRead: false},
		{UserID: budi.ID,   Title: "📋 SKBDN Disetujui",   Message: "SKBDN Urea 400 Ton Sumatera disetujui. Menunggu pencairan.",        NotifType: "success", IsRead: false},
		{UserID: ahmad.ID,  Title: "⚠️ Perlu Revisi",      Message: "SKBDN Petroganik 1000 Ton perlu diperbaiki: nomor kontrak.",         NotifType: "warning", IsRead: false},
		{UserID: siti.ID,   Title: "📤 Draft Dikirim",     Message: "Draft SKBDN NPK Kebomas 250 Ton telah diterima AP2.",               NotifType: "info",    IsRead: true},
		{UserID: hendra.ID, Title: "📥 Draft Masuk",       Message: "Draft baru dari Dewi Lestari: Urea 250 Ton Lampung menunggu review.", NotifType: "info",    IsRead: false},
		{UserID: admin.ID,  Title: "💰 Siap Dicairkan",    Message: "SKBDN Urea 400 Ton Sumatera siap dicairkan.",                      NotifType: "success", IsRead: false},
	}
	for i := range notifs { db.Create(&notifs[i]) }
	log.Printf("  ✓ %d notifikasi dibuat", len(notifs))

	// ── Verifikasi stats ──────────────────────────────────────────────────
	var counts []struct {
		Status string
		Count  int64
	}
	db.Raw("SELECT status, COUNT(*) as count FROM documents GROUP BY status ORDER BY status").Scan(&counts)
	log.Println("\n📊 Status dokumen:")
	for _, c := range counts { log.Printf("  %-35s : %d", c.Status, c.Count) }
	log.Println("\n📋 Login credentials (password: password123):")
	log.Println("  buyer@pusri.com / siti@buyer.com / ahmad@buyer.com / dewi@buyer.com")
	log.Println("  finance@pusri.com / ap2@pusri.com / admin@pusri.com")
	log.Println("\n✅ Seed selesai!")
}
