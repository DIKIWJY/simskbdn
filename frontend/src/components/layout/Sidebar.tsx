"use client";

import type { SyntheticEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { LogOut, X } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { getNavConfig } from "@/config/navigation";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { NavItem as NavItemType, NavBadgeKey } from "@/types";

interface NavItemProps {
  item: NavItemType;
  badges: Partial<Record<NavBadgeKey, number>>;
  onClose?: () => void;
}

// ─── Item navigasi tunggal ────────────────────────────────────────────────────
function NavItem({ item, badges, onClose }: NavItemProps) {
  const pathname = usePathname();
  const Icon = item.icon;
  const count = item.badge ? (badges[item.badge] ?? 0) : 0;
  const isActive = item.exact
    ? pathname === item.path
    : pathname.startsWith(item.path) && item.path.length > 3;

  return (
    <Link
      href={item.path}
      onClick={onClose}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
        isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-white/[0.07]"
      )}
    >
      {Icon && (
        <Icon
          size={15}
          className={cn(
            "flex-shrink-0 transition-colors",
            isActive ? "text-blue-100" : "text-slate-500 group-hover:text-slate-300"
          )}
        />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
            "flex items-center justify-center flex-shrink-0",
            isActive ? "bg-white/25 text-white" : "bg-red-500 text-white"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar utama ────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  badges?: Partial<Record<NavBadgeKey, number>>;
}

export default function Sidebar({ isOpen, onClose, badges = {} }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const nav = getNavConfig(user?.role);

  if (!nav) return null;

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  const handleLogout = () => {
    logout();
    toast.success("Berhasil keluar");
    router.push("/login");
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-[2px] animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 flex flex-col",
          "bg-slate-900 border-r border-white/[0.06]",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: 245 }}
      >
        {/* ── Brand / Logo (DIOPERBAIKI) ─────────────────────────────── */}
        <div className="flex items-center justify-between px-4 h-[57px] flex-shrink-0 border-b border-white/[0.06]">
          {/* Kotak biru dihapus, img langsung ditaruh di sini */}
          <img
            src="/assets/pusri.png"
            alt="Pusri"
            className="h-12 w-auto object-contain flex-shrink-0"
            onError={(e: SyntheticEvent<HTMLImageElement>) => {
              // Jika gambar error, sembunyikan elemen img
              e.currentTarget.style.display = "none";
              // Opsional: Tampilkan teks fallback jika gambar gagal dimuat
              // e.target.parentNode.insertAdjacentHTML('afterbegin', '<span class="text-white font-bold text-xl">PUSRI</span>');
            }}
          />

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Tutup sidebar"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Navigasi ─────────────────────────────────────────────── */}
        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full">
            <div className="px-3 py-4 space-y-5">
              {nav.groups.map((group, gi) => (
                <div key={gi}>
                  <p className="px-3 mb-1.5 text-[9.5px] font-bold text-slate-600 uppercase tracking-[0.12em]">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem key={item.path} item={item} badges={badges} onClose={onClose} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            className="flex select-none touch-none p-[2px] bg-transparent w-1.5"
            orientation="vertical"
          >
            <ScrollArea.Thumb className="flex-1 bg-white/10 rounded-full relative" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>

        {/* ── User section ─────────────────────────────────────────── */}
        <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0">
          {/* Info user */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5">
            <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white/10">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white leading-tight truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          {/* Tombol logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[12px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut size={13} className="flex-shrink-0" />
            <span>Keluar dari Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
}