"use client";
// Padanan dari pages/ap2/AP2Dashboard.jsx — satu komponen dipakai oleh 4 route:
// /ap2, /ap2/inbox, /ap2/inprogress, /ap2/monitoring.
// AP2DocumentDetailPage tetap di-import relatif ("./AP2DocumentDetailPage")
// karena keduanya sengaja ditaruh satu folder di sini, persis strukturnya
// dengan kode asli (satu folder pages/ap2/).

import { useRouter, usePathname } from "next/navigation";
import {
  Inbox, BarChart2, Upload, Users, CheckCircle2,
  AlertTriangle, TrendingUp, FileText, RefreshCw,
  Clock, ShieldCheck, Eye, AlertCircle,
} from "lucide-react";
import { useDocuments, useDocumentStats } from "@/hooks/useDocuments";
import FinanceMonitoringTable, { type MonitoringFilters } from "@/components/finance/FinanceMonitoringTable";
import AP2DocumentDetailPage from "./AP2DocumentDetailPage";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import { useState, useEffect } from "react";
import { formatRupiah, formatNumber } from "@/components/skbdn/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { Document, DocumentStats } from "@/types";

const rp  = (v?: number | null) => formatRupiah(v || 0, { compact: true });
const num = (v?: number | null) => (v || 0).toLocaleString("id-ID");

interface DocQueueProps {
  title: string;
  status: string;
  emptyMsg: string;
  color?: "blue" | "amber" | "green" | "red";
  onOpen?: (id: string) => void;
}

