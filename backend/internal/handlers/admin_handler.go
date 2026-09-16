package handlers

import (
	"net/http"
	"strconv"
	"time"

	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"
	"pusri-backend/internal/services"
	"pusri-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

type adminHandler struct {
	authSvc  services.AuthServiceInterface
	userRepo repository.UserRepository
	docRepo  repository.DocumentRepository
}

// NewAdminHandler menerima service dan repository sebagai interface — tidak ada concrete type.
func NewAdminHandler(
	authSvc services.AuthServiceInterface,
	userRepo repository.UserRepository,
	docRepo repository.DocumentRepository,
) *adminHandler {
	return &adminHandler{authSvc: authSvc, userRepo: userRepo, docRepo: docRepo}
}

// ─── User management ──────────────────────────────────────────────────────────

func (h *adminHandler) CreateUser(c *gin.Context) {
	var req services.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	user, err := h.authSvc.Register(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Gagal membuat akun", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Akun berhasil dibuat", user)
}

func (h *adminHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userRepo.FindAllWithFilter(c.Query("search"), c.Query("role"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data user", "")
		return
	}
	responses := make([]interface{}, len(users))
	for i, u := range users {
		resp := u.ToResponse()
		responses[i] = resp
	}
	utils.SuccessResponse(c, http.StatusOK, "Daftar user", responses)
}

func (h *adminHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		Name        string `json:"name"         binding:"omitempty,max=100"`
		Email       string `json:"email"        binding:"omitempty,email,max=255"`
		Role        string `json:"role"         binding:"omitempty,oneof=buyer ap2 finance admin"`
		CompanyName string `json:"company_name" binding:"omitempty,max=200"`
		PhoneNumber string `json:"phone_number" binding:"omitempty,max=20"`
		Password    string `json:"password"     binding:"omitempty,min=8,max=128"`
		IsActive    *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	// Cek email unik jika diubah
	if req.Email != "" {
		taken, err := h.userRepo.IsEmailTaken(req.Email, userID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memeriksa email", "")
			return
		}
		if taken {
			utils.ErrorResponse(c, http.StatusConflict, "Email sudah digunakan akun lain", "")
			return
		}
	}

	updates := map[string]interface{}{
		"company_name": req.CompanyName,
		"phone_number": req.PhoneNumber,
	}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Password != "" {
		// PERBAIKAN BUG: versi sebelumnya menerima field password dari form
		// tapi TIDAK PERNAH benar-benar mengubahnya (hanya komentar, tidak ada
		// eksekusi) — admin akan melihat respons sukses padahal password user
		// tidak berubah sama sekali. Sekarang benar-benar di-hash dan disimpan
		// lewat AuthService.AdminResetPassword (konsisten dengan bcrypt cost
		// yang sama seperti Register/ChangePassword).
		if len(req.Password) < 8 {
			utils.ErrorResponse(c, http.StatusBadRequest, "Password minimal 8 karakter", "")
			return
		}
		if err := h.authSvc.AdminResetPassword(userID, req.Password); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mereset password", "")
			return
		}
	}

	if err := h.userRepo.Update(userID, updates); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update user", "")
		return
	}

	user, _ := h.userRepo.FindByID(userID)
	if user == nil {
		utils.SuccessResponse(c, http.StatusOK, "User berhasil diupdate", nil)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User berhasil diupdate", user.ToResponse())
}

func (h *adminHandler) DeleteUser(c *gin.Context) {
	if err := h.userRepo.Delete(c.Param("id")); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal hapus user", "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User berhasil dihapus", nil)
}

func (h *adminHandler) ToggleUserActive(c *gin.Context) {
	user, err := h.userRepo.ToggleActive(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User tidak ditemukan", "")
		return
	}
	msg := "User diaktifkan"
	if !user.IsActive {
		msg = "User dinonaktifkan"
	}
	utils.SuccessResponse(c, http.StatusOK, msg, user.ToResponse())
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
// Semua akses DB melalui repository — tidak ada database.GetDB() di handler.

func (h *adminHandler) GetDashboardStats(c *gin.Context) {
	userID := c.GetString("user_id")
	// Ambil stats dokumen dari docRepo (sudah tersedia)
	// Untuk stats user, kita buat query sederhana melalui userRepo
	allUsers, err := h.userRepo.FindAllWithFilter("", "")
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat statistik", "")
		return
	}
	// Hitung per role
	var totalBuyers, totalFinance, totalAP2 int64
	for _, u := range allUsers {
		switch u.Role {
		case "buyer":
			totalBuyers++
		case "finance":
			totalFinance++
		case "ap2":
			totalAP2++
		}
	}

	// Ambil stats dokumen dari docRepo
	docStats, err := h.docRepo.GetMonitoringStats(userID, models.RoleAdmin)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memuat statistik dokumen", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Statistik dashboard", gin.H{
		"total_users":   int64(len(allUsers)),
		"total_buyers":  totalBuyers,
		"total_finance": totalFinance,
		"total_ap2":     totalAP2,
		"documents":     docStats,
	})
}

func (h *adminHandler) GetAllDocuments(c *gin.Context) {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit > 200 {
		limit = 200
	}
	docs, total, err := h.docRepo.FindAll(repository.DocumentQueryParams{
		Page: page, Limit: limit, Status: status,
	})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil dokumen", "")
		return
	}
	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}
	utils.SuccessResponse(c, http.StatusOK, "Semua dokumen", gin.H{
		"data":        docs,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

func (h *adminHandler) GetSystemActivity(c *gin.Context) {
	// Ambil riwayat aktivitas — untuk sementara ambil dari beberapa dokumen terakhir
	// Ini bisa diperluas dengan dedicated ActivityLog table di iterasi berikutnya
	docs, _, err := h.docRepo.FindAll(repository.DocumentQueryParams{Page: 1, Limit: 50})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal ambil aktivitas", "")
		return
	}
	// Kumpulkan revision history dari dokumen-dokumen terakhir
	var activity []interface{}
	for _, doc := range docs {
		history, err := h.docRepo.GetRevisionHistory(doc.ID.String())
		if err != nil {
			continue
		}
		for _, entry := range history {
			activity = append(activity, entry)
		}
		if len(activity) >= 50 {
			break
		}
	}
	utils.SuccessResponse(c, http.StatusOK, "Aktivitas sistem", gin.H{
		"activity":     activity,
		"generated_at": time.Now(),
	})
}
