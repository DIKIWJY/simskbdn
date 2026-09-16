package middleware

import (
	"net/http"
	"strings"
	"sync"

	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"
	"pusri-backend/internal/services"
	"pusri-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

// Singleton user repository — dibuat sekali, dipakai semua request.
var (
	sharedUserRepo     repository.UserRepository
	sharedUserRepoOnce sync.Once
)

// InitAuthMiddleware harus dipanggil sekali dari main() setelah DB tersambung.
func InitAuthMiddleware(userRepo repository.UserRepository) {
	sharedUserRepoOnce.Do(func() {
		sharedUserRepo = userRepo
	})
}

// AuthMiddleware — validasi JWT, load user terbaru dari DB, blokir akun nonaktif.
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Token diperlukan", "")
			c.Abort()
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if len(tokenStr) > 2048 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Token tidak valid", "")
			c.Abort()
			return
		}
		claims, err := services.ValidateToken(tokenStr, jwtSecret)
		if err != nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Token tidak valid atau kadaluarsa", "")
			c.Abort()
			return
		}
		user, err := sharedUserRepo.FindByID(claims.UserID)
		if err != nil || user == nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User tidak ditemukan", "")
			c.Abort()
			return
		}
		if !user.IsActive {
			utils.ErrorResponse(c, http.StatusForbidden, "Akun tidak aktif, hubungi administrator", "")
			c.Abort()
			return
		}
		c.Set("user", user.ToResponse())
		c.Set("user_id", claims.UserID)
		c.Set("role", string(claims.Role))
		c.Next()
	}
}

// RoleRequired — guard akses berdasarkan satu atau lebih role.
func RoleRequired(roles ...models.Role) gin.HandlerFunc {
	// Pre-compute set of allowed roles — O(1) lookup saat request masuk
	allowed := make(map[models.Role]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		roleStr, exists := c.Get("role")
		if !exists {
			utils.ErrorResponse(c, http.StatusForbidden, "Akses ditolak", "")
			c.Abort()
			return
		}
		currentRole := models.Role(roleStr.(string))
		if _, ok := allowed[currentRole]; ok {
			c.Next()
			return
		}
		utils.ErrorResponse(c, http.StatusForbidden, "Anda tidak memiliki akses ke fitur ini", "")
		c.Abort()
	}
}
