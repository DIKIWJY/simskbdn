package models

import (
    "time"
    "github.com/google/uuid"
)

// Tipe alat anotasi yang didukung
type AnnotationType string

const (
    AnnotationHighlight  AnnotationType = "highlight"   // highlight kuning
    AnnotationStrike     AnnotationType = "strikethrough" // coret merah
    AnnotationRect       AnnotationType = "rectangle"   // kotak border
    AnnotationText       AnnotationType = "text"        // komentar sticky note
    AnnotationArrow      AnnotationType = "arrow"       // tanda panah
    AnnotationFreehand   AnnotationType = "freehand"    // gambar bebas
)

// ─── Tabel annotations ─────────────────────────────────────────────────────
// Satu baris = satu halaman dari satu versi dokumen
// annotation_data menyimpan JSON canvas Fabric.js lengkap
type Annotation struct {
    ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    DocumentID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"document_id"`
    VersionID      uuid.UUID      `gorm:"type:uuid;not null" json:"version_id"`
    PageNumber      int            `gorm:"not null" json:"page_number"`
    AnnotatorID    uuid.UUID      `gorm:"type:uuid;not null" json:"annotator_id"`
    Annotator      User           `gorm:"foreignKey:AnnotatorID" json:"annotator,omitempty"`
    // AnnotationData = hasil canvas.toJSON() dari Fabric.js
    // Disimpan sebagai JSONB di PostgreSQL — fleksibel, bisa di-query
    AnnotationData JSONBMap       `gorm:"type:jsonb;not null;default:'{}'" json:"annotation_data"`
    // Summary berisi daftar ringkasan per objek anotasi (untuk tampilan list)
    Summary        []AnnotationItem `gorm:"type:jsonb;serializer:json" json:"summary,omitempty"`
    IsResolved     bool           `gorm:"default:false" json:"is_resolved"`
    CreatedAt      time.Time      `json:"created_at"`
    UpdatedAt      time.Time      `json:"updated_at"`
}

// JSONBMap → type alias agar GORM bisa handle map[string]interface{} sebagai JSONB
type JSONBMap map[string]interface{}

// ─── Item anotasi individual (untuk summary / list komentar) ───────────────
type AnnotationItem struct {
    ObjectID   string         `json:"object_id"`   // ID unik dari Fabric.js object
    Type       AnnotationType `json:"type"`
    Comment    string         `json:"comment,omitempty"`   // komentar teks
    Color      string         `json:"color,omitempty"`
    PageNumber  int            `json:"page_number"`
    CreatedAt  time.Time      `json:"created_at"`
    IsResolved bool           `json:"is_resolved"`
}

// ─── Response ringkas untuk list anotasi ──────────────────────────────────
type AnnotationSummaryResponse struct {
    DocumentID  string           `json:"document_id"`
    TotalPages  int              `json:"total_pages"`
    Pages       []PageAnnotation `json:"pages"`
}

type PageAnnotation struct {
    PageNumber  int              `json:"page_number"`
    HasData     bool             `json:"has_data"`
    ItemCount   int              `json:"item_count"`
    AnnotationID string          `json:"annotation_id,omitempty"`
}