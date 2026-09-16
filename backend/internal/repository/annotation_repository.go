package repository

import (
	"pusri-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type annotationRepo struct {
	db *gorm.DB
}

func NewAnnotationRepository(db *gorm.DB) AnnotationRepository {
	return &annotationRepo{db: db}
}

func (r *annotationRepo) UpsertPage(ann *models.Annotation) error {
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "document_id"},
			{Name: "version_id"},
			{Name: "page_number"},
			{Name: "annotator_id"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"annotation_data", "summary", "updated_at",
		}),
	}).Create(ann).Error
}

func (r *annotationRepo) FindByID(annID string) (*models.Annotation, error) {
	var ann models.Annotation
	err := r.db.Where("id = ?", annID).First(&ann).Error
	if err != nil {
		return nil, err
	}
	return &ann, nil
}

func (r *annotationRepo) FindByPage(docID, versionID string, page int) (*models.Annotation, error) {
	var ann models.Annotation
	err := r.db.Preload("Annotator").
		Where("document_id = ? AND version_id = ? AND page_number = ?", docID, versionID, page).
		First(&ann).Error
	if err != nil {
		return nil, err
	}
	return &ann, nil
}

func (r *annotationRepo) FindAllByDocument(docID, versionID string) ([]models.Annotation, error) {
	var anns []models.Annotation
	err := r.db.Preload("Annotator").
		Where("document_id = ? AND version_id = ?", docID, versionID).
		Order("page_number ASC").
		Find(&anns).Error
	return anns, err
}

func (r *annotationRepo) GetSummary(docID, versionID string) ([]models.PageAnnotation, error) {
	type row struct {
		PageNumber int
		Count      int
		AnnID      uuid.UUID
	}
	var rows []row
	err := r.db.Raw(`
		SELECT
			page_number,
			jsonb_array_length(summary::jsonb) AS count,
			id AS ann_id
		FROM annotations
		WHERE document_id = ? AND version_id = ?
		ORDER BY page_number ASC
	`, docID, versionID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	pages := make([]models.PageAnnotation, 0, len(rows))
	for _, r := range rows {
		pages = append(pages, models.PageAnnotation{
			PageNumber:   r.PageNumber,
			HasData:      r.Count > 0,
			ItemCount:    r.Count,
			AnnotationID: r.AnnID.String(),
		})
	}
	return pages, nil
}

func (r *annotationRepo) DeleteAnnotationObject(annID, objectID string) error {
	return r.db.Exec(`
		UPDATE annotations
		SET annotation_data = jsonb_set(
			annotation_data,
			'{objects}',
			(
				SELECT jsonb_agg(obj)
				FROM jsonb_array_elements(annotation_data->'objects') AS obj
				WHERE obj->>'id' != ?
			)
		),
		updated_at = NOW()
		WHERE id = ?
	`, objectID, annID).Error
}

func (r *annotationRepo) MarkResolved(annID string, resolved bool) error {
	return r.db.Model(&models.Annotation{}).
		Where("id = ?", annID).
		Update("is_resolved", resolved).Error
}

func (r *annotationRepo) DeleteAllByVersion(docID, versionID string) error {
	return r.db.
		Where("document_id = ? AND version_id = ?", docID, versionID).
		Delete(&models.Annotation{}).Error
}
