# SIMSKBDN — Frontend (Next.js)

Hasil migrasi dari React + Vite + react-router-dom ke **Next.js 14 (App Router)**.
Backend Go di folder `backend/` **tidak diubah** — Next.js hanya menggantikan
frontend Vite Anda.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Backend Go harus jalan di `localhost:8080`
(sama seperti sebelumnya) — `next.config.js` sudah mem-proxy `/api/*` ke sana
untuk mode development, meniru proxy yang dulu ada di `vite.config.js`.

Untuk build production:

```bash
npm run build
npm run start
```

## Yang perlu Anda cek sendiri (PENTING)

Konversi ini dikerjakan **tanpa akses internet** di lingkungan kerja saya,
sehingga saya tidak bisa menjalankan `npm install` / `next build` yang
sesungguhnya untuk memverifikasi hasil akhir end-to-end. Yang sudah saya
lakukan sebagai gantinya:

- Setiap file (116 file) divalidasi sintaksnya satu per satu dengan parser
  Babel (JS murni, tidak butuh instalasi apa pun).
- Setiap import (`@/...` maupun relatif) divalidasi otomatis benar-benar
  mengarah ke file yang ada di proyek — tidak ada satu pun yang hilang.
- Struktur route dicocokkan 1:1 terhadap `routes/AppRoutes.jsx` yang lama
  (40 route total, semua sudah ada padanannya).

Tapi ini **bukan pengganti** menjalankan `npm run dev` yang sesungguhnya.
Mohon setelah `npm install`, coba jalankan dan uji alur-alur berikut secara
manual sebelum deploy ke production:

1. Login sebagai masing-masing role (buyer, finance, ap2, admin)
2. Buka halaman anotasi PDF (Finance & AP2) — ini bagian paling berisiko
   karena memakai Fabric.js + pdfjs-dist yang butuh pola khusus di Next.js
3. Upload dokumen, WebSocket notifikasi real-time
4. Coba refresh halaman di tengah-tengah tiap role (memastikan guard
   login/role bekerja dengan benar setelah reload)

Kalau ada error yang muncul, kemungkinan besar penyebabnya adalah salah satu
dari daftar di bagian "Keputusan & Risiko Arsitektur" di laporan yang saya
kirim di chat — cek di sana dulu sebelum debugging dari nol.

## Struktur proyek

```
src/
  app/                    ← routing (menggantikan routes/AppRoutes.jsx + pages/)
    (dashboard)/          ← route group, berbagi 1 layout untuk semua role
      buyer/  finance/  ap2/  admin/
    login/
  components/              ← sama seperti sebelumnya + komponen "*View.jsx" baru
                              (pengganti pages/*Dashboard.jsx yang di-share
                              beberapa route)
  hooks/ api/ store/ lib/ config/ utils/   ← TIDAK BERUBAH dari kode asli
```

## Environment variable

Kode asli tidak memakai environment variable sama sekali (baseURL API
hardcode `"/api"`, WebSocket connect langsung ke `host:8080`). Ini
dipertahankan apa adanya — tidak ada `.env` yang perlu diisi.
