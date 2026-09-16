# ─────────────────────────────────────────────────────────────
# SIMSKBDN — Dockerfile Frontend (Next.js)
# Multi-stage build: hasilnya lebih kecil dan lebih aman karena
# semua devDependency & source code tidak masuk ke image final.
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Install dependensi ──────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json dulu (sebelum source code) agar layer
# di-cache Docker — npm install tidak diulang selama
# package.json tidak berubah.
COPY package.json ./
RUN npm install --frozen-lockfile

# ── Stage 2: Build aplikasi ───────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Matikan telemetry Next.js (tidak perlu di production)
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Image production final ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# User non-root untuk keamanan (best practice container)
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nextjs

# Salin output build Next.js (standalone mode lebih kecil)
COPY --from=builder /app/public        ./public
COPY --from=builder /app/.next/static  ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js dibuat otomatis oleh Next.js standalone build
CMD ["node", "server.js"]
