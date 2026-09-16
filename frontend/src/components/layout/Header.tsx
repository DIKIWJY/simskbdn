"use client";

import { useRouter } from "next/navigation";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Bell, Menu, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import NotificationDropdown from "../notification/NotificationDropdown";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { UserRole } from "@/types";

interface HeaderProps {
  onMenuClick?: () => void;
}

// CATATAN AUDIT: ROLE_BADGE di kode asli tidak menyertakan "ap2" (pola yang
// sama berulang di beberapa file lain — lihat laporan audit). Efeknya cuma
// kosmetik — badge untuk user ap2 memakai fallback abu-abu. Dipertahankan
// apa adanya sesuai kode asli.
const ROLE_BADGE: Partial<Record<UserRole, { label: string; cls: string }>> = {
  buyer:   { label: "Pembeli",  cls: "bg-blue-50 text-blue-700 border-blue-100" },
  ap2:     { label: "AP2",      cls: "bg-teal-50 text-teal-700 border-teal-100" },
  finance: { label: "Keuangan", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  admin:   { label: "Admin",    cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const roleInfo = (user?.role ? ROLE_BADGE[user.role] : undefined) ?? {
    label: user?.role ?? "",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleLogout = () => {
    logout();
    toast.success("Berhasil keluar");
    router.push("/login");
  };

  return (
    <header className="h-[57px] flex items-center justify-between px-4 lg:px-5 bg-white border-b border-slate-200 flex-shrink-0 sticky top-0 z-20">

      {/* ── Kiri: hamburger (mobile) ──────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      {/* Spacer desktop */}
      <div className="hidden lg:block" />

      {/* ── Kanan ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Role badge */}
        <span className={cn(
          "hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mr-1",
          roleInfo.cls
        )}>
          {roleInfo.label}
        </span>

        {/* ── Notifikasi ──────────────────────────────────────────── */}
        {/* PERBAIKAN: NotificationDropdown sudah mandiri (py tombol lonceng
            + state buka/tutup sendiri). Versi sebelumnya membungkusnya dengan
            tombol lonceng KEDUA di Header + prop onClose yang tidak diterima
            komponennya — hasilnya dua ikon lonceng tumpang tindih dan gagal
            compile. Cukup render komponennya langsung. */}
        <NotificationDropdown />

        {/* ── Profile dropdown (Radix) ────────────────────────────── */}
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors outline-none",
              "hover:bg-slate-50 data-[state=open]:bg-slate-50"
            )}>
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-blue-100 flex-shrink-0">
                {initials}
              </div>
              <span className="hidden sm:block text-[13px] font-semibold text-slate-700 max-w-[90px] truncate">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown size={13} className="hidden sm:block text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuPrimitive.Trigger>

          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={8}
              className={cn(
                "z-50 min-w-[200px] overflow-hidden rounded-xl",
                "border border-slate-200 bg-white p-1",
                "shadow-lg shadow-slate-200/60",
                "animate-scale-in"
              )}
            >
              {/* Header info */}
              <div className="px-3 py-2.5 mb-0.5 border-b border-slate-100">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              {/* Pengaturan */}
              <DropdownMenuPrimitive.Item
                onSelect={() => router.push(`/${user?.role}/settings`)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 cursor-pointer",
                  "hover:bg-slate-50 hover:text-slate-900 outline-none transition-colors"
                )}
              >
                <Settings size={14} className="text-slate-400" />
                Pengaturan
              </DropdownMenuPrimitive.Item>

              <DropdownMenuPrimitive.Separator className="my-1 h-px bg-slate-100" />

              {/* Logout */}
              <DropdownMenuPrimitive.Item
                onSelect={handleLogout}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 cursor-pointer",
                  "hover:bg-red-50 outline-none transition-colors"
                )}
              >
                <LogOut size={14} />
                Keluar
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

      </div>
    </header>
  );
}
