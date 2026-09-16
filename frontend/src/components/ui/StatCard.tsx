"use client";

import type { LucideIcon } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatCardColor = "blue" | "indigo" | "teal" | "amber" | "green" | "red" | "purple" | "gray";

const COLOR_MAP: Record<StatCardColor, { icon: string; active: string; border: string }> = {
  blue:   { icon: "bg-blue-50 text-blue-500",     active: "bg-blue-600",   border: "border-blue-100" },
  indigo: { icon: "bg-indigo-50 text-indigo-500", active: "bg-indigo-600", border: "border-indigo-100" },
  teal:   { icon: "bg-teal-50 text-teal-500",     active: "bg-teal-600",   border: "border-teal-100" },
  amber:  { icon: "bg-amber-50 text-amber-500",   active: "bg-amber-500",  border: "border-amber-100" },
  green:  { icon: "bg-green-50 text-green-500",   active: "bg-green-600",  border: "border-green-100" },
  red:    { icon: "bg-red-50 text-red-500",       active: "bg-red-600",    border: "border-red-100" },
  purple: { icon: "bg-purple-50 text-purple-500", active: "bg-purple-600", border: "border-purple-100" },
  gray:   { icon: "bg-slate-50 text-slate-500",   active: "bg-slate-700",  border: "border-slate-100" },
};

interface StatCardProps {
  label: ReactNode;
  value?: number | string | null;
  icon?: LucideIcon;
  color?: StatCardColor;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  active?: boolean;
  className?: string;
}

export default function StatCard({
  label, value, icon: Icon, color = "blue",
  loading = false, onClick, active = false, className = "",
}: StatCardProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  /* ── Variasi aktif (biru solid) ── */
  if (active) {
    return (
      <div onClick={onClick}
        className={cn(
          c.active,
          "rounded-2xl p-5 flex flex-col gap-3",
          "shadow-lg transition-all",
          onClick && "cursor-pointer active:scale-[0.98]",
          className,
        )}>
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold text-white/75 uppercase tracking-wider leading-tight">{label}</p>
          {Icon && (
            <div className="bg-white/15 p-2 rounded-xl">
              <Icon size={18} className="text-white" />
            </div>
          )}
        </div>
        <p className="text-4xl font-black text-white tracking-tight">
          {loading ? <span className="block h-9 w-16 bg-white/25 rounded-lg animate-pulse" /> : (value ?? 0)}
        </p>
      </div>
    );
  }

  /* ── Variasi normal (putih) ── */
  return (
    <div onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3",
        "shadow-sm transition-all hover:shadow-md hover:border-slate-300",
        onClick && "cursor-pointer active:scale-[0.99]",
        className,
      )}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight pr-2">{label}</p>
        {Icon && (
          <div className={cn("p-2 rounded-xl", c.icon)}>
            <Icon size={18} />
          </div>
        )}
      </div>
      {loading
        ? <div className="h-9 w-16 bg-slate-100 rounded-lg animate-pulse" />
        : <p className="text-4xl font-black text-slate-900 tracking-tight">{value ?? 0}</p>
      }
    </div>
  );
}
