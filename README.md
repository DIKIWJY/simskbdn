# SIMSKBDN — Sistem Informasi Monitoring SKBDN
**PT Pupuk Sriwidjaja Palembang**

Sistem monitoring dokumen SKBDN (Surat Kredit Berdokumen Dalam Negeri) untuk
alur: **Buyer → AP2 → Keuangan → Admin**.

---

## Tech Stack

| Layer    | Teknologi |
|----------|-----------|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS v4 |
| Backend  | Go 1.21 · Gin · GORM · PostgreSQL |
| Storage  | MinIO (file PDF SKBDN) |
| Realtime | WebSocket (gorilla/websocket) |
| Auth     | JWT (HS256) + bcrypt cost 12 |
| Docker   | Compose v2 (4 layanan) |

---

## Cara Menjalankan (Docker — direkomendasikan)

```bash
# 1. Setup konfigurasi
cp .env.example .env
# → Buka .env dan isi DB_PASSWORD, JWT_SECRET, MINIO_SECRET_KEY

# 2. Jalankan semua layanan
docker compose up --build

# 3. (Opsional) Isi data demo
docker compose exec backend go run ./cmd/seed/main.go
```

Buka **http://localhost:3000**

### URL layanan
| Layanan | URL |
|---------|-----|
| Aplikasi | http://localhost:3000 |
| API Backend | http://localhost:8080 |
| MinIO Console | http://localhost:9001 |

---

## Cara Menjalankan (Manual — tanpa Docker)

### Prasyarat
- Go 1.21+
- Node.js 20+
- PostgreSQL 15+
- MinIO

### Backend
```bash
cd backend
cp .env.example .env   # isi konfigurasi, DB_HOST=localhost
go mod download
go run ./cmd/main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Akun Demo (setelah seed)

| Role | Email | Password |
|------|-------|----------|
| Buyer | buyer@pusri.com | password123 |
| AP2 | ap2@pusri.com | password123 |
| Finance | finance@pusri.com | password123 |
| Admin | admin@pusri.com | password123 |

---

## Struktur Proyek

```
simskbdn/
├── backend/                    ← Go API (Clean Architecture)
│   ├── cmd/
│   │   ├── main.go             ← Entry point, DI wiring
│   │   └── seed/main.go        ← Data demo
│   ├── internal/
│   │   ├── config/             ← Konfigurasi terpusat (AppConfig)
│   │   ├── handlers/           ← HTTP handlers (thin layer)
│   │   ├── middleware/         ← JWT auth, role guard
│   │   ├── models/             ← GORM models
│   │   ├── repository/         ← Interface + implementasi DB
│   │   ├── routes/             ← Route definitions + DI
│   │   └── services/           ← Business logic + interfaces
│   └── pkg/
│       ├── database/           ← PostgreSQL connection pool
│       ├── email/              ← SMTP notifikasi
│       ├── storage/            ← MinIO file upload
│       ├── utils/              ← Response helpers
│       └── websocket/          ← Hub, Client, Notifier
│
├── frontend/                   ← Next.js TypeScript
│   ├── src/
│   │   ├── app/                ← App Router pages & layouts
│   │   ├── api/                ← Axios + typed API clients
│   │   ├── components/         ← React components
│   │   ├── hooks/              ← TanStack Query hooks
│   │   ├── store/              ← Zustand state (auth, notif)
│   │   ├── types/              ← TypeScript interfaces (index.ts)
│   │   └── utils/              ← Helpers (exportExcel, dll)
│   ├── public/                 ← Assets + pdf.worker.min.mjs
│   ├── Dockerfile
│   ├── next.config.js
│   └── tsconfig.json
│
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Type-check frontend
```bash
cd frontend
npm run type-check   # harus: Found 0 errors
```

## Build production
```bash
docker compose -f docker-compose.yml up --build -d
```

---

© 2026 PT Pupuk Sriwidjaja Palembang. Dibuat dengan Go + Next.js.
