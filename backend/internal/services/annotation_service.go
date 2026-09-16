package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"

	"github.com/google/uuid"
)

// ─── DTOs ────────────────────────────────────────────────────────────────────

type SavePageRequest struct {
	VersionID  string                 `json:"version_id"  binding:"required"`
	PageNumber int                    `json:"page_number" binding:"required,min=1"`
	CanvasJSON map[string]interface{} `json:"canvas_json" binding:"required"`
	Items      []AnnotationItemDTO    `json:"items"`
}

type AnnotationItemDTO struct {
	ObjectID   string `json:"object_id"`
	Type       string `json:"type"`
	Comment    string `json:"comment,omitempty"`
	Color      string `json:"color,omitempty"`
	PageNumber int    `json:"page_number"`
}

type DeleteObjectRequest struct {
	AnnotationID string `json:"annotation_id" binding:"required"`
	ObjectID     string `json:"object_id"     binding:"required"`
}

// ─── annotationService ────────────────────────────────────────────────────────

type annotationService struct {
	annRepo repository.AnnotationRepository
	docRepo repository.DocumentRepository
}

func NewAnnotationService(
	annRepo repository.AnnotationRepository,
	docRepo repository.DocumentRepository,
) AnnotationServiceInterface {
	return &annotationService{annRepo: annRepo, docRepo: docRepo}
}

// ─── SavePage ─────────────────────────────────────────────────────────────────

func (s *annotationService) SavePage(
	docID, annotatorID string,
	role models.Role,
	req SavePageRequest,
) (*models.Annotation, error) {
	if role != models.RoleFinance && role != models.RoleAP2 {
		return nil, errors.New("hanya AP2 atau Keuangan yang dapat membuat anotasi")
	}
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return nil, errors.New("dokumen tidak ditemukan")
	}
	allowedStatuses := map[models.DocumentStatus]bool{
		models.StatusDraftSubmitted:    true,
		models.StatusFinalSubmitted:    true,
		models.StatusDraftUnderReview:  true,
		models.StatusFinalUnderReview:  true,
		models.StatusRevisionRequested: true,
		models.StatusUnderReview:       true,
	}
	if !allowedStatuses[doc.Status] {
		return nil, fmt.Errorf(
			"anotasi hanya diizinkan saat dokumen dalam proses verifikasi/review (status saat ini: %s)",
			doc.Status,
		)
	}

	// Validasi UUID eksplisit — tidak ada lagi silent error
	versionUUID, err := uuid.Parse(req.VersionID)
	if err != nil {
		return nil, errors.New("version_id tidak valid")
	}
	docUUID, err := uuid.Parse(docID)
	if err != nil {
		return nil, errors.New("document ID tidak valid")
	}
	annotatorUUID, err := uuid.Parse(annotatorID)
	if err != nil {
		return nil, errors.New("annotator ID tidak valid")
	}

	items := make([]models.AnnotationItem, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, models.AnnotationItem{
			ObjectID:   item.ObjectID,
			Type:       models.AnnotationType(item.Type),
			Comment:    item.Comment,
			Color:      item.Color,
			PageNumber: item.PageNumber,
			CreatedAt:  time.Now(),
		})
	}

	ann := &models.Annotation{
		DocumentID:     docUUID,
		VersionID:      versionUUID,
		PageNumber:     req.PageNumber,
		AnnotatorID:    annotatorUUID,
		AnnotationData: models.JSONBMap(req.CanvasJSON),
		Summary:        items,
	}
	if err := s.annRepo.UpsertPage(ann); err != nil {
		return nil, fmt.Errorf("gagal menyimpan anotasi: %w", err)
	}
	return ann, nil
}

// ─── GetPage ──────────────────────────────────────────────────────────────────

func (s *annotationService) GetPage(
	docID, versionID string,
	page int,
	requesterID string,
	role models.Role,
) (*models.Annotation, error) {
	if role == models.RoleBuyer {
		doc, err := s.docRepo.FindByID(docID)
		if err != nil || doc.BuyerID.String() != requesterID {
			return nil, errors.New("akses ditolak")
		}
	}
	ann, err := s.annRepo.FindByPage(docID, versionID, page)
	if err != nil {
		// Halaman belum dianotasi — kembalikan canvas kosong (bukan error)
		return &models.Annotation{
			AnnotationData: models.JSONBMap{
				"version": "5.3.0",
				"objects": []interface{}{},
			},
		}, nil
	}
	return ann, nil
}

