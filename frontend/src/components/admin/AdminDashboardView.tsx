"use client";
// Padanan dari pages/admin/AdminDashboard.jsx — satu komponen dipakai oleh
// 5 route: /admin, /admin/inbox, /admin/forwarded, /admin/approved,
// /admin/monitoring. AdminDocumentDetailPage tetap di-import relatif
// ("./AdminDocumentDetailPage") karena satu folder, sama seperti kode asli.

import { useRouter, usePathname } from "next/navigation";
import {
  Inbox, Send, BarChart2, Upload, Users, CheckCircle2,
  AlertTriangle, TrendingUp, FileText, Banknote, RefreshCw,
  Clock, ShieldCheck, Activity, ArrowRight, Zap,
  Building2, Scale, Eye,
} from "lucide-react";
import { useDocuments, useDocumentStats } from "@/hooks/useDocuments";
import { useQueryClient } from "@tanstack/react-query";
import FinanceMonitoringTable, { type MonitoringFilters } from "@/components/finance/FinanceMonitoringTable";
import AdminDocumentDetailPage from "./AdminDocumentDetailPage";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import { useState, useEffect } from "react";
import { formatRupiah } from "@/components/skbdn/utils";
import type { Document, DocumentStats, DocumentStatus } from "@/types";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const rp  = (v?: number | null) => formatRupiah(v||0, { compact: true });
const num = (v?: number | null) => (v||0).toLocaleString("id-ID");

/* ─── Pipeline funnel (CSS bar chart) ─────────────────────────────────────── */
interface PipelineBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function PipelineBar({ label, count, total, color }: PipelineBarProps) {
  const pct = total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[11px] font-semibold text-gray-500 text-right flex-shrink-0 truncate">{label}</div>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }}/>
      </div>
      <div className="w-8 text-xs font-bold text-gray-800 tabular-nums text-right">{count}</div>
    </div>
  );
}

function Pipeline({ stats }: { stats?: DocumentStats }) {
  const total = stats?.total || 1;
  const stages = [
    { label: "Draft Dikirim",   count: stats?.pending_review||0,  color: "bg-blue-400"   },
    { label: "Direview AP2",    count: stats?.under_review||0,    color: "bg-amber-400"  },
    { label: "Dengan Keuangan", count: (stats?.draft_approved||0)+(stats?.under_review||0), color: "bg-indigo-400" },
    { label: "Need Revision",   count: stats?.need_revision||0,   color: "bg-orange-400" },
    { label: "Verified",        count: stats?.approved||0,        color: "bg-green-500"  },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 mb-1">Pipeline SKBDN</p>
      <p className="text-xs text-gray-400 mb-4">Sebaran dokumen per tahap alur</p>
      <div className="space-y-2.5">
        {stages.map(s => <PipelineBar key={s.label} {...s} total={total}/>)}
      </div>
    </div>
  );
}

