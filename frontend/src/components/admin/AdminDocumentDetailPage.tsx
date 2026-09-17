"use client";
// Padanan dari pages/admin/AdminDocumentDetailPage.jsx. BUKAN halaman ber-
// route — komponen modal/drawer dipanggil langsung dari AdminDashboardView.

import { useState } from "react";
import {
  X, CheckCircle2, AlertTriangle, Send, FileText, Loader2,
  Download,
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
import type { DocumentStatus } from "@/types";
import type { LucideIcon } from "lucide-react";

// ─── Tombol aksi ────────────────────────────────────────────────────────────
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
    green: "bg-green-600 hover:bg-green-700 text-white shadow-sm",
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

// ─── Modal utama ─────────────────────────────────────────────────────────────
interface AdminDocumentDetailPageProps {
  docId: string;
  onClose?: () => void;
}

export default function AdminDocumentDetailPage({ docId, onClose }: AdminDocumentDetailPageProps) {
  const { data: docData, isLoading }      = useDocument(docId);
  const { data: history }                 = useDocumentHistory(docId);
  const { data: versions, isLoading: lv } = useDocumentVersions(docId);
  const qc = useQueryClient();

  const [notes, setNotes]       = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [tab, setTab]           = useState("info"); // "info" | "history"

  if (!docId) return null;
  // docData sekarang selalu berbentuk { document, file_url, download_url }
  const doc     = docData?.document;
  const fileURL = docData?.file_url;
  const s       = doc?.status;

  // Variabel status turunan
  const isDone      = !!s && ["disbursed", "rejected", "expired", "approved"].includes(s);
  const canForward  = s === "draft_submitted";
  const canReturn   = s === "draft_submitted";

  const inv = () => {
    ["documents", "document-stats"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ["document", docId] });
  };

  const doUpdate = async (status: DocumentStatus, n: string = notes) => {
    setBusy(true);
    try {
      await documentAPI.updateStatusAdmin(docId, { status, notes: n });
      const msg: Partial<Record<DocumentStatus, string>> = {
        draft_under_review:   "Draft diteruskan ke Keuangan!",
        draft_revision_buyer: "Draft dikembalikan ke Buyer",
      };
      toast.success(msg[status] || "Status diperbarui!");
      inv();
      setNotes(""); setShowNotes(false);
      onClose?.();
    } catch (e) {
      const errMsg = e instanceof Error && "response" in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(errMsg || "Gagal");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose}/>

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-indigo-500"/>
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"/>
              ) : (
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
          ).map(([id,lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`py-3 px-1 mr-6 text-sm font-semibold border-b-2 -mb-px transition-all ${
                tab === id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-700"
              }`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl"/>)}
            </div>
          ) : tab === "history" ? (
            <div className="p-6">
              <StatusTimeline history={history || []}/>
            </div>
          ) : doc ? (
            <div className="p-6 space-y-4">
              {/* Expiry */}
              {doc.expired_date && <ExpiryIndicator expiredDate={doc.expired_date} variant="badge"/>}

              {/* Aksi panel */}
              {canForward && !isDone && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi Admin</p>

                  {/* Catatan revisi */}
                  {showNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                      <p className="text-xs font-semibold text-amber-800">Catatan revisi (wajib diisi):</p>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                        placeholder="Jelaskan apa yang perlu diperbaiki Buyer..."
                        className="w-full text-sm border border-amber-200 rounded-xl p-2.5 outline-none focus:border-amber-400 resize-none bg-white transition-all"/>
                      <div className="flex gap-2">
                        <button onClick={() => doUpdate("draft_revision_buyer")} disabled={!notes.trim() || busy}
                          className="flex-1 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all">
                          Kirim Catatan
                        </button>
                        <button onClick={() => setShowNotes(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {!showNotes && (
                    <>
                      <ActionBtn icon={Send} label="Verifikasi & Teruskan ke Keuangan" color="teal"
                        onClick={() => doUpdate("draft_under_review")} loading={busy}/>
                      <ActionBtn icon={AlertTriangle} label="Kembalikan ke Buyer" color="amber"
                        onClick={() => setShowNotes(true)} loading={busy}/>
                    </>
                  )}
                </div>
              )}

              {/* File preview link */}
              {fileURL && (
                <a href={fileURL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-red-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Klik untuk preview / download</p>
                  </div>
                  <Download size={14} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors"/>
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