/**
 * StatusBadge — label konsisten dengan alur bisnis SKBDN Pusri
 *
 * PERUBAHAN:
 * - approved      → "Verified" (bukan "Approved")
 * - rejected      → "Ditolak"
 * - expired       → "Kadaluarsa"
 * - disbursed     → "Verified"
 * - revision_requested → "Perlu Revisi"
 * - Seluruh label diseragamkan agar konsisten (Indonesian)
 */
import type { DocumentStatus } from "@/types";

interface StatusConfig {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
}

const CFG: Partial<Record<DocumentStatus, StatusConfig>> = {
  // ── Draft Phase ──────────────────────────────────────────────────────────
  draft_submitted: {
    label: "Menunggu Verifikasi AP2",
    dot:    "bg-blue-400",
    text:   "text-blue-700",
    bg:     "bg-blue-50",
    border: "border-blue-200",
  },
  draft_under_review: {
    label: "Direview Keuangan",
    dot:    "bg-amber-400",
    text:   "text-amber-700",
    bg:     "bg-amber-50",
    border: "border-amber-200",
  },
  draft_revision_buyer: {
    label: "Perlu Diperbaiki",
    dot:    "bg-orange-500",
    text:   "text-orange-700",
    bg:     "bg-orange-50",
    border: "border-orange-200",
  },
  draft_approved: {
    label: "Draft Disetujui",
    dot:    "bg-teal-500",
    text:   "text-teal-700",
    bg:     "bg-teal-50",
    border: "border-teal-200",
  },

  // ── Final Phase ──────────────────────────────────────────────────────────
  final_submitted: {
    label: "Final Dikirim",
    dot:    "bg-purple-500",
    text:   "text-purple-700",
    bg:     "bg-purple-50",
    border: "border-purple-200",
  },
  final_under_review: {
    label: "Final Direview",
    dot:    "bg-indigo-500",
    text:   "text-indigo-700",
    bg:     "bg-indigo-50",
    border: "border-indigo-200",
  },
  revision_requested: {
    label: "Perlu Revisi",
    dot:    "bg-red-500",
    text:   "text-red-700",
    bg:     "bg-red-50",
    border: "border-red-200",
  },
  approved: {
    label: "Verified",
    dot:    "bg-green-500",
    text:   "text-green-700",
    bg:     "bg-green-50",
    border: "border-green-200",
  },
  // FIXED: "Rejected" → "Ditolak"
  rejected: {
    label: "Ditolak",
    dot:    "bg-red-600",
    text:   "text-red-800",
    bg:     "bg-red-100",
    border: "border-red-300",
  },
  // FIXED: "Expired" → "Kadaluarsa"
  expired: {
    label: "Kadaluarsa",
    dot:    "bg-gray-500",
    text:   "text-gray-600",
    bg:     "bg-gray-100",
    border: "border-gray-300",
  },
  // FIXED: "Disbursed" → "Verified"
  disbursed: {
    label: "Verified",
    dot:    "bg-emerald-600",
    text:   "text-emerald-700",
    bg:     "bg-emerald-50",
    border: "border-emerald-200",
  },

  // ── Legacy / backward compat ─────────────────────────────────────────────
  submitted: {
    label: "Dikirim",
    dot:    "bg-blue-400",
    text:   "text-blue-700",
    bg:     "bg-blue-50",
    border: "border-blue-200",
  },
  draft_verified_ap2: {
    label: "Draft Verified",
    dot:    "bg-teal-400",
    text:   "text-teal-700",
    bg:     "bg-teal-50",
    border: "border-teal-200",
  },
  final_sent_to_finance: {
    label: "Final Dikirim",
    dot:    "bg-purple-400",
    text:   "text-purple-700",
    bg:     "bg-purple-50",
    border: "border-purple-200",
  },
  under_review: {
    label: "Sedang Direview",
    dot:    "bg-amber-400",
    text:   "text-amber-700",
    bg:     "bg-amber-50",
    border: "border-amber-200",
  },
  received_sales: {
    label: "Diterima Sales",
    dot:    "bg-teal-400",
    text:   "text-teal-600",
    bg:     "bg-teal-50",
    border: "border-teal-200",
  },
};

interface StatusBadgeProps {
  status?: DocumentStatus | string;
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, className = "", showDot = true, size = "sm" }: StatusBadgeProps) {
  const c: StatusConfig = CFG[status as DocumentStatus] ?? {
    label:  status?.replace(/_/g, " ") || "—",
    dot:    "bg-gray-400",
    text:   "text-gray-600",
    bg:     "bg-gray-100",
    border: "border-gray-200",
  };
  const sz = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap ${sz} ${c.text} ${c.bg} ${c.border} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />}
      {c.label}
    </span>
  );
}