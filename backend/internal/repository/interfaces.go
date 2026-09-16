package repository

// File ini mendefinisikan kontrak (interface) untuk setiap repository.
//
// Mengapa interface penting?
//   1. Handler & service bergantung pada abstraksi, bukan implementasi konkret
//      (Dependency Inversion Principle — SOLID "D")
//   2. Memungkinkan unit testing dengan mock tanpa database nyata
//   3. Memudahkan penggantian implementasi (mis. PostgreSQL → MySQL) tanpa
//      mengubah layer atas
//
// Konvensi penamaan: {Entity}Repository → interface, {Entity}Repo → concrete

import (
	"pusri-backend/internal/models"
)

// ─── UserRepository ───────────────────────────────────────────────────────────

type UserRepository interface {
	Create(user *models.User) error
	FindByID(id string) (*models.User, error)
	FindByEmail(email string) (*models.User, error)
	FindByRole(role models.Role) ([]models.User, error)
	FindAllWithFilter(search, role string) ([]models.User, error)
	FindBuyers() ([]models.User, error)
	Update(id string, updates map[string]interface{}) error
	Delete(id string) error
	ToggleActive(id string) (*models.User, error)
	IsEmailTaken(email, excludeID string) (bool, error)
}

// ─── DocumentRepository ───────────────────────────────────────────────────────

type DocumentRepository interface {
	Create(doc *models.Document) error
	CreateVersion(v *models.DocumentVersion) error
	FindByID(id string) (*models.Document, error)
	FindAll(params DocumentQueryParams) ([]models.Document, int64, error)
	UpdateStatus(id string, status models.DocumentStatus, updaterID string) error
	UpdateFields(id string, updates map[string]interface{}) error
	UnsetCurrentVersion(docID string) error
	GetLatestVersion(docID string) (*models.DocumentVersion, error)
	GetAllVersions(docID string) ([]models.DocumentVersion, error)
	GetAllVersionsWithUploader(docID string) ([]models.DocumentVersion, error)
	GetMonitoringStats(userID string, role models.Role) (*models.MonitoringStats, error)
	GetExpiringSoon(daysAhead, limit int) ([]models.Document, error)

	SaveRevisionHistory(h *models.RevisionHistory) error
	GetRevisionHistory(docID string) ([]models.RevisionHistory, error)

	CreateNotification(n *models.Notification) error
	GetNotifications(userID string, limit int) ([]models.Notification, error)
	MarkNotificationRead(notifID, userID string) error
	MarkAllNotificationsRead(userID string) error
}

// DocumentQueryParams menggantikan parameter panjang di FindAll.
// Menggunakan struct lebih mudah dibaca dan diperluas di masa depan.
type DocumentQueryParams struct {
	UserID       string
	Role         models.Role
	Page         int
	Limit        int
	Status       string
	Search       string
	SortBy       string
	DateFrom     string
	DateTo       string
	ExpiringSoon bool
}

// ─── AnnotationRepository ─────────────────────────────────────────────────────

type AnnotationRepository interface {
	UpsertPage(ann *models.Annotation) error
	FindByID(annID string) (*models.Annotation, error)
	FindByPage(docID, versionID string, page int) (*models.Annotation, error)
	FindAllByDocument(docID, versionID string) ([]models.Annotation, error)
	GetSummary(docID, versionID string) ([]models.PageAnnotation, error)
	DeleteAnnotationObject(annID, objectID string) error
	MarkResolved(annID string, resolved bool) error
	DeleteAllByVersion(docID, versionID string) error
}
