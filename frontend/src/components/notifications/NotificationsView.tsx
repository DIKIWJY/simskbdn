"use client";
// Padanan dari pages/notifications/NotificationsPage.jsx (versi Vite/React
// Router). Dipakai bersama oleh route /buyer/notifications, /finance/notifications,
// /ap2/notifications, dan /admin/notifications — sama seperti komponen aslinya
// yang dipasang di 4 <Route> berbeda pada routes/AppRoutes.jsx.

import { useState } from "react";
import { Bell, CheckCheck, Clock, AlertCircle, Info, Inbox, type LucideIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationAPI } from "@/api/notification.api";
import { useNotificationStore } from "@/store/notification.store";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { ApiNotification, UserRole } from "@/types";

interface TypeConfigEntry {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

const TYPE_CONFIG: Record<string, TypeConfigEntry> = {
  success: { icon: CheckCheck,  color: "text-green-500", bg: "bg-green-50",  border: "border-green-100", dot: "bg-green-500" },
  warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50",  border: "border-amber-100", dot: "bg-amber-500" },
  error:   { icon: AlertCircle, color: "text-red-500",   bg: "bg-red-50",    border: "border-red-100",   dot: "bg-red-500"   },
  info:    { icon: Info,        color: "text-blue-500",  bg: "bg-blue-50",   border: "border-blue-100",  dot: "bg-blue-500"  },
};

function relTime(d?: string | null): string {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
  if (m < 1)   return "Baru saja";
  if (m < 60)  return `${m} menit lalu`;
  if (h < 24)  return `${h} jam lalu`;
  if (day < 7) return `${day} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export default function NotificationsView() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const { markAsRead: markRead, markAllAsRead: markAllRead } = useNotificationStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationAPI.getAll().then(r => r.data.data ?? []),
    refetchInterval: 30_000,
  });

  const readMut = useMutation({
    mutationFn: (id: string) => notificationAPI.markRead(id),
    onSuccess: (_, id) => { markRead(id); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const readAllMut = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => { markAllRead(); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const all = notifications || [];
  const shown = filter === "unread" ? all.filter(n => !n.is_read) : all;
  const unreadCount = all.filter(n => !n.is_read).length;

  const handleClick = (notif: ApiNotification) => {
    if (!notif.is_read && notif.id) readMut.mutate(notif.id);
    if (notif.document_id) {
      // CATATAN AUDIT (TIDAK diubah — lihat laporan akhir): peta ini di kode
      // asli tidak menyertakan "ap2", padahal halaman ini juga dipasang di
      // /ap2/notifications (lihat AppRoutes.jsx lama). Saya SENGAJA tidak
      // menambahkan "ap2" di sini seperti di LoginPage, karena — beda dengan
      // LoginPage — route "/ap2/documents/:id" itu sendiri memang tidak ada
      // di aplikasi asli Anda (role ap2 cuma punya /ap2/documents/:id/annotate,
      // tidak ada halaman detail biasa). Menambahkan "ap2" ke peta ini hanya
      // akan mengarahkan ke URL yang juga tidak ada. Ini gap desain yang perlu
      // Anda putuskan sendiri, bukan hal yang aman saya perbaiki sepihak.
      const map: Partial<Record<UserRole, string>> = { buyer: "/buyer", ap2: "/ap2", finance: "/finance", admin: "/admin" };
      router.push(`${(user?.role && map[user.role]) || "/buyer"}/documents/${notif.document_id}`);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0
              ? <><span className="font-semibold text-blue-600">{unreadCount}</span> belum dibaca</>
              : "Semua sudah dibaca"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => readAllMut.mutate()} disabled={readAllMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all disabled:opacity-50">
            <CheckCheck size={14}/> Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(
          [
            ["all", "Semua"],
            ["unread", "Belum Dibaca"],
          ] as const
        ).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === v ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {l}
            {v === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifikasi list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"/>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center gap-4 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
            <Bell size={24} className="text-gray-200"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500">
              {filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Tidak ada notifikasi"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === "unread" ? "Semua notifikasi sudah dibaca" : "Notifikasi akan muncul di sini ketika ada pembaruan SKBDN"}
            </p>
          </div>
          {filter === "unread" && (
            <button onClick={() => setFilter("all")}
              className="text-xs text-blue-600 font-semibold hover:underline">
              Lihat semua notifikasi
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
          {shown.map(notif => {
            const cfg = TYPE_CONFIG[notif.notif_type ?? "info"] ?? TYPE_CONFIG.info!;
            const Icon = cfg.icon;
            return (
              <div key={notif.id} onClick={() => handleClick(notif)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-all hover:bg-gray-50/80 ${
                  !notif.is_read ? "bg-blue-50/40" : "bg-white"
                }`}>
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  notif.is_read ? "bg-gray-100" : cfg.bg
                }`}>
                  <Icon size={17} className={notif.is_read ? "text-gray-400" : cfg.color}/>
                </div>

                {/* Konten */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm font-semibold leading-snug ${notif.is_read ? "text-gray-600" : "text-gray-900"}`}>
                      {notif.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.is_read && (
                        <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`}/>
                      )}
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{relTime(notif.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                  {notif.document_id && (
                    <p className="text-[11px] text-blue-500 mt-1.5 font-medium flex items-center gap-1">
                      <Inbox size={10}/> Klik untuk lihat dokumen
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statistik kecil */}
      {all.length > 0 && (
        <p className="text-xs text-gray-400 text-center pb-2">
          {all.length} total · {unreadCount} belum dibaca · {all.length - unreadCount} sudah dibaca
        </p>
      )}
    </div>
  );
}
