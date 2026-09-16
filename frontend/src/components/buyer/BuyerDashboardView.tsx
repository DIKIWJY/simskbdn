"use client";

// Padanan dari pages/buyer/BuyerDashboard.jsx (versi Vite/React Router).
// Satu komponen ini dipakai oleh 3 route berbeda — /buyer, /buyer/documents,
// /buyer/history — persis seperti sebelumnya, hanya "penonton"-nya (view)
// ditentukan dari usePathname() alih-alih useLocation().pathname.

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus, FileText, Clock, CheckCircle,
  AlertCircle, RefreshCw, ExternalLink,
  TrendingUp, Scale, ShieldCheck, Timer, Banknote,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import { formatRupiah } from "@/components/skbdn/utils";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuthStore } from "@/store/auth.store";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DocumentTable from "@/components/documents/DocumentTable";
import UploadDocumentModal from "@/components/documents/UploadDocumentModal";
import UploadFinalModal from "@/components/documents/UploadFinalModal";
import type { Document } from "@/types";

// View aktif berdasarkan URL
function useActiveView() {
  const pathname = usePathname();
  if (pathname.includes("/buyer/history"))   return "history";
  if (pathname.includes("/buyer/documents")) return "documents";
  return "dashboard"; // /buyer
}

interface ViewMeta {
  title: string | null;
  sub?: string;
}

const VIEW_META: Record<string, ViewMeta> = {
  dashboard: { title: null },
  documents: { title: "SKBDN Saya", sub: "Dokumen SKBDN yang sedang berjalan atau perlu tindakan" },
  history:   { title: "Riwayat",    sub: "Dokumen yang sudah selesai diproses (Approved, Disbursed, Ditolak)" },
};

