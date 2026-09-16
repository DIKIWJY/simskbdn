package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ─── Status SKBDN — dua fase: Draft Phase & Final Phase ───────────────────
//
// DRAFT PHASE (Buyer upload Draft → AP2 verifikasi → Keuangan review draft):
//   draft_submitted      : Buyer upload Draft, menunggu AP2
//   draft_under_review   : AP2 setujui, Keuangan sedang review Draft
//   draft_revision_buyer : AP2 atau Keuangan kembalikan Draft ke Buyer
//   draft_approved       : Keuangan setujui Draft → Buyer boleh upload Final
//
// FINAL PHASE (Buyer upload Final → Keuangan review Final):
//   final_submitted      : Buyer upload Final SKBDN dari bank
//   final_under_review   : Keuangan sedang review Final
//   revision_requested   : Keuangan minta revisi Final ke Buyer
//   approved             : Final SKBDN disetujui Keuangan ✓
//   rejected             : Ditolak
//   expired              : Melewati tanggal expired
//   disbursed            : Sudah dicairkan

type DocumentStatus string

const (
	// ── Draft Phase ──
	StatusDraftSubmitted     DocumentStatus = "draft_submitted"
	StatusDraftUnderReview   DocumentStatus = "draft_under_review"   // Keuangan review Draft
	StatusDraftRevisionBuyer DocumentStatus = "draft_revision_buyer" // dikembalikan ke Buyer
	StatusDraftApproved      DocumentStatus = "draft_approved"       // Draft OK → Buyer upload Final

	// ── Final Phase ──
	StatusFinalSubmitted   DocumentStatus = "final_submitted"    // Buyer upload Final
	StatusFinalUnderReview DocumentStatus = "final_under_review" // Keuangan review Final
	StatusRevisionRequested DocumentStatus = "revision_requested" // Final perlu revisi
	StatusApproved         DocumentStatus = "approved"
	StatusRejected         DocumentStatus = "rejected"
	StatusExpired          DocumentStatus = "expired"
	StatusDisbursed        DocumentStatus = "disbursed"

	// ── Legacy (backward compat) ──
	StatusSubmitted          DocumentStatus = "submitted"
	StatusDraftVerifiedAP2   DocumentStatus = "draft_verified_ap2"
	StatusFinalSentToFinance DocumentStatus = "final_sent_to_finance"
	StatusUnderReview        DocumentStatus = "under_review"
	StatusReceivedSales      DocumentStatus = "received_sales"
)

// VersionType — konteks kenapa versi ini ada
type VersionType string

const (
	VersionDraftInitial  VersionType = "draft_initial"  // Upload Draft pertama kali
	VersionDraftRevision VersionType = "draft_revision"  // Revisi Draft (karena diminta AP2/Keuangan)
	VersionFinal         VersionType = "final"           // Upload Final SKBDN (setelah draft disetujui)
	VersionFinalRevision VersionType = "final_revision"  // Revisi Final (karena diminta Keuangan)
)

type DocumentType string

const (
	DocTypeDraft DocumentType = "draft"
	DocTypeFinal DocumentType = "final"
)

// ─── Tabel utama dokumen SKBDN ─────────────────────────────────────────────
type Document struct {
	ID      uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	BuyerID uuid.UUID `gorm:"type:uuid;not null" json:"buyer_id"`
	Buyer   User      `gorm:"foreignKey:BuyerID" json:"buyer,omitempty"`

	// ─── Informasi Dasar ───
	DocType     DocumentType `gorm:"not null" json:"doc_type"`
	Title       string       `gorm:"not null" json:"title"`
	Description string       `json:"description"`

	// ─── Field SKBDN Lengkap (diisi saat upload Draft) ───
	SKBDNNumber     string  `gorm:"index" json:"skbdn_number"`
	ContractNumber  string  `json:"contract_number"`
	IssuingBank     string  `json:"issuing_bank"`
	GoodsType       string  `json:"goods_type"`
	Tonnage         float64 `json:"tonnage"`
	PricePerTon     float64 `json:"price_per_ton"`
	TotalPrice      float64 `json:"total_price"`
	CountryOfOrigin string  `json:"country_of_origin"`
	DateOfIssue     *time.Time `json:"date_of_issue,omitempty"`
	ExpiredDate     *time.Time `gorm:"index" json:"expired_date,omitempty"`

	// ─── Status & Tracking ───
	Status         DocumentStatus `gorm:"not null;default:'draft_submitted';index" json:"status"`
	CurrentVersion int            `gorm:"not null;default:1" json:"current_version"`
	ForwardedBy    *uuid.UUID     `gorm:"type:uuid" json:"forwarded_by,omitempty"`
	ReviewedBy     *uuid.UUID     `gorm:"type:uuid" json:"reviewed_by,omitempty"`
	ApprovedAt     *time.Time     `json:"approved_at,omitempty"`
	DisbursedAt    *time.Time     `json:"disbursed_at,omitempty"`

	// ─── Audit Trail ───
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Versions []DocumentVersion `gorm:"foreignKey:DocumentID;order:version_number desc" json:"versions,omitempty"`
}

