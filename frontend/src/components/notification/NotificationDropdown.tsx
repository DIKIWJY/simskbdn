"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useNotificationStore } from "@/store/notification.store";
import { useAuthStore } from "@/store/auth.store";
import { notificationAPI } from "@/api/notification.api";
import type { StoreNotification, UserRole } from "@/types";

const STATUS_ICON: Record<string, LucideIcon> = {
  submitted: FileText,
  under_review: Eye,
  revision_requested: AlertCircle,
  approved: CheckCircle2,
};

const STATUS_COLOR: Record<string, string> = {
  submitted: "text-gray-500 bg-gray-100",
  under_review: "text-amber-500 bg-amber-50",
  revision_requested: "text-red-500 bg-red-50",
  approved: "text-green-500 bg-green-50",
};

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m}m lalu`;
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(diff / 86400000)}h lalu`;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, addNotification, loadFromDB } =
    useNotificationStore();

  // Fetch notifikasi dari DB saat dropdown dibuka — supaya tetap ada setelah refresh
  const { refetch } = useQuery({
    queryKey: ["notifications-dropdown"],
    queryFn: () => notificationAPI.getAll().then(r => {
      const dbNotifs = r.data.data ?? [];
      loadFromDB(dbNotifs); // replace state dengan data DB terbaru
      return dbNotifs;
    }),
    enabled: false,
    staleTime: 0, // selalu fresh setiap dibuka
  });

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) refetch(); // fetch dari DB setiap kali dibuka
  };

  const handleNotifClick = (notif: StoreNotification) => {
    markAsRead(notif.id);
    notificationAPI.markRead(notif.id).catch(() => {}); // tandai di DB juga
    setIsOpen(false);
    if (notif.documentId) {
      const paths: Partial<Record<UserRole, string>> = {
        buyer: `/buyer/documents/${notif.documentId}`,
        ap2: `/ap2`,
        finance: `/finance`,
        admin: `/admin`,
      };
      router.push((user?.role && paths[user.role]) || "/");
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => handleToggle()}
        className="relative p-2 rounded-lg text-gray-500
                   hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="
            absolute top-1 right-1 min-w-[16px] h-[16px]
            bg-red-500 text-white text-[9px] font-bold
            rounded-full flex items-center justify-center
            ring-2 ring-white animate-pulse
          "
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="
          absolute right-0 top-full mt-2 w-80
          bg-white rounded-xl border border-gray-100
          shadow-xl shadow-gray-200/60
          z-50 overflow-hidden
        "
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3
                           border-b border-gray-50"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
              {unreadCount > 0 && (
                <p className="text-[11px] text-gray-400">
                  {unreadCount} belum dibaca
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => { markAllAsRead(); notificationAPI.markAllRead().catch(() => {}); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600
                             hover:bg-green-50 transition-colors"
                  title="Tandai semua dibaca"
                >
                  <Check size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500
                             hover:bg-red-50 transition-colors"
                  title="Hapus semua"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List notifikasi */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={24} className="text-gray-200" />
                <p className="text-xs text-gray-400">Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif: StoreNotification) => {
                const Icon = (notif.status && STATUS_ICON[notif.status]) || FileText;
                const color =
                  (notif.status && STATUS_COLOR[notif.status]) || "text-gray-500 bg-gray-100";

                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`
                      w-full flex items-start gap-3 px-4 py-3
                      text-left transition-colors border-b border-gray-50
                      ${
                        notif.isRead
                          ? "bg-white hover:bg-gray-50"
                          : "bg-blue-50/30 hover:bg-blue-50/60"
                      }
                    `}
                  >
                    <div
                      className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      flex-shrink-0 ${color}
                    `}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-medium leading-tight truncate
                          ${notif.isRead ? "text-gray-600" : "text-gray-900"}
                        `}
                        >
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full
                                          flex-shrink-0 mt-1"
                          />
                        )}
                      </div>
                      <p
                        className="text-[11px] text-gray-400 mt-0.5
                                    line-clamp-2 leading-relaxed"
                      >
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-300 mt-1">
                        {formatRelativeTime(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