export default function BuyerDashboardView() {
  const { user } = useAuthStore();
  const router = useRouter();
  const view = useActiveView();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [reuploadDoc, setReuploadDoc] = useState<Document | null>(null);
  const [uploadFinalDoc, setUploadFinalDoc] = useState<Document | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { setPage(1); setSearchQuery(""); setStatusFilter(""); }, [view]);

  // SKBDN Saya = dokumen aktif (belum selesai)
  const ACTIVE_STATUS = "draft_submitted,draft_under_review,draft_revision_buyer,draft_approved,final_submitted,final_under_review,revision_requested";
  // Riwayat = dokumen yang sudah selesai
  const DONE_STATUS   = "approved,disbursed,rejected,expired";

  const queryStatus = view === "documents"
    ? (statusFilter || ACTIVE_STATUS)
    : view === "history"
    ? (statusFilter || DONE_STATUS)
    : (statusFilter || undefined);

  const { data, isLoading, refetch } = useDocuments({
    page, limit: 10,
    status: queryStatus,
    search: searchQuery || undefined,
  });

  const { data: allData } = useDocuments({ limit: 200 });
  const allDocs = allData?.data ?? [];

  const stats = {
    total:    allDocs.length,
    waiting:  allDocs.filter(d => ["draft_submitted","draft_verified_ap2","final_sent_to_finance","under_review","draft_under_review","final_under_review"].includes(d.status)).length,
    revision: allDocs.filter(d => ["revision_requested","draft_revision_buyer"].includes(d.status)).length,
    approved: allDocs.filter(d => ["approved","disbursed"].includes(d.status)).length,
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
  })();

  const meta = VIEW_META[view] ?? VIEW_META.dashboard!;

  return (
    <div>
      <PageHeader
        title={view === "dashboard" ? `${greeting}, ${user?.name?.split(" ")[0]}!` : meta.title}
        subtitle={
          view === "dashboard"
            ? `${user?.company_name || "Perusahaan Anda"} · Dashboard Pembeli`
            : meta.sub
        }
        action={
          <div className="flex gap-2">
            <Button onClick={() => setUploadOpen(true)} size="md">
              <Plus size={15}/> Upload SKBDN
            </Button>
          </div>
        }
      />

      {/* Stat cards & dashboard extras */}
      {view === "dashboard" && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total Dokumen" value={stats.total}
            icon={FileText} color="blue" loading={isLoading}
            onClick={() => router.push("/buyer/documents")}/>
          <StatCard label="Dalam Proses" value={stats.waiting}
            icon={Clock} color="amber" loading={isLoading}/>
          <StatCard label="Need Revision" value={stats.revision}
            icon={AlertCircle} color="red" loading={isLoading}/>
          <StatCard label="Verified" value={stats.approved}
            icon={CheckCircle} color="green" loading={isLoading}/>
        </div>

        {/* Metrics strip */}
        {allDocs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { icon: Scale,      label: "Total Tonase",  val: `${allDocs.reduce((s,d)=>s+(d.tonnage||0),0).toLocaleString("id-ID")} Ton`,     color: "blue"    },
              { icon: TrendingUp, label: "Total Nilai",   val: formatRupiah(allDocs.reduce((s,d)=>s+(d.total_price||0),0), { compact: true }), color: "indigo"  },
              { icon: ShieldCheck,label: "Nilai Approved",val: formatRupiah(allDocs.filter(d=>["approved","disbursed"].includes(d.status)).reduce((s,d)=>s+(d.total_price||0),0), { compact: true }), color: "green" },
              { icon: Timer,      label: "Verified",     val: `${allDocs.filter(d=>d.status==="disbursed").length} SKBDN`,                   color: "emerald" },
            ].map(m => (
              <div key={m.label} className={`bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm`}>
                <div className={`p-1.5 rounded-lg bg-${m.color}-50 flex-shrink-0`}>
                  <m.icon size={13} className={`text-${m.color}-500`}/>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{m.label}</p>
                  <p className="text-sm font-extrabold text-gray-900 tabular-nums truncate">{m.val}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dokumen aktif — mini cards */}
        {allDocs.filter(d => !["disbursed","rejected","expired"].includes(d.status)).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Dokumen Aktif</p>
              <span className="text-[11px] text-gray-400">
                {allDocs.filter(d => !["disbursed","rejected","expired"].includes(d.status)).length} dokumen sedang berjalan
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {allDocs.filter(d => !["disbursed","rejected","expired"].includes(d.status)).slice(0,5).map(doc => (
                <button key={doc.id} onClick={() => router.push(`/buyer/documents/${doc.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50/40 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-blue-600">{doc.skbdn_number||"—"}</p>
                    <p className="text-[11px] text-gray-400 truncate">{doc.goods_type} · {(doc.tonnage||0).toLocaleString("id-ID")} Ton</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>
                    <StatusBadge status={doc.status}/>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </>}

      {/* Alert revisi */}
      {view === "dashboard" && stats.revision > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">{stats.revision} dokumen butuh revisi</p>
            <p className="text-xs text-amber-600">Dokumen perlu diperbaiki sesuai catatan dari Keuangan</p>
          </div>
          <button onClick={() => { setStatusFilter("revision_requested,draft_revision_buyer"); router.push("/buyer/documents"); }}
            className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg flex-shrink-0">
            Lihat
          </button>
        </div>
      )}

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-4">
        {[
          { path: "/buyer",           label: "Dashboard",       v: "dashboard" },
          { path: "/buyer/documents", label: "Dokumen SKBDN",   v: "documents" },
          { path: "/buyer/history",   label: "Riwayat",         v: "history" },
        ].map(tab => (
          <button key={tab.v} onClick={() => router.push(tab.path)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === tab.v ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabel dokumen */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            {view === "history" ? "SKBDN Verified" : view === "documents" ? "Dokumen Aktif" : "Dokumen SKBDN"}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {view === "history"
              ? "Approved, Disbursed, Ditolak, Expired"
              : view === "documents"
              ? "Draft, Dalam Review, Perlu Revisi"
              : "Semua dokumen SKBDN Anda"}
          </p>
        </div>
        <button onClick={() => { refetch(); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-0.5">
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      <DocumentTable
        data={data} loading={isLoading}
        page={page} totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        onReupload={doc => { setReuploadDoc(doc); setUploadOpen(true); }}
        onUploadFinal={doc => setUploadFinalDoc(doc)}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        statusFilter={statusFilter} onStatusFilter={setStatusFilter}
        viewMode={view === "history" ? "history" : view === "documents" ? "documents" : "all"}
      />

      <UploadDocumentModal
        isOpen={uploadOpen}
        onClose={() => { setUploadOpen(false); setReuploadDoc(null); refetch(); }}
        reuploadDocId={reuploadDoc?.id}
        initialData={reuploadDoc}
      />

      <UploadFinalModal
        isOpen={!!uploadFinalDoc}
        onClose={() => { setUploadFinalDoc(null); refetch(); }}
        doc={uploadFinalDoc}
        isRevision={false}
      />
    </div>
  );
}
