"use client";

import { Search, FileText, ChevronLeft, ChevronRight, Filter, ArrowUpDown, ChevronDown, X, type LucideIcon } from "lucide-react";
import { useState, type MouseEvent } from "react";
import StatusBadge from "../ui/StatusBadge";
import ExpiryIndicator from "../skbdn/ExpiryIndicator";
import { formatRupiah, formatNumber } from "../skbdn/utils";
import type { Document, PaginatedResponse } from "@/types";

interface SelectOption {
  value: string;
  label: string;
}

const STATUS_FILTERS: SelectOption[] = [
  { value:"",                     label:"Semua Status"    },
  { value:"draft_submitted",      label:"Draft Dikirim"   },
  { value:"draft_under_review",   label:"Draft Direview"  },
  { value:"draft_revision_buyer", label:"Revisi Draft"    },
  { value:"draft_approved",       label:"Draft Verified"  },
  { value:"final_submitted",      label:"Final Dikirim"   },
  { value:"final_under_review",   label:"Final Direview"  },
  { value:"revision_requested",   label:"Need Revision"   },
  { value:"approved",             label:"Verified"        },
  { value:"expired",              label:"Expired"         },
  { value:"rejected",             label:"Rejected"        },
];
const SORT_OPTIONS: SelectOption[] = [
  { value:"",           label:"Terbaru"          },
  { value:"expiry_asc", label:"Expired Terdekat" },
  { value:"value_desc", label:"Nilai Tertinggi"  },
];

interface DropdownProps {
  icon: LucideIcon;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  minWidth?: number;
}

function Dropdown({ icon: Icon, options, value, onChange, minWidth = 180 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.value === value) || options[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
          value ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
        }`} style={{ minWidth }}>
        <Icon size={13} className="flex-shrink-0"/>
        <span className="truncate flex-1">{cur?.label}</span>
        <ChevronDown size={11} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && <>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
        <div className="absolute right-0 mt-1.5 z-20 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 w-52 max-h-72 overflow-y-auto">
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${
                value === o.value ? "text-blue-600 font-bold bg-blue-50/60" : "text-gray-700 font-medium"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </>}
    </div>
  );
}

export interface MonitoringFilters {
  search?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface FinanceMonitoringTableProps {
  documents?: PaginatedResponse<Document>;
  loading?: boolean;
  onOpenDetail?: (doc: Document) => void;
  filters?: MonitoringFilters;
  onFiltersChange?: (filters: MonitoringFilters) => void;
  lockStatus?: boolean;
}

export default function FinanceMonitoringTable({ documents, loading, onOpenDetail, filters = {}, onFiltersChange, lockStatus = false }: FinanceMonitoringTableProps) {
  const set = (k: keyof MonitoringFilters, v: string | number) =>
    onFiltersChange?.({ ...filters, [k]: v, ...(k !== "page" ? { page: 1 } : {}) });

  const docs       = documents?.data || [];
  const total      = documents?.total ?? docs.length;
  const page       = documents?.page || filters.page || 1;
  const limit      = documents?.limit || filters.limit || 15;
  const totalPages = documents?.total_pages || Math.max(1, Math.ceil(total / limit));
  const from       = total === 0 ? 0 : (page - 1) * limit + 1;
  const to         = Math.min(page * limit, total);

  const pageNums: (number | "...")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pageNums.push(p);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  return (
    <div className="space-y-3 w-full">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={filters.search || ""} onChange={e => set("search", e.target.value)}
            placeholder="Cari nomor SKBDN, nama pembeli, jenis barang..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!lockStatus && <Dropdown icon={Filter} options={STATUS_FILTERS} value={filters.status || ""} onChange={v => set("status", v)}/>}
          <Dropdown icon={ArrowUpDown} options={SORT_OPTIONS} value={filters.sort || ""} onChange={v => set("sort", v)} minWidth={155}/>
          <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">
            <strong className="text-gray-700">{total}</strong> dokumen
          </span>
        </div>
      </div>

      {!lockStatus && (filters.status || "") && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg">
            Filter: {STATUS_FILTERS.find(f => f.value === filters.status)?.label}
            <button onClick={() => set("status", "")} className="hover:text-red-500 transition-colors"><X size={11}/></button>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKBDN</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pembeli</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Barang</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tonase</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nilai</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expired</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ver</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center">
                    <FileText size={36} className="mx-auto text-gray-200 mb-3"/>
                    <p className="text-sm font-semibold text-gray-400">Tidak ada dokumen</p>
                    <p className="text-xs text-gray-300 mt-1">Coba ubah filter atau kata kunci</p>
                  </td>
                </tr>
              ) : docs.map((doc, idx) => (
                <tr key={doc.id} onClick={() => onOpenDetail?.(doc)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-4 text-sm text-center text-gray-400 tabular-nums">{from + idx}</td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-blue-600 font-mono leading-tight">{doc.skbdn_number || "—"}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[170px]">{doc.title}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{doc.buyer?.name || "—"}</p>
                    <p className="text-[11px] text-gray-400 truncate max-w-[130px]">{doc.buyer?.company_name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700 truncate max-w-[130px]">{doc.goods_type || "—"}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-gray-700 tabular-nums">{doc.tonnage ? `${formatNumber(doc.tonnage)} T` : "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-gray-700 tabular-nums">{doc.total_price ? formatRupiah(doc.total_price, { compact: true }) : "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-center"><StatusBadge status={doc.status}/></td>
                  <td className="px-4 py-4 text-center"><ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/></td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">v{doc.current_version || 1}</span>
                  </td>
                  <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onOpenDetail?.(doc)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-all">
                      Buka
                    </button>
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
              <button disabled={page <= 1} onClick={() => set("page", page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={14}/>
              </button>
              {pageNums.map((p, i) => p === "..." ? (
                <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
              ) : (
                <button key={p} onClick={() => set("page", p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    p === page ? "bg-blue-600 text-white border border-blue-600" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => set("page", page + 1)}
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