/* ─── Value breakdown (horizontal stacked bar) ─────────────────────────────── */
function ValueBreakdown({ stats }: { stats?: DocumentStats }) {
  const total = stats?.total_value || 1;
  const segments = [
    { label: "Proses",    value: stats?.total_value ? (stats.total_value - (stats.approved_value||0)) : 0, color: "bg-blue-400"   },
    { label: "Verified",  value: stats?.approved_value||0,  color: "bg-green-500"  },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 mb-1">Distribusi Nilai</p>
      <p className="text-xs text-gray-400 mb-3">Total: <strong className="text-gray-700">{formatRupiah(stats?.total_value||0)}</strong></p>
      <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-3">
        {segments.map(s => {
          const pct = total > 0 ? Math.max(2, (s.value/total)*100) : 50;
          return <div key={s.label} className={`${s.color} transition-all duration-700`} style={{ width: `${pct}%` }}/>;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`}/>
            <span className="text-[11px] text-gray-500">{s.label}: <strong className="text-gray-700">{rp(s.value)}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Urgency queue (dokumen butuh aksi segera) ─────────────────────────────── */
function UrgencyQueue({ onOpen }: { onOpen?: (id: string) => void }) {
  const { data: urgent } = useDocuments({ status: "draft_submitted", page: 1, limit: 5, sort: "created_asc" });
  const { data: expiring } = useDocuments({ expiring_soon: true, page: 1, limit: 4 });
  const docs = urgent?.data || [];
  const expDocs = expiring?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-amber-500"/>
          <p className="text-sm font-bold text-gray-900">Butuh Aksi Segera</p>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">Draft belum diproses & akan expired</p>
      </div>

      {docs.length > 0 && (
        <div>
          <p className="px-5 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Draft Menunggu Verifikasi</p>
          {docs.map(doc => (
            <button key={doc.id} onClick={() => onOpen?.(doc.id)}
              className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-amber-50/50 transition-colors text-left border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Inbox size={13} className="text-amber-500"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900">{doc.skbdn_number||"—"}</p>
                <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name} · {doc.goods_type}</p>
              </div>
              <ArrowRight size={12} className="text-amber-400 flex-shrink-0"/>
            </button>
          ))}
        </div>
      )}

      {expDocs.length > 0 && (
        <div>
          <p className="px-5 pt-3 pb-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">Akan Expired ≤14 Hari</p>
          {expDocs.map(doc => (
            <button key={doc.id} onClick={() => onOpen?.(doc.id)}
              className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-red-50/40 transition-colors text-left border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900">{doc.skbdn_number||"—"}</p>
                <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name}</p>
              </div>
              <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
            </button>
          ))}
        </div>
      )}

      {docs.length === 0 && expDocs.length === 0 && (
        <div className="px-5 py-10 text-center">
          <CheckCircle2 size={28} className="text-green-300 mb-2"/>
          <p className="text-xs text-gray-400">Semua dokumen sudah diproses</p>
        </div>
      )}
    </div>
  );
}

interface BuyerAggregate {
  name: string;
  company: string;
  count: number;
  value: number;
}

/* ─── Buyer leaderboard ─────────────────────────────────────────────────────── */
function BuyerStats({ onOpen }: { onOpen?: (id: string) => void }) {
  const { data } = useDocuments({ page: 1, limit: 50 });
  const docs = data?.data || [];

  const byBuyer = docs.reduce<Record<string, BuyerAggregate>>((acc, doc) => {
    const id = doc.buyer_id || doc.buyer?.id;
    if (!id) return acc;
    if (!acc[id]) acc[id] = { name: doc.buyer?.name||"?", company: doc.buyer?.company_name||"", count: 0, value: 0 };
    acc[id]!.count++;
    acc[id]!.value += doc.total_price || 0;
    return acc;
  }, {});

  const sorted = Object.values(byBuyer).sort((a,b) => b.value - a.value).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Building2 size={14} className="text-indigo-400"/>
        <p className="text-sm font-bold text-gray-900">Top Buyer</p>
      </div>
      <div className="divide-y divide-gray-50">
        {sorted.map((b, i) => (
          <div key={b.name} className="flex items-center gap-3 px-5 py-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
              i===0?"bg-yellow-100 text-yellow-700":i===1?"bg-gray-100 text-gray-600":"bg-slate-50 text-slate-500"
            }`}>{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{b.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{b.company} · {b.count} SKBDN</p>
            </div>
            <span className="text-xs font-bold text-gray-700 tabular-nums flex-shrink-0">{rp(b.value)}</span>
          </div>
        ))}
        {sorted.length === 0 && <p className="px-5 py-6 text-xs text-gray-400 text-center">Belum ada data</p>}
      </div>
    </div>
  );
}

function DisbursedMonitor({ onOpen }: { onOpen?: (id: string) => void }) {
  const docs = data?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={14} className="text-emerald-500"/>
          <p className="text-sm font-bold text-gray-900">Monitor Pencairan</p>
        </div>
        <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-600 font-semibold rounded-full border border-emerald-100">
          {data?.total??docs.length} total
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {docs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Banknote size={28} className="text-gray-200 mb-2"/>
            <p className="text-xs text-gray-400">Belum ada yang Verified</p>
          </div>
        ) : docs.map(doc => (
          <button key={doc.id} onClick={() => onOpen?.(doc.id)}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-emerald-50/40 transition-colors text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={13} className="text-emerald-500"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-bold text-gray-900">{doc.skbdn_number||"—"}</p>
              <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name} · {doc.goods_type}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold text-emerald-600">{rp(doc.total_price)}</p>
              <p className="text-[10px] text-gray-400">{num(doc.tonnage)} Ton</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Recent activity feed ──────────────────────────────────────────────────── */
function ActivityFeed() {
  const { data } = useDocuments({ page: 1, limit: 8, sort: "updated_desc" });
  const docs = data?.data || [];

  const statusColor: Partial<Record<DocumentStatus, string>> = {
    draft_submitted: "bg-blue-500", draft_under_review: "bg-amber-500",
    draft_approved: "bg-teal-500", approved: "bg-green-500",
    revision_requested: "bg-orange-500", draft_revision_buyer: "bg-orange-400",
    final_submitted: "bg-purple-500", final_under_review: "bg-indigo-500",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Activity size={14} className="text-blue-400"/>
        <p className="text-sm font-bold text-gray-900">Aktivitas Terkini</p>
      </div>
      <div className="divide-y divide-gray-50">
        {docs.length === 0 ? (
          <p className="px-5 py-8 text-xs text-gray-400 text-center">Belum ada aktivitas</p>
        ) : docs.map(doc => (
          <div key={doc.id} className="flex items-start gap-3 px-5 py-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor[doc.status]||"bg-gray-400"}`}/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800">{doc.skbdn_number||"—"}</p>
              <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name} · {doc.goods_type}</p>
            </div>
            <StatusBadge status={doc.status}/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Table view ─────────────────────────────────────────────────────────────── */
interface TableViewProps {
  title: string;
  subtitle?: string;
  initialStatus?: string;
}

function TableView({ title, subtitle, initialStatus }: TableViewProps) {
  const [filters, setFilters] = useState<MonitoringFilters>({ status: initialStatus||"", search:"", page:1, limit:15 });
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isLoading } = useDocuments(filters);
  useEffect(() => { setFilters(f => ({ ...f, status: initialStatus||"", page:1 })); }, [initialStatus]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <FinanceMonitoringTable
        documents={data} loading={isLoading}
        onOpenDetail={(doc: Document) => setDetailId(doc.id)}
        filters={filters} onFiltersChange={setFilters}
        lockStatus={!!initialStatus}
      />
      {detailId && <AdminDocumentDetailPage docId={detailId} onClose={() => setDetailId(null)}/>}
    </div>
  );
}

/* ─── OVERVIEW utama ─────────────────────────────────────────────────────────── */
function Overview() {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: stats, isLoading, refetch } = useDocumentStats();
  const handleRefresh = () => { qc.invalidateQueries(); refetch(); };
  const v = (k: keyof DocumentStats): number | undefined => isLoading ? undefined : (stats?.[k] ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoring SKBDN · Verifikasi · Pencairan · Manajemen Pengguna</p>
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex-shrink-0">
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox}         label="Draft Masuk"      color="indigo" loading={isLoading} value={v("pending_review")} onClick={() => router.push("/admin/inbox")}/>
        <StatCard icon={AlertTriangle} label="Perlu Revisi"     color="amber"  loading={isLoading} value={v("need_revision")}/>
        <StatCard icon={CheckCircle2}  label="SKBDN Verified"   color="green"  loading={isLoading} value={v("approved")}       onClick={() => router.push("/admin/approved")}/>
        <StatCard icon={BarChart2}     label="Total SKBDN"      color="gray"   loading={isLoading} value={v("total")}          onClick={() => router.push("/admin/monitoring")}/>
      </div>

      {/* Summary strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Scale,     label: "Total Tonase",    val: `${num(stats.total_tonnage)} Ton`,        color: "blue"    },
            { icon: TrendingUp,label: "Total Nilai",     val: rp(stats.total_value),                    color: "indigo"  },
            { icon: CheckCircle2,label:"Nilai Approved", val: rp(stats.approved_value),                 color: "green"   },
          ].map(m => (
            <div key={m.label} className={`bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm`}>
              <div className={`p-2 rounded-lg bg-${m.color}-50 flex-shrink-0`}>
                <m.icon size={14} className={`text-${m.color}-500`}/>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-sm font-extrabold text-gray-900 tabular-nums">{m.val}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Baris 1: Pipeline + Value + Urgency */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Pipeline stats={stats}/>
        <ValueBreakdown stats={stats}/>
        <UrgencyQueue onOpen={setDetailId}/>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <BuyerStats onOpen={setDetailId}/>
        <ActivityFeed/>
      </div>

      {detailId && <AdminDocumentDetailPage docId={detailId} onClose={() => setDetailId(null)}/>}
    </div>
  );
}

export default function AdminDashboardView() {
  const seg = usePathname().split("/")[2] || "";
  if (!seg) return <Overview/>;

  const views: Record<string, { title: string; sub: string; status: string }> = {
    inbox:     { title:"Draft Masuk",            sub:"Draft SKBDN menunggu verifikasi AP2",        status:"draft_submitted" },
    forwarded: { title:"Diteruskan ke Keuangan",  sub:"Dokumen yang sudah diteruskan ke Keuangan", status:"draft_under_review,draft_approved,final_submitted,final_under_review,approved" },
    approved:  { title:"SKBDN Verified",          sub:"SKBDN sudah diverifikasi Keuangan", status:"approved" },
    monitoring:{ title:"Monitoring SKBDN",        sub:"Pantau seluruh dokumen dalam sistem",       status:"" },
  };

  const v = views[seg];
  if (!v) return <Overview/>;
  return <TableView title={v.title} subtitle={v.sub} initialStatus={v.status}/>;
}
