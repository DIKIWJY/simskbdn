import { formatRupiah } from "@/components/skbdn/utils";
import type { Document, DocumentStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportMeta {
  dateFrom?: string;
  dateTo?: string;
  status?: DocumentStatus | "";
}

// Intersect Document dengan extra fields backend mungkin kirim di laporan
type DocumentRow = Document & {
  title?: string;
  buyer?: { name?: string; company_name?: string };
  price_per_ton?: number;
  contract_number?: string;
  country_of_origin?: string;
  date_of_issue?: string;
  current_version?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Partial<Record<DocumentStatus, string>> = {
  draft_submitted: "Draft Dikirim",
  draft_under_review: "Direview AP2",
  draft_revision_buyer: "Revisi Draft",
  draft_approved: "Draft Verified",
  final_submitted: "Final Dikirim",
  final_under_review: "Final Direview",
  revision_requested: "Need Revision",
  approved: "Verified",
  rejected: "Rejected",
  expired: "Expired",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtNum(n?: number | null): string {
  return n ? Number(n).toLocaleString("id-ID") : "0";
}

type CellValue = string | number | boolean | null | undefined;

function escapeCell(cell: CellValue): string {
  const s = String(cell ?? "").replace(/"/g, '""');
  return s.includes(",") || s.includes("\n") || s.includes('"')
    ? `"${s}"`
    : s;
}

// ─── Main export function ─────────────────────────────────────────────────────

export function exportSKBDNToExcel(
  docs: DocumentRow[] = [],
  filename = "Laporan_SKBDN.csv",
  meta: ExportMeta = {},
): void {
  const rows: CellValue[][] = [];

  // Header info
  rows.push(["LAPORAN SKBDN — PT PUPUK SRIWIDJAJA PALEMBANG"]);
  rows.push([
    "Dicetak pada",
    new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    } as Intl.DateTimeFormatOptions),
  ]);
  if (meta.dateFrom ?? meta.dateTo) {
    rows.push(["Periode", `${meta.dateFrom ?? "-"} s/d ${meta.dateTo ?? "-"}`]);
  }
  if (meta.status) {
    rows.push(["Filter Status", STATUS_LABEL[meta.status as DocumentStatus] ?? meta.status]);
  }
  rows.push(["Total Dokumen", docs.length]);
  const totalNilai = docs.reduce((s, d) => s + (d.total_price ?? 0), 0);
  const totalTonase = docs.reduce((s, d) => s + (d.tonnage ?? 0), 0);
  rows.push(["Total Nilai", formatRupiah(totalNilai)]);
  rows.push(["Total Tonase", `${fmtNum(totalTonase)} Ton`]);
  rows.push([]);

  // Table header
  rows.push([
    "No", "Nomor SKBDN", "Judul", "Buyer", "Perusahaan",
    "Jenis Barang", "Tonase (Ton)", "Harga per Ton (Rp)",
    "Total Nilai (Rp)", "Bank Penerbit", "Nomor Kontrak",
    "Negara Asal", "Tanggal Terbit", "Tanggal Expired",
    "Status", "Versi", "Tanggal Dibuat",
  ]);

  // Data rows
  docs.forEach((doc, i) => {
    rows.push([
      i + 1,
      doc.skbdn_number ?? "",
      doc.title ?? "",
      doc.buyer?.name ?? "",
      doc.buyer?.company_name ?? "",
      doc.goods_type ?? "",
      doc.tonnage ?? 0,
      doc.price_per_ton ?? 0,
      doc.total_price ?? 0,
      doc.issuing_bank ?? "",
      doc.contract_number ?? "",
      doc.country_of_origin ?? "Indonesia",
      fmtDate(doc.date_of_issue),
      fmtDate(doc.expired_date),
      STATUS_LABEL[doc.status] ?? doc.status ?? "",
      doc.current_version != null ? `v${doc.current_version}` : "v1",
      fmtDate(doc.created_at),
    ]);
  });

  rows.push([]);
  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "Sistem SIMSKBDN — PT Pupuk Sriwidjaja Palembang"]);

  // Build CSV
  const csv = rows
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportLaporanBulanan(
  docs: DocumentRow[],
  dateFrom?: string,
  dateTo?: string,
  status?: DocumentStatus | "",
): void {
  const bulan = dateFrom
    ? new Date(dateFrom).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
  const filename = `SKBDN_${bulan.replace(" ", "_")}.csv`;
  exportSKBDNToExcel(docs, filename, { dateFrom, dateTo, status });
}
