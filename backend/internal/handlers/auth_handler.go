package handlers

import (
	"net/http"

	"pusri-backend/internal/models"
	"pusri-backend/internal/services"
	"pusri-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

// authHandler — HANYA parse request, panggil service, kembalikan response.
// Tidak ada logika bisnis di sini.
type authHandler struct {
	svc services.AuthServiceInterface
}

func NewAuthHandler(svc services.AuthServiceInterface) *authHandler {
	return &authHandler{svc: svc}
}

func (h *authHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	pair, err := h.svc.Login(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login gagal", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Login berhasil", pair)
}

func (h *authHandler) RefreshToken(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Refresh token diperlukan", err.Error())
		return
	}
	pair, err := h.svc.RefreshToken(body.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Refresh token tidak valid", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Token diperbarui", pair)
}

func (h *authHandler) GetMe(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Tidak terautentikasi", "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Data user", user)
}

// UpdateProfile — logika bisnis (cek email unik, update) ada di authService.UpdateProfile.
func (h *authHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	var req services.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	user, err := h.svc.UpdateProfile(userID, req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "email sudah digunakan oleh akun lain" {
			status = http.StatusConflict
		}
		utils.ErrorResponse(c, status, err.Error(), "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Profil berhasil diperbarui", user)
}

// ChangePassword — logika bisnis ada di authService.ChangePassword.
func (h *authHandler) ChangePassword(c *gin.Context) {
	userID := c.GetString("user_id")
	var req services.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	if err := h.svc.ChangePassword(userID, req); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "password saat ini salah" || err.Error() == "password baru harus berbeda dari password saat ini" {
			status = http.StatusBadRequest
		}
		utils.ErrorResponse(c, status, err.Error(), "")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Password berhasil diubah", nil)
}

// getUserFromContext — helper aman untuk ambil user dari context Gin.
func getUserFromContext(c *gin.Context) (models.UserResponse, bool) {
	v, exists := c.Get("user")
	if !exists {
		return models.UserResponse{}, false
	}
	u, ok := v.(models.UserResponse)
	return u, ok
}
