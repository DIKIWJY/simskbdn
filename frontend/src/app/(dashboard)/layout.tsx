"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import NotificationToast from "@/components/notification/NotificationToast";
import { useWebSocketConnect } from "@/hooks/useWebSocket";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function WSInit() {
  useWebSocketConnect();
  return null;
}

/**
 * Padanan dari src/layouts/DashboardLayout.jsx.
 *
 * Ini dipasang lewat route group "(dashboard)" — folder dengan tanda kurung
 * tidak menambah segmen di URL, jadi /buyer, /finance, /ap2, /admin, dsb.
 * semuanya berbagi satu layout ini persis seperti sebelumnya (satu
 * <DashboardLayout> membungkus semua <Route> lewat elemen di AppRoutes.jsx).
 *
 * Guard "harus login dulu" (dulu pakai <Navigate to="/login"/> langsung di
 * body render) di sini dipindah ke dalam useEffect + router.replace. Alasan:
 * di React Router, komponen <Navigate> "boleh" dirender langsung di body
 * karena itu murni client-side render. Di Next.js, App Router masih
 * melakukan render awal (SSR) untuk root Client Component juga, jadi
 * memicu redirect di tengah proses render (bukan di efek) berisiko error
 * "Cannot update a component while rendering a different component".
 * Pola useEffect ini adalah cara yang aman & didukung resmi.
 */
export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuth, user, _hasHydrated } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && (!isAuth || !user)) {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuth, user, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  if (!isAuth || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <WSInit />

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badges={{ notif: unreadCount }}
      />

      {/* ── Konten utama ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 lg:px-8 lg:py-7 w-full">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <NotificationToast />
    </div>
  );
}
