package services

// Interface untuk semua service layer.
// Handler bergantung pada interface ini, bukan implementasi konkret.
// Type yang direferensikan (DocumentListResponse, UpdateStatusRequest, dsb.)
// didefinisikan di file service masing-masing — satu package, langsung visible.

import (
	"pusri-backend/internal/models"
	"mime/multipart"
)

// ─── AuthService ──────────────────────────────────────────────────────────────

type AuthServiceInterface interface {
	Login(req LoginRequest) (*TokenPair, error)
	Register(req RegisterRequest) (*models.UserResponse, error)
	RefreshToken(refreshToken string) (*TokenPair, error)
	UpdateProfile(userID string, req UpdateProfileRequest) (*models.UserResponse, error)
	ChangePassword(userID string, req ChangePasswordRequest) error
	AdminResetPassword(userID, newPassword string) error
}

// ─── DocumentService ─────────────────────────────────────────────────────────

type DocumentServiceInterface interface {
	CreateDocument(buyerID string, req CreateDocumentRequest, file multipart.File, header *multipart.FileHeader) (*models.Document, error)
	ReUploadDraft(docID, buyerID string, file multipart.File, header *multipart.FileHeader, notes string, fields map[string]string) (*models.Document, error)
	UploadFinal(docID, buyerID string, file multipart.File, header *multipart.FileHeader, notes string) (*models.Document, error)
	ReUploadFinal(docID, buyerID string, file multipart.File, header *multipart.FileHeader, notes string) (*models.Document, error)
	GetDocumentList(params GetDocumentListParams) (*DocumentListResponse, error)
	GetDocument(docID, requesterID string, role models.Role) (*models.Document, string, string, error)
	UpdateStatus(docID, updaterID string, role models.Role, req UpdateStatusRequest) (*models.Document, error)
	MarkDisbursed(docID, adminID string) (*models.Document, error)
	GetMonitoringStats(userID string, role models.Role) (*models.MonitoringStats, error)
	GetAllVersions(docID, requesterID string, role models.Role) ([]models.DocumentVersion, error)
	GetRevisionHistory(docID, requesterID string, role models.Role) ([]models.RevisionHistory, error)
	GetVersionFileURL(docID, versionNum, requesterID string, role models.Role, preview bool) (string, error)
	CreateDocumentForBuyer(adminID, buyerID string, req CreateDocumentRequest, file multipart.File, header *multipart.FileHeader) (*models.Document, error)
	GetBuyerList() ([]models.User, error)
}

// ─── AnnotationService ────────────────────────────────────────────────────────

type AnnotationServiceInterface interface {
	SavePage(docID, annotatorID string, role models.Role, req SavePageRequest) (*models.Annotation, error)
	GetPage(docID, versionID string, page int, requesterID string, role models.Role) (*models.Annotation, error)
	GetAllPages(docID, versionID, requesterID string, role models.Role) ([]models.Annotation, error)
	GetSummary(docID, versionID, requesterID string, role models.Role) (*models.AnnotationSummaryResponse, error)
	DeleteObject(docID, annotatorID string, role models.Role, req DeleteObjectRequest) error
	MarkResolved(annID, annotatorID string, role models.Role, resolved bool) error
}

// ─── GetDocumentListParams ────────────────────────────────────────────────────

// GetDocumentListParams menggantikan 10+ parameter terpisah di GetDocumentList.
// Clean Code: "avoid long parameter list" — Martin, Clean Code ch.3.
type GetDocumentListParams struct {
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