function DocQueue({ title, status, emptyMsg, color = "blue", onOpen }: DocQueueProps) {
  const { data, isLoading } = useDocuments({ status, page: 1, limit: 5, sort: "created_asc" });
  const docs = data?.data || [];
  const total = data?.total ?? docs.length;
  const accentMap: Record<string, string> = { blue:"border-l-blue-400", amber:"border-l-amber-400", green:"border-l-green-400", red:"border-l-red-400" };
  const accent = accentMap[color] || "border-l-blue-400";

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${accent} shadow-sm overflow-hidden`}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <span className="text-xs text-gray-400 tabular-nums">{total} dok</span>
      </div>
      {isLoading ? (
        <div className="divide-y divide-gray-50">{[...Array(3)].map((_,i)=>(<div key={i} className="flex gap-3 px-5 py-3 animate-pulse"><div className="flex-1 h-4 bg-gray-100 rounded"/><div className="w-20 h-4 bg-gray-100 rounded"/></div>))}</div>
      ) : docs.length === 0 ? (
        <div className="px-5 py-8 text-center"><CheckCircle2 size={24} className="text-green-300 mx-auto mb-1.5"/><p className="text-xs text-gray-400">{emptyMsg}</p></div>
      ) : (
        <div className="divide-y divide-gray-50">
          {docs.map(doc => (
            <button key={doc.id} onClick={()=>onOpen?.(doc.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50/40 transition-colors text-left">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-blue-600">{doc.skbdn_number||"—"}</p>
                <p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name} · {doc.goods_type}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
                <StatusBadge status={doc.status}/>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpiringSoon({ onOpen }: { onOpen?: (id: string) => void }) {
  const { data } = useDocuments({ expiring_soon: true, page: 1, limit: 6, sort: "expiry_asc" });
  const docs = data?.data || [];
  if (docs.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={15} className="text-amber-500"/>
        <p className="text-sm font-bold text-amber-800">{docs.length} SKBDN akan expired dalam 14 hari</p>
      </div>
      <div className="space-y-2">
        {docs.slice(0,3).map(doc=>(
          <button key={doc.id} onClick={()=>onOpen?.(doc.id)} className="w-full flex items-center gap-3 p-2.5 bg-white rounded-xl border border-amber-100 hover:border-amber-300 transition-all text-left">
            <div className="flex-1 min-w-0"><p className="text-xs font-mono font-bold text-blue-600">{doc.skbdn_number||"—"}</p><p className="text-[11px] text-gray-400 truncate">{doc.buyer?.name}</p></div>
            <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
          </button>
        ))}
        {docs.length > 3 && <p className="text-[11px] text-amber-600 text-center font-semibold">+{docs.length-3} lainnya</p>}
      </div>
    </div>
  );
}

interface TableViewProps {
  title: string;
  subtitle?: string;
  initialStatus?: string;
}

function TableView({ title, subtitle, initialStatus }: TableViewProps) {
  const [filters, setFilters] = useState<MonitoringFilters>({ status: initialStatus||"", search:"", page:1, limit:15 });
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isLoading } = useDocuments(filters);
  useEffect(()=>{ setFilters(f=>({...f,status:initialStatus||"",page:1})); },[initialStatus]);
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-gray-900">{title}</h1>{subtitle&&<p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}</div>
      <FinanceMonitoringTable documents={data} loading={isLoading} onOpenDetail={(doc: Document)=>setDetailId(doc.id)} filters={filters} onFiltersChange={setFilters} lockStatus={!!initialStatus}/>
      {detailId&&<AP2DocumentDetailPage docId={detailId} onClose={()=>setDetailId(null)}/>}
    </div>
  );
}

function Overview() {
  const router = useRouter();
  const qc = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: stats, isLoading, refetch } = useDocumentStats();
  const v = (k: keyof DocumentStats): number | undefined => isLoading ? undefined : (stats?.[k] ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-xl font-bold text-gray-900">Dashboard AP2</h1><p className="text-sm text-gray-500 mt-0.5">Verifikasi SKBDN sebelum diteruskan ke Keuangan</p></div>
        <button onClick={()=>{ qc.invalidateQueries(); refetch(); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex-shrink-0"><RefreshCw size={13}/> Refresh</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox}         label="Draft Masuk"    color="indigo" loading={isLoading} value={v("pending_review")} onClick={()=>router.push("/ap2/inbox")}/>
        <StatCard icon={Eye}           label="Sedang Diverif" color="amber"  loading={isLoading} value={v("under_review")}/>
        <StatCard icon={AlertTriangle} label="Perlu Revisi"   color="red"    loading={isLoading} value={v("need_revision")}/>
        <StatCard icon={BarChart2}     label="Total SKBDN"    color="gray"   loading={isLoading} value={v("total")}          onClick={()=>router.push("/ap2/monitoring")}/>
      </div>
      {stats&&(
        <div className="flex flex-wrap items-center gap-5 px-5 py-3.5 bg-white rounded-2xl border border-gray-200 text-sm shadow-sm">
          <span className="text-gray-500"><FileText size={13} className="inline mr-1"/>Tonase: <strong className="text-gray-800">{num(stats.total_tonnage)} Ton</strong></span>
          <span className="text-gray-200">|</span>
          <span className="text-gray-500"><TrendingUp size={13} className="inline mr-1"/>Nilai: <strong className="text-gray-800">{rp(stats.total_value)}</strong></span>
        </div>
      )}
      <ExpiringSoon onOpen={setDetailId}/>
      <div className="grid lg:grid-cols-3 gap-5">
        <DocQueue title="Draft Masuk — Perlu Verifikasi" status="draft_submitted" emptyMsg="Tidak ada draft masuk" color="amber" onOpen={setDetailId}/>
        <DocQueue title="Final Masuk — Perlu Verifikasi" status="final_submitted" emptyMsg="Tidak ada final masuk" color="blue" onOpen={setDetailId}/>
        <DocQueue title="Perlu Revisi" status="revision_requested,draft_revision_buyer" emptyMsg="Tidak ada revisi" color="red" onOpen={setDetailId}/>
      </div>
      {detailId&&<AP2DocumentDetailPage docId={detailId} onClose={()=>setDetailId(null)}/>}
    </div>
  );
}

export default function AP2DashboardView() {
  const seg = usePathname().split("/")[2]||"";
  if (!seg) return <Overview/>;
  const views: Record<string, { title: string; sub: string; status: string }> = {
    inbox:      { title:"Draft Masuk",         sub:"Draft SKBDN menunggu verifikasi AP2", status:"draft_submitted" },
    inprogress: { title:"Sedang Diverifikasi",  sub:"Dokumen dalam proses verifikasi",     status:"draft_under_review,final_under_review" },
    monitoring: { title:"Monitoring SKBDN",     sub:"Pantau seluruh dokumen",              status:"" },
  };
  const v = views[seg];
  if (!v) return <Overview/>;
  return <TableView title={v.title} subtitle={v.sub} initialStatus={v.status}/>;
}
