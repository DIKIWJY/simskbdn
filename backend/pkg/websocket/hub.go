package websocket

import (
    "encoding/json"
    "log"
    "sync"
)

// ─── Event types yang dikirim ke client ────────────────────────────────────
type EventType string

const (
    EventDocumentSubmitted      EventType = "document_submitted"
    EventDocumentReceived       EventType = "document_received"
    EventDocumentUnderReview    EventType = "document_under_review"
    EventDocumentRevisionReq    EventType = "document_revision_requested"
    EventDocumentApproved       EventType = "document_approved"
    EventAnnotationSaved        EventType = "annotation_saved"
    EventNotification           EventType = "notification"
)

// ─── Message yang dikirim ke client ────────────────────────────────────────
type WSMessage struct {
    Event     EventType   `json:"event"`
    Payload   interface{} `json:"payload"`
    TargetIDs []string    `json:"target_ids,omitempty"` // user IDs yang dituju
    SenderID  string      `json:"sender_id,omitempty"`
}

// ─── NotificationPayload — isi pesan notifikasi ───────────────────────────
type NotificationPayload struct {
    ID         string `json:"id,omitempty"`
    Title      string `json:"title"`
    Message    string `json:"message"`
    DocumentID string `json:"document_id,omitempty"`
    Status     string `json:"status,omitempty"`
    ActorName  string `json:"actor_name,omitempty"`
    ActorRole  string `json:"actor_role,omitempty"`
    CreatedAt  string `json:"created_at,omitempty"`
}

// ─── Hub — mengelola semua koneksi WebSocket ───────────────────────────────
type Hub struct {
    // Semua client yang terhubung (key = userID)
    clients    map[string]map[*Client]bool
    mu         sync.RWMutex

    // Channel untuk registrasi, unregistrasi, dan broadcast
    register   chan *Client
    unregister chan *Client
    broadcast  chan *WSMessage
}

// Singleton hub
var hub *Hub
var once sync.Once

func GetHub() *Hub {
    once.Do(func() {
        hub = &Hub{
            clients:    make(map[string]map[*Client]bool),
            register:   make(chan *Client),
            unregister: make(chan *Client),
            broadcast:  make(chan *WSMessage, 256),
        }
    })
    return hub
}

// Run — jalankan hub di goroutine terpisah (dipanggil di main.go)
func (h *Hub) Run() {
    log.Println("WebSocket Hub berjalan...")
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            if _, ok := h.clients[client.UserID]; !ok {
                h.clients[client.UserID] = make(map[*Client]bool)
            }
            h.clients[client.UserID][client] = true
            h.mu.Unlock()
            log.Printf("WS: %s (%s) terkoneksi. Total user online: %d",
                client.UserName, client.Role, h.CountOnline())

        case client := <-h.unregister:
            h.mu.Lock()
            if conns, ok := h.clients[client.UserID]; ok {
                delete(conns, client)
                if len(conns) == 0 {
                    delete(h.clients, client.UserID)
                }
            }
            h.mu.Unlock()
            log.Printf("WS: %s terputus", client.UserName)

        case msg := <-h.broadcast:
            h.dispatchMessage(msg)
        }
    }
}

// dispatchMessage — kirim pesan ke target yang dituju
func (h *Hub) dispatchMessage(msg *WSMessage) {
    data, err := json.Marshal(msg)
    if err != nil {
        log.Println("WS: gagal marshal message:", err)
        return
    }

    h.mu.RLock()
    defer h.mu.RUnlock()

    if len(msg.TargetIDs) > 0 {
        // Kirim ke user tertentu
        for _, targetID := range msg.TargetIDs {
            if conns, ok := h.clients[targetID]; ok {
                for client := range conns {
                    select {
                    case client.send <- data:
                    default:
                        // Buffer penuh, skip
                        log.Printf("WS: buffer penuh untuk %s", client.UserName)
                    }
                }
            }
        }
    } else {
        // Broadcast ke semua (kecuali sender)
        for userID, conns := range h.clients {
            if userID == msg.SenderID {
                continue
            }
            for client := range conns {
                select {
                case client.send <- data:
                default:
                }
            }
        }
    }
}

// ─── Public methods untuk kirim pesan ──────────────────────────────────────

// SendToUser — kirim ke satu user spesifik
func (h *Hub) SendToUser(userID string, event EventType, payload interface{}) {
    h.broadcast <- &WSMessage{
        Event:     event,
        Payload:   payload,
        TargetIDs: []string{userID},
    }
}

// SendToUsers — kirim ke beberapa user sekaligus
func (h *Hub) SendToUsers(userIDs []string, event EventType, payload interface{}) {
    h.broadcast <- &WSMessage{
        Event:     event,
        Payload:   payload,
        TargetIDs: userIDs,
    }
}

// SendToRole — kirim ke semua user dengan role tertentu
func (h *Hub) SendToRole(role string, event EventType, payload interface{}, senderID string) {
    h.mu.RLock()
    var targets []string
    for _, conns := range h.clients {
        for client := range conns {
            if client.Role == role && client.UserID != senderID {
                targets = append(targets, client.UserID)
            }
        }
    }
    h.mu.RUnlock()

    if len(targets) > 0 {
        h.broadcast <- &WSMessage{
            Event:     event,
            Payload:   payload,
            TargetIDs: targets,
            SenderID:  senderID,
        }
    }
}

// BroadcastAll — kirim ke semua user yang online (kecuali sender)
func (h *Hub) BroadcastAll(event EventType, payload interface{}, senderID string) {
    h.broadcast <- &WSMessage{
        Event:    event,
        Payload:  payload,
        SenderID: senderID,
    }
}

// CountOnline — jumlah user unik yang online
func (h *Hub) CountOnline() int {
    h.mu.RLock()
    defer h.mu.RUnlock()
    return len(h.clients)
}