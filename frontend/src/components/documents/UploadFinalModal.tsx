"use client";

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { X, Upload, FileText, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useUploadFinal, useReuploadFinal } from "@/hooks/useDocuments";
import { formatRupiah, formatNumber, formatDate, formatFileSize } from "../skbdn/utils";
import type { Document } from "@/types";

interface DropZoneProps {
  file: globalThis.File | null;
  onFile: (file: globalThis.File | null) => void;
  error?: string;
}

function DropZone({ file, onFile, error }: DropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }} />
      <div
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onClick={() => !file && ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 transition-all cursor-pointer ${
          file ? "border-green-300 bg-green-50/50 cursor-default"
          : drag ? "border-blue-400 bg-blue-50"
          : error ? "border-red-300 bg-red-50"
          : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30"
        }`}>
        {file ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg border border-green-200 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(file.size)} · Siap diupload</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onFile(null); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
              <X size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <Upload size={20} className={drag ? "text-blue-500" : "text-gray-400"} />
            <p className="text-sm font-semibold text-gray-700">
              {drag ? "Lepaskan file" : "Klik atau drag file Final SKBDN"}
            </p>
            <p className="text-[11px] text-gray-400">PDF, JPG, atau PNG · maks 10 MB</p>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface UploadFinalModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: Document | null;
  isRevision?: boolean;
}

// UploadFinalModal — hanya perlu file, data SKBDN sudah ada dari Draft
export default function UploadFinalModal({ isOpen, onClose, doc, isRevision = false }: UploadFinalModalProps) {
  const uploadFinal   = useUploadFinal();
  const reuploadFinal = useReuploadFinal();
  const mut = isRevision ? reuploadFinal : uploadFinal;

  const [file, setFile]   = useState<globalThis.File | null>(null);
  const [notes, setNotes] = useState("");
  const [fileErr, setFileErr] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) { setFile(null); setNotes(""); setFileErr(""); setSuccess(false); }
  }, [isOpen]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async () => {
    if (!file) { setFileErr("File Final SKBDN wajib diupload"); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) { setFileErr("Hanya PDF, JPG, PNG"); return; }
    if (file.size > 10 * 1024 * 1024) { setFileErr("Maksimal 10 MB"); return; }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("notes", notes.trim());

    try {
      await mut.mutateAsync({ id: doc.id, formData: fd });
      setSuccess(true);
      setTimeout(() => onClose(), 1400);
    } catch { /* handled by hook */ }
  };

  const infoRows: [string, string][] = [
    ["Nomor SKBDN", doc.skbdn_number || "—"],
    ["Bank", doc.issuing_bank || "—"],
    ["Barang", doc.goods_type || "—"],
    ["Tonase", doc.tonnage ? `${formatNumber(doc.tonnage)} Ton` : "—"],
    ["Total Nilai", doc.total_price ? formatRupiah(doc.total_price) : "—"],
    ["Expired", formatDate(doc.expired_date)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isRevision ? "Upload Final SKBDN (Revisi)" : "Upload Final SKBDN"}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isRevision
                ? "Ganti file Final SKBDN sesuai permintaan Keuangan"
                : "Draft sudah disetujui — upload file Final dari bank"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <p className="text-base font-bold text-gray-800">Final SKBDN berhasil dikirim!</p>
              <p className="text-sm text-gray-500 text-center">Keuangan akan segera mereview dokumen Anda.</p>
            </div>
          ) : (
            <>
              {/* Info: data dari Draft sudah ada */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Data SKBDN sudah tersimpan dari Draft
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {infoRows.map(([label, val]) => (
                    <div key={label}>
                      <p className="text-green-600 font-medium">{label}</p>
                      <p className="text-green-900 font-semibold truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revisi reason */}
              {isRevision && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} /> Alasan revisi dari Keuangan:
                  </p>
                  <p className="text-xs text-amber-800">
                    Periksa catatan revisi di riwayat status dokumen dan pastikan file Final baru sudah sesuai.
                  </p>
                </div>
              )}

              {/* File upload */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  File Final SKBDN dari Bank <span className="text-red-500">*</span>
                </p>
                <DropZone file={file} onFile={(f) => { setFile(f); setFileErr(""); }} error={fileErr} />
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Catatan (opsional)</p>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder={isRevision
                    ? "Jelaskan perubahan yang sudah dilakukan sesuai permintaan Keuangan..."
                    : "Catatan tambahan untuk Keuangan (mis: mohon diproses segera)..."}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 resize-none transition-all"
                />
              </div>
            </>
          )}
        </div>

        {!success && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              Batal
            </button>
            <button onClick={handleSubmit} disabled={mut.isPending || !file}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50 transition-all shadow-sm">
              {mut.isPending
                ? <><Loader2 size={15} className="animate-spin"/>Mengirim...</>
                : <><Upload size={15}/>{isRevision ? "Kirim Revisi Final" : "Kirim Final SKBDN"}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
