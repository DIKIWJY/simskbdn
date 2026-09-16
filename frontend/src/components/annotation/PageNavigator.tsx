"use client";

import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  annotatedPages?: number[]; // array nomor halaman yang sudah dianotasi
}

export default function PageNavigator({
  currentPage,
  totalPages,
  onPageChange,
  annotatedPages = [],
}: PageNavigatorProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Halaman
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {currentPage} dari {totalPages}
        </p>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto py-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const hasAnnotation = annotatedPages.includes(page);
          const isActive = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`
                w-full flex items-center justify-between
                px-3 py-2 text-sm transition-all
                ${
                  isActive
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }
              `}
            >
              <span>Hal. {page}</span>
              {hasAnnotation && (
                <MessageSquare
                  size={11}
                  className={isActive ? "text-green-500" : "text-amber-400"}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-between p-2 border-t border-gray-100">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700
                     hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-gray-400">
          {currentPage}/{totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700
                     hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
