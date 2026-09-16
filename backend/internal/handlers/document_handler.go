package handlers

import (
	"net/http"
	"strconv"

	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"
	"pusri-backend/internal/services"
	storagepkg "pusri-backend/pkg/storage"
	"pusri-backend/pkg/utils"
	ws "pusri-backend/pkg/websocket"

	"github.com/gin-gonic/gin"
)

type documentHandler struct {
	svc      services.DocumentServiceInterface
	docRepo  repository.DocumentRepository
	notifier *ws.Notifier
}

// NewDocumentHandler menerima service interface dan repository interface.
// docRepo dipakai untuk operasi notifikasi yang tidak perlu melewati service layer
// (GetNotifications, MarkRead — operasi sederhana langsung ke DB via repository).
func NewDocumentHandler(
	svc services.DocumentServiceInterface,
	docRepo repository.DocumentRepository,
) *documentHandler {
	return &documentHandler{svc: svc, docRepo: docRepo, notifier: ws.NewNotifier()}
}

// ─── Dokumen CRUD ─────────────────────────────────────────────────────────────

func (h *documentHandler) CreateDocument(c *gin.Context) {
	var req services.CreateDocumentRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File dokumen diperlukan", err.Error())
		return
	}
	defer file.Close()

	buyerID := c.GetString("user_id")
	doc, err := h.svc.CreateDocument(buyerID, req, file, header)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal upload draft", err.Error())
		return
	}

	userResp, _ := getUserFromContext(c)
	h.notifier.DocumentSubmitted(doc, userResp.Name)

	utils.SuccessResponse(c, http.StatusCreated, "Draft SKBDN berhasil dikirim", doc)
}

func (h *documentHandler) ReUploadDraft(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File diperlukan", err.Error())
		return
	}
	defer file.Close()

	updatedFields := map[string]string{
		"skbdn_number": c.PostForm("skbdn_number"), "contract_number": c.PostForm("contract_number"),
		"issuing_bank": c.PostForm("issuing_bank"), "goods_type": c.PostForm("goods_type"),
		"tonnage": c.PostForm("tonnage"), "price_per_ton": c.PostForm("price_per_ton"),
		"country_of_origin": c.PostForm("country_of_origin"),
		"date_of_issue":     c.PostForm("date_of_issue"), "expired_date": c.PostForm("expired_date"),
	}
	doc, err := h.svc.ReUploadDraft(c.Param("id"), c.GetString("user_id"), file, header, c.PostForm("notes"), updatedFields)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal re-upload draft", err.Error())
		return
	}
	userResp, _ := getUserFromContext(c)
	h.notifier.DocumentReUploaded(doc, userResp.Name, doc.CurrentVersion)
	utils.SuccessResponse(c, http.StatusOK, "Draft revisi berhasil dikirim", doc)
}

func (h *documentHandler) UploadFinal(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File Final SKBDN diperlukan", err.Error())
		return
	}
	defer file.Close()

	doc, err := h.svc.UploadFinal(c.Param("id"), c.GetString("user_id"), file, header, c.PostForm("notes"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal upload Final SKBDN", err.Error())
		return
	}
	userResp, _ := getUserFromContext(c)
	h.notifier.DocumentReUploaded(doc, userResp.Name, doc.CurrentVersion)
	utils.SuccessResponse(c, http.StatusOK, "Final SKBDN berhasil dikirim", doc)
}

func (h *documentHandler) ReUploadFinal(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File diperlukan", err.Error())
		return
	}
	defer file.Close()

	doc, err := h.svc.ReUploadFinal(c.Param("id"), c.GetString("user_id"), file, header, c.PostForm("notes"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal re-upload Final", err.Error())
		return
	}
	userResp, _ := getUserFromContext(c)
	h.notifier.DocumentReUploaded(doc, userResp.Name, doc.CurrentVersion)
	utils.SuccessResponse(c, http.StatusOK, "Final SKBDN revisi berhasil dikirim", doc)
}

func (h *documentHandler) GetDocuments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	result, err := h.svc.GetDocumentList(services.GetDocumentListParams{
		UserID:       c.GetString("user_id"),
		Role:         models.Role(c.GetString("role")),
		Page:         page,
		Limit:        limit,
		Status:       c.Query("status"),
		Search:       c.Query("search"),
		SortBy:       c.Query("sort"),
		DateFrom:     c.Query("date_from"),
		DateTo:       c.Query("date_to"),
		ExpiringSoon: c.Query("expiring_soon") == "true",
	})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Data dokumen", result)
}

func (h *documentHandler) GetDocument(c *gin.Context) {
	doc, fileURL, downloadURL, err := h.svc.GetDocument(
		c.Param("id"), c.GetString("user_id"), models.Role(c.GetString("role")),
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Dokumen tidak ditemukan", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Detail dokumen", gin.H{
		"document":     doc,
		"file_url":     fileURL,
		"download_url": downloadURL,
	})
}

func (h *documentHandler) UpdateStatus(c *gin.Context) {
	var req services.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	doc, err := h.svc.UpdateStatus(
		c.Param("id"), c.GetString("user_id"),
		models.Role(c.GetString("role")), req,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal mengubah status", err.Error())
		return
	}
	// WebSocket notifikasi real-time (service sudah simpan ke DB notifications)
	userResp, _ := getUserFromContext(c)
	h.dispatchWSNotification(doc, req.Status, userResp, req.Notes)
	utils.SuccessResponse(c, http.StatusOK, "Status diperbarui", doc)
}

// dispatchWSNotification — WebSocket hanya sebagai saluran real-time.
// DB notification sudah diurus oleh service.sendStatusNotification.
func (h *documentHandler) dispatchWSNotification(
	doc *models.Document,
	status models.DocumentStatus,
	actor models.UserResponse,
	notes string,
) {
	actorID := actor.ID.String()
	switch status {
	case models.StatusDraftUnderReview, models.StatusFinalUnderReview:
		h.notifier.DocumentForwarded(doc, actor.Name, actorID)
	case models.StatusDraftRevisionBuyer:
		h.notifier.DraftRevisionRequested(doc, actor.Name, actorID, notes)
	case models.StatusDraftApproved:
		h.notifier.DraftApproved(doc, actor.Name, actorID)
	case models.StatusRevisionRequested:
		h.notifier.RevisionRequested(doc, actor.Name, actorID, notes)
	case models.StatusApproved:
		h.notifier.DocumentApproved(doc, actor.Name, actorID)
	case models.StatusRejected:
		h.notifier.DocumentRejected(doc, actor.Name, actorID, notes)
	}
}

func (h *documentHandler) MarkDisbursed(c *gin.Context) {
	doc, err := h.svc.MarkDisbursed(c.Param("id"), c.GetString("user_id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal mencairkan SKBDN", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "SKBDN berhasil dicairkan", doc)
}

func (h *documentHandler) GetMonitoringStats(c *gin.Context) {
	stats, err := h.svc.GetMonitoringStats(c.GetString("user_id"), models.Role(c.GetString("role")))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal ambil statistik", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Statistik monitoring", stats)
}

func (h *documentHandler) GetAllVersions(c *gin.Context) {
	versions, err := h.svc.GetAllVersions(c.Param("id"), c.GetString("user_id"), models.Role(c.GetString("role")))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal ambil versi", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Daftar versi", versions)
}

func (h *documentHandler) GetRevisionHistory(c *gin.Context) {
	history, err := h.svc.GetRevisionHistory(c.Param("id"), c.GetString("user_id"), models.Role(c.GetString("role")))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal ambil riwayat", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Riwayat dokumen", history)
}

func (h *documentHandler) GetVersionURL(c *gin.Context) {
	url, err := h.svc.GetVersionFileURL(
		c.Param("id"), c.Param("version"),
		c.GetString("user_id"), models.Role(c.GetString("role")),
		true, // preview
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal ambil URL", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "URL file", gin.H{"url": url})
}

func (h *documentHandler) CreateDocumentForBuyer(c *gin.Context) {
	buyerID := c.Param("buyerID")
	if buyerID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "buyerID diperlukan", "")
		return
	}
	var req services.CreateDocumentRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File diperlukan", err.Error())
		return
	}
	defer file.Close()

	doc, err := h.svc.CreateDocumentForBuyer(c.GetString("user_id"), buyerID, req, file, header)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal upload dokumen atas nama buyer", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Draft SKBDN berhasil dibuat atas nama buyer", doc)
}

func (h *documentHandler) GetBuyerList(c *gin.Context) {
	buyers, err := h.svc.GetBuyerList()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil daftar buyer", err.Error())
		return
	}
	type BuyerItem struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Email       string `json:"email"`
		CompanyName string `json:"company_name"`
	}
	result := make([]BuyerItem, len(buyers))
	for i, b := range buyers {
		result[i] = BuyerItem{
			ID: b.ID.String(), Name: b.Name,
			Email: b.Email, CompanyName: b.CompanyName,
		}
	}
	utils.SuccessResponse(c, http.StatusOK, "Daftar buyer", result)
}

func (h *documentHandler) UploadRevisionAttachment(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File diperlukan", err.Error())
		return
	}
	defer file.Close()

	// Validasi tipe file attachment (gambar atau PDF)
	mimeType := header.Header.Get("Content-Type")
	allowed := map[string]bool{
		"image/jpeg": true, "image/png": true,
		"image/webp": true, "application/pdf": true,
	}
	if !allowed[mimeType] {
		utils.ErrorResponse(c, http.StatusBadRequest, "Hanya JPG, PNG, WebP, atau PDF", "")
		return
	}
	if header.Size > 5*1024*1024 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Ukuran file maksimal 5 MB", "")
		return
	}

	docID      := c.Param("id")
	uploaderID := c.GetString("user_id")
	folder     := "revision-attachments/" + docID + "/" + uploaderID

	filePath, err := storagepkg.UploadFile(file, header, folder)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal upload file", "")
		return
	}
	fileURL, err := storagepkg.GetFileURL(filePath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal generate URL", "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "File berhasil diupload", gin.H{
		"url":       fileURL,
		"file_name": header.Filename,
		"file_size": header.Size,
		"mime_type": mimeType,
	})
}

// ─── Notifikasi ───────────────────────────────────────────────────────────────
// Operasi CRUD notifikasi adalah thin wrapper ke repository.
// Tidak ada business logic — tidak perlu melewati service.

func (h *documentHandler) GetUserNotifications(c *gin.Context) {
	notifs, err := h.docRepo.GetNotifications(c.GetString("user_id"), 50)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal ambil notifikasi", "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Notifikasi", notifs)
}

func (h *documentHandler) MarkNotificationRead(c *gin.Context) {
	if err := h.docRepo.MarkNotificationRead(c.Param("id"), c.GetString("user_id")); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update notifikasi", "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Notifikasi ditandai dibaca", nil)
}

func (h *documentHandler) MarkAllNotificationsRead(c *gin.Context) {
	if err := h.docRepo.MarkAllNotificationsRead(c.GetString("user_id")); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update notifikasi", "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Semua notifikasi ditandai dibaca", nil)
}
