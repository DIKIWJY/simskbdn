package websocket

import (
    "fmt"
    "time"

    "pusri-backend/internal/models"
)

// Notifier — service yang dipakai handler untuk kirim notifikasi real-time
type Notifier struct {
    hub *Hub
}

func NewNotifier() *Notifier {
    return &Notifier{hub: GetHub()}
}

// ─── Event: Buyer upload dokumen baru ──────────────────────────────────────
func (n *Notifier) DocumentSubmitted(doc *models.Document, buyerName string) {
    payload := NotificationPayload{
        Title:      "Draft SKBDN Baru Masuk",
        Message:    fmt.Sprintf("%s mengirim Draft SKBDN: %s", buyerName, doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftSubmitted),
        ActorName:  buyerName,
        ActorRole:  "buyer",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }

    // Kirim ke semua AP2 (yang memverifikasi pertama kali)
    n.hub.SendToRole("ap2", EventDocumentSubmitted, payload, doc.BuyerID.String())
    // Kirim ke Admin untuk monitoring
    n.hub.SendToRole("admin", EventDocumentSubmitted, payload, doc.BuyerID.String())
}

// ─── Event: AP2 verifikasi dan teruskan dokumen ke Finance ─────────────────
func (n *Notifier) DocumentForwarded(doc *models.Document, ap2Name, ap2ID string) {
    // Notif ke Finance: ada dokumen untuk direview
    payloadFinance := NotificationPayload{
        Title:      "Dokumen Siap Direview",
        Message:    fmt.Sprintf("AP2 %s meneruskan dokumen '%s' untuk direview", ap2Name, doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftUnderReview),
        ActorName:  ap2Name,
        ActorRole:  "ap2",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToRole("finance", EventDocumentUnderReview, payloadFinance, ap2ID)

    // Notif ke Buyer: dokumennya sudah diteruskan
    payloadBuyer := NotificationPayload{
        Title:      "Dokumen Diteruskan",
        Message:    fmt.Sprintf("Dokumen '%s' telah diteruskan ke Keuangan untuk direview", doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftUnderReview),
        ActorName:  ap2Name,
        ActorRole:  "ap2",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToUser(doc.BuyerID.String(), EventDocumentUnderReview, payloadBuyer)
}

// ─── Event: Draft dikembalikan ke Buyer ────────────────────────────────────
func (n *Notifier) DraftRevisionRequested(doc *models.Document, actorName, actorID, notes string) {
    payloadBuyer := NotificationPayload{
        Title:      "Draft SKBDN Perlu Diperbaiki",
        Message:    fmt.Sprintf("Draft '%s' dikembalikan. Catatan: %s", doc.Title, notes),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftRevisionBuyer),
        ActorName:  actorName,
        ActorRole:  "ap2",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToUser(doc.BuyerID.String(), EventDocumentRevisionReq, payloadBuyer)
}

// ─── Event: Draft disetujui Keuangan → Buyer upload Final ──────────────────
func (n *Notifier) DraftApproved(doc *models.Document, financeName, financeID string) {
    payloadBuyer := NotificationPayload{
        Title:      "Draft Disetujui — Upload Final SKBDN",
        Message:    fmt.Sprintf("Draft '%s' disetujui! Silakan upload Final SKBDN dari bank.", doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftApproved),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToUser(doc.BuyerID.String(), EventDocumentApproved, payloadBuyer)

    // Notif ke AP2: monitoring
    payloadAP2 := NotificationPayload{
        Title:      "Draft SKBDN Disetujui",
        Message:    fmt.Sprintf("Keuangan menyetujui Draft '%s' — menunggu Final dari Buyer", doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftApproved),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToRole("ap2", EventDocumentApproved, payloadAP2, financeID)
}

// ─── Event: Finance minta revisi Final ─────────────────────────────────────
func (n *Notifier) RevisionRequested(doc *models.Document, financeName, financeID, notes string) {
    // Notif ke Buyer: perlu upload ulang
    payloadBuyer := NotificationPayload{
        Title:      "Final SKBDN Perlu Direvisi",
        Message:    fmt.Sprintf("Final SKBDN '%s' memerlukan revisi. Catatan: %s", doc.Title, notes),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusRevisionRequested),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToUser(doc.BuyerID.String(), EventDocumentRevisionReq, payloadBuyer)

    // Notif ke AP2: monitoring
    payloadAP2 := NotificationPayload{
        Title:      "Revisi Final Diminta",
        Message:    fmt.Sprintf("Keuangan meminta revisi Final SKBDN '%s'", doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusRevisionRequested),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToRole("ap2", EventDocumentRevisionReq, payloadAP2, financeID)
}

// ─── Event: Finance approve Final SKBDN ────────────────────────────────────
func (n *Notifier) DocumentApproved(doc *models.Document, financeName, financeID string) {
    // Notif ke Buyer
    payloadBuyer := NotificationPayload{
        Title:      "Final SKBDN Disetujui!",
        Message:    fmt.Sprintf("Final SKBDN '%s' telah disetujui oleh Keuangan", doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusApproved),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToUser(doc.BuyerID.String(), EventDocumentApproved, payloadBuyer)

    // Notif ke AP2 & Admin: monitoring
    payloadOthers := NotificationPayload{
        Title:      "SKBDN Disetujui",
        Message:    fmt.Sprintf("Final SKBDN '%s' disetujui — menunggu pencairan Admin", doc.Title),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusApproved),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToRole("ap2", EventDocumentApproved, payloadOthers, financeID)
    n.hub.SendToRole("admin", EventDocumentApproved, payloadOthers, financeID)
}

// ─── Event: SKBDN ditolak ──────────────────────────────────────────────────
func (n *Notifier) DocumentRejected(doc *models.Document, financeName, financeID, notes string) {
    payloadBuyer := NotificationPayload{
        Title:      "SKBDN Ditolak",
        Message:    fmt.Sprintf("SKBDN '%s' ditolak. Catatan: %s", doc.Title, notes),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusRejected),
        ActorName:  financeName,
        ActorRole:  "finance",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }
    n.hub.SendToUser(doc.BuyerID.String(), EventDocumentRevisionReq, payloadBuyer)
}

// ─── Event: Buyer re-upload setelah revisi ────────────────────────────────
func (n *Notifier) DocumentReUploaded(doc *models.Document, buyerName string, version int) {
    payload := NotificationPayload{
        Title:      "Dokumen Diperbarui",
        Message:    fmt.Sprintf("%s mengirim ulang dokumen '%s' (v%d)", buyerName, doc.Title, version),
        DocumentID: doc.ID.String(),
        Status:     string(models.StatusDraftSubmitted),
        ActorName:  buyerName,
        ActorRole:  "buyer",
        CreatedAt:  time.Now().Format(time.RFC3339),
    }

    // Kirim ke AP2 (verifikator pertama)
    n.hub.SendToRole("ap2", EventDocumentSubmitted, payload, doc.BuyerID.String())
}
