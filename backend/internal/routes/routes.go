package routes

import (
	"net/http"
	"time"

	"pusri-backend/internal/handlers"
	"pusri-backend/internal/middleware"
	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"
	"pusri-backend/internal/services"
	"pusri-backend/pkg/database"

	"github.com/gin-gonic/gin"
)

// JWTSecretProvider adalah interface minimal untuk routes mendapatkan JWT secret
// tanpa harus bergantung pada seluruh AppConfig.
type JWTSecretProvider interface {
	JWTSecret() string
}

// SetupRoutes menerima semua dependency secara eksplisit (bukan inisialisasi sendiri).
// Ini adalah pola Dependency Injection yang benar: main() yang mengontrol lifecycle,
// routes hanya menerima apa yang dibutuhkan.
func SetupRoutes(
	r *gin.Engine,
	loginRL gin.HandlerFunc,
	authSvc services.AuthServiceInterface,
	docSvc services.DocumentServiceInterface,
	annSvc services.AnnotationServiceInterface,
	userRepo repository.UserRepository,
	docRepo repository.DocumentRepository,
	jwtProvider JWTSecretProvider,
) {
	authH  := handlers.NewAuthHandler(authSvc)
	docH   := handlers.NewDocumentHandler(docSvc, docRepo)
	annH   := handlers.NewAnnotationHandler(annSvc)
	adminH := handlers.NewAdminHandler(authSvc, userRepo, docRepo)

	jwtSecret := jwtProvider.JWTSecret()

	api := r.Group("/api")

	// ── Health check ─────────────────────────────────────────────────────────
	// Cek konektivitas DB dan status sistem — bukan sekadar return 200.
	api.GET("/health", func(c *gin.Context) {
		dbOK := database.Ping() == nil
		status := "ok"
		httpCode := http.StatusOK
		if !dbOK {
			status = "degraded"
			httpCode = http.StatusServiceUnavailable
		}
		c.JSON(httpCode, gin.H{
			"status":    status,
			"timestamp": time.Now().Format(time.RFC3339),
			"database":  map[string]bool{"ok": dbOK},
		})
	})

	// ── Auth public ──────────────────────────────────────────────────────────
	auth := api.Group("/auth")
	auth.POST("/login",   loginRL, authH.Login)
	auth.POST("/refresh", authH.RefreshToken)

	// ── Authenticated ────────────────────────────────────────────────────────
	p := api.Group("/")
	p.Use(middleware.AuthMiddleware(jwtSecret))

	p.GET("/me",                         authH.GetMe)
	p.PUT("/auth/profile",               authH.UpdateProfile)
	p.PUT("/auth/password",              authH.ChangePassword)
	p.GET("/notifications",              docH.GetUserNotifications)
	p.PATCH("/notifications/:id/read",   docH.MarkNotificationRead)
	p.PATCH("/notifications/read-all",   docH.MarkAllNotificationsRead)

	// Baca dokumen (semua role)
	p.GET("/documents",                            docH.GetDocuments)
	p.GET("/documents/stats",                      docH.GetMonitoringStats)
	p.GET("/documents/:id",                        docH.GetDocument)
	p.GET("/documents/:id/history",               docH.GetRevisionHistory)
	p.GET("/documents/:id/versions",              docH.GetAllVersions)
	p.GET("/documents/:id/versions/:version/url", docH.GetVersionURL)
	p.GET("/documents/:id/annotations",           annH.GetAllPages)
	p.GET("/documents/:id/annotations/summary",   annH.GetSummary)
	p.GET("/documents/:id/annotations/page/:page", annH.GetPage)

	// ── BUYER ─────────────────────────────────────────────────────────────────
	buyer := p.Group("/")
	buyer.Use(middleware.RoleRequired(models.RoleBuyer))
	buyer.POST("/documents",                    docH.CreateDocument)
	buyer.POST("/documents/:id/reupload-draft", docH.ReUploadDraft)
	buyer.POST("/documents/:id/upload-final",   docH.UploadFinal)
	buyer.POST("/documents/:id/reupload-final", docH.ReUploadFinal)

	// ── AP2 ───────────────────────────────────────────────────────────────────
	ap2 := p.Group("/")
	ap2.Use(middleware.RoleRequired(models.RoleAP2))
	ap2.PUT("/documents/:id/verify", docH.UpdateStatus)

	// ── FINANCE ───────────────────────────────────────────────────────────────
	fin := p.Group("/")
	fin.Use(middleware.RoleRequired(models.RoleFinance))
	fin.PUT("/documents/:id/review", docH.UpdateStatus)

	// ── AP2 + FINANCE (anotasi & attachment) ──────────────────────────────────
	rev := p.Group("/")
	rev.Use(middleware.RoleRequired(models.RoleAP2, models.RoleFinance))
	rev.POST("/documents/:id/revision-attachment",  docH.UploadRevisionAttachment)
	rev.POST("/documents/:id/annotations",          annH.SavePage)
	rev.DELETE("/documents/:id/annotations/object", annH.DeleteObject)
	rev.PATCH("/annotations/:ann_id/resolve",       annH.MarkResolved)

	// ── ADMIN (pencairan) ─────────────────────────────────────────────────────
	adm := p.Group("/")
	adm.Use(middleware.RoleRequired(models.RoleAdmin))
	adm.PUT("/documents/:id/status",    docH.UpdateStatus)
	adm.POST("/documents/:id/disburse", docH.MarkDisbursed)

	// ── AP2 + ADMIN (upload atas nama buyer) ──────────────────────────────────
	upload := p.Group("/")
	upload.Use(middleware.RoleRequired(models.RoleAP2, models.RoleAdmin))
	upload.GET("/buyers",                        docH.GetBuyerList)
	upload.POST("/documents/for-buyer/:buyerID", docH.CreateDocumentForBuyer)

	// ── ADMIN ONLY (manajemen user) ────────────────────────────────────────────
	userMgmt := p.Group("/admin")
	userMgmt.Use(middleware.RoleRequired(models.RoleAdmin))
	userMgmt.POST("/users",             adminH.CreateUser)
	userMgmt.GET("/users",              adminH.GetAllUsers)
	userMgmt.PATCH("/users/:id/toggle", adminH.ToggleUserActive)
	userMgmt.PUT("/users/:id",          adminH.UpdateUser)
	userMgmt.DELETE("/users/:id",       adminH.DeleteUser)

	// ── ADMIN + AP2 (monitoring) ──────────────────────────────────────────────
	monitor := p.Group("/admin")
	monitor.Use(middleware.RoleRequired(models.RoleAdmin, models.RoleAP2))
	monitor.GET("/stats",         adminH.GetDashboardStats)
	monitor.GET("/all-documents", adminH.GetAllDocuments)
	monitor.GET("/activity",      adminH.GetSystemActivity)
}
