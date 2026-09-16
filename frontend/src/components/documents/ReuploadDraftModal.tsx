"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { X, Upload, FileText, CheckCircle2, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { useReuploadDraft } from "@/hooks/useDocuments";
import { formatRupiah, formatFileSize } from "../skbdn/utils";
import type { Document } from "@/types";

const inputCls = (err: boolean): string => `w-full border rounded-xl px-3 py-2 text-sm outline-none bg-white transition-all focus:ring-2 focus:ring-blue-500/20 ${
  err ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"
}`;

/** Field SKBDN yang bisa diubah saat revisi draft — semua bernilai string
 * (angka & tanggal pun disimpan sebagai string karena berasal dari <input>). */
interface EditableFields {
  skbdn_number: string;
  contract_number: string;
  issuing_bank: string;
  goods_type: string;
  tonnage: string;
  price_per_ton: string;
  country_of_origin: string;
  date_of_issue: string;
  expired_date: string;
}

const EMPTY_FIELDS: EditableFields = {
  skbdn_number: "", contract_number: "", issuing_bank: "", goods_type: "",
  tonnage: "", price_per_ton: "", country_of_origin: "",
  date_of_issue: "", expired_date: "",
};

// Daftar field yang dirender di bagian "Ubah data SKBDN" — key harus salah
// satu dari EditableFields agar type-safe saat diakses via fields[key].
const EDIT_FIELD_DEFS: { label: string; key: keyof EditableFields; type: string }[] = [
  { label: "Nomor SKBDN",     key: "skbdn_number",      type: "" },
  { label: "Nomor Kontrak",   key: "contract_number",   type: "" },
  { label: "Bank Penerbit",   key: "issuing_bank",      type: "" },
  { label: "Jenis Barang",    key: "goods_type",        type: "" },
  { label: "Tonase (Ton)",    key: "tonnage",           type: "number" },
  { label: "Harga/Ton (Rp)",  key: "price_per_ton",     type: "number" },
  { label: "Negara Asal",     key: "country_of_origin", type: "" },
  { label: "Date of Issue",   key: "date_of_issue",     type: "date" },
  { label: "Expired Date",    key: "expired_date",      type: "date" },
];

interface ReuploadDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: Document | null;
}

export default function ReuploadDraftModal({ isOpen, onClose, doc }: ReuploadDraftModalProps) {
  const mut = useReuploadDraft();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile]   = useState<globalThis.File | null>(null);
  const [notes, setNotes] = useState("");
  const [fileErr, setFileErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Field yang bisa diubah saat revisi draft
  const [fields, setFields] = useState<EditableFields>(EMPTY_FIELDS);

  useEffect(() => {
    if (isOpen && doc) {
      setFields({
        skbdn_number: doc.skbdn_number || "",
        contract_number: doc.contract_number || "",
        issuing_bank: doc.issuing_bank || "",
        goods_type: doc.goods_type || "",
        tonnage: doc.tonnage?.toString() || "",
        price_per_ton: doc.price_per_ton?.toString() || "",
        country_of_origin: doc.country_of_origin || "",
        date_of_issue: doc.date_of_issue ? doc.date_of_issue.split("T")[0]! : "",
        expired_date: doc.expired_date ? doc.expired_date.split("T")[0]! : "",
      });
    }
    if (!isOpen) { setFile(null); setNotes(""); setFileErr(""); setSuccess(false); setShowEdit(false); }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const fc = (k: keyof EditableFields) => (v: string) => setFields(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!file) { setFileErr("File wajib diupload"); return; }
    if (!notes.trim()) { setFileErr("Catatan perubahan wajib diisi"); return; }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("notes", notes.trim());
    Object.entries(fields).forEach(([k, v]) => { if (v) fd.append(k, v); });

    try {
      await mut.mutateAsync({ id: doc.id, formData: fd });
      setSuccess(true);
      setTimeout(() => onClose(), 1400);
    } catch { /* handled */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Re-upload Draft SKBDN</h3>
            <p className="text-xs text-gray-400 mt-0.5">Perbaiki dan kirim ulang draft</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-bold text-gray-800">Draft revisi berhasil dikirim!</p>
            </div>
          ) : (
            <>
              {/* Alasan revisi dari riwayat */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12}/> Alasan revisi:
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Periksa riwayat status dokumen untuk melihat catatan lengkap dari AP2 atau Keuangan.
                </p>
              </div>

              {/* File upload */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">File Draft Baru <span className="text-red-500">*</span></p>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (f) { setFile(f); setFileErr(""); }
                  }} />
                {file ? (
                  <div className="flex items-center gap-3 p-3 border border-green-200 bg-green-50 rounded-xl">
                    <FileText size={16} className="text-red-400 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                      <p className="text-[11px] text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <Upload size={16} className="mx-auto mb-1"/> Klik untuk pilih file
                  </button>
                )}
                {fileErr && <p className="mt-1 text-xs text-red-500">{fileErr}</p>}
              </div>

              {/* Catatan perubahan */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Catatan Perubahan <span className="text-red-500">*</span></p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Jelaskan apa yang sudah diperbaiki (wajib)..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 resize-none"/>
              </div>

              {/* Edit data SKBDN (expandable) */}
              <div>
                <button onClick={() => setShowEdit(!showEdit)}
                  className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  <ChevronDown size={13} className={`transition-transform ${showEdit ? "rotate-180" : ""}`}/>
                  {showEdit ? "Sembunyikan" : "Ubah data SKBDN (jika ada perubahan)"}
                </button>

                {showEdit && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {EDIT_FIELD_DEFS.map(({ label, key, type }) => (
                      <div key={key} className={key === "issuing_bank" || key === "goods_type" ? "col-span-2" : ""}>
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">{label}</p>
                        <input type={type || "text"} value={fields[key] || ""} onChange={e => fc(key)(e.target.value)}
                          className={inputCls(false)} />
                      </div>
                    ))}
                    {fields.tonnage && fields.price_per_ton && (
                      <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex justify-between items-center">
                        <p className="text-xs text-emerald-700">Total Nilai (otomatis)</p>
                        <p className="text-sm font-bold text-emerald-700">
                          {formatRupiah(parseFloat(fields.tonnage || "0") * parseFloat(fields.price_per_ton || "0"))}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!success && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
            <button onClick={handleSubmit} disabled={mut.isPending || !file}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 shadow-sm">
              {mut.isPending
                ? <><Loader2 size={14} className="animate-spin"/>Mengirim...</>
                : <><Upload size={14}/>Kirim Draft Revisi</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
