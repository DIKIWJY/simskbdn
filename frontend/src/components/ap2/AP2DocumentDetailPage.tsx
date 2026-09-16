"use client";
// Padanan dari pages/ap2/AP2DocumentDetailPage.jsx. Ini BUKAN halaman ber-
// route — komponen modal/drawer yang dipanggil langsung dari AP2DashboardView
// (bukan lewat AppRoutes), jadi tidak dipindah ke app/, tetap jadi komponen
// biasa di sini.

import { useState } from "react";
import {
  X, CheckCircle2, AlertTriangle, FileText,
  Loader2, ArrowRight, Eye, Download,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import SKBDNInfoCard from "@/components/skbdn/SKBDNInfoCard";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import VersionHistoryCard from "@/components/skbdn/VersionHistoryCard";
import StatusTimeline from "@/components/documents/StatusTimeline";
import { useDocument, useDocumentHistory, useDocumentVersions } from "@/hooks/useDocuments";
import { documentAPI } from "@/api/document.api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { DocumentStatus } from "@/types";
import type { LucideIcon } from "lucide-react";

interface ActionBtnProps {
  icon?: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function ActionBtn({ icon: Icon, label, color, onClick, disabled, loading }: ActionBtnProps) {
  const colors: Record<string, string> = {
    teal:  "bg-teal-600 hover:bg-teal-700 text-white shadow-sm",
    amber: "border border-amber-300 text-amber-700 bg-white hover:bg-amber-50",
    red:   "border border-red-200 text-red-600 bg-white hover:bg-red-50",
    gray:  "border border-gray-200 text-gray-600 bg-white hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${colors[color] || colors.gray}`}>
      {loading ? <Loader2 size={15} className="animate-spin"/> : Icon && <Icon size={15}/>}
      {label}
    </button>
  );
}

interface AP2DocumentDetailPageProps {
  docId: string;
  onClose?: () => void;
}

export default function AP2DocumentDetailPage({ docId, onClose }: AP2DocumentDetailPageProps) {
  const { data: docData, isLoading }      = useDocument(docId);
  const { data: history }                 = useDocumentHistory(docId);
  const { data: versions, isLoading: lv } = useDocumentVersions(docId);
  const qc = useQueryClient();
  const router = useRouter();

  const [notes, setNotes]       = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [tab, setTab]           = useState("info");

  if (!docId) return null;
  // docData sekarang selalu berbentuk { document, file_url, download_url }
  const doc     = docData?.document;
  const fileURL = docData?.file_url;
  const s       = doc?.status;

  const inv = () => {
    ["documents", "document-stats", "document", docId].forEach(k =>
      qc.invalidateQueries({ queryKey: [k] })
    );
  };

  const doUpdate = async (status: DocumentStatus, n: string = notes) => {
    setBusy(true);
    try {
      // AP2 uses /documents/:id/verify endpoint
      await documentAPI.verifyAP2(docId, { status, notes: n });
      const msgs: Partial<Record<DocumentStatus, string>> = {
        draft_under_review:   "Draft diteruskan ke Keuangan untuk review",
        final_under_review:   "Final diteruskan ke Keuangan untuk review",
        draft_revision_buyer: "Draft dikembalikan ke Buyer",
        revision_requested:   "Revisi diminta dari Buyer",
      };
      toast.success(msgs[status] || "Status diperbarui");
      inv();
      setNotes(""); setShowNotes(false);
      onClose?.();
    } catch (e) {
      const errMsg = e instanceof Error && "response" in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(errMsg || "Gagal memperbarui status");
    }
    setBusy(false);
  };

  // AP2 actions based on document phase
  const isDraftPhase = s === "draft_submitted";
  const isFinalPhase = s === "final_submitted";
  const canVerify    = isDraftPhase || isFinalPhase;
  const isDone       = !!s && ["disbursed", "rejected", "expired", "approved", "draft_approved", "draft_under_review", "final_under_review"].includes(s);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-indigo-500"/>
            </div>
            <div className="min-w-0">
              {isLoading ? <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"/> : (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 font-mono">{doc?.skbdn_number || doc?.title}</p>
                    {doc && <StatusBadge status={doc.status}/>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-xs">{doc?.title}</p>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
          {(
            [["info","Informasi"],["history","Riwayat"]] as const
          ).map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`py-3 px-1 mr-6 text-sm font-semibold border-b-2 -mb-px transition-all ${tab===id?"border-blue-500 text-blue-600":"border-transparent text-gray-400 hover:text-gray-700"}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4 animate-pulse">{[1,2,3].map(i=><div key={i} className="h-32 bg-gray-100 rounded-2xl"/>)}</div>
          ) : tab === "history" ? (
            <div className="p-6"><StatusTimeline history={history||[]}/></div>
          ) : doc ? (
            <div className="p-6 space-y-4">
              {doc.expired_date && <ExpiryIndicator expiredDate={doc.expired_date} variant="badge"/>}

              {/* Aksi AP2 */}
              {canVerify && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi Verifikasi AP2</p>

                  {isDraftPhase && (
                    <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 leading-relaxed">
                      Verifikasi kelengkapan dokumen Draft SKBDN. Jika sudah sesuai, teruskan ke Keuangan untuk review.
                    </div>
                  )}
                  {isFinalPhase && (
                    <div className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 leading-relaxed">
                      Verifikasi Final SKBDN. Jika sudah sesuai, teruskan ke Keuangan untuk persetujuan akhir.
                    </div>
                  )}

                  {/* Anotasi PDF */}
                  {fileURL && (
                    <button onClick={() => { onClose?.(); router.push(`/ap2/documents/${docId}/annotate`); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all">
                      <Eye size={14}/> Buka & Anotasi Dokumen PDF
                    </button>
                  )}

                  {/* Catatan pengembalian */}
                  {showNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                      <p className="text-xs font-semibold text-amber-800">Catatan untuk Buyer (wajib):</p>
                      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
                        placeholder="Jelaskan apa yang perlu diperbaiki..."
                        className="w-full text-sm border border-amber-200 rounded-xl p-2.5 outline-none focus:border-amber-400 resize-none bg-white transition-all"/>
                      <div className="flex gap-2">
                        <button onClick={()=>doUpdate(isDraftPhase?"draft_revision_buyer":"revision_requested")}
                          disabled={!notes.trim()||busy}
                          className="flex-1 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50">
                          Kirim
                        </button>
                        <button onClick={()=>setShowNotes(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl">Batal</button>
                      </div>
                    </div>
                  )}

                  {!showNotes && (
                    <>
                      <ActionBtn icon={ArrowRight}
                        label={isDraftPhase ? "Verifikasi & Teruskan Draft ke Keuangan" : "Verifikasi & Teruskan Final ke Keuangan"}
                        color="teal"
                        onClick={() => doUpdate(isDraftPhase ? "draft_under_review" : "final_under_review")}
                        loading={busy}/>
                      <ActionBtn icon={AlertTriangle}
                        label="Kembalikan ke Buyer"
                        color="amber"
                        onClick={() => setShowNotes(true)}
                        loading={busy}/>
                    </>
                  )}
                </div>
              )}

              {isDone && !canVerify && (
                <div className="flex items-center gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <CheckCircle2 size={15} className="text-gray-400"/>
                  <p className="text-xs text-gray-500">Dokumen sudah diproses — tidak ada aksi tersedia.</p>
                </div>
              )}

              {/* File */}
              {fileURL && (
                <a href={fileURL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-red-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Klik untuk preview / download</p>
                  </div>
                  <Download size={14} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0"/>
                </a>
              )}

              <SKBDNInfoCard doc={doc}/>
              <VersionHistoryCard docId={docId} versions={versions || doc.versions || []} loading={lv}/>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText size={32} className="text-gray-200 mb-2"/>
              <p className="text-sm text-gray-400">Dokumen tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
