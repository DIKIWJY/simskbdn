"use client";

import type { ReactNode } from "react";// Padanan dari src/layouts/AuthLayout.jsx (versi Vite/React Router).
// <Outlet/> digantikan oleh {children}, sesuai konvensi Next.js App Router.
// Perlu "use client": elemen <img onError=...> memasang event handler, dan
// Next.js tidak mengizinkan function/event handler dikirim sebagai prop dari
// Server Component ke elemen DOM.

export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Variabel untuk menyamakan source logo di seluruh layout
  const LOGO_SRC = "/assets/pusri.png"; // Sesuaikan dengan nama file asli Anda
  const FALLBACK_SRC = "/assets/favicon.svg";

  return (
    <div className="min-h-screen flex">
      {/* ── PANEL KIRI: Branding ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ backgroundColor: "#0b3c8f" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            {/* Menggunakan h-12 w-auto agar logo persegi panjang tidak mengecil/terpotong */}
            <div className="h-15 flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Logo Pusri"
                className="h-full w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_SRC;
                }}
              />
            </div>
          </div>

          <h1 className="text-white text-4xl font-bold leading-tight mb-4 tracking-tight">
            Sistem Informasi
            <br />
            Monitoring SKBDN
          </h1>
          <p className="text-blue-100/80 text-lg leading-relaxed">
            Monitoring dokumen SKBDN, proses verifikasi,
            <br />
            dan review keuangan dalam satu platform.
          </p>
        </div>

        <div className="space-y-4">
          {[
            [
              "Monitoring SKBDN Real-time",
              "Pantau status dokumen dari semua tahap",
            ],
            ["Verifikasi Berlapis", "Sales AP2 → Keuangan → Persetujuan Final"],
            ["Notifikasi Otomatis", "Update status instan ke semua pihak"],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-400/20 border border-blue-400/30 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-blue-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">{title}</p>
                <p className="text-blue-200/60 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-blue-300/40 text-sm font-medium">
          © 2026 PT Pupuk Sriwidjaja Palembang
        </p>
      </div>

      {/* ── PANEL KANAN: Form Login ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Header Mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-8 flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Logo Pusri"
                className="h-full w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_SRC;
                }}
              />
            </div>
            <span className="font-semibold text-gray-800">
              PT Pupuk Sriwidjaja Palembang
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