func (d *Document) IsExpired() bool {
	if d.ExpiredDate == nil {
		return false
	}
	return time.Now().After(*d.ExpiredDate)
}

func (d *Document) DaysUntilExpired() int {
	if d.ExpiredDate == nil {
		return 0
	}
	return int(time.Until(*d.ExpiredDate).Hours() / 24)
}

// IsDraftPhase — dokumen masih dalam fase Draft
func (d *Document) IsDraftPhase() bool {
	switch d.Status {
	case StatusDraftSubmitted, StatusDraftUnderReview,
		StatusDraftRevisionBuyer, StatusDraftApproved,
		// legacy
		StatusSubmitted, StatusDraftVerifiedAP2,
		StatusFinalSentToFinance, StatusUnderReview:
		return true
	}
	return false
}

// ─── Versi file dokumen ────────────────────────────────────────────────────
// Setiap upload (baru, revisi, atau final) menghasilkan versi baru
type DocumentVersion struct {
	ID            uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	DocumentID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"document_id"`
	VersionNumber int         `gorm:"not null" json:"version_number"`
	VersionType   VersionType `gorm:"not null;default:'draft_initial'" json:"version_type"`

	// File info
	FilePath  string `gorm:"not null" json:"file_path"`
	FileName  string `gorm:"not null" json:"file_name"`
	FileSize  int64  `json:"file_size"`
	MimeType  string `json:"mime_type"`
	IsCurrent bool   `gorm:"default:false" json:"is_current"`

	// Konteks
	UploadNotes    string `json:"upload_notes"`    // catatan Buyer saat upload
	RevisionReason string `json:"revision_reason"` // alasan revisi diminta (dari AP2/Keuangan)
	RequestedBy    string `json:"requested_by"`    // nama yang meminta revisi

	UploadedBy uuid.UUID `gorm:"type:uuid;not null" json:"uploaded_by"`
	Uploader   User      `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
	UploadedAt time.Time `json:"uploaded_at"`
}

// VersionTypeLabel — label tampilan untuk VersionType
func (v *DocumentVersion) VersionTypeLabel() string {
	switch v.VersionType {
	case VersionDraftInitial:
		return "Draft Pertama"
	case VersionDraftRevision:
		return "Draft Revisi"
	case VersionFinal:
		return "Final SKBDN"
	case VersionFinalRevision:
		return "Final Revisi"
	default:
		return "Draft"
	}
}

// ─── Riwayat perubahan status ──────────────────────────────────────────────
type RevisionHistory struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	DocumentID uuid.UUID      `gorm:"type:uuid;not null;index" json:"document_id"`
	FromStatus DocumentStatus `json:"from_status"`
	ToStatus   DocumentStatus `gorm:"not null" json:"to_status"`
	Notes      string         `json:"notes"`
	CreatedBy  uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	Actor      User           `gorm:"foreignKey:CreatedBy" json:"actor,omitempty"`
	VersionRef int            `json:"version_ref"`
	CreatedAt  time.Time      `json:"created_at"`
}

// ─── MonitoringStats ───────────────────────────────────────────────────────
type MonitoringStats struct {
	Total         int64   `json:"total"`
	PendingReview int64   `json:"pending_review"` // draft_under_review + final_submitted
	UnderReview   int64   `json:"under_review"`   // final_under_review
	NeedRevision  int64   `json:"need_revision"`  // draft_revision_buyer + revision_requested
	DraftApproved int64   `json:"draft_approved"` // menunggu Buyer upload Final
	Approved      int64   `json:"approved"`
	Rejected      int64   `json:"rejected"`
	Expired       int64   `json:"expired"`
	ExpiringSoon  int64   `json:"expiring_soon"`
	Disbursed     int64   `json:"disbursed"`
	TotalValue    float64 `json:"total_value"`
	ApprovedValue float64 `json:"approved_value"`
	TotalTonnage  float64 `json:"total_tonnage"`
}

// ─── Notifikasi ────────────────────────────────────────────────────────────
type Notification struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	DocumentID *uuid.UUID `gorm:"type:uuid" json:"document_id,omitempty"`
	Title      string     `gorm:"not null" json:"title"`
	Message    string     `gorm:"not null" json:"message"`
	NotifType  string     `json:"notif_type"`
	IsRead     bool       `gorm:"default:false" json:"is_read"`
	CreatedAt  time.Time  `json:"created_at"`
}
