"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, Loader2, CheckCircle2, Upload, AlertTriangle, Clock } from "lucide-react";
import { useDocument, useDocumentHistory, useDocumentVersions } from "@/hooks/useDocuments";
import StatusBadge from "@/components/ui/StatusBadge";
import SKBDNInfoCard from "@/components/skbdn/SKBDNInfoCard";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import VersionHistoryCard from "@/components/skbdn/VersionHistoryCard";
import SKBDNStatusTracker from "@/components/skbdn/SKBDNStatusTracker";
import UploadFinalModal from "@/components/documents/UploadFinalModal";
import ReuploadDraftModal from "@/components/documents/ReuploadDraftModal";
import { formatDate } from "@/components/skbdn/utils";
import type { Document } from "@/types";

// Banner kontekstual sesuai status
interface ActionBannerProps {
  doc?: Document | null;
  onUploadFinal?: () => void;
  onReuploadDraft?: () => void;
  onReuploadFinal?: () => void;
}

function ActionBanner({ doc, onUploadFinal, onReuploadDraft, onReuploadFinal }: ActionBannerProps) {
  const s = doc?.status;
  if (!s) return null;

  // Draft perlu diperbaiki
  if (s === "draft_revision_buyer") return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5"/>
      <div className="flex-1">
        <p className="text-sm font-bold text-orange-800">Draft SKBDN Perlu Diperbaiki</p>
        <p className="text-xs text-orange-700 mt-1 leading-relaxed">
          AP2 atau Keuangan mengembalikan draft Anda. Lihat riwayat status di bawah untuk catatan lengkapnya, 
          perbaiki dokumen di bank, lalu upload ulang.
        </p>
      </div>
      <button onClick={onReuploadDraft}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-sm flex-shrink-0">
        <Upload size={13}/> Re-upload Draft
      </button>
    </div>
  );

  // Draft disetujui Keuangan → harus upload Final
  if (s === "draft_approved") return (
    <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-4 flex items-start gap-3">
      <CheckCircle2 size={18} className="text-teal-600 flex-shrink-0 mt-0.5"/>
      <div className="flex-1">
        <p className="text-sm font-bold text-teal-800">Draft Disetujui — Upload Final SKBDN Sekarang</p>
        <p className="text-xs text-teal-700 mt-1 leading-relaxed">
          Keuangan telah menyetujui Draft SKBDN Anda. Silakan minta bank menerbitkan 
          <strong> Final SKBDN resmi</strong>, lalu upload di sini. 
          Data (nama barang, bank, tonase, dll) <strong>tidak perlu diisi ulang</strong>.
        </p>
      </div>
      <button onClick={onUploadFinal}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm flex-shrink-0">
        <Upload size={13}/> Upload Final
      </button>
    </div>
  );

  // Final perlu direvisi
  if (s === "revision_requested") return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5"/>
      <div className="flex-1">
        <p className="text-sm font-bold text-red-800">Final SKBDN Perlu Direvisi</p>
        <p className="text-xs text-red-700 mt-1 leading-relaxed">
          Keuangan meminta revisi Final SKBDN. Lihat catatan di riwayat status, 
          minta bank menerbitkan ulang, lalu upload versi baru.
        </p>
      </div>
      <button onClick={onReuploadFinal}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-sm flex-shrink-0">
        <Upload size={13}/> Re-upload Final
      </button>
    </div>
  );

  // Final disetujui
  if (s === "approved") return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <CheckCircle2 size={18} className="text-green-500"/>
      <p className="text-sm font-semibold text-green-800">
        Final SKBDN Verified! Dokumen sudah disetujui oleh Keuangan.
      </p>
    </div>
  );

  // Sudah selesai
  if (s === "disbursed") return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
      <CheckCircle2 size={18} className="text-emerald-500"/>
      <p className="text-sm font-semibold text-emerald-800">
        SKBDN Sudah Verified.
      </p>
    </div>
  );

  // Draft dikirim — menunggu AP2
  if (s === "draft_submitted") return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
      <Clock size={18} className="text-blue-500"/>
      <div>
        <p className="text-sm font-semibold text-blue-800">Draft Sedang Diproses</p>
        <p className="text-xs text-blue-600 mt-0.5">Menunggu verifikasi AP2 sebelum diteruskan ke Keuangan.</p>
      </div>
    </div>
  );

  // Draft direview Keuangan
  if (s === "draft_under_review") return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <Clock size={18} className="text-amber-500"/>
      <div>
        <p className="text-sm font-semibold text-amber-800">Draft Sedang Direview Keuangan</p>
        <p className="text-xs text-amber-600 mt-0.5">AP2 telah memverifikasi draft, Keuangan sedang melakukan review.</p>
      </div>
    </div>
  );

  // Final dikirim — menunggu AP2
  if (s === "final_submitted") return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
      <Clock size={18} className="text-purple-500"/>
      <div>
        <p className="text-sm font-semibold text-purple-800">Final SKBDN Sedang Diproses</p>
        <p className="text-xs text-purple-600 mt-0.5">Menunggu verifikasi AP2 sebelum diteruskan ke Keuangan untuk persetujuan.</p>
      </div>
    </div>
  );

  // Final direview Keuangan
  if (s === "final_under_review") return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
      <Clock size={18} className="text-indigo-500"/>
      <div>
        <p className="text-sm font-semibold text-indigo-800">Final SKBDN Sedang Direview</p>
        <p className="text-xs text-indigo-600 mt-0.5">Keuangan sedang mereview Final SKBDN Anda.</p>
      </div>
    </div>
  );

  return null;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: docData, isLoading } = useDocument(id);
  const { data: history }  = useDocumentHistory(id);
  const { data: versions, isLoading: loadingVersions } = useDocumentVersions(id);

  const [showUploadFinal,   setShowUploadFinal]   = useState(false);
  const [showReuploadDraft, setShowReuploadDraft] = useState(false);
  const [showReuploadFinal, setShowReuploadFinal] = useState(false);

  // docData sekarang selalu berbentuk { document, file_url, download_url } —
  // lihat DocumentDetailResponse di @/types. Fallback "|| docData" lama
  // dibuang karena docData tidak pernah berupa Document polos.
  const doc = docData?.document;
  const fileURL = docData?.file_url;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-blue-500"/>
    </div>
  );
  if (!doc) return (
    <div className="text-center py-20">
      <FileText size={40} className="mx-auto text-gray-200 mb-2"/>
      <p className="text-gray-500 text-sm">Dokumen tidak ditemukan</p>
      <button onClick={() => router.push("/buyer")} className="mt-3 text-sm text-blue-600 hover:underline">← Kembali</button>
    </div>
  );

  return (
    <div className="space-y-5 w-full">
      {/* Back + header */}
      <div>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={15}/> Kembali
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-extrabold text-gray-900">{doc.title}</h1>
              <StatusBadge status={doc.status} size="md"/>
            </div>
            <p className="text-sm text-gray-400 mt-1 font-mono">{doc.skbdn_number || "—"}</p>
          </div>
          {fileURL && (
            <a href={fileURL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all self-start">
              <ExternalLink size={13}/> File Aktif
            </a>
          )}
        </div>
      </div>

      {/* Expiry + banner full width */}
      <ExpiryIndicator expiredDate={doc.expired_date} variant="card"/>
      <ActionBanner
        doc={doc}
        onUploadFinal={() => setShowUploadFinal(true)}
        onReuploadDraft={() => setShowReuploadDraft(true)}
        onReuploadFinal={() => setShowReuploadFinal(true)}
      />

      {/* Status Tracker Visual */}
      <SKBDNStatusTracker status={doc?.status}/>

      {/* 2-column layout: kiri konten utama, kanan history */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Kiri — Info + Versi */}
        <div className="lg:col-span-2 space-y-4">
          <SKBDNInfoCard doc={doc}/>
          <VersionHistoryCard docId={id} versions={versions || doc.versions || []} loading={loadingVersions}/>
        </div>

        {/* Kanan — Riwayat Status */}
        <div>
          {history && history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Riwayat Status</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{history.length} aktivitas</p>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {[...history].reverse().map((h, i) => (
                  <div key={h.id || i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${i===0?"bg-blue-500 ring-2 ring-blue-200":"bg-gray-200"}`}/>
                      {i < history.length-1 && <div className="w-px flex-1 bg-gray-200 my-1"/>}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={h.to_status}/>
                        {(h.version_ref ?? 0) > 0 && (
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{h.version_ref}</span>
                        )}
                      </div>
                      {h.notes && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">{h.notes}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {h.actor?.name || "Sistem"} · {formatDate(h.created_at, { withTime: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UploadFinalModal   isOpen={showUploadFinal}   onClose={() => setShowUploadFinal(false)}   doc={doc} isRevision={false}/>
      <UploadFinalModal   isOpen={showReuploadFinal} onClose={() => setShowReuploadFinal(false)} doc={doc} isRevision={true}/>
      <ReuploadDraftModal isOpen={showReuploadDraft} onClose={() => setShowReuploadDraft(false)} doc={doc}/>
    </div>
  );
}
