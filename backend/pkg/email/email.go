package email

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"strings"
	"time"
)

type EmailService struct {
	host     string
	port     string
	username string
	password string
	from     string
	enabled  bool
}

var svc *EmailService

// Init menerima semua konfigurasi SMTP dari AppConfig — tidak ada lagi os.Getenv.
func Init(host string, port int, username, password, from string) {
	svc = &EmailService{
		host:     host,
		port:     fmt.Sprintf("%d", port),
		username: username,
		password: password,
		from:     from,
		enabled:  host != "",
	}
	if svc.enabled {
		log.Printf("[EMAIL] Service aktif: %s:%d", host, port)
	} else {
		log.Println("[EMAIL] Service tidak dikonfigurasi (set SMTP_HOST di .env)")
	}
}

func GetService() *EmailService { return svc }

type NotifData struct {
	RecipientName string
	DocTitle      string
	DocNumber     string // Nomor SKBDN
	Status        string
	StatusLabel   string
	Notes         string
	ActionURL     string
	ActorName     string
	Timestamp     string
	CompanyName   string
	GoodsType     string
	TotalPrice    string
	ExpiredDate   string
}

func (e *EmailService) SendStatusUpdate(toEmail, toName string, data NotifData) error {
	if !e.enabled { return nil }

	subject, body := buildEmail(data)
	return e.send(toEmail, subject, body)
}

func buildEmail(d NotifData) (subject, body string) {
	if d.Timestamp == "" { d.Timestamp = time.Now().Format("02 Jan 2006, 15:04 WIB") }

	statusColors := map[string]string{
		"approved":              "#16a34a",
		"rejected":              "#dc2626",
		"revision_requested":    "#d97706",
		"draft_revision_buyer":  "#d97706",
		"final_sent_to_finance": "#2563eb",
		"draft_verified_ap2":    "#2563eb",
		"under_review":          "#7c3aed",
		"disbursed":             "#059669",
	}
	statusLabels := map[string]string{
		"approved":              "✅ DISETUJUI",
		"rejected":              "❌ DITOLAK",
		"revision_requested":    "⚠️ PERLU REVISI",
		"draft_revision_buyer":  "⚠️ DRAFT DIKEMBALIKAN",
		"final_sent_to_finance": "📤 DIKIRIM KE KEUANGAN",
		"draft_verified_ap2":    "✅ DRAFT DIVERIFIKASI",
		"under_review":          "🔍 SEDANG DIREVIEW",
		"disbursed":             "💰 SKBDN DICAIRKAN",
	}

	color := statusColors[d.Status]
	if color == "" { color = "#3b82f6" }
	label := statusLabels[d.Status]
	if label == "" { label = strings.ToUpper(d.Status) }
	if d.StatusLabel != "" { label = d.StatusLabel }

	subject = fmt.Sprintf("[SIMSKBDN Pusri] %s — %s", label, d.DocTitle)

	tpl := `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%%,#2563eb 100%%);padding:28px 32px;">
    <table width="100%%"><tr>
      <td><p style="margin:0;color:#fff;font-size:13px;opacity:0.8;letter-spacing:1px;text-transform:uppercase;">PT Pupuk Sriwidjaja Palembang</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">SIMSKBDN — Notifikasi Dokumen</h1></td>
      <td align="right"><div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">📄</div></td>
    </tr></table>
  </td></tr>

  <!-- Status Badge -->
  <tr><td style="padding:0 32px;">
    <div style="background:{{.Color}};color:#fff;padding:12px 20px;border-radius:0 0 12px 12px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:0.5px;">
      {{.Label}}
    </div>
  </td></tr>

  <!-- Content -->
  <tr><td style="padding:28px 32px 0;">
    <p style="margin:0 0 8px;color:#374151;font-size:15px;">Halo, <strong>{{.Name}}</strong></p>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
      Terdapat pembaruan status dokumen SKBDN Anda yang memerlukan perhatian.
    </p>
  </td></tr>

  <!-- Doc Info Card -->
  <tr><td style="padding:0 32px 20px;">
    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Dokumen</p>
        <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:700;">{{.DocTitle}}</p>
        {{if .DocNumber}}<p style="margin:2px 0 0;color:#64748b;font-size:12px;font-family:monospace;">{{.DocNumber}}</p>{{end}}
      </td></tr>
      {{if .GoodsType}}<tr><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
        <table width="100%%"><tr>
          <td style="color:#64748b;font-size:12px;">Jenis Barang</td>
          <td align="right" style="color:#1e293b;font-size:13px;font-weight:600;">{{.GoodsType}}</td>
        </tr></table>
      </td></tr>{{end}}
      {{if .TotalPrice}}<tr><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
        <table width="100%%"><tr>
          <td style="color:#64748b;font-size:12px;">Total Harga</td>
          <td align="right" style="color:#1e293b;font-size:14px;font-weight:700;">{{.TotalPrice}}</td>
        </tr></table>
      </td></tr>{{end}}
      {{if .ExpiredDate}}<tr><td style="padding:12px 20px;">
        <table width="100%%"><tr>
          <td style="color:#64748b;font-size:12px;">Expired Date</td>
          <td align="right" style="color:#dc2626;font-size:13px;font-weight:600;">{{.ExpiredDate}}</td>
        </tr></table>
      </td></tr>{{end}}
    </table>
  </td></tr>

  {{if .Notes}}
  <!-- Notes -->
  <tr><td style="padding:0 32px 20px;">
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
      <p style="margin:0 0 6px;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Catatan dari Petugas</p>
      <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;">{{.Notes}}</p>
    </div>
  </td></tr>
  {{end}}

  {{if .ActionURL}}
  <!-- CTA Button -->
  <tr><td style="padding:0 32px 28px;" align="center">
    <a href="{{.ActionURL}}" style="display:inline-block;background:#2563eb;color:#fff;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
      Buka Sistem SIMSKBDN →
    </a>
  </td></tr>
  {{end}}

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
      Dikirim otomatis oleh SIMSKBDN — PT Pupuk Sriwidjaja Palembang &nbsp;|&nbsp; {{.Timestamp}}<br/>
      <span style="color:#cbd5e1;">Email ini adalah notifikasi otomatis, harap tidak membalas.</span>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

	// Render template
	tmpl := template.Must(template.New("email").Parse(tpl))
	var buf bytes.Buffer
	tmpl.Execute(&buf, map[string]interface{}{
		"Color":       color,
		"Label":       label,
		"Name":        d.RecipientName,
		"DocTitle":    d.DocTitle,
		"DocNumber":   d.DocNumber,
		"GoodsType":   d.GoodsType,
		"TotalPrice":  d.TotalPrice,
		"ExpiredDate": d.ExpiredDate,
		"Notes":       d.Notes,
		"ActionURL":   d.ActionURL,
		"Timestamp":   d.Timestamp,
	})
	return subject, buf.String()
}

func (e *EmailService) send(to, subject, body string) error {
	header := fmt.Sprintf("From: SIMSKBDN Pusri <%s>\r\nTo: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nSubject: %s\r\n\r\n",
		e.from, to, subject)

	addr := e.host + ":" + e.port
	auth := smtp.PlainAuth("", e.username, e.password, e.host)

	// Try TLS first (port 465), fallback to STARTTLS (587)
	if e.port == "465" {
		tlsCfg := &tls.Config{ServerName: e.host}
		conn, err := tls.Dial("tcp", addr, tlsCfg)
		if err != nil { return fmt.Errorf("TLS dial: %w", err) }
		defer conn.Close()
		client, err := smtp.NewClient(conn, e.host)
		if err != nil { return err }
		defer client.Close()
		if err := client.Auth(auth); err != nil { return err }
		if err := client.Mail(e.from); err != nil { return err }
		if err := client.Rcpt(to); err != nil { return err }
		w, err := client.Data()
		if err != nil { return err }
		fmt.Fprint(w, header+body)
		return w.Close()
	}

	return smtp.SendMail(addr, auth, e.from, []string{to}, []byte(header+body))
}
