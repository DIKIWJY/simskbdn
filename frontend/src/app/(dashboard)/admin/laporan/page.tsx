"use client";

import { useState, useRef, type RefObject } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { exportLaporanBulanan } from "@/utils/exportExcel";
import { formatRupiah, formatNumber, formatDate } from "@/components/skbdn/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import {
  Download, Printer, Calendar, AlertTriangle,
  FileText, TrendingUp, Scale, BarChart2,
  RefreshCw, ChevronLeft, ChevronRight, Filter,
  type LucideIcon,
} from "lucide-react";
import type { Document, DocumentStatus } from "@/types";

// ── Stat summary card ─────────────────────────────────────────────────────
interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: "blue" | "green" | "amber" | "gray" | "red";
}

function SummaryCard({ icon: Icon, label, value, color }: SummaryCardProps) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    amber:  "bg-amber-50 text-amber-600",
    gray:   "bg-slate-50 text-slate-600",
    red:    "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${colors[color] || colors.gray}`}>
        <Icon size={20}/>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ── Print preview component ───────────────────────────────────────────────
interface PrintPreviewProps {
  docs: Document[];
  dateFrom?: string;
  dateTo?: string;
  onClose: () => void;
}

function PrintPreview({ docs, dateFrom, dateTo, onClose }: PrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>Laporan SKBDN</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
          h1 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 16px; }
          .meta { display: flex; gap: 32px; margin-bottom: 16px; font-size: 10px; color: #666; }
          .meta span strong { color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f1f5f9; padding: 8px 6px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 7px 6px; font-size: 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          .right { text-align: right; }
          .center { text-align: center; }
          .total-row td { font-weight: 700; background: #eff6ff; border-top: 2px solid #3b82f6; }
          .footer { margin-top: 24px; font-size: 9px; color: #9ca3af; text-align: right; }
          .logo { font-size: 14px; font-weight: 800; color: #1e40af; }
          @media print {
            body { padding: 16px; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const totalNilai  = docs.reduce((s, d) => s + (d.total_price || 0), 0);
  const totalTonase = docs.reduce((s, d) => s + (d.tonnage || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">Preview Cetak Laporan</p>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all">
              <Printer size={14}/> Cetak / Simpan PDF
            </button>
            <button onClick={onClose}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
              Tutup
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div ref={printRef} className="bg-white p-8 rounded-xl shadow-sm min-h-[600px]">
            <div className="logo">PT PUPUK SRIWIDJAJA PALEMBANG</div>
            <h1 className="text-lg font-black mt-1 text-gray-900">LAPORAN REKAP SKBDN</h1>
            <h2 className="text-sm text-gray-500 mt-0.5">Sistem Informasi Monitoring SKBDN</h2>

            <div className="flex flex-wrap gap-6 mt-4 mb-6 text-xs text-gray-600">
              <span>Periode: <strong className="text-gray-900">{dateFrom || "Semua"} s/d {dateTo || "Sekarang"}</strong></span>
              <span>Total Dokumen: <strong className="text-gray-900">{docs.length}</strong></span>
              <span>Total Nilai: <strong className="text-gray-900">{formatRupiah(totalNilai)}</strong></span>
              <span>Total Tonase: <strong className="text-gray-900">{formatNumber(totalTonase)} Ton</strong></span>
              <span>Dicetak: <strong className="text-gray-900">{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</strong></span>
            </div>

            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["No","Nomor SKBDN","Buyer","Barang","Tonase","Total Nilai","Status","Expired"].map(h => (
                    <th key={h} style={{ padding:"8px 6px", textAlign:"left", fontSize:"10px", fontWeight:"700", borderBottom:"2px solid #cbd5e1", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr key={doc.id} style={{ background: i%2===0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0" }}>{i+1}</td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0", fontFamily:"monospace", fontWeight:"600", color:"#1d4ed8" }}>{doc.skbdn_number||"—"}</td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0" }}>
                      <div style={{ fontWeight:"600" }}>{doc.buyer?.name}</div>
                      <div style={{ color:"#6b7280", fontSize:"9px" }}>{doc.buyer?.company_name}</div>
                    </td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0" }}>{doc.goods_type}</td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0", textAlign:"right" }}>{formatNumber(doc.tonnage)} T</td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0", textAlign:"right", fontWeight:"600" }}>{formatRupiah(doc.total_price || 0, { compact: true })}</td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0" }}>{doc.status}</td>
                    <td style={{ padding:"7px 6px", borderBottom:"1px solid #e2e8f0", color: doc.expired_date && new Date(doc.expired_date) < new Date() ? "#dc2626" : "#374151" }}>
                      {doc.expired_date ? new Date(doc.expired_date).toLocaleDateString("id-ID") : "—"}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background:"#eff6ff", borderTop:"2px solid #3b82f6" }}>
                  <td colSpan={4} style={{ padding:"8px 6px", fontWeight:"700" }}>TOTAL</td>
                  <td style={{ padding:"8px 6px", textAlign:"right", fontWeight:"700" }}>{formatNumber(totalTonase)} T</td>
                  <td style={{ padding:"8px 6px", textAlign:"right", fontWeight:"700" }}>{formatRupiah(totalNilai)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>

            <p style={{ marginTop:"24px", fontSize:"9px", color:"#9ca3af", textAlign:"right" }}>
              Dicetak oleh Sistem SIMSKBDN — PT Pupuk Sriwidjaja Palembang
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expiring Soon card ────────────────────────────────────────────────────
function ExpiringSoonCard({ onOpenDetail }: { onOpenDetail?: (doc: Document) => void }) {
  const { data, isLoading } = useDocuments({ expiring_soon: true, page: 1, limit: 20, sort: "expiry_asc" });
  const docs = data?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #fffbeb, #fff)" }}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 rounded-xl">
            <AlertTriangle size={16} className="text-amber-500"/>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">SKBDN Hampir Expired</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Dokumen yang expired dalam 14 hari ke depan</p>
          </div>
        </div>
        {docs.length > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            {docs.length} dokumen
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 animate-pulse">
              <div className="flex-1 h-4 bg-gray-100 rounded"/>
              <div className="w-24 h-4 bg-gray-100 rounded"/>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
            <FileText size={20} className="text-green-400"/>
          </div>
          <p className="text-sm font-semibold text-gray-500">Tidak ada yang hampir expired</p>
          <p className="text-xs text-gray-400 mt-1">Semua dokumen masih dalam batas waktu aman</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {docs.map(doc => (
            <button key={doc.id} onClick={() => onOpenDetail?.(doc)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-amber-50/40 transition-colors text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-600 font-mono">{doc.skbdn_number || "—"}</p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {doc.buyer?.name} · {doc.goods_type} · {formatNumber(doc.tonnage)} Ton
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={doc.status}/>
                <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Laporan Page ──────────────────────────────────────────────────────
export default function AdminLaporanPage() {
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [status,     setStatus]     = useState<DocumentStatus | "">("");
  const [page,       setPage]       = useState(1);
  const [showPrint,  setShowPrint]  = useState(false);
  const [exporting,  setExporting]  = useState(false);

  const { data, isLoading, refetch } = useDocuments({
    page, limit: 20,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
    sort: "created_desc",
  });

  const docs       = data?.data || [];
  const total      = data?.total || 0;
  const totalPages = data?.total_pages || 1;
  const from       = total === 0 ? 0 : (page - 1) * 20 + 1;
  const to         = Math.min(page * 20, total);

  const totalNilai  = docs.reduce((s, d) => s + (d.total_price || 0), 0);
  const totalTonase = docs.reduce((s, d) => s + (d.tonnage || 0), 0);
  const approved    = docs.filter(d => d.status === "approved").length;

  const handleExport = async () => {
    setExporting(true);
    try {
      // Ambil semua data untuk export (tanpa limit)
      const { documentAPI } = await import("@/api/document.api");
      const res = await documentAPI.getAll({
        limit: 500,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to:   dateTo   || undefined,
      });
      const allDocs = res.data?.data?.data ?? [];
      exportLaporanBulanan(allDocs, dateFrom, dateTo, status);
    } catch {
      exportLaporanBulanan(docs, dateFrom, dateTo, status);
    }
    setExporting(false);
  };

  const pageNums: (number | "...")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pageNums.push(p);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  const STATUS_OPTS = [
    { value:"",                  label:"Semua Status"    },
    { value:"draft_submitted",   label:"Draft Dikirim"   },
    { value:"draft_under_review",label:"Direview AP2"    },
    { value:"draft_approved",    label:"Draft Verified"  },
    { value:"final_submitted",   label:"Final Dikirim"   },
    { value:"revision_requested",label:"Need Revision"   },
    { value:"approved",          label:"Verified"        },
    { value:"rejected",          label:"Ditolak"         },
    { value:"expired",           label:"Expired"         },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan & Export</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rekap SKBDN, export Excel, cetak laporan, monitor expired</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={() => setShowPrint(true)} disabled={docs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50">
            <Printer size={14}/> Cetak
          </button>
          <button onClick={handleExport} disabled={exporting || docs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 shadow-sm">
            <Download size={14}/> {exporting ? "Mengexport..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Filter size={12}/> Filter Laporan
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar size={14} className="text-gray-400 flex-shrink-0"/>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Dari</label>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"/>
              </div>
              <span className="text-gray-400 text-sm pt-5">—</span>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sampai</label>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"/>
              </div>
            </div>
          </div>
          <div className="sm:w-52">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value as DocumentStatus | ""); setPage(1); }}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 bg-white appearance-none cursor-pointer">
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {(dateFrom || dateTo || status) && (
            <div className="flex items-end">
              <button onClick={() => { setDateFrom(""); setDateTo(""); setStatus(""); setPage(1); }}
                className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 rounded-xl transition-all">
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={FileText}    label="Total Dokumen" value={total}                              color="blue"/>
        <SummaryCard icon={Scale}       label="Total Tonase"  value={`${formatNumber(totalTonase)} T`}  color="gray"/>
        <SummaryCard icon={TrendingUp}  label="Total Nilai"   value={formatRupiah(totalNilai, { compact: true })} color="green"/>
      </div>

      {/* 2-col layout: table + expiring soon */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Tabel hasil filter */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Daftar Dokumen</p>
            <span className="text-xs text-gray-400 tabular-nums">{from}–{to} dari {total}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["No","SKBDN","Buyer","Nilai","Status","Expired"].map(h => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider ${
                      h === "Nilai" ? "text-right" : h === "Status" || h === "Expired" || h === "No" ? "text-center" : "text-left"
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                    ))}</tr>
                  ))
                ) : docs.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <FileText size={32} className="mx-auto text-gray-200 mb-3"/>
                    <p className="text-sm text-gray-400 font-medium">Tidak ada dokumen</p>
                    <p className="text-xs text-gray-300 mt-1">Coba ubah filter periode atau status</p>
                  </td></tr>
                ) : docs.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3.5 text-center text-sm text-gray-400 tabular-nums">{from + idx}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-bold text-blue-600 font-mono">{doc.skbdn_number || "—"}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[150px]">{doc.goods_type}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-gray-800">{doc.buyer?.name || "—"}</p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[120px]">{doc.buyer?.company_name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-sm text-gray-700 tabular-nums">{formatRupiah(doc.total_price || 0, { compact: true })}</p>
                      <p className="text-[11px] text-gray-400">{formatNumber(doc.tonnage)} T</p>
                    </td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge status={doc.status}/></td>
                    <td className="px-4 py-3.5 text-center"><ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">{from}–{to} dari <strong>{total}</strong> Total</p>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={14}/>
                </button>
                {pageNums.map((p, i) => p === "..." ? (
                  <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      p === page ? "bg-blue-600 text-white border border-blue-600" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    }`}>{p}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expiring soon */}
        <ExpiringSoonCard onOpenDetail={() => {}}/>
      </div>

      {/* Print modal */}
      {showPrint && (
        <PrintPreview docs={docs} dateFrom={dateFrom} dateTo={dateTo} onClose={() => setShowPrint(false)}/>
      )}
    </div>
  );
}
