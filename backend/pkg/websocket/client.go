package websocket

import (
    "log"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"

    "pusri-backend/internal/services"
)

const (
    writeWait  = 10 * time.Second
    pongWait   = 60 * time.Second
    pingPeriod = (pongWait * 9) / 10 // 54 detik
    maxMsgSize = 512
)

// allowedWSOrigins adalah set origin yang diizinkan untuk koneksi WebSocket.
// Diisi oleh InitAllowedOrigins() yang dipanggil dari main() setelah config diload.
var allowedWSOrigins = map[string]bool{
    "http://localhost:3000": true,
    "http://localhost:5173": true,
    "http://127.0.0.1:3000": true,
}

// InitAllowedOrigins dipanggil dari main() setelah config diload.
// Memisahkan konfigurasi dari kode — tidak ada os.Getenv() di sini.
func InitAllowedOrigins(origins []string) {
    for _, o := range origins {
        if o != "" {
            allowedWSOrigins[o] = true
        }
    }
}

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    // CheckOrigin — hanya izinkan origin yang terdaftar (CORS + WebSocket selaras).
    // Sebelumnya: return true (semua origin diizinkan = Cross-Site WebSocket Hijacking).
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        if origin == "" {
            // Koneksi tanpa Origin header (curl, native app) — izinkan
            return true
        }
        return allowedWSOrigins[origin]
    },
}

// Client — satu koneksi WebSocket dari satu tab browser.
type Client struct {
    UserID   string
    UserName string
    Role     string
    conn     *websocket.Conn
    send     chan []byte
}

// readPump — baca pesan dari client (keep-alive via ping/pong).
func (c *Client) readPump() {
    defer func() {
        GetHub().unregister <- c
        c.conn.Close()
    }()
    c.conn.SetReadLimit(maxMsgSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })
    for {
        _, _, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
                log.Printf("[WS] Unexpected close: %v", err)
            }
            break
        }
    }
}

// writePump — kirim pesan ke client + ping periodik.
func (c *Client) writePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()
    for {
        select {
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                return
            }
        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// NewHandleWebSocket mengembalikan gin.HandlerFunc yang sudah "tahu" jwtSecret.
//
// Pola factory function ini dipilih atas dua alasan:
//   1. HandleWebSocket butuh jwtSecret untuk validasi token, tapi gin.HandlerFunc
//      tidak bisa menerima argumen — closure adalah solusi idiomatis di Go.
//   2. jwtSecret tidak disimpan sebagai global package-level var (itu anti-pattern),
//      melainkan di-capture oleh closure saat konstruksi di main().
//
// Dipanggil dari main() sebagai: r.GET("/ws", ws.NewHandleWebSocket(cfg.JWTSecret))
func NewHandleWebSocket(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // WebSocket tidak bisa mengirim custom header saat handshake dari browser,
        // sehingga token dikirim via query parameter (bukan Authorization header).
        // Ini adalah pola standar untuk WebSocket authenticated.
        tokenStr := c.Query("token")
        if tokenStr == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Token diperlukan"})
            return
        }

        // Panjang token juga dibatasi di sini (sama seperti di middleware HTTP)
        if len(tokenStr) > 2048 {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid"})
            return
        }

        // Validasi JWT — sekarang menerima jwtSecret dari closure, bukan os.Getenv
        claims, err := services.ValidateToken(tokenStr, jwtSecret)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid atau kadaluarsa"})
            return
        }

        conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
        if err != nil {
            log.Printf("[WS] Upgrade gagal: %v", err)
            return
        }

        client := &Client{
            UserID:   claims.UserID,
            UserName: claims.Email,
            Role:     string(claims.Role),
            conn:     conn,
            send:     make(chan []byte, 256),
        }

        GetHub().register <- client

        go client.writePump()
        go client.readPump()
    }
}
