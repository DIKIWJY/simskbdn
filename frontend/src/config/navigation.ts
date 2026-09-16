import {
  LayoutDashboard, FileText, Bell, Settings,
  Inbox, Send, BarChart2, AlertCircle, Eye, CheckCircle2,
  Users, Activity, Upload, Clock, BarChart3,
} from "lucide-react";
import type { NavConfigMap, NavConfig, UserRole } from "@/types";

export const NAV_CONFIG: NavConfigMap = {
  buyer: {
    label: "Pembeli",
    groups: [
      {
        title: "SKBDN",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/buyer", exact: true },
          { icon: FileText, label: "SKBDN Saya", path: "/buyer/documents" },
          { icon: Clock, label: "Riwayat", path: "/buyer/history" },
        ],
      },
      {
        title: "Akun",
        items: [
          { icon: Bell, label: "Notifikasi", path: "/buyer/notifications", badge: "notif" },
          { icon: Settings, label: "Pengaturan", path: "/buyer/settings" },
        ],
      },
    ],
  },

  ap2: {
    label: "AP2",
    groups: [
      {
        title: "SKBDN",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/ap2", exact: true },
          { icon: Inbox, label: "Draft Masuk", path: "/ap2/inbox", badge: "pending" },
          { icon: Eye, label: "Sedang Diverifikasi", path: "/ap2/inprogress" },
          { icon: BarChart2, label: "Monitoring", path: "/ap2/monitoring" },
        ],
      },
      {
        title: "Upload",
        items: [
          { icon: Upload, label: "Upload Buyer", path: "/ap2/upload-buyer" },
        ],
      },
      {
        title: "Manajemen",
        items: [
          { icon: Activity, label: "Log Aktivitas", path: "/ap2/activity" },
        ],
      },
      {
        title: "Akun",
        items: [
          { icon: Bell, label: "Notifikasi", path: "/ap2/notifications", badge: "notif" },
          { icon: Settings, label: "Pengaturan", path: "/ap2/settings" },
        ],
      },
    ],
  },

  finance: {
    label: "Keuangan",
    groups: [
      {
        title: "SKBDN",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/finance", exact: true },
          { icon: AlertCircle, label: "Perlu Direview", path: "/finance/review", badge: "review" },
          { icon: Eye, label: "Sedang Review", path: "/finance/inprogress" },
          { icon: CheckCircle2, label: "Disetujui", path: "/finance/approved" },
        ],
      },
      {
        title: "Monitoring",
        items: [
          { icon: BarChart2, label: "Semua Dokumen", path: "/finance/monitoring" },
          { icon: BarChart3, label: "Laporan", path: "/finance/laporan" },
        ],
      },
      {
        title: "Akun",
        items: [
          { icon: Bell, label: "Notifikasi", path: "/finance/notifications", badge: "notif" },
          { icon: Settings, label: "Pengaturan", path: "/finance/settings" },
        ],
      },
    ],
  },

  admin: {
    label: "Admin",
    groups: [
      {
        title: "SKBDN",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin", exact: true },
          { icon: CheckCircle2, label: "SKBDN Approved", path: "/admin/approved" },
          { icon: BarChart2, label: "Monitoring", path: "/admin/monitoring" },
          { icon: BarChart3, label: "Laporan & Export", path: "/admin/laporan" },
        ],
      },
      {
        title: "Manajemen",
        items: [
          { icon: Users, label: "Kelola Pengguna", path: "/admin/users" },
          { icon: Activity, label: "Log Aktivitas", path: "/admin/activity" },
          { icon: Upload, label: "Upload Buyer", path: "/admin/upload-buyer" },
        ],
      },
      {
        title: "Akun",
        items: [
          { icon: Bell, label: "Notifikasi", path: "/admin/notifications", badge: "notif" },
          { icon: Settings, label: "Pengaturan", path: "/admin/settings" },
        ],
      },
    ],
  },
};

/** Ambil konfigurasi navigasi berdasarkan role user.
 * Menerima `undefined` karena saat auth store belum ter-hidrasi, `user` bisa
 * null — di titik itu Sidebar tetap butuh nav default sebelum redirect terjadi. */
export function getNavConfig(role: UserRole | undefined): NavConfig {
  return (role && NAV_CONFIG[role]) ?? NAV_CONFIG.buyer;
}

export default NAV_CONFIG;
