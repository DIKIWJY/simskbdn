"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

/**
 * Providers — padanan Next.js dari src/main.jsx pada versi Vite/React Router.
 *
 * `QueryClient` sengaja dibuat lewat useState(() => new QueryClient()) alih-alih
 * langsung `new QueryClient()` di top-level module. Ini penting di Next.js:
 * kalau dibuat di top-level, satu instance QueryClient bisa "bocor" dipakai
 * bersama antar request berbeda di server, atau memicu re-create yang tidak
 * perlu di client. Pola useState ini adalah cara resmi yang direkomendasikan
 * TanStack Query untuk App Router.
 */
export default function Providers({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 menit
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: "14px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },
          success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />
    </QueryClientProvider>
  );
}
