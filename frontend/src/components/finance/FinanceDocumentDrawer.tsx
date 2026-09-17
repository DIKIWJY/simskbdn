"use client";
// CATATAN AUDIT: komponen ini TIDAK dipakai/di-import di mana pun pada kode
// asli Anda. Tetap diikutkan apa adanya. Lihat laporan akhir untuk detail.

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  X, CheckCircle2, AlertTriangle, XCircle, FileText,
  Loader2, ChevronDown, ChevronUp, PenLine, MessageSquare,
  Download, Calendar, Building2, Hash, Package, Camera,
  type LucideIcon,
} from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import SKBDNInfoCard from "../skbdn/SKBDNInfoCard";
import ExpiryIndicator from "../skbdn/ExpiryIndicator";
import VersionHistoryCard from "../skbdn/VersionHistoryCard";
import { formatDate } from "../skbdn/utils";
import {
  useFinanceDocument, useFinanceDocumentVersions,
  useFinanceDocumentHistory, useUpdateFinanceStatus,
} from "@/hooks/useFinance";
import StatusTimeline from "../documents/StatusTimeline";
import type { DocumentStatus } from "@/types";

// ─── Action Button ─────────────────────────────────────────────────────────
interface ActionBtnProps {
  icon?: LucideIcon;
  label: string;
  color?: "green" | "teal" | "amber" | "red" | "blue" | "gray";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
}

function ActionBtn({ icon: Icon, label, color, onClick, disabled, loading }: ActionBtnProps) {
  const colors: Record<string, string> = {
    green:  "bg-green-600 hover:bg-green-700 text-white",
    teal:   "bg-teal-600 hover:bg-teal-700 text-white",
    amber:  "border border-amber-400 text-amber-700 hover:bg-amber-50",
    red:    "border border-red-300 text-red-600 hover:bg-red-50",
    blue:   "border border-blue-300 text-blue-700 hover:bg-blue-50",
    gray:   "border border-gray-200 text-gray-600 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${colors[color ?? "gray"] ?? colors.gray}`}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon && <Icon size={15} />}
      {label}
    </button>
  );
}

// ─── Notes Input ───────────────────────────────────────────────────────────
interface NotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  onSubmit: (attachmentUrl: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  docId: string;
}

