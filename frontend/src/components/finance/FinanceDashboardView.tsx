"use client";
// Padanan dari pages/finance/FinanceDashboard.jsx — satu komponen ini dipakai
// oleh 6 route: /finance, /finance/review, /finance/inprogress,
// /finance/approved, /finance/monitoring, /finance/laporan — persis seperti
// aslinya, switch tampilan berdasarkan usePathname().

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText, Eye, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Scale, RefreshCw, AlertCircle, ShieldCheck,
  Activity, Banknote, ArrowRight, Zap, BarChart2, Timer,
} from "lucide-react";
import FinanceMonitoringTable, { type MonitoringFilters } from "@/components/finance/FinanceMonitoringTable";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import { useFinanceDocuments, useFinanceStats } from "@/hooks/useFinance";
import { useQueryClient } from "@tanstack/react-query";
import { formatRupiah } from "@/components/skbdn/utils";
import type { Document, DocumentStats } from "@/types";

const rp  = (v?: number | null) => formatRupiah(v||0, { compact: true });
const num = (v?: number | null) => (v||0).toLocaleString("id-ID");

/* ─── Horizontal progress bar mini ──────────────────────────────────────── */
function ProgressBar({ pct, color = "bg-blue-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(3, pct)}%` }}/>
    </div>
  );
}

/* ─── Dokumen prioritas review ───────────────────────────────────────────── */
function ReviewQueue({ onOpen }: { onOpen?: (id: string) => void }) {
  const nav = useRouter();
  const SHOW = 3;
  const { data: draft } = useFinanceDocuments({ status: "draft_under_review", page: 1, limit: 10 });
  const { data: final } = useFinanceDocuments({ status: "final_under_review", page: 1, limit: 10 });
  const draftDocs = draft?.data || [];
  const finalDocs = final?.data || [];
  const totalCount = (draft?.total || 0) + (final?.total || 0);

  const DocRow = ({ doc, type }: { doc: Document; type: "draft" | "final" }) => (
    <button onClick={() => onOpen?.(doc.id)}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50/40 transition-colors text-left border-b border-gray-50 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${type==="draft"?"bg-amber-50":"bg-purple-50"}`}>
        <FileText size={13} className={type==="draft"?"text-amber-500":"text-purple-500"}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-bold text-blue-600">{doc.skbdn_number||"—"}</p>
        <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name} · {num(doc.tonnage)} Ton</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
        <ArrowRight size={11} className="text-gray-300"/>
      </div>
    </button>
  );

  const isEmpty = draftDocs.length === 0 && finalDocs.length === 0;
  const showDraft = draftDocs.slice(0, SHOW);
  const showFinal = finalDocs.slice(0, Math.max(0, SHOW - showDraft.length));
  const hasMore = totalCount > SHOW;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full" style={{ minHeight: 280 }}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Zap size={15} className="text-amber-500"/>
        <p className="text-sm font-bold text-gray-900">Antrian Review</p>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${totalCount > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
          {totalCount} dok
        </span>
      </div>

      <div className="flex-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle2 size={24} className="text-green-400"/>
            </div>
            <p className="text-sm font-semibold text-gray-500">Antrian review kosong</p>
            <p className="text-xs text-gray-400 mt-1">Semua dokumen sudah diproses ✓</p>
          </div>
        ) : (
          <>
            {showDraft.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider">Draft — Perlu Direview</p>
                {showDraft.map(d => <DocRow key={d.id} doc={d} type="draft"/>)}
              </>
            )}
            {showFinal.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-purple-500 uppercase tracking-wider">Final — Perlu Direview</p>
                {showFinal.map(d => <DocRow key={d.id} doc={d} type="final"/>)}
              </>
            )}
          </>
        )}
      </div>

      {hasMore && (
        <button onClick={() => nav.push("/finance/review")}
          className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-xs font-semibold text-blue-600 hover:bg-blue-50/50 transition-colors">
          <Eye size={13}/> Lihat {totalCount - SHOW} dokumen lainnya
          <ArrowRight size={12}/>
        </button>
      )}
    </div>
  );
}


/* ─── Status pipeline cards ──────────────────────────────────────────────── */
function StatusPipeline({ stats }: { stats?: DocumentStats }) {
  const total = Math.max(stats?.total || 1, 1);
  const rows = [
    { label: "Draft Masuk",      val: stats?.pending_review||0, icon: Clock,        color: "text-blue-500",   bar: "bg-blue-400",    bg: "bg-blue-50"    },
    { label: "Sedang Review",    val: stats?.under_review||0,   icon: Eye,          color: "text-amber-500",  bar: "bg-amber-400",   bg: "bg-amber-50"   },
    { label: "Need Revision",    val: stats?.need_revision||0,  icon: AlertTriangle,color: "text-orange-500", bar: "bg-orange-400",  bg: "bg-orange-50"  },
    { label: "Verified",         val: stats?.approved||0,       icon: CheckCircle2, color: "text-green-500",  bar: "bg-green-500",   bg: "bg-green-50"   },
    { label: "Rejected",         val: stats?.rejected||0,       icon: AlertCircle,  color: "text-red-500",    bar: "bg-red-400",     bg: "bg-red-50"     },
    { label: "Disbursed",        val: stats?.disbursed||0,      icon: ShieldCheck,  color: "text-emerald-500",bar: "bg-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-full">
      <p className="text-sm font-bold text-gray-900 mb-4">Status Pipeline</p>
      <div className="space-y-3.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${r.bg} flex-shrink-0`}>
              <r.icon size={12} className={r.color}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className="text-[11px] font-semibold text-gray-600">{r.label}</span>
                <span className="text-[11px] font-bold text-gray-800 tabular-nums">{r.val}</span>
              </div>
              <ProgressBar pct={(r.val/total)*100} color={r.bar}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Nilai dashboard ─────────────────────────────────────────────────────── */
function ValueDashboard({ stats }: { stats?: DocumentStats }) {
  const metrics = [
    { label: "Total Nilai SKBDN",  val: rp(stats?.total_value),    icon: TrendingUp, color: "blue"    },
    { label: "Nilai Approved",     val: rp(stats?.approved_value), icon: CheckCircle2,color:"green"   },
    { label: "Total Tonase",       val: `${num(stats?.total_tonnage)} T`, icon: Scale, color: "indigo"},
    { label: "Dokumen Expired",    val: `${stats?.expired||0} dok`, icon: Timer,     color: "red"     },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-sm font-bold text-gray-900 mb-4">Ringkasan Nilai & Volume</p>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className={`p-3.5 rounded-xl bg-${m.color}-50 border border-${m.color}-100`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <m.icon size={12} className={`text-${m.color}-500`}/>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{m.label}</p>
            </div>
            <p className="text-base font-extrabold text-gray-900 tabular-nums">{m.val}</p>
          </div>
        ))}
      </div>

      {/* Stacked value bar */}
      {(stats?.total_value||0) > 0 && (
        <div className="mt-4">
          <p className="text-[10px] text-gray-400 mb-1.5">Komposisi Nilai</p>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {[
              { v: (stats?.total_value||0) - (stats?.approved_value||0), c: "bg-blue-400"   },
              { v:  stats?.approved_value||0,                             c: "bg-green-500"  },
            ].map((s, i) => {
              const pct = ((s.v / (stats?.total_value||1)) * 100);
              return pct > 1 ? <div key={i} className={s.c} style={{ width: `${pct}%` }}/> : null;
            })}
          </div>
          <div className="flex gap-3 mt-1.5">
            <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block"/>Proses</span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block"/>Approved</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Perlu revisi ─────────────────────────────────────────────────────────── */
function RevisionNeeded({ onOpen }: { onOpen?: (id: string) => void }) {
  const nav = useRouter();
  const SHOW = 4;
  const { data } = useFinanceDocuments({ status: "revision_requested,draft_revision_buyer", page: 1, limit: 20 });
  const docs = (data?.data || []).slice(0, SHOW);
  const totalCount = data?.total || 0;
  const hasMore = totalCount > SHOW;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-500"/>
          <p className="text-sm font-bold text-gray-900">Perlu Revisi</p>
        </div>
        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{data?.total||docs.length}</span>
      </div>
      {docs.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <CheckCircle2 size={24} className="text-green-300 mb-1.5"/>
          <p className="text-xs text-gray-400">Tidak ada revisi pending</p>
        </div>
      ) : docs.map(doc => (
        <button key={doc.id} onClick={() => onOpen?.(doc.id)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-orange-50/40 transition-colors text-left border-b border-gray-50 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-bold text-orange-600">{doc.skbdn_number||"—"}</p>
            <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name}</p>
          </div>
          <StatusBadge status={doc.status}/>
        </button>
      ))}
    </div>
  );
}

/* ─── Approved sudah disetujui ─────────────────────────────────────────────── */
function ApprovedQueue({ onOpen }: { onOpen?: (id: string) => void }) {
  const { data } = useFinanceDocuments({ status: "approved", page: 1, limit: 6 });
  const docs = data?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-green-100 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #f0fdf4, #ffffff)" }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-green-500"/>
          <p className="text-sm font-bold text-gray-900">Approved — Menunggu Pencairan</p>
        </div>
        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{data?.total||docs.length}</span>
      </div>
      {docs.length === 0 ? (
        <p className="px-5 py-8 text-xs text-gray-400 text-center">Tidak ada SKBDN yang pending</p>
      ) : docs.map(doc => (
        <button key={doc.id} onClick={() => onOpen?.(doc.id)}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-green-50/60 transition-colors text-left border-b border-gray-50 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-bold text-gray-900">{doc.skbdn_number||"—"}</p>
            <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name} · {doc.buyer?.company_name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-green-600">{rp(doc.total_price)}</p>
            <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Table view ─────────────────────────────────────────────────────────── */
interface TableViewProps {
  title: string;
  subtitle?: string;
  initialStatus?: string;
}

function TableView({ title, subtitle, initialStatus }: TableViewProps) {
  const navigate = useRouter();
  const [filters, setFilters] = useState<MonitoringFilters>({ status: initialStatus||"", search:"", sort:"", page:1, limit:15 });
  const { data: docsData, isLoading } = useFinanceDocuments(filters);
  useEffect(() => { setFilters(f => ({ ...f, status: initialStatus||"", page:1 })); }, [initialStatus]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <FinanceMonitoringTable
        documents={docsData} loading={isLoading}
        onOpenDetail={(doc: Document) => navigate.push(`/finance/documents/${doc.id}`)}
        filters={filters} onFiltersChange={setFilters}
        lockStatus={!!initialStatus}
      />
    </div>
  );
}

/* ─── Overview ──────────────────────────────────────────────────────────── */
function Overview() {
  const nav = useRouter();
  const qc = useQueryClient();
  const { data: stats, isLoading: ls, refetch } = useFinanceStats();
  const handleRefresh = () => { qc.invalidateQueries(); refetch(); };
  const v = (k: keyof DocumentStats): number | undefined => ls ? undefined : (stats?.[k] ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Keuangan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoring & Review SKBDN · PT Pupuk Sriwidjaja Palembang</p>
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex-shrink-0">
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={FileText}     label="Total SKBDN"    color="blue"  loading={ls} value={v("total")}          onClick={() => nav.push("/finance/monitoring")}/>
        <StatCard icon={Clock}        label="Perlu Direview" color="amber" loading={ls} value={v("pending_review")} onClick={() => nav.push("/finance/review")}/>
        <StatCard icon={Eye}          label="Sedang Review"  color="blue"  loading={ls} value={v("under_review")}   onClick={() => nav.push("/finance/inprogress")}/>
        <StatCard icon={AlertTriangle}label="Need Revision"  color="red"   loading={ls} value={v("need_revision")}/>
        <StatCard icon={CheckCircle2} label="Verified"       color="green" loading={ls} value={v("approved")}       onClick={() => nav.push("/finance/approved")}/>
      </div>

      {/* Alert expiring */}
      {(stats?.expiring_soon||0) > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0"/>
          <p className="text-sm font-semibold text-amber-800">
            {stats?.expiring_soon} SKBDN akan expired ≤14 hari — segera proses!
          </p>
        </div>
      )}

      {/* Baris 1: Antrian review + Status pipeline — sama tinggi */}
      <div className="grid lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <ReviewQueue onOpen={id => nav.push(`/finance/documents/${id}`)}/>
        </div>
        <div className="flex flex-col">
          <StatusPipeline stats={stats}/>
        </div>
      </div>

      {/* Baris 2: Nilai + Revisi + Approved queue */}
      <div className="grid lg:grid-cols-3 gap-5">
        <ValueDashboard stats={stats}/>
        <RevisionNeeded onOpen={id => nav.push(`/finance/documents/${id}`)}/>
        <ApprovedQueue  onOpen={id => nav.push(`/finance/documents/${id}`)}/>
      </div>
    </div>
  );
}

export default function FinanceDashboardView() {
  const seg = usePathname().split("/")[2] || "";
  if (!seg) return <Overview/>;

  const views: Record<string, { title: string; sub: string; status: string }> = {
    review:     { title:"Perlu Direview",  sub:"Dokumen menunggu keputusan Keuangan",
                  status:"draft_under_review,final_under_review,final_sent_to_finance,under_review" },
    inprogress: { title:"Sedang Direview", sub:"Dokumen dalam proses review",
                  status:"final_under_review,under_review" },
    approved:   { title:"Verified",        sub:"SKBDN sudah Verified",
                  status:"approved" },
    monitoring: { title:"Monitoring SKBDN",sub:"Pantau seluruh dokumen", status:"" },
    laporan:    { title:"Laporan",         sub:"Laporan & rekap dokumen SKBDN", status:"" },
  };

  const v = views[seg];
  if (!v) return <TableView title="Monitoring SKBDN" subtitle="Semua dokumen" initialStatus=""/>;
  return <TableView title={v.title} subtitle={v.sub} initialStatus={v.status}/>;
}
