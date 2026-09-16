import { Clock, AlertTriangle, AlertCircle, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import { expiryStatus, formatDate, type ExpiryLevel } from "./utils";

const ICONS: Record<ExpiryLevel, LucideIcon> = {
  expired:  XCircle,
  critical: AlertCircle,
  warning:  AlertTriangle,
  soon:     Clock,
  safe:     CheckCircle2,
};

interface StyleSet {
  bg: string;
  border: string;
  text: string;
  iconColor: string;
}

const STYLES: Record<ExpiryLevel, StyleSet> = {
  expired:  { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   iconColor: "text-red-500"   },
  critical: { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   iconColor: "text-red-500"   },
  warning:  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconColor: "text-amber-500" },
  soon:     { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-700",  iconColor: "text-blue-500"  },
  safe:     { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", iconColor: "text-green-500" },
};

interface ExpiryIndicatorProps {
  expiredDate?: string | Date | null;
  variant?: "badge" | "card" | "inline";
  className?: string;
}

// Variant: "badge" (compact pill) | "card" (full info box) | "inline" (text only)
export default function ExpiryIndicator({ expiredDate, variant = "badge", className = "" }: ExpiryIndicatorProps) {
  if (!expiredDate) {
    if (variant === "card") {
      return (
        <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
          <p className="text-xs text-gray-400">Tanggal expired belum diisi</p>
        </div>
      );
    }
    return <span className="text-xs text-gray-400">—</span>;
  }

  const status = expiryStatus(expiredDate);
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const Icon = ICONS[status.level];
  const style = STYLES[status.level];

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${style.text} ${className}`}>
        <Icon size={12} className={style.iconColor} />
        {status.label}
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div className={`${style.bg} ${style.border} border rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center flex-shrink-0`}>
            <Icon size={16} className={style.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
              {status.level === "expired" ? "SKBDN Sudah Kadaluarsa"
               : status.level === "critical" ? "Segera Kadaluarsa"
               : status.level === "warning"  ? "Mendekati Kadaluarsa"
               : status.level === "soon"     ? "Akan Kadaluarsa"
               : "Masih Aktif"}
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {status.level === "expired" ? `Sudah lewat ${Math.abs(status.days)} hari` : `${status.days} hari lagi`}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Tanggal expired: {formatDate(expiredDate, { full: true })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default: badge
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${style.bg} ${style.text} ${style.border} ${className}`}>
      <Icon size={11} className={style.iconColor} />
      {status.label}
    </span>
  );
}
