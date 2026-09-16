package handlers

import (
	"net/http"
	"strconv"

	"pusri-backend/internal/models"
	"pusri-backend/internal/services"
	"pusri-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

type annotationHandler struct {
	svc services.AnnotationServiceInterface
}

func NewAnnotationHandler(svc services.AnnotationServiceInterface) *annotationHandler {
	return &annotationHandler{svc: svc}
}

func (h *annotationHandler) SavePage(c *gin.Context) {
	var req services.SavePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	ann, err := h.svc.SavePage(
		c.Param("id"), c.GetString("user_id"),
		models.Role(c.GetString("role")), req,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal menyimpan anotasi", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Anotasi disimpan", ann)
}

func (h *annotationHandler) GetPage(c *gin.Context) {
	pageStr := c.Param("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Nomor halaman tidak valid", "")
		return
	}
	versionID := c.Query("version_id")
	if versionID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "version_id diperlukan", "")
		return
	}
	ann, err := h.svc.GetPage(
		c.Param("id"), versionID, page,
		c.GetString("user_id"), models.Role(c.GetString("role")),
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, "Gagal mengambil anotasi", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Data anotasi halaman", ann)
}

func (h *annotationHandler) GetAllPages(c *gin.Context) {
	versionID := c.Query("version_id")
	if versionID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "version_id diperlukan", "")
		return
	}
	anns, err := h.svc.GetAllPages(
		c.Param("id"), versionID,
		c.GetString("user_id"), models.Role(c.GetString("role")),
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, "Gagal mengambil anotasi", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Semua anotasi dokumen", anns)
}

func (h *annotationHandler) GetSummary(c *gin.Context) {
	versionID := c.Query("version_id")
	if versionID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "version_id diperlukan", "")
		return
	}
	summary, err := h.svc.GetSummary(
		c.Param("id"), versionID,
		c.GetString("user_id"), models.Role(c.GetString("role")),
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, "Gagal mengambil ringkasan", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Ringkasan anotasi", summary)
}

func (h *annotationHandler) DeleteObject(c *gin.Context) {
	var req services.DeleteObjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	if err := h.svc.DeleteObject(
		c.Param("id"), c.GetString("user_id"),
		models.Role(c.GetString("role")), req,
	); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal menghapus objek", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Objek anotasi dihapus", nil)
}

func (h *annotationHandler) MarkResolved(c *gin.Context) {
	// Perbaikan: versi lama mengabaikan error binding (c.ShouldBindJSON(&body) hasilnya dibuang)
	var body struct {
		Resolved bool `json:"resolved"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	if err := h.svc.MarkResolved(
		c.Param("ann_id"), c.GetString("user_id"),
		models.Role(c.GetString("role")), body.Resolved,
	); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal update status anotasi", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Status anotasi diperbarui", nil)
}
