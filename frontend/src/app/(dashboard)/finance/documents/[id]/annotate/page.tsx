"use client";

import dynamic from "next/dynamic";

// ssr:false WAJIB di sini — lihat catatan lengkap di
// src/components/finance/DocumentAnnotatorClient.jsx (memakai fabric.js dan
// pdfjs-dist yang mengakses API browser saat modul di-import).
const DocumentAnnotatorClient = dynamic(
  () => import("@/components/finance/DocumentAnnotatorClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-h))] -m-4 lg:-m-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Memuat editor anotasi...</p>
        </div>
      </div>
    ),
  },
);

export default function Page() {
  return <DocumentAnnotatorClient />;
}
