package services

import (
	"errors"
	"fmt"
	"mime/multipart"
	"strconv"
	"strings"
	"time"

	"pusri-backend/internal/config"
	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"
	"pusri-backend/pkg/email"
	"pusri-backend/pkg/storage"

	"github.com/gabriel-vasile/mimetype"
	"github.com/google/uuid"
)

// ─── DTOs ────────────────────────────────────────────────────────────────────

type CreateDocumentRequest struct {
	Title           string              `form:"title"            binding:"required,min=3,max=200"`
	Description     string              `form:"description"`
	DocType         models.DocumentType `form:"doc_type"         binding:"required,oneof=draft final"`
	Notes           string              `form:"notes"`
	SKBDNNumber     string              `form:"skbdn_number"`
	ContractNumber  string              `form:"contract_number"`
	IssuingBank     string              `form:"issuing_bank"`
	GoodsType       string              `form:"goods_type"`
	Tonnage         float64             `form:"tonnage"`
	PricePerTon     float64             `form:"price_per_ton"`
	CountryOfOrigin string              `form:"country_of_origin"`
	DateOfIssue     string              `form:"date_of_issue"`
	ExpiredDate     string              `form:"expired_date"`
}

type UpdateStatusRequest struct {
	Status models.DocumentStatus `json:"status" binding:"required"`
	Notes  string                `json:"notes"  binding:"max=1000"`
}

