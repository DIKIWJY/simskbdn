# ─────────────────────────────────────────────────────────────
# SIMSKBDN — Dockerfile Backend (Go / Gin)
# Multi-stage build: binary Go akhirnya jalan di atas image
# alpine yang super kecil (~15 MB) tanpa Go toolchain.
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build binary Go ─────────────────────────────────
FROM golang:1.26-alpine AS builder
WORKDIR /app

# Install ca-certificates untuk HTTPS outbound (email, dsb.)
RUN apk add --no-cache ca-certificates git

# Download dependensi dulu (di-cache jika go.mod tidak berubah)
COPY go.mod go.sum ./
RUN go mod download

# Salin seluruh source dan build
COPY . .

# CGO_ENABLED=0 → binary statis, tidak butuh glibc di image final
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o server \
    ./cmd/main.go

# Build binary seed juga
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o seed \
    ./cmd/seed/main.go

# ── Stage 2: Image production final ──────────────────────────
FROM alpine:3.19 AS runner

RUN apk add --no-cache ca-certificates tzdata
# Set timezone ke WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta

WORKDIR /app

# Salin binary hasil build
COPY --from=builder /app/server .
COPY --from=builder /app/seed .

EXPOSE 8080

CMD ["./server"]