// ─── GetAllPages ──────────────────────────────────────────────────────────────

func (s *annotationService) GetAllPages(
	docID, versionID, requesterID string,
	role models.Role,
) ([]models.Annotation, error) {
	if role == models.RoleBuyer {
		doc, err := s.docRepo.FindByID(docID)
		if err != nil || doc.BuyerID.String() != requesterID {
			return nil, errors.New("akses ditolak")
		}
	}
	return s.annRepo.FindAllByDocument(docID, versionID)
}

// ─── GetSummary ───────────────────────────────────────────────────────────────

func (s *annotationService) GetSummary(
	docID, versionID, requesterID string,
	role models.Role,
) (*models.AnnotationSummaryResponse, error) {
	if role == models.RoleBuyer {
		doc, err := s.docRepo.FindByID(docID)
		if err != nil || doc.BuyerID.String() != requesterID {
			return nil, errors.New("akses ditolak")
		}
	}
	pages, err := s.annRepo.GetSummary(docID, versionID)
	if err != nil {
		return nil, errors.New("gagal mengambil ringkasan anotasi")
	}
	return &models.AnnotationSummaryResponse{
		DocumentID: docID,
		Pages:      pages,
	}, nil
}

// ─── DeleteObject ─────────────────────────────────────────────────────────────

func (s *annotationService) DeleteObject(
	docID, annotatorID string,
	role models.Role,
	req DeleteObjectRequest,
) error {
	if role != models.RoleFinance && role != models.RoleAP2 {
		return errors.New("hanya AP2 atau Keuangan yang dapat menghapus anotasi")
	}

	// PERBAIKAN KEAMANAN (IDOR): versi sebelumnya langsung menghapus objek
	// berdasarkan req.AnnotationID dari body request TANPA memverifikasi bahwa
	// anotasi tersebut benar-benar milik docID yang ada di URL. Akibatnya,
	// siapa pun dengan role AP2/Finance bisa mengirim annotation_id milik
	// dokumen LAIN lewat endpoint /documents/{docID_manapun}/annotations/object
	// dan tetap berhasil menghapusnya — docID di URL jadi sekadar dekorasi,
	// tidak benar-benar mengontrol akses ke resource yang dituju.
	ann, err := s.annRepo.FindByID(req.AnnotationID)
	if err != nil {
		return errors.New("anotasi tidak ditemukan")
	}
	if ann.DocumentID.String() != docID {
		return errors.New("anotasi tidak ditemukan pada dokumen ini")
	}

	if err := s.annRepo.DeleteAnnotationObject(req.AnnotationID, req.ObjectID); err != nil {
		return fmt.Errorf("gagal menghapus objek anotasi: %w", err)
	}
	return nil
}

// ─── MarkResolved ─────────────────────────────────────────────────────────────

func (s *annotationService) MarkResolved(
	annID, annotatorID string,
	role models.Role,
	resolved bool,
) error {
	if role != models.RoleFinance && role != models.RoleAP2 {
		return errors.New("akses ditolak")
	}
	return s.annRepo.MarkResolved(annID, resolved)
}

// ─── ExportAnnotatedData ──────────────────────────────────────────────────────

func (s *annotationService) ExportAnnotatedData(
	docID, versionID, requesterID string,
	role models.Role,
) (map[int]map[string]interface{}, error) {
	if role == models.RoleBuyer {
		return nil, errors.New("akses ditolak")
	}
	annotations, err := s.annRepo.FindAllByDocument(docID, versionID)
	if err != nil {
		return nil, errors.New("gagal mengambil data anotasi")
	}
	result := make(map[int]map[string]interface{}, len(annotations))
	for _, ann := range annotations {
		raw, err := json.Marshal(ann.AnnotationData)
		if err != nil {
			continue // skip halaman yang gagal di-marshal
		}
		var pageData map[string]interface{}
		if err := json.Unmarshal(raw, &pageData); err != nil {
			continue // skip halaman yang gagal di-unmarshal
		}
		result[ann.PageNumber] = pageData
	}
	return result, nil
}
