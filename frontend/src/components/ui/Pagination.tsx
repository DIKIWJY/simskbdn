"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  label?: string;
}

/**
 * Pagination konsisten untuk seluruh sistem.
 * Menampilkan: info total · tombol prev/next · nomor halaman (dengan ellipsis).
 */
export default function Pagination({ page = 1, totalPages = 1, total = 0, onPageChange, label = "data" }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Buat list nomor halaman dengan ellipsis: 1 … 4 5 6 … 12
  const pages: number[] = [];
  const push = (p: number): void => { if (!pages.includes(p)) pages.push(p); };
  push(1);
  for (let p = page - 1; p <= page + 1; p++) if (p > 1 && p < totalPages) push(p);
  if (totalPages > 1) push(totalPages);
  pages.sort((a, b) => a - b);

  const items: (number | "...")[] = [];
  pages.forEach((p, i) => {
    // Non-null assertion aman: kondisi "i > 0" menjamin pages[i-1] selalu ada.
    if (i > 0 && p - pages[i - 1]! > 1) items.push("...");
    items.push(p);
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/60">
      <span className="text-xs text-gray-500">
        Halaman <strong className="text-gray-800">{page}</strong> dari {totalPages}
        <span className="hidden sm:inline"> · <strong className="text-gray-800">{total}</strong> {label}</span>
      </span>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={13}/> <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {items.map((it, i) =>
          it === "..." ? (
            <span key={`e${i}`} className="px-1.5 text-xs text-gray-400">…</span>
          ) : (
            <button key={it} onClick={() => onPageChange?.(it)}
              className={`min-w-[32px] px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                it === page
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}>
              {it}
            </button>
          )
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <span className="hidden sm:inline">Berikutnya</span> <ChevronRight size={13}/>
        </button>
      </div>
    </div>
  );
}
