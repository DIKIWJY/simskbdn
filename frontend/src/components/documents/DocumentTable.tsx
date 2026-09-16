"use client";

import { Search, FileText, Upload, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import StatusBadge from "../ui/StatusBadge";
import ExpiryIndicator from "../skbdn/ExpiryIndicator";
import { formatRupiah, formatNumber } from "../skbdn/utils";
import type { Document, DocumentStatus, PaginatedResponse } from "@/types";

interface StatusOption {
  value: string;
  label: string;
}

const ACTIVE_STATUS_OPTIONS: StatusOption[] = [
  { value:"",                     label:"Semua Aktif"       },
  { value:"draft_submitted",      label:"Draft Dikirim"     },
  { value:"draft_under_review",   label:"Direview Keuangan" },
  { value:"draft_revision_buyer", label:"Dikembalikan"      },
  { value:"draft_approved",       label:"Draft Verified"    },
  { value:"final_submitted",      label:"Final Dikirim"     },
  { value:"final_under_review",   label:"Final Direview"    },
  { value:"revision_requested",   label:"Need Revision"     },
];

const HISTORY_STATUS_OPTIONS: StatusOption[] = [
  { value:"",         label:"Semua Riwayat" },
  { value:"approved", label:"Verified"      },
  { value:"rejected", label:"Ditolak"       },
  { value:"expired",  label:"Expired"       },
];

const ALL_STATUS_OPTIONS: StatusOption[] = [
  { value:"",                     label:"Semua Status"      },
  { value:"draft_submitted",      label:"Draft Dikirim"     },
  { value:"draft_under_review",   label:"Direview Keuangan" },
  { value:"draft_revision_buyer", label:"Dikembalikan"      },
  { value:"draft_approved",       label:"Draft Verified"    },
  { value:"final_submitted",      label:"Final Dikirim"     },
  { value:"final_under_review",   label:"Final Direview"    },
  { value:"revision_requested",   label:"Need Revision"     },
  { value:"approved",             label:"Verified"          },
  { value:"rejected",             label:"Ditolak"           },
  { value:"expired",              label:"Expired"           },
];

// Keep legacy name for backward compat
const STATUS_OPTIONS = ALL_STATUS_OPTIONS;

const canReupload    = (s: DocumentStatus | string): boolean => ["revision_requested", "draft_revision_buyer"].includes(s);
const canUploadFinal = (s: DocumentStatus | string): boolean => s === "draft_approved";

interface DocumentTableProps {
  data?: PaginatedResponse<Document>;
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onReupload?: (doc: Document) => void;
  onUploadFinal?: (doc: Document) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilter?: (value: string) => void;
  viewMode?: "all" | "documents" | "history";
}

export default function DocumentTable({ data, loading, page = 1, totalPages = 1, onPageChange, onReupload, onUploadFinal, searchQuery, onSearchChange, statusFilter, onStatusFilter, viewMode = "all" }: DocumentTableProps) {
  const router = useRouter();
  const docs  = data?.data || [];
  const total = data?.total || 0;
  const limit = data?.limit || 10;
  const from  = total === 0 ? 0 : (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);

  const statusOpts = viewMode === "documents" ? ACTIVE_STATUS_OPTIONS
                   : viewMode === "history"   ? HISTORY_STATUS_OPTIONS
                   : ALL_STATUS_OPTIONS;

  const pageNums: (number | "...")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pageNums.push(p);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  return (
    <div className="space-y-3 w-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={searchQuery} onChange={e => onSearchChange?.(e.target.value)}
            placeholder="Cari nomor SKBDN, jenis barang..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"/>
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <select value={statusFilter} onChange={e => onStatusFilter?.(e.target.value)}
            className="pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-400 appearance-none cursor-pointer min-w-[180px]">
            {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nomor SKBDN</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Jenis Barang</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tonase</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nilai</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expired</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <FileText size={36} className="mx-auto text-gray-200 mb-3"/>
                    <p className="text-sm font-semibold text-gray-400">Tidak ada dokumen ditemukan</p>
                    <p className="text-xs text-gray-300 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                  </td>
                </tr>
              ) : docs.map((doc, idx) => (
                <tr key={doc.id} onClick={() => router.push(`/buyer/documents/${doc.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-4 text-sm text-center text-gray-400 tabular-nums">{from + idx}</td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-blue-600 font-mono leading-tight">{doc.skbdn_number || "—"}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{doc.title}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700">{doc.goods_type || "—"}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-gray-700 tabular-nums">{doc.tonnage ? `${formatNumber(doc.tonnage)} T` : "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-gray-700 tabular-nums">{doc.total_price ? formatRupiah(doc.total_price, { compact: true }) : "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-center"><StatusBadge status={doc.status}/></td>
                  <td className="px-4 py-4 text-center"><ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/></td>
                  <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => router.push(`/buyer/documents/${doc.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-all">
                        Detail
                      </button>
                      {canReupload(doc.status) && (
                        <button onClick={() => onReupload?.(doc)}
                          className="px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-100 transition-all flex items-center gap-1">
                          <Upload size={11}/> Revisi
                        </button>
                      )}
                      {canUploadFinal(doc.status) && (
                        <button onClick={() => onUploadFinal?.(doc)}
                          className="px-3 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-100 transition-all flex items-center gap-1">
                          <Upload size={11}/> Final
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">{from}–{to} dari <strong className="text-gray-800">{total}</strong> Total</p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={14}/>
              </button>
              {pageNums.map((p, i) => p === "..." ? (
                <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
              ) : (
                <button key={p} onClick={() => onPageChange?.(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    p === page ? "bg-blue-600 text-white border border-blue-600" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
