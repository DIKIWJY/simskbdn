"use client";

import { useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, FileText,
  Loader2, PenLine, Download, Camera, X, Banknote, Eye, Info,
  type LucideIcon,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import SKBDNInfoCard from "@/components/skbdn/SKBDNInfoCard";
import ExpiryIndicator from "@/components/skbdn/ExpiryIndicator";
import VersionHistoryCard from "@/components/skbdn/VersionHistoryCard";
import StatusTimeline from "@/components/documents/StatusTimeline";
import type { DocumentStatus } from "@/types";
import {
  useFinanceDocument, useFinanceDocumentVersions,
  useFinanceDocumentHistory, useUpdateFinanceStatus,
} from "@/hooks/useFinance";

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
    green: "bg-green-600 hover:bg-green-700 text-white shadow-sm",
    teal:  "bg-teal-600 hover:bg-teal-700 text-white shadow-sm",
    blue:  "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
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

// ─── Panel catatan (revisi / penolakan) ─────────────────────────────────────
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
    setUploading(true);
    try {
      const { documentAPI } = await import("@/api/document.api");
      const res = await documentAPI.uploadRevisionAttachment(docId, f);
      const url = res.data?.data?.url;
      if (url) {
        setAttachmentUrl(url);
        onChange((value ? value + "\n" : "") + `📎 Lampiran: ${f.name}`);
      }
    } catch (err) { console.error("Upload failed:", err); }
    setUploading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</p>

      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={4}
        placeholder="Tuliskan catatan yang jelas agar Buyer dapat memperbaiki dokumen..."
        className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none bg-gray-50/50 transition-all"
      />

      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Lampiran Foto / Scan Coretan (opsional)
        </p>
        {file ? (
          <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
            {file.type.startsWith("image/") && (
              <img src={URL.createObjectURL(file)} alt="" className="w-12 h-12 object-cover rounded-lg border"/>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
              <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB {uploading ? "· Mengupload..." : attachmentUrl ? "· Terupload" : ""}</p>
            </div>
            <button onClick={() => { setFile(null); setAttachmentUrl(""); }}
              className="p-1 text-gray-400 hover:text-red-500"><X size={13}/></button>
          </div>
        ) : (
          <label className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all">
            <Camera size={16} className="text-gray-400"/>
            <span className="text-xs text-gray-500">Klik untuk upload foto coretan, scan, atau screenshot</span>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange}/>
          </label>
        )}
      </div>

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

// ─── Halaman Detail Dokumen — Keuangan ──────────────────────────────────────
export default function FinanceDocumentDetailPage() {
  const { id: docId } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: docData, isLoading } = useFinanceDocument(docId);
  const { data: versions }           = useFinanceDocumentVersions(docId);
  const { data: history }            = useFinanceDocumentHistory(docId);
  const updateStatus = useUpdateFinanceStatus();

  const [notes, setNotes]       = useState("");
  const [notesFor, setNotesFor] = useState<DocumentStatus | null>(null);
  const [tab, setTab]           = useState("info");

  // docData sekarang selalu berbentuk { document, file_url, download_url } —
  // lihat DocumentDetailResponse di @/types.
  const doc     = docData?.document;
  const fileURL = docData?.file_url;
  const busy    = updateStatus.isPending;
  const status  = doc?.status;

  // ── Fase sesuai aturan transisi backend (role: finance) ──────────────────
  const isDraftReview  = status === "draft_under_review";                                  // → draft_approved | draft_revision_buyer
  const isFinalWaiting = !!status && ["final_submitted", "final_sent_to_finance"].includes(status);     // → final_under_review
  const isFinalReview  = !!status && ["final_under_review", "under_review"].includes(status);           // → approved | revision_requested | rejected
  const isApproved     = status === "approved";
  const isDone         = !!status && ["disbursed", "rejected", "expired", "approved"].includes(status);
  const isRevisionWaiting = status === "revision_requested" || status === "draft_revision_buyer"; // Menunggu Buyer revisi
  const isWaitingBuyer    = status === "draft_approved"; // Menunggu Buyer upload Final
  const canAnnotate    = isDraftReview || isFinalReview;

  const doUpdate = (s: DocumentStatus, n: string = notes) => {
    updateStatus.mutate({ id: docId, status: s, notes: n }, {
      onSuccess: () => { setNotes(""); setNotesFor(null); },
    });
  };

  const handleAction = (s: DocumentStatus) => {
    if (["revision_requested", "rejected", "draft_revision_buyer"].includes(s)) {
      setNotesFor(s);
      return;
    }
    doUpdate(s);
  };

  return (
    <div className="w-full space-y-5">
      {/* ── Header halaman ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => router.back()}
            className="p-2 mt-0.5 rounded-xl text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0">
            <ArrowLeft size={16}/>
          </button>
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-6 w-56 bg-gray-200 rounded animate-pulse"/>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 font-mono">{doc?.skbdn_number || "Detail SKBDN"}</h1>
                  {doc && <StatusBadge status={doc.status} size="md"/>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{doc?.title}</p>
              </>
            )}
          </div>
        </div>
        {doc?.expired_date && <ExpiryIndicator expiredDate={doc.expired_date} variant="inline"/>}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200">
        {(
          [["info","Informasi"],["history","Riwayat Status"]] as const
        ).map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`py-2.5 px-1 mr-6 text-sm font-semibold border-b-2 -mb-px transition-all ${
              tab === id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-700"
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid lg:grid-cols-3 gap-5 animate-pulse">
          <div className="lg:col-span-2 space-y-4">{[1,2].map(i => <div key={i} className="h-44 bg-gray-100 rounded-2xl"/>)}</div>
          <div className="h-64 bg-gray-100 rounded-2xl"/>
        </div>
      ) : tab === "history" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <StatusTimeline history={history || []}/>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          {/* ── Kolom kiri: informasi dokumen ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {doc?.expired_date && <ExpiryIndicator expiredDate={doc.expired_date} variant="badge"/>}

            <SKBDNInfoCard doc={doc}/>

            {fileURL && (
              <a href={fileURL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all group shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={17} className="text-red-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors truncate">{doc?.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Klik untuk preview / download dokumen aktif</p>
                </div>
                <Download size={15} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors"/>
              </a>
            )}

            <VersionHistoryCard docId={docId} versions={versions || []}/>
          </div>

          {/* ── Kolom kanan: panel aksi (sticky) ───────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-4">
            {/* Anotasi PDF */}
            {canAnnotate && fileURL && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <PenLine size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">Anotasi PDF (Opsional)</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Coret, tandai, atau beri catatan langsung di dokumen PDF.
                    </p>
                    <button
                      onClick={() => router.push(`/finance/documents/${docId}/annotate`)}
                      className="mt-2.5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
                      <PenLine size={13}/> Buka Mode Anotasi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Panel catatan aktif */}
            {notesFor && (
              <NotesPanel
                value={notes} onChange={setNotes}
                label={
                  notesFor === "rejected" ? "Alasan Penolakan"
                  : notesFor === "revision_requested" ? "Catatan Revisi Final"
                  : "Catatan Pengembalian Draft"
                }
                onSubmit={() => doUpdate(notesFor)}
                onCancel={() => { setNotesFor(null); setNotes(""); }}
                disabled={busy}
                docId={docId}
              />
            )}

            {/* Aksi sesuai fase & wewenang role Keuangan */}
            {!notesFor && doc && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Aksi Keuangan</p>

                {isDraftReview && (
                  <>
                    <ActionBtn icon={CheckCircle2} label="Setujui Draft → Minta Buyer Upload Final" color="teal"
                      onClick={() => doUpdate("draft_approved")} loading={busy}/>
                    <ActionBtn icon={AlertTriangle} label="Kembalikan Draft ke Buyer" color="amber"
                      onClick={() => handleAction("draft_revision_buyer")} loading={busy}/>
                    <p className="text-[11px] text-gray-400 pt-1 flex items-start gap-1.5">
                      <Info size={12} className="flex-shrink-0 mt-0.5"/>
                      Penolakan SKBDN hanya dapat dilakukan pada fase review Final.
                    </p>
                  </>
                )}

                {isFinalWaiting && (
                  <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <Eye size={15} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-xs font-bold text-blue-800 mb-0.5">Menunggu Verifikasi AP2</p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Final SKBDN baru diterima dari Buyer. AP2 akan memverifikasi kelengkapan dokumen
                        sebelum diteruskan ke Keuangan untuk persetujuan akhir.
                      </p>
                    </div>
                  </div>
                )}

                {isFinalReview && (
                  <>
                    <ActionBtn icon={CheckCircle2} label="Setujui Final SKBDN" color="green"
                      onClick={() => doUpdate("approved")} loading={busy}/>
                    <ActionBtn icon={AlertTriangle} label="Minta Revisi Final ke Buyer" color="amber"
                      onClick={() => handleAction("revision_requested")} loading={busy}/>
                    <ActionBtn icon={XCircle} label="Tolak SKBDN" color="red"
                      onClick={() => handleAction("rejected")} loading={busy}/>
                  </>
                )}

                {isRevisionWaiting && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-xs font-bold text-amber-800 mb-0.5">Menunggu Revisi dari Buyer</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Catatan revisi sudah dikirim ke Buyer. Sistem akan otomatis memberi tahu Anda saat Buyer mengupload dokumen yang diperbaiki.
                      </p>
                    </div>
                  </div>
                )}

                {isWaitingBuyer && (
                  <div className="flex items-start gap-2.5 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                    <CheckCircle2 size={15} className="text-teal-500 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-xs font-bold text-teal-800 mb-0.5">Draft Verified — Menunggu Final dari Buyer</p>
                      <p className="text-xs text-teal-700 leading-relaxed">
                        Buyer telah diberitahu untuk mengupload Final SKBDN. Sistem akan memberi notifikasi saat Final diterima.
                      </p>
                    </div>
                  </div>
                )}

                {isApproved && (
                  <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-teal-100 rounded-xl">
                    <Banknote size={15} className="text-teal-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-teal-700 leading-relaxed">
                      SKBDN telah <strong>disetujui</strong>. Pencairan dilakukan oleh <strong>Admin</strong>.
                    </p>
                  </div>
                )}

                {isDone && (
                  <p className="text-xs text-gray-400 py-1">
                    Dokumen sudah berstatus final — tidak ada aksi tersedia.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}