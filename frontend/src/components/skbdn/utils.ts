// ─────────────────────────────────────────────────────────────────────────────
// SIMSKBDN — components/skbdn/utils.ts
// Utility functions untuk format tampilan (Rupiah, tanggal, ukuran file, dsb).
// File ini dipakai luas di seluruh aplikasi — semua fungsi diberi type yang
// jelas karena banyak komponen lain bergantung pada return type-nya.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Formatter Rupiah ──────────────────────────────────────────────────────

export interface FormatRupiahOptions {
  compact?: boolean;
}

export function formatRupiah(
  amount: number | null | undefined,
  opts: FormatRupiahOptions = {},
): string {
  if (amount == null || isNaN(amount)) return "Rp 0";
  const { compact = false } = opts;

  if (compact && amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2)} M`;
  }
  if (compact && amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
  }
  if (compact && amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Formatter Angka ───────────────────────────────────────────────────────

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

// ─── Formatter Tanggal ─────────────────────────────────────────────────────

export interface FormatDateOptions {
  full?: boolean;
  withTime?: boolean;
}

export function formatDate(
  dateStr: string | Date | null | undefined,
  opts: FormatDateOptions = {},
): string {
  if (!dateStr) return "—";
  const { full = false, withTime = false } = opts;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";

  const config: Intl.DateTimeFormatOptions = full
    ? { day: "2-digit", month: "long", year: "numeric" }
    : { day: "2-digit", month: "short", year: "numeric" };

  if (withTime) {
    config.hour = "2-digit";
    config.minute = "2-digit";
  }

  return new Intl.DateTimeFormat("id-ID", config).format(d);
}

// ─── Relative time ─────────────────────────────────────────────────────────

export function formatRelativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  if (h < 24) return `${h} jam lalu`;
  if (d < 7) return `${d} hari lalu`;
  return formatDate(dateStr);
}

// ─── Hitung sisa hari sampai expiry ────────────────────────────────────────

export function daysUntilExpiry(expiredDate: string | Date | null | undefined): number | null {
  if (!expiredDate) return null;
  const d = new Date(expiredDate);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

// ─── Status urgency expiry ─────────────────────────────────────────────────

export type ExpiryLevel = "expired" | "critical" | "warning" | "soon" | "safe";

export interface ExpiryStatus {
  level: ExpiryLevel;
  days: number;
  label: string;
  color: "red" | "amber" | "blue" | "green";
}

export function expiryStatus(expiredDate: string | Date | null | undefined): ExpiryStatus | null {
  const days = daysUntilExpiry(expiredDate);
  if (days === null) return null;
  if (days < 0)   return { level: "expired",  days, label: "Kadaluarsa",        color: "red"   };
  if (days <= 7)  return { level: "critical", days, label: `${days} hari lagi`, color: "red"   };
  if (days <= 14) return { level: "warning",  days, label: `${days} hari lagi`, color: "amber" };
  if (days <= 30) return { level: "soon",     days, label: `${days} hari lagi`, color: "blue"  };
  return              { level: "safe",     days, label: `${days} hari lagi`, color: "green" };
}

// ─── Format file size ──────────────────────────────────────────────────────

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Normalisasi status (single source of truth) ───────────────────────────
// Semua modul WAJIB pakai ini kalau perlu menyeragamkan variasi penamaan
// status lama (huruf besar/kecil, alias lama, dsb) ke satu bentuk standar.

const STATUS_MAP: Record<string, string> = {
  // Draft
  DRAFT: "draft",
  draft: "draft",
  draft_submitted: "draft_submitted",

  // AP2
  draft_under_review: "draft_under_review",
  under_ap2_review: "under_ap2_review",
  REJECTED_AP2: "rejected_by_ap2",
  rejected_by_ap2: "rejected_by_ap2",

  // Finance
  draft_revision_buyer: "draft_revision_buyer",
  draft_approved: "draft_approved",
  finance_review: "finance_review",
  REJECTED_FINANCE: "rejected_by_finance",
  rejected_by_finance: "rejected_by_finance",

  // Verified
  VERIFIED: "verified",
  verified: "verified",

  // Final
  final_submitted: "final_submitted",
  final_under_review: "final_under_review",
  revision_requested: "revision_requested",
  final_uploaded: "final_uploaded",

  // End
  APPROVED: "approved",
  approved: "approved",
  DISBURSED: "disbursed",
  disbursed: "disbursed",
};

export function normalizeStatus(status: string | null | undefined): string {
  if (!status) return "draft";
  return STATUS_MAP[status] ?? status;
}
