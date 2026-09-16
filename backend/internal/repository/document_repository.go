package repository

import (
	"strings"
	"time"

	"pusri-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type documentRepo struct {
	db *gorm.DB
}

func NewDocumentRepository(db *gorm.DB) DocumentRepository {
	return &documentRepo{db: db}
}

func (r *documentRepo) Create(doc *models.Document) error {
	return r.db.Create(doc).Error
}

func (r *documentRepo) CreateVersion(v *models.DocumentVersion) error {
	return r.db.Create(v).Error
}

func (r *documentRepo) FindByID(id string) (*models.Document, error) {
	var doc models.Document
	err := r.db.
		Preload("Buyer").
		Preload("Versions", func(db *gorm.DB) *gorm.DB {
			return db.Order("version_number DESC")
		}).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&doc).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

// FindAll menggunakan DocumentQueryParams alih-alih 10 parameter terpisah.
// Clean Code: "avoid long parameter list" — Martin, Clean Code ch.3.
func (r *documentRepo) FindAll(p DocumentQueryParams) ([]models.Document, int64, error) {
	var docs []models.Document
	var total int64

	query := r.db.Model(&models.Document{}).
		Preload("Buyer").
		Where("documents.deleted_at IS NULL")

	if p.Role == models.RoleBuyer {
		query = query.Where("buyer_id = ?", p.UserID)
	}

	if p.Status != "" {
		statuses := strings.Split(p.Status, ",")
		if len(statuses) == 1 {
			query = query.Where("status = ?", statuses[0])
		} else {
			query = query.Where("status IN ?", statuses)
		}
	}

	if p.Search != "" {
		like := "%" + strings.ToLower(p.Search) + "%"
		query = query.Where(
			"LOWER(title) LIKE ? OR LOWER(skbdn_number) LIKE ? OR LOWER(contract_number) LIKE ? OR LOWER(goods_type) LIKE ?",
			like, like, like, like,
		)
	}

	if p.DateFrom != "" {
		query = query.Where("created_at >= ?", p.DateFrom+" 00:00:00")
	}
	if p.DateTo != "" {
		query = query.Where("created_at <= ?", p.DateTo+" 23:59:59")
	}

	if p.ExpiringSoon {
		query = query.Where(
			"expired_date IS NOT NULL AND expired_date <= NOW() + INTERVAL '14 days' AND expired_date > NOW()",
		)
	}

	query.Count(&total)

	order := r.buildOrderClause(p.SortBy)
	offset := (p.Page - 1) * p.Limit
	err := query.Order(order).Offset(offset).Limit(p.Limit).Find(&docs).Error
	return docs, total, err
}

func (r *documentRepo) buildOrderClause(sortBy string) string {
	clauses := map[string]string{
		"expiry_asc":   "expired_date ASC NULLS LAST",
		"expiry_desc":  "expired_date DESC NULLS LAST",
		"value_desc":   "total_price DESC",
		"value_asc":    "total_price ASC",
		"created_asc":  "created_at ASC",
		"created_desc": "created_at DESC",
	}
	if clause, ok := clauses[sortBy]; ok {
		return clause
	}
	return "updated_at DESC"
}

// UpdateStatus menerima string userID dan parse di sini — bukan di service.
func (r *documentRepo) UpdateStatus(id string, status models.DocumentStatus, updaterIDStr string) error {
	updaterID, err := uuid.Parse(updaterIDStr)
	if err != nil {
		return err
	}

	updates := map[string]interface{}{"status": status}

	switch status {
	case models.StatusDraftUnderReview, models.StatusFinalUnderReview,
		models.StatusDraftRevisionBuyer, models.StatusDraftVerifiedAP2,
		models.StatusFinalSentToFinance, models.StatusReceivedSales:
		updates["forwarded_by"] = updaterID
	case models.StatusDraftApproved, models.StatusApproved,
		models.StatusRevisionRequested, models.StatusRejected,
		models.StatusDisbursed, models.StatusUnderReview:
		updates["reviewed_by"] = updaterID
	}

	if status == models.StatusApproved {
		now := time.Now()
		updates["approved_at"] = &now
	}
	if status == models.StatusDisbursed {
		now := time.Now()
		updates["disbursed_at"] = &now
	}

	return r.db.Model(&models.Document{}).Where("id = ?", id).Updates(updates).Error
}

func (r *documentRepo) UpdateFields(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.Document{}).Where("id = ?", id).Updates(updates).Error
}

func (r *documentRepo) UnsetCurrentVersion(docID string) error {
	return r.db.Model(&models.DocumentVersion{}).
		Where("document_id = ?", docID).
		Update("is_current", false).Error
}

func (r *documentRepo) GetLatestVersion(docID string) (*models.DocumentVersion, error) {
	var v models.DocumentVersion
	err := r.db.Where("document_id = ?", docID).Order("version_number DESC").First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *documentRepo) GetAllVersions(docID string) ([]models.DocumentVersion, error) {
	var versions []models.DocumentVersion
	err := r.db.Where("document_id = ?", docID).Order("version_number ASC").Find(&versions).Error
	return versions, err
}

func (r *documentRepo) GetAllVersionsWithUploader(docID string) ([]models.DocumentVersion, error) {
	var versions []models.DocumentVersion
	err := r.db.Preload("Uploader").
		Where("document_id = ?", docID).
		Order("version_number DESC").
		Find(&versions).Error
	return versions, err
}

func (r *documentRepo) SaveRevisionHistory(h *models.RevisionHistory) error {
	return r.db.Create(h).Error
}

func (r *documentRepo) GetRevisionHistory(docID string) ([]models.RevisionHistory, error) {
	var history []models.RevisionHistory
	err := r.db.Preload("Actor").
		Where("document_id = ?", docID).
		Order("created_at ASC").
		Find(&history).Error
	return history, err
}

func (r *documentRepo) CreateNotification(n *models.Notification) error {
	return r.db.Create(n).Error
}

func (r *documentRepo) GetNotifications(userID string, limit int) ([]models.Notification, error) {
	var notifs []models.Notification
	if limit <= 0 {
		limit = 50
	}
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifs).Error
	return notifs, err
}

func (r *documentRepo) MarkNotificationRead(notifID, userID string) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notifID, userID).
		Update("is_read", true).Error
}

func (r *documentRepo) MarkAllNotificationsRead(userID string) error {
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Update("is_read", true).Error
}

func (r *documentRepo) GetMonitoringStats(userID string, role models.Role) (*models.MonitoringStats, error) {
	stats := &models.MonitoringStats{}
	base := r.db.Model(&models.Document{}).Where("deleted_at IS NULL")
	if role == models.RoleBuyer {
		base = base.Where("buyer_id = ?", userID)
	}

	base.Session(&gorm.Session{}).Count(&stats.Total)

	if role == models.RoleAP2 {
		base.Session(&gorm.Session{}).Where("status IN ?", []models.DocumentStatus{
			models.StatusDraftSubmitted, models.StatusFinalSubmitted,
		}).Count(&stats.PendingReview)
		base.Session(&gorm.Session{}).Where("status IN ?", []models.DocumentStatus{
			models.StatusDraftUnderReview, models.StatusFinalUnderReview, models.StatusUnderReview,
		}).Count(&stats.UnderReview)
	} else {
		base.Session(&gorm.Session{}).Where("status IN ?", []models.DocumentStatus{
			models.StatusDraftUnderReview, models.StatusFinalUnderReview, models.StatusFinalSentToFinance,
		}).Count(&stats.PendingReview)
		base.Session(&gorm.Session{}).Where("status IN ?", []models.DocumentStatus{
			models.StatusFinalUnderReview, models.StatusUnderReview,
		}).Count(&stats.UnderReview)
	}

	base.Session(&gorm.Session{}).Where("status IN ?", []models.DocumentStatus{
		models.StatusDraftRevisionBuyer, models.StatusRevisionRequested,
	}).Count(&stats.NeedRevision)

	base.Session(&gorm.Session{}).Where("status = ?", models.StatusDraftApproved).Count(&stats.DraftApproved)
	base.Session(&gorm.Session{}).Where("status = ?", models.StatusApproved).Count(&stats.Approved)
	base.Session(&gorm.Session{}).Where("status = ?", models.StatusRejected).Count(&stats.Rejected)
	base.Session(&gorm.Session{}).Where("status = ?", models.StatusExpired).Count(&stats.Expired)
	base.Session(&gorm.Session{}).Where("status = ?", models.StatusDisbursed).Count(&stats.Disbursed)

	now := time.Now()
	in14Days := now.AddDate(0, 0, 14)
	base.Session(&gorm.Session{}).
		Where("expired_date IS NOT NULL").
		Where("expired_date BETWEEN ? AND ?", now, in14Days).
		Where("status NOT IN ?", []models.DocumentStatus{
			models.StatusExpired, models.StatusDisbursed, models.StatusRejected,
		}).Count(&stats.ExpiringSoon)

	type agg struct {
		TotalValue    float64
		TotalTonnage  float64
		ApprovedValue float64
	}
	var row agg
	base.Session(&gorm.Session{}).
		Where("status NOT IN ?", []models.DocumentStatus{models.StatusRejected, models.StatusExpired}).
		Select("COALESCE(SUM(total_price),0) as total_value, COALESCE(SUM(tonnage),0) as total_tonnage").
		Scan(&row)
	stats.TotalValue = row.TotalValue
	stats.TotalTonnage = row.TotalTonnage

	var approvedRow agg
	base.Session(&gorm.Session{}).
		Where("status IN ?", []models.DocumentStatus{models.StatusApproved, models.StatusDisbursed}).
		Select("COALESCE(SUM(total_price),0) as approved_value").
		Scan(&approvedRow)
	stats.ApprovedValue = approvedRow.ApprovedValue

	return stats, nil
}

func (r *documentRepo) GetExpiringSoon(daysAhead, limit int) ([]models.Document, error) {
	var docs []models.Document
	now := time.Now()
	deadline := now.AddDate(0, 0, daysAhead)
	err := r.db.Preload("Buyer").
		Where("deleted_at IS NULL").
		Where("expired_date IS NOT NULL").
		Where("expired_date BETWEEN ? AND ?", now, deadline).
		Where("status NOT IN ?", []models.DocumentStatus{
			models.StatusExpired, models.StatusDisbursed, models.StatusRejected,
		}).
		Order("expired_date ASC").
		Limit(limit).
		Find(&docs).Error
	return docs, err
}
