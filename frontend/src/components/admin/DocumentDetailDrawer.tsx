"use client";
// CATATAN AUDIT: komponen ini TIDAK dipakai/di-import di mana pun pada kode
// asli Anda (sudah saya cek dengan grep menyeluruh) — sepertinya versi awal
// dari AdminDocumentDetailPage.jsx sebelum di-refactor. Tetap saya ikutkan
// apa adanya (tidak saya hapus sepihak), sudah diberi "use client" agar aman
// dipakai kalau suatu saat dibutuhkan. Lihat laporan akhir untuk detail.

import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, Send, FileText, Loader2 } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import SKBDNInfoCard from "../skbdn/SKBDNInfoCard";
import ExpiryIndicator from "../skbdn/ExpiryIndicator";
import VersionHistoryCard from "../skbdn/VersionHistoryCard";
import { formatDate } from "../skbdn/utils";
import { useDocument, useDocumentHistory, useDocumentVersions } from "@/hooks/useDocuments";
import { documentAPI } from "@/api/document.api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { DocumentStatus } from "@/types";

interface DocumentDetailDrawerProps {
  docId: string;
  onClose: () => void;
}

export default function DocumentDetailDrawer({ docId, onClose }: DocumentDetailDrawerProps) {
  const { data: docData, isLoading }      = useDocument(docId);
  const { data: history }                 = useDocumentHistory(docId);
  const { data: versions, isLoading: lv } = useDocumentVersions(docId);
  const qc = useQueryClient();

  const [notes, setNotes]         = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [busy, setBusy]           = useState(false);

  if (!docId) return null;
  // docData sekarang selalu berbentuk { document, file_url, download_url }
  const doc    = docData?.document;
  const fileURL = docData?.file_url;
  const s      = doc?.status;

  const inv = () => {
    ["documents","document-stats"].forEach(k => qc.invalidateQueries({ queryKey:[k] }));
    qc.invalidateQueries({ queryKey:["document", docId] });
  };

  const doUpdate = async (status: DocumentStatus, n: string = notes) => {
    setBusy(true);
    try {
      // CATATAN AUDIT: method asli "updateStatusSales" tidak ada di document.api.ts
      // manapun (baik versi lama atau baru) — kemungkinan sisa dari draft API
      // yang tidak pernah dibuat. Diarahkan ke updateStatusAdmin yang secara
      // semantik paling dekat (endpoint PUT /documents/:id/status).
      await documentAPI.updateStatusAdmin(docId, { status, notes: n });
      toast.success(
        status === "draft_under_review" ? "Draft diteruskan ke Keuangan!"
        : status === "draft_revision_buyer" ? "Draft dikembalikan ke Buyer"
        : "Status diperbarui!"
      );
      inv(); setNotes(""); setShowNotes(false);
    } catch (e) {
      const msg = e instanceof Error && "response" in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(msg || "Gagal");
    }
    setBusy(false);
  };

  const renderActions = () => {
    if (!doc) return null;
    return (
      <div className="space-y-3">
        {showNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">Catatan revisi (wajib diisi):</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Jelaskan apa yang perlu diperbaiki Buyer..."
              className="w-full text-sm border border-amber-200 rounded-lg p-2.5 outline-none focus:border-amber-400 resize-none bg-white"/>
            <div className="flex gap-2">
              <button onClick={() => doUpdate("draft_revision_buyer")} disabled={!notes.trim()||busy}
                className="flex-1 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                Kirim Catatan
              </button>
              <button onClick={() => setShowNotes(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Draft baru masuk — AP2 setujui & teruskan ke Keuangan */}
          {s === "draft_submitted" && (
            <>
              <button onClick={() => doUpdate("draft_under_review")} disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50 shadow-sm">
                {busy ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
                Verifikasi & Teruskan ke Keuangan
              </button>
              <button onClick={() => setShowNotes(true)} disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 shadow-sm">
                <AlertTriangle size={13}/> Kembalikan ke Buyer
              </button>
            </>
          )}

          {fileURL && (
            <button onClick={() => window.open(fileURL,"_blank")}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl">
              <FileText size={13}/> Lihat File
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            {isLoading ? <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"/> : (
              <>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-gray-900 truncate">{doc?.title}</h3>
                  {doc && <StatusBadge status={doc.status} size="md"/>}
                </div>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">{doc?.skbdn_number}</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading
            ? <div className="space-y-3 animate-pulse">{[1,2].map(i=><div key={i} className="h-32 bg-gray-100 rounded-xl"/>)}</div>
            : doc ? (
              <>
                <ExpiryIndicator expiredDate={doc.expired_date} variant="card"/>
                {renderActions()}
                <SKBDNInfoCard doc={doc}/>
                <VersionHistoryCard docId={docId} versions={versions||doc.versions||[]} loading={lv}/>
                {history && history.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">Riwayat Status</p>
                    </div>
                    <div className="p-4 space-y-0">
                      {history.map((h, i) => (
                        <div key={h.id||i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${i===history.length-1?"bg-blue-500 ring-2 ring-blue-200":"bg-gray-300"}`}/>
                            {i < history.length-1 && <div className="w-px flex-1 bg-gray-200 my-1"/>}
                          </div>
                          <div className="pb-4 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge status={h.to_status}/>
                              {(h.version_ref ?? 0) > 0 && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{h.version_ref}</span>}
                            </div>
                            {h.notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">{h.notes}</p>}
                            <p className="text-[10px] text-gray-400 mt-1">{h.actor?.name||"Sistem"} · {formatDate(h.created_at,{withTime:true})}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : <div className="flex flex-col items-center justify-center py-16"><FileText size={32} className="text-gray-200"/></div>
          }
        </div>
      </div>
    </div>
  );
}