function NotesPanel({ value, onChange, label, onSubmit, onCancel, disabled, docId }: NotesPanelProps) {
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // Upload immediately
    setUploading(true);
    try {
      const { documentAPI } = await import("@/api/document.api");
      const res = await documentAPI.uploadRevisionAttachment(docId, f);
      const url = res.data?.data?.url;
      if (url) {
        setAttachmentUrl(url);
        // Append image link to notes
        onChange((value ? value + "\n" : "") + `📎 Lampiran: ${f.name}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</p>

      {/* Text notes */}
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={4}
        placeholder="Tuliskan catatan yang jelas agar Buyer dapat memperbaiki dokumen..."
        className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none bg-white transition-all"
      />

      {/* Image upload — opsional */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Lampiran Foto / Scan Coretan (opsional)
        </p>
        {file ? (
          <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-200">
            {file.type.startsWith("image/") && (
              <img src={URL.createObjectURL(file)} alt="" className="w-12 h-12 object-cover rounded-lg border"/>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
              <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB {uploading ? "· Mengupload..." : attachmentUrl ? "· ✓ Terupload" : ""}</p>
            </div>
            <button onClick={() => { setFile(null); setAttachmentUrl(""); }}
              className="p-1 text-gray-400 hover:text-red-500"><X size={13}/></button>
          </div>
        ) : (
          <label className="flex items-center gap-2.5 p-3 bg-white rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all">
            <Camera size={16} className="text-gray-400"/>
            <span className="text-xs text-gray-500">Klik untuk upload foto coretan, scan, atau screenshot</span>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange}/>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => onSubmit(attachmentUrl)} disabled={!value.trim() || disabled || uploading}
          className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all">
          {uploading ? "Mengupload..." : "Kirim"}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
          Batal
        </button>
      </div>
    </div>
  );
}

// ─── Drawer Utama ──────────────────────────────────────────────────────────
interface FinanceDocumentDrawerProps {
  docId: string;
  onClose?: () => void;
}

export default function FinanceDocumentDrawer({ docId, onClose }: FinanceDocumentDrawerProps) {
  const router = useRouter();
  const { data: docData, isLoading }   = useFinanceDocument(docId);
  const { data: versions }             = useFinanceDocumentVersions(docId);
  const { data: history }              = useFinanceDocumentHistory(docId);
  const updateStatus = useUpdateFinanceStatus();

  const [notes, setNotes]       = useState("");
  const [notesFor, setNotesFor] = useState<DocumentStatus | null>(null);
  const [tab, setTab]           = useState("info"); // "info" | "history"

  if (!docId) return null;
  // docData sekarang selalu berbentuk { document, file_url, download_url }
  const doc    = docData?.document;
  const fileURL = docData?.file_url;
  const busy   = updateStatus.isPending;
  const status = doc?.status;

  const canReviewDraft = status === "draft_under_review";
  const canReviewFinal = !!status && ["final_submitted", "final_under_review", "final_sent_to_finance", "under_review"].includes(status);
  const canReview   = canReviewDraft || canReviewFinal;
  const canApprove  = canReviewFinal;
  const isDone      = !!status && ["disbursed", "rejected", "expired", "approved"].includes(status);

  const doUpdate = (s: DocumentStatus, n: string = notes) => {
    updateStatus.mutate({ id: docId, status: s, notes: n }, {
      onSuccess: () => { setNotes(""); setNotesFor(null); },
    });
  };

  const handleAction = (s: DocumentStatus) => {
    if (["revision_requested", "rejected", "draft_revision_buyer"].includes(s)) {
      setNotesFor(s); return;
    }
    doUpdate(s);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="w-full max-w-xl bg-white flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {isLoading ? "Memuat..." : (doc?.skbdn_number || doc?.title || "Detail SKBDN")}
              </p>
              {doc && <StatusBadge status={doc.status} />}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 px-5">
          {(
            [["info","Informasi"],["history","Riwayat"]] as const
          ).map(([id,lbl])=>(
            <button key={id} onClick={() => setTab(id)}
              className={`py-3 px-1 mr-5 text-sm font-semibold border-b-2 transition-all ${tab===id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i=><div key={i} className="h-24 bg-gray-100 rounded-2xl"/>)}
            </div>
          ) : tab === "info" ? (
            <>
              {/* Expired alert */}
              {doc?.expired_date && <ExpiryIndicator expiredDate={doc.expired_date} variant="badge" />}

              {/* SKBDN Info */}
              <SKBDNInfoCard doc={doc} />

              {/* File */}
              {fileURL && (
                <a href={fileURL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                      {doc?.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Klik untuk preview / download</p>
                  </div>
                  <Download size={15} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                </a>
              )}

              {/* Version history */}
              {!!versions?.length && <VersionHistoryCard docId={docId} versions={versions} />}

              {/* Anotasi PDF — opsional */}
              {canReview && fileURL && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <PenLine size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800">Anotasi PDF (Opsional)</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        Buka mode anotasi untuk mencoret, menandai, atau memberi catatan langsung di dokumen PDF.
                      </p>
                      <button
                        onClick={() => { onClose?.(); router.push(`/finance/documents/${docId}/annotate`); }}
                        className="mt-2.5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
                        <PenLine size={13} /> Buka Mode Anotasi
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes input aktif */}
              {notesFor && (
                <NotesPanel
                  value={notes} onChange={setNotes}
                  label={notesFor === "revision_requested" ? "Catatan Revisi" : "Alasan Penolakan"}
                  onSubmit={() => doUpdate(notesFor)}
                  onCancel={() => { setNotesFor(null); setNotes(""); }}
                  disabled={busy}
                  docId={docId}
                />
              )}
            </>
          ) : (
            <StatusTimeline history={history || []} />
          )}
        </div>

        {/* Action buttons */}
        {!isDone && doc && !notesFor && (
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-2.5">
            {/* Draft review: approve draft → buyer uploads final */}
            {canReviewDraft && (
              <>
                <ActionBtn icon={CheckCircle2} label="Setujui Draft → Minta Buyer Upload Final" color="teal"
                  onClick={() => doUpdate("draft_approved")} loading={busy} />
                <ActionBtn icon={AlertTriangle} label="Kembalikan Draft ke Buyer" color="amber"
                  onClick={() => handleAction("draft_revision_buyer")} loading={busy} />
              </>
            )}
            {/* Final review: approve final */}
            {canApprove && (
              <ActionBtn icon={CheckCircle2} label="Setujui Final SKBDN" color="green"
                onClick={() => handleAction("approved")} loading={busy} />
            )}
            {canReviewFinal && (
              <ActionBtn icon={AlertTriangle} label="Minta Revisi Final ke Buyer" color="amber"
                onClick={() => handleAction("revision_requested")} loading={busy} />
            )}
            {canReview && (
              <ActionBtn icon={XCircle} label="Tolak SKBDN" color="red"
                onClick={() => handleAction("rejected")} loading={busy} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}