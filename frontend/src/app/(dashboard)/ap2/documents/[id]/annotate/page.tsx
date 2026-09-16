"use client";

import dynamic from "next/dynamic";

// ssr:false WAJIB — sama seperti versi Finance (lihat catatan di
// src/components/ap2/AP2DocumentAnnotatorClient.jsx).
const AP2DocumentAnnotatorClient = dynamic(
  () => import("@/components/ap2/AP2DocumentAnnotatorClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-h))] -m-4 lg:-m-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Memuat editor anotasi...</p>
        </div>
      </div>
    ),
  },
);

export default function Page() {
  return <AP2DocumentAnnotatorClient />;
}