type DocumentListResponse struct {
	Data       []models.Document `json:"data"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

// ─── documentService ──────────────────────────────────────────────────────────

type documentService struct {
	docRepo  repository.DocumentRepository
	userRepo repository.UserRepository
	cfg      *config.AppConfig
}

func NewDocumentService(
	docRepo repository.DocumentRepository,
	userRepo repository.UserRepository,
	cfg *config.AppConfig,
) DocumentServiceInterface {
	return &documentService{docRepo: docRepo, userRepo: userRepo, cfg: cfg}
}

// ─── CreateDocument ───────────────────────────────────────────────────────────

func (s *documentService) CreateDocument(
	buyerID string,
	req CreateDocumentRequest,
	file multipart.File,
	header *multipart.FileHeader,
) (*models.Document, error) {
	if err := validateFile(header); err != nil {
		return nil, err
	}
	filePath, err := storage.UploadFile(file, header, fmt.Sprintf("documents/%s", buyerID))
	if err != nil {
		return nil, errors.New("gagal upload file ke storage")
	}
	buyerUUID, err := parseUUID(buyerID)
	if err != nil {
		storage.DeleteFile(filePath)
		return nil, errors.New("buyer ID tidak valid")
	}
	totalPrice := req.Tonnage * req.PricePerTon
	dateOfIssue := parseDate(req.DateOfIssue)
	expiredDate := parseDate(req.ExpiredDate)
	if expiredDate != nil && dateOfIssue != nil && expiredDate.Before(*dateOfIssue) {
		storage.DeleteFile(filePath)
		return nil, errors.New("tanggal expired harus setelah tanggal terbit")
	}

	mimeStr := header.Header.Get("Content-Type")
	doc := &models.Document{
		BuyerID:         buyerUUID,
		DocType:         req.DocType,
		Title:           req.Title,
		Description:     req.Description,
		SKBDNNumber:     req.SKBDNNumber,
		ContractNumber:  req.ContractNumber,
		IssuingBank:     req.IssuingBank,
		GoodsType:       req.GoodsType,
		Tonnage:         req.Tonnage,
		PricePerTon:     req.PricePerTon,
		TotalPrice:      totalPrice,
		CountryOfOrigin: req.CountryOfOrigin,
		DateOfIssue:     dateOfIssue,
		ExpiredDate:     expiredDate,
		Status:          models.StatusDraftSubmitted,
		CurrentVersion:  1,
	}
	if err := s.docRepo.Create(doc); err != nil {
		storage.DeleteFile(filePath)
		return nil, errors.New("gagal menyimpan dokumen")
	}
	s.docRepo.CreateVersion(&models.DocumentVersion{
		DocumentID:    doc.ID,
		VersionNumber: 1,
		VersionType:   models.VersionDraftInitial,
		FilePath:      filePath,
		FileName:      header.Filename,
		FileSize:      header.Size,
		MimeType:      mimeStr,
		IsCurrent:     true,
		UploadNotes:   req.Notes,
		UploadedBy:    buyerUUID,
		UploadedAt:    time.Now(),
	})
	s.saveHistory(doc.ID.String(), "", models.StatusDraftSubmitted, buyerID, "Draft SKBDN dikirim", 1)
	return doc, nil
}

// ─── ReUploadDraft ────────────────────────────────────────────────────────────

func (s *documentService) ReUploadDraft(
	docID, buyerID string,
	file multipart.File,
	header *multipart.FileHeader,
	notes string,
	updatedFields map[string]string,
) (*models.Document, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if doc.BuyerID.String() != buyerID {
		return nil, errors.New("akses ditolak")
	}
	allowed := map[models.DocumentStatus]bool{
		models.StatusDraftRevisionBuyer: true,
	}
	if !allowed[doc.Status] {
		return nil, fmt.Errorf("dokumen dengan status '%s' tidak bisa di-reupload", doc.Status)
	}
	if err := validateFile(header); err != nil {
		return nil, err
	}
	lastRevisionNotes := s.getLastRevisionNotes(docID)
	filePath, err := storage.UploadFile(file, header, fmt.Sprintf("documents/%s", buyerID))
	if err != nil {
		return nil, errors.New("gagal upload file")
	}
	buyerUUID, err := parseUUID(buyerID)
	if err != nil {
		storage.DeleteFile(filePath)
		return nil, errors.New("buyer ID tidak valid")
	}
	newVersion := doc.CurrentVersion + 1
	s.docRepo.UnsetCurrentVersion(docID)
	s.docRepo.CreateVersion(&models.DocumentVersion{
		DocumentID:     doc.ID,
		VersionNumber:  newVersion,
		VersionType:    models.VersionDraftRevision,
		FilePath:       filePath,
		FileName:       header.Filename,
		FileSize:       header.Size,
		IsCurrent:      true,
		UploadNotes:    notes,
		RevisionReason: lastRevisionNotes,
		UploadedBy:     buyerUUID,
		UploadedAt:     time.Now(),
	})
	updates := s.buildSKBDNUpdates(updatedFields)
	updates["status"] = models.StatusDraftSubmitted
	updates["current_version"] = newVersion
	s.docRepo.UpdateFields(docID, updates)
	s.saveHistory(docID, doc.Status, models.StatusDraftSubmitted, buyerID, "Draft revisi dikirim: "+notes, newVersion)
	doc.Status = models.StatusDraftSubmitted
	doc.CurrentVersion = newVersion
	return doc, nil
}

// ─── UploadFinal ──────────────────────────────────────────────────────────────

func (s *documentService) UploadFinal(
	docID, buyerID string,
	file multipart.File,
	header *multipart.FileHeader,
	notes string,
) (*models.Document, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if doc.BuyerID.String() != buyerID {
		return nil, errors.New("akses ditolak")
	}
	if doc.Status != models.StatusDraftApproved {
		return nil, errors.New("Final SKBDN hanya bisa diupload setelah Draft disetujui Keuangan")
	}
	if err := validateFile(header); err != nil {
		return nil, err
	}
	filePath, err := storage.UploadFile(file, header, fmt.Sprintf("documents/%s", buyerID))
	if err != nil {
		return nil, errors.New("gagal upload file")
	}
	buyerUUID, err := parseUUID(buyerID)
	if err != nil {
		storage.DeleteFile(filePath)
		return nil, errors.New("buyer ID tidak valid")
	}
	newVersion := doc.CurrentVersion + 1
	s.docRepo.UnsetCurrentVersion(docID)
	s.docRepo.CreateVersion(&models.DocumentVersion{
		DocumentID:    doc.ID,
		VersionNumber: newVersion,
		VersionType:   models.VersionFinal,
		FilePath:      filePath,
		FileName:      header.Filename,
		FileSize:      header.Size,
		IsCurrent:     true,
		UploadNotes:   notes,
		UploadedBy:    buyerUUID,
		UploadedAt:    time.Now(),
	})
	s.docRepo.UpdateFields(docID, map[string]interface{}{
		"status":          models.StatusFinalSubmitted,
		"current_version": newVersion,
	})
	s.saveHistory(docID, doc.Status, models.StatusFinalSubmitted, buyerID, "Final SKBDN dikirim", newVersion)
	s.sendStatusNotification(doc, models.StatusFinalSubmitted, "", buyerID)
	doc.Status = models.StatusFinalSubmitted
	doc.CurrentVersion = newVersion
	return doc, nil
}

// ─── ReUploadFinal ────────────────────────────────────────────────────────────

func (s *documentService) ReUploadFinal(
	docID, buyerID string,
	file multipart.File,
	header *multipart.FileHeader,
	notes string,
) (*models.Document, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if doc.BuyerID.String() != buyerID {
		return nil, errors.New("akses ditolak")
	}
	if doc.Status != models.StatusRevisionRequested {
		return nil, fmt.Errorf("re-upload Final hanya bisa saat status 'revision_requested', status saat ini: %s", doc.Status)
	}
	if err := validateFile(header); err != nil {
		return nil, err
	}
	lastRevisionNotes := s.getLastRevisionNotes(docID)
	filePath, err := storage.UploadFile(file, header, fmt.Sprintf("documents/%s", buyerID))
	if err != nil {
		return nil, errors.New("gagal upload file")
	}
	buyerUUID, err := parseUUID(buyerID)
	if err != nil {
		storage.DeleteFile(filePath)
		return nil, errors.New("buyer ID tidak valid")
	}
	newVersion := doc.CurrentVersion + 1
	s.docRepo.UnsetCurrentVersion(docID)
	s.docRepo.CreateVersion(&models.DocumentVersion{
		DocumentID:     doc.ID,
		VersionNumber:  newVersion,
		VersionType:    models.VersionFinalRevision,
		FilePath:       filePath,
		FileName:       header.Filename,
		FileSize:       header.Size,
		IsCurrent:      true,
		UploadNotes:    notes,
		RevisionReason: lastRevisionNotes,
		UploadedBy:     buyerUUID,
		UploadedAt:     time.Now(),
	})
	s.docRepo.UpdateFields(docID, map[string]interface{}{
		"status":          models.StatusFinalSubmitted,
		"current_version": newVersion,
	})
	s.saveHistory(docID, doc.Status, models.StatusFinalSubmitted, buyerID, "Final revisi dikirim: "+notes, newVersion)
	doc.Status = models.StatusFinalSubmitted
	doc.CurrentVersion = newVersion
	return doc, nil
}

// ─── UpdateStatus ─────────────────────────────────────────────────────────────

func (s *documentService) UpdateStatus(
	docID, updaterID string,
	updaterRole models.Role,
	req UpdateStatusRequest,
) (*models.Document, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if err := validateStatusTransition(doc.Status, req.Status, updaterRole); err != nil {
		return nil, err
	}
	if req.Status == models.StatusApproved && doc.IsExpired() {
		return nil, errors.New("SKBDN sudah expired, tidak bisa disetujui")
	}
	oldStatus := doc.Status
	if err := s.docRepo.UpdateStatus(docID, req.Status, updaterID); err != nil {
		return nil, errors.New("gagal mengubah status")
	}
	s.saveHistory(docID, oldStatus, req.Status, updaterID, req.Notes, doc.CurrentVersion)
	s.sendStatusNotification(doc, req.Status, req.Notes, updaterID)
	doc.Status = req.Status
	return doc, nil
}

// ─── MarkDisbursed ────────────────────────────────────────────────────────────

func (s *documentService) MarkDisbursed(docID, adminID string) (*models.Document, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if doc.Status != models.StatusApproved {
		return nil, errors.New("hanya SKBDN berstatus 'approved' yang dapat dicairkan")
	}
	if doc.IsExpired() {
		return nil, errors.New("SKBDN sudah expired, tidak bisa dicairkan")
	}
	adminUUID, err := parseUUID(adminID)
	if err != nil {
		return nil, errors.New("admin ID tidak valid")
	}
	now := time.Now()
	if err := s.docRepo.UpdateFields(docID, map[string]interface{}{
		"status":       models.StatusDisbursed,
		"disbursed_at": &now,
		"reviewed_by":  adminUUID,
	}); err != nil {
		return nil, errors.New("gagal update status pencairan")
	}
	s.saveHistory(docID, doc.Status, models.StatusDisbursed, adminID,
		fmt.Sprintf("SKBDN dicairkan senilai Rp %.0f", doc.TotalPrice), doc.CurrentVersion)
	doc.Status = models.StatusDisbursed
	doc.DisbursedAt = &now
	return doc, nil
}

// ─── GetDocument ──────────────────────────────────────────────────────────────

func (s *documentService) GetDocument(
	docID, requesterID string,
	role models.Role,
) (*models.Document, string, string, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, "", "", errors.New("dokumen tidak ditemukan")
	}
	if role == models.RoleBuyer && doc.BuyerID.String() != requesterID {
		return nil, "", "", errors.New("akses ditolak")
	}
	if doc.IsExpired() &&
		doc.Status != models.StatusExpired &&
		doc.Status != models.StatusDisbursed &&
		doc.Status != models.StatusRejected {
		s.docRepo.UpdateFields(docID, map[string]interface{}{"status": models.StatusExpired})
		doc.Status = models.StatusExpired
	}
	latest, err := s.docRepo.GetLatestVersion(docID)
	fileURL, downloadURL := "", ""
	if err == nil {
		bucket := s.cfg.MinIOBucket
		if bucket == "" {
			bucket = "pusri-documents"
		}
		publicHost := "http://localhost:9000"
		fileURL = fmt.Sprintf("%s/%s/%s", publicHost, bucket, latest.FilePath)
		downloadURL = fmt.Sprintf("%s/%s/%s", publicHost, bucket, latest.FilePath)
	}
	return doc, fileURL, downloadURL, nil
}

// ─── GetDocumentList ──────────────────────────────────────────────────────────

func (s *documentService) GetDocumentList(p GetDocumentListParams) (*DocumentListResponse, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 {
		p.Limit = 10
	}
	if p.Limit > 200 {
		p.Limit = 200
	}

	docs, total, err := s.docRepo.FindAll(repository.DocumentQueryParams{
		UserID:       p.UserID,
		Role:         p.Role,
		Page:         p.Page,
		Limit:        p.Limit,
		Status:       p.Status,
		Search:       p.Search,
		SortBy:       p.SortBy,
		DateFrom:     p.DateFrom,
		DateTo:       p.DateTo,
		ExpiringSoon: p.ExpiringSoon,
	})
	if err != nil {
		return nil, errors.New("gagal mengambil data dokumen")
	}

	for i := range docs {
		if docs[i].IsExpired() &&
			docs[i].Status != models.StatusExpired &&
			docs[i].Status != models.StatusDisbursed &&
			docs[i].Status != models.StatusRejected {
			s.docRepo.UpdateFields(docs[i].ID.String(), map[string]interface{}{"status": models.StatusExpired})
			docs[i].Status = models.StatusExpired
		}
	}

	totalPages := int(total) / p.Limit
	if int(total)%p.Limit != 0 {
		totalPages++
	}
	return &DocumentListResponse{
		Data: docs, Total: total,
		Page: p.Page, Limit: p.Limit, TotalPages: totalPages,
	}, nil
}

func (s *documentService) GetMonitoringStats(userID string, role models.Role) (*models.MonitoringStats, error) {
	return s.docRepo.GetMonitoringStats(userID, role)
}

func (s *documentService) GetRevisionHistory(docID, requesterID string, role models.Role) ([]models.RevisionHistory, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if role == models.RoleBuyer && doc.BuyerID.String() != requesterID {
		return nil, errors.New("akses ditolak")
	}
	return s.docRepo.GetRevisionHistory(docID)
}

func (s *documentService) GetAllVersions(docID, requesterID string, role models.Role) ([]models.DocumentVersion, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	if role == models.RoleBuyer && doc.BuyerID.String() != requesterID {
		return nil, errors.New("akses ditolak")
	}
	return s.docRepo.GetAllVersionsWithUploader(docID)
}

func (s *documentService) GetVersionFileURL(docID, versionNum, requesterID string, role models.Role, preview bool) (string, error) {
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return "", errors.New("dokumen tidak ditemukan")
	}
	if role == models.RoleBuyer && doc.BuyerID.String() != requesterID {
		return "", errors.New("akses ditolak")
	}
	versions, err := s.docRepo.GetAllVersions(docID)
	if err != nil || len(versions) == 0 {
		return "", errors.New("versi tidak ditemukan")
	}
	num, _ := strconv.Atoi(versionNum)
	for _, v := range versions {
		if v.VersionNumber == num {
			bucket := s.cfg.MinIOBucket
			if bucket == "" {
				bucket = "pusri-documents"
			}
			publicHost := "http://localhost:9000"
			return fmt.Sprintf("%s/%s/%s", publicHost, bucket, v.FilePath), nil
		}
	}
	return "", errors.New("versi tidak ditemukan")
}

// ─── CreateDocumentForBuyer (Admin/AP2) ───────────────────────────────────────

func (s *documentService) CreateDocumentForBuyer(
	adminID, buyerID string,
	req CreateDocumentRequest,
	file multipart.File,
	header *multipart.FileHeader,
) (*models.Document, error) {
	buyer, err := s.userRepo.FindByID(buyerID)
	if err != nil {
		return nil, errors.New("buyer tidak ditemukan")
	}
	if buyer.Role != models.RoleBuyer {
		return nil, errors.New("user yang dipilih bukan Buyer")
	}
	if !buyer.IsActive {
		return nil, errors.New("akun buyer tidak aktif")
	}
	return s.CreateDocument(buyerID, req, file, header)
}

func (s *documentService) GetBuyerList() ([]models.User, error) {
	return s.userRepo.FindBuyers()
}

// ─── Private helpers ──────────────────────────────────────────────────────────

func (s *documentService) saveHistory(
	docID string,
	from, to models.DocumentStatus,
	createdBy, notes string,
	versionRef int,
) {
	creatorUUID, err1 := uuid.Parse(createdBy)
	docUUID, err2 := uuid.Parse(docID)
	if err1 != nil || err2 != nil {
		return
	}
	_ = s.docRepo.SaveRevisionHistory(&models.RevisionHistory{
		DocumentID: docUUID,
		FromStatus: from,
		ToStatus:   to,
		Notes:      notes,
		CreatedBy:  creatorUUID,
		VersionRef: versionRef,
	})
}

func (s *documentService) notifyUser(docID, userID, title, message string) {
	docUUID, err1 := uuid.Parse(docID)
	userUUID, err2 := uuid.Parse(userID)
	if err1 != nil || err2 != nil {
		return
	}
	_ = s.docRepo.CreateNotification(&models.Notification{
		UserID:     userUUID,
		DocumentID: &docUUID,
		Title:      title,
		Message:    message,
		NotifType:  "info",
	})
}

func (s *documentService) notifyByRole(docID string, role models.Role, title, message string) {
	users, err := s.userRepo.FindByRole(role)
	if err != nil {
		return
	}
	docUUID, err := uuid.Parse(docID)
	if err != nil {
		return
	}
	for _, u := range users {
		_ = s.docRepo.CreateNotification(&models.Notification{
			UserID:     u.ID,
			DocumentID: &docUUID,
			Title:      title,
			Message:    message,
			NotifType:  "info",
		})
	}
}

func (s *documentService) getLastRevisionNotes(docID string) string {
	history, err := s.docRepo.GetRevisionHistory(docID)
	if err != nil || len(history) == 0 {
		return ""
	}
	for i := len(history) - 1; i >= 0; i-- {
		if history[i].ToStatus == models.StatusDraftRevisionBuyer ||
			history[i].ToStatus == models.StatusRevisionRequested {
			return history[i].Notes
		}
	}
	return ""
}

func (s *documentService) sendStatusNotification(
	doc *models.Document,
	status models.DocumentStatus,
	notes, updaterID string,
) {
	docID := doc.ID.String()
	buyerID := doc.BuyerID.String()

	type notifSpec struct {
		targetID  string
		byRole    models.Role
		title     string
		message   string
		sendEmail bool
	}

	specs := map[models.DocumentStatus]notifSpec{
		models.StatusDraftUnderReview: {
			byRole:  models.RoleFinance,
			title:   "📋 Draft SKBDN Siap Direview",
			message: fmt.Sprintf("AP2 meneruskan Draft SKBDN '%s' ke Keuangan untuk direview.", doc.Title),
		},
		models.StatusDraftRevisionBuyer: {
			targetID:  buyerID,
			title:     "⚠️ Draft SKBDN Perlu Diperbaiki",
			message:   fmt.Sprintf("Draft SKBDN '%s' dikembalikan. Catatan: %s", doc.Title, notes),
			sendEmail: true,
		},
		models.StatusDraftApproved: {
			targetID: buyerID,
			title:    "✅ Draft Disetujui — Upload Final SKBDN",
			message:  fmt.Sprintf("Draft SKBDN '%s' disetujui Keuangan. Silakan upload Final SKBDN.", doc.Title),
		},
		models.StatusFinalSubmitted: {
			byRole:  models.RoleFinance,
			title:   "📄 Final SKBDN Diterima",
			message: fmt.Sprintf("Final SKBDN '%s' siap untuk direview.", doc.Title),
		},
		models.StatusFinalUnderReview: {
			byRole:  models.RoleFinance,
			title:   "📄 Final SKBDN Dalam Review",
			message: fmt.Sprintf("Final SKBDN '%s' sedang direview.", doc.Title),
		},
		models.StatusRevisionRequested: {
			targetID:  buyerID,
			title:     "⚠️ Final SKBDN Perlu Direvisi",
			message:   fmt.Sprintf("Keuangan meminta revisi Final SKBDN '%s'. Catatan: %s", doc.Title, notes),
			sendEmail: true,
		},
		models.StatusApproved: {
			targetID:  buyerID,
			title:     "🎉 Final SKBDN Disetujui!",
			message:   fmt.Sprintf("Final SKBDN '%s' telah disetujui oleh Keuangan.", doc.Title),
			sendEmail: true,
		},
		models.StatusRejected: {
			targetID:  buyerID,
			title:     "❌ SKBDN Ditolak",
			message:   fmt.Sprintf("SKBDN '%s' ditolak. Catatan: %s", doc.Title, notes),
			sendEmail: true,
		},
	}

	spec, ok := specs[status]
	if !ok {
		return
	}
	if spec.targetID != "" {
		s.notifyUser(docID, spec.targetID, spec.title, spec.message)
	} else if spec.byRole != "" {
		s.notifyByRole(docID, spec.byRole, spec.title, spec.message)
	}
	if spec.sendEmail {
		go s.sendEmailToBuyer(doc, status, notes)
	}
}

func (s *documentService) sendEmailToBuyer(doc *models.Document, status models.DocumentStatus, notes string) {
	svc := email.GetService()
	if svc == nil {
		return
	}
	buyer, err := s.userRepo.FindByID(doc.BuyerID.String())
	if err != nil {
		return
	}
	appURL := s.cfg.AppURL
	totalStr := ""
	if doc.TotalPrice > 0 {
		totalStr = fmt.Sprintf("Rp %s", formatRupiah(doc.TotalPrice))
	}
	expStr := ""
	if doc.ExpiredDate != nil {
		expStr = doc.ExpiredDate.Format("02 Jan 2006")
	}
	data := email.NotifData{
		RecipientName: buyer.Name,
		DocTitle:      doc.Title,
		DocNumber:     doc.SKBDNNumber,
		Status:        string(status),
		Notes:         notes,
		ActionURL:     fmt.Sprintf("%s/buyer/documents/%s", appURL, doc.ID.String()),
		GoodsType:     doc.GoodsType,
		TotalPrice:    totalStr,
		ExpiredDate:   expStr,
	}
	if err := svc.SendStatusUpdate(buyer.Email, buyer.Name, data); err != nil {
		fmt.Printf("[EMAIL] Gagal kirim ke %s: %v\n", buyer.Email, err)
	}
}

func (s *documentService) buildSKBDNUpdates(fields map[string]string) map[string]interface{} {
	updates := make(map[string]interface{})
	str := func(k string) {
		if v, ok := fields[k]; ok && v != "" {
			updates[k] = v
		}
	}
	flt := func(k string) {
		if v, ok := fields[k]; ok && v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				updates[k] = f
			}
		}
	}
	str("skbdn_number")
	str("contract_number")
	str("issuing_bank")
	str("goods_type")
	str("country_of_origin")
	flt("tonnage")
	flt("price_per_ton")
	if t, ok := fields["tonnage"]; ok {
		if p, ok2 := fields["price_per_ton"]; ok2 {
			ton, e1 := strconv.ParseFloat(t, 64)
			per, e2 := strconv.ParseFloat(p, 64)
			if e1 == nil && e2 == nil {
				updates["total_price"] = ton * per
			}
		}
	}
	if v := fields["date_of_issue"]; v != "" {
		if t := parseDate(v); t != nil {
			updates["date_of_issue"] = t
		}
	}
	if v := fields["expired_date"]; v != "" {
		if t := parseDate(v); t != nil {
			updates["expired_date"] = t
		}
	}
	return updates
}

// ─── Package-level helpers ────────────────────────────────────────────────────

func parseUUID(s string) (uuid.UUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("format ID tidak valid ('%s'): %w", s, err)
	}
	return u, nil
}

func parseDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	for _, f := range []string{"2006-01-02", time.RFC3339} {
		clean := strings.Split(s, "T")[0]
		if t, err := time.Parse(f, clean); err == nil {
			return &t
		}
		if t, err := time.Parse(f, s); err == nil {
			return &t
		}
	}
	return nil
}

func formatRupiah(amount float64) string {
	s := strconv.FormatFloat(amount, 'f', 0, 64)
	var out []byte
	n := len(s)
	for i, c := range s {
		if (n-i)%3 == 0 && i != 0 {
			out = append(out, '.')
		}
		out = append(out, byte(c))
	}
	return string(out)
}

func validateFile(header *multipart.FileHeader) error {
	if header.Size == 0 {
		return errors.New("file tidak boleh kosong")
	}
	if header.Size > 10*1024*1024 {
		return errors.New("ukuran file maksimal 10 MB")
	}
	f, err := header.Open()
	if err != nil {
		return errors.New("gagal membaca file")
	}
	defer f.Close()
	detected, err := mimetype.DetectReader(f)
	if err != nil {
		return errors.New("gagal mendeteksi tipe file")
	}
	allowed := map[string]bool{
		"application/pdf": true,
		"image/jpeg":      true,
		"image/png":       true,
	}
	mimeStr := strings.SplitN(detected.String(), ";", 2)[0]
	if !allowed[strings.TrimSpace(mimeStr)] {
		return fmt.Errorf("tipe file tidak didukung (%s) — hanya PDF, JPG, PNG", mimeStr)
	}
	return nil
}

func validateStatusTransition(current, next models.DocumentStatus, role models.Role) error {
	type key struct {
		From models.DocumentStatus
		Role models.Role
	}
	allowed := map[key][]models.DocumentStatus{
		{models.StatusDraftSubmitted, models.RoleAP2}:        {models.StatusDraftUnderReview, models.StatusDraftRevisionBuyer},
		{models.StatusFinalSubmitted, models.RoleAP2}:        {models.StatusFinalUnderReview, models.StatusRevisionRequested},
		{models.StatusDraftUnderReview, models.RoleFinance}: {models.StatusDraftApproved, models.StatusDraftRevisionBuyer},
		{models.StatusFinalUnderReview, models.RoleFinance}: {models.StatusApproved, models.StatusRevisionRequested, models.StatusRejected},
		{models.StatusFinalSentToFinance, models.RoleFinance}: {models.StatusFinalUnderReview},
		{models.StatusUnderReview, models.RoleFinance}:       {models.StatusApproved, models.StatusRevisionRequested, models.StatusRejected},
		{models.StatusApproved, models.RoleAdmin}:          {models.StatusDisbursed},
		{models.StatusDraftSubmitted, models.RoleAdmin}:    {models.StatusDraftUnderReview, models.StatusDraftRevisionBuyer},
		{models.StatusDraftVerifiedAP2, models.RoleAdmin}:  {models.StatusDraftUnderReview},
	}
	nextStatuses, ok := allowed[key{current, role}]
	if !ok {
		return fmt.Errorf("role '%s' tidak berhak mengubah status dari '%s'", role, current)
	}
	for _, s := range nextStatuses {
		if s == next {
			return nil
		}
	}
	return fmt.Errorf("transisi '%s' → '%s' tidak diizinkan untuk role '%s'", current, next, role)
}