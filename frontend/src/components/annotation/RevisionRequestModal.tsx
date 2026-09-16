"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { X, AlertTriangle, Send, Upload, FileText, Type, PenLine, Camera, Loader2, type LucideIcon } from "lucide-react";
import Button from "../ui/Button";

/**
 * RevisionRequestModal — modal permintaan revisi dari AP2 / Finance ke Buyer
 *
 * PERUBAHAN:
 * - Ditambah pilihan metode revisi:
 *     1. "Catatan Saja"    → tulis catatan teks, cocok untuk revisi kecil
 *     2. "Upload Dokumen"  → upload file fisik yang sudah dicoret/ditandai manual (print→coret→scan/foto)
 *     3. "Mode Anotasi"    → diarahkan ke halaman anotasi PDF digital (existing flow)
 * - Catatan revisi jadi opsional pada mode "Upload Dokumen"
 * - onSubmit sekarang menerima { notes, file, mode } agar parent bisa handle sesuai kebutuhan
 */

export type RevisionMode = "notes" | "upload" | "annotate";

export interface RevisionSubmitPayload {
  notes: string;
  file: globalThis.File | null;
  mode: RevisionMode;
}

interface RevisionModeOption {
  id: RevisionMode;
  icon: LucideIcon;
  label: string;
  desc: string;
  color: "blue" | "purple" | "indigo";
}

const REVISION_MODES: RevisionModeOption[] = [
  {
    id:    "notes",
    icon:  Type,
    label: "Catatan Saja",
    desc:  "Tulis catatan apa yang perlu diperbaiki oleh Buyer",
    color: "blue",
  },
  {
    id:    "upload",
    icon:  Upload,
    label: "Upload Dokumen",
    desc:  "Upload scan / foto dokumen fisik yang sudah dicoret atau ditandai",
    color: "purple",
  },
  {
    id:    "annotate",
    icon:  PenLine,
    label: "Mode Anotasi",
    desc:  "Tandai langsung di halaman PDF secara digital",
    color: "indigo",
  },
];

interface ColorCfg {
  active: string;
  icon: string;
  label: string;
  desc: string;
}

const COLOR_MAP: Record<string, ColorCfg> = {
  blue:   { active: "border-blue-400 bg-blue-50",   icon: "bg-blue-100 text-blue-600",   label: "text-blue-800",   desc: "text-blue-600"   },
  purple: { active: "border-purple-400 bg-purple-50", icon: "bg-purple-100 text-purple-600", label: "text-purple-800", desc: "text-purple-600" },
  indigo: { active: "border-indigo-400 bg-indigo-50", icon: "bg-indigo-100 text-indigo-600", label: "text-indigo-800", desc: "text-indigo-600" },
};

interface RevisionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (payload: RevisionSubmitPayload) => void;
  onAnnotate?: () => void;
  isLoading?: boolean;
}

export default function RevisionRequestModal({
  isOpen,
  onClose,
  onSubmit,    // ({ notes, file, mode }) => void  — untuk "notes" dan "upload"
  onAnnotate,  // () => void — untuk "annotate" mode
  isLoading,
}: RevisionRequestModalProps) {
  const [mode, setMode]   = useState<RevisionMode>("notes");
  const [notes, setNotes] = useState("");
  const [file, setFile]   = useState<globalThis.File | null>(null);
  const [error, setError] = useState("");
  const fileInputRef      = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleModeChange = (m: RevisionMode) => {
    setMode(m);
    setError("");
  };

  const handleSubmit = () => {
    setError("");

    // Mode anotasi: langsung redirect, tidak perlu submit form
    if (mode === "annotate") {
      onAnnotate?.();
      return;
    }

    // Mode upload: file wajib, notes opsional
    if (mode === "upload") {
      if (!file) { setError("File dokumen revisi wajib diunggah"); return; }
      onSubmit?.({ notes: notes.trim(), file, mode });
      return;
    }

    // Mode notes: catatan wajib dan minimal 10 karakter
    if (!notes.trim()) { setError("Catatan revisi wajib diisi"); return; }
    if (notes.trim().length < 10) { setError("Catatan minimal 10 karakter"); return; }
    onSubmit?.({ notes: notes.trim(), file: null, mode });
  };

  const curMode = REVISION_MODES.find((m) => m.id === mode);
  const colorCfg = COLOR_MAP[curMode?.color || "blue"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Minta Revisi</h3>
              <p className="text-xs text-gray-400 mt-0.5">Buyer akan dinotifikasi untuk perbaikan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
            <p className="text-xs text-amber-700 leading-relaxed">
              Pilih metode revisi yang sesuai. Anotasi atau dokumen revisi Anda akan dikirim ke Buyer
              sebagai referensi perbaikan. Status dokumen akan berubah menjadi{" "}
              <strong>"Perlu Revisi"</strong>.
            </p>
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Metode Revisi</p>
            {REVISION_MODES.map((m) => {
              const isActive = mode === m.id;
              const cfg      = COLOR_MAP[m.color] ?? COLOR_MAP.blue!;
              const Icon     = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    isActive ? cfg.active : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? cfg.icon : "bg-gray-100 text-gray-400"
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isActive ? cfg.label : "text-gray-700"}`}>
                      {m.label}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${isActive ? cfg.desc : "text-gray-400"}`}>
                      {m.desc}
                    </p>
                  </div>
                  {/* Radio indicator */}
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors flex items-center justify-center ${
                    isActive ? "border-current bg-current" : "border-gray-300"
                  } ${isActive ? cfg.label : ""}`}>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mode: Annotate — info saja */}
          {mode === "annotate" && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-2">
              <p className="text-xs font-semibold text-indigo-800">Cara kerja Mode Anotasi:</p>
              <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Anda akan diarahkan ke halaman anotasi PDF</li>
                <li>Tandai bagian dokumen yang perlu diperbaiki</li>
                <li>Klik "Simpan" lalu "Minta Revisi" dengan catatan</li>
                <li>Buyer otomatis menerima notifikasi dengan anotasi Anda</li>
              </ol>
            </div>
          )}

          {/* Mode: Upload — file input */}
          {mode === "upload" && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                File Revisi <span className="text-red-400">*</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setFile(e.target.files?.[0] || null); setError(""); }}
              />
              {file ? (
                <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800 truncate">{file.name}</p>
                    <p className="text-xs text-green-600">{(file.size / 1024).toFixed(0)} KB · Siap diupload</p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2.5 py-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-all"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Camera size={22} className="text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Klik untuk upload</p>
                    <p className="text-xs text-gray-400 mt-0.5">Foto/scan dokumen yang sudah dicoret · PDF, JPG, PNG · maks 10 MB</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Catatan teks — wajib pada "notes", opsional pada "upload" */}
          {mode !== "annotate" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Catatan Revisi{" "}
                {mode === "notes"
                  ? <span className="text-red-400">*</span>
                  : <span className="text-xs font-normal text-gray-400">(opsional — untuk revisi kecil)</span>
                }
              </label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setError(""); }}
                rows={mode === "upload" ? 3 : 4}
                placeholder={
                  mode === "upload"
                    ? "Catatan tambahan untuk Buyer, jika ada... (opsional)"
                    : "Jelaskan secara detail bagian mana yang perlu diperbaiki...\n\nContoh: Nomor SKBDN tidak sesuai format Bank Indonesia, mohon diperbaiki."
                }
                className={`w-full rounded-xl border px-3.5 py-3 text-sm resize-none outline-none transition-all bg-gray-50 focus:bg-white focus:ring-2 ${
                  error
                    ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-blue-400 focus:ring-blue-500/20"
                }`}
              />
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
              {mode === "notes" && (
                <p className="mt-1 text-[11px] text-gray-400">
                  {notes.length} karakter · minimal 10 karakter
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
            Batal
          </Button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 ${
              mode === "annotate"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : mode === "upload"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isLoading ? (
              <><Loader2 size={14} className="animate-spin" /> Mengirim...</>
            ) : mode === "annotate" ? (
              <><PenLine size={14} /> Buka Anotasi</>
            ) : (
              <><Send size={14} /> Kirim Revisi</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}