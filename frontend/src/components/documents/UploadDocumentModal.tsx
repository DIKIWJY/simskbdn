"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent, type ChangeEvent, type ReactNode } from "react";
import {
  X, Upload, FileText, File, AlertCircle, CheckCircle2,
  Info, ChevronLeft, ChevronRight, ArrowRight, Loader2,
  Hash, FileBadge, Banknote, Package, Scale, DollarSign,
  Globe, Calendar, CalendarClock,
} from "lucide-react";
// Use the specific hooks you defined
import { useCreateDraft, useReuploadDraft, useReuploadFinal, useReuploadDocument } from "@/hooks/useDocuments";
import { formatRupiah, formatNumber, formatFileSize } from "../skbdn/utils";
import type { Document } from "@/types";

type FormErrors = Record<string, string>;

/** Shape formulir upload SKBDN — semua field bertipe string (termasuk angka,
 * karena diketik lewat <input> dan di-parse saat submit). */
interface UploadFormState {
  title: string;
  doc_type: string;
  description: string;
  notes: string;
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

interface StepFormProps {
  form: UploadFormState;
  errors: FormErrors;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

// ─── DropZone ──────────────────────────────────────────────────────────────
interface DropZoneProps {
  file: globalThis.File | null;
  onFile: (file: globalThis.File | null) => void;
  error?: string;
}

function DropZone({ file, onFile, error }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  const fileIcon = file?.type === "application/pdf"
    ? <FileText size={24} className="text-red-400" />
    : <File size={24} className="text-blue-400" />;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 transition-all cursor-pointer ${
          file ? "border-green-300 bg-green-50/50 cursor-default"
          : dragging ? "border-blue-400 bg-blue-50 scale-[1.01]"
          : error ? "border-red-300 bg-red-50"
          : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30"
        }`}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg border border-green-200 flex items-center justify-center flex-shrink-0">
              {fileIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(file.size)} · Siap diupload</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFile(null); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              dragging ? "bg-blue-100" : "bg-gray-100"
            }`}>
              <Upload size={20} className={dragging ? "text-blue-600" : "text-gray-400"} />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {dragging ? "Lepaskan file di sini" : "Klik atau drag file ke sini"}
            </p>
            <p className="text-[11px] text-gray-400">PDF, JPG, atau PNG · maksimal 10 MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Field input wrapper ───────────────────────────────────────────────────
interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

const inputClass = (hasError?: unknown) => `w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white transition-all focus:ring-2 focus:ring-blue-500/20 ${
  hasError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"
}`;

const POPULAR_BANKS = [
  "Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)",
  "Bank Central Asia (BCA)", "Bank Syariah Indonesia (BSI)", "CIMB Niaga", "Bank Danamon",
];

// ─── STEP 1: File & Informasi Dasar ────────────────────────────────────────
interface StepFileProps extends StepFormProps {
  file: globalThis.File | null;
  setFile: (file: globalThis.File | null) => void;
  fileError?: string;
  isReupload: boolean;
}

function StepFile({ form, errors, onChange, file, setFile, fileError, isReupload }: StepFileProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          {isReupload
            ? "Upload file SKBDN versi terbaru. Versi lama tetap tersimpan untuk audit trail."
            : "Unggah dokumen SKBDN (Surat Kredit Berdokumen Dalam Negeri) untuk diproses oleh Sales AP2 lalu Keuangan."}
        </p>
      </div>

      <Field label="Judul Dokumen" required error={errors.title}>
        <input
          name="title"
          value={form.title}
          onChange={onChange}
          placeholder="mis: SKBDN Urea Granul 500 Ton - Q2 2026"
          className={inputClass(errors.title)}
          disabled={isReupload}
        />
      </Field>

      <Field label="Tipe Dokumen" required>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
          <input
            type="radio"
            name="doc_type"
            value="draft"
            checked={true}
            readOnly
            className="mt-0.5 accent-blue-600"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">Draft SKBDN</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Semua dokumen baru dimulai sebagai Draft. Setelah Draft diverifikasi AP2 dan disetujui Keuangan, 
              Anda akan diminta mengupload Final SKBDN melalui tombol terpisah.
            </p>
          </div>
        </div>
      </Field>

      <Field label="File Dokumen" required error={fileError}>
        <DropZone file={file} onFile={setFile} error={fileError} />
      </Field>

      <Field label="Deskripsi" hint="Opsional · keterangan tambahan tentang dokumen">
        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          rows={2}
          placeholder="mis: Pembelian pupuk Urea untuk kebutuhan musim tanam Q2"
          className={`${inputClass(false)} resize-none`}
        />
      </Field>
    </div>
  );
}

// ─── STEP 2: Detail SKBDN ──────────────────────────────────────────────────
function StepSKBDN({ form, errors, onChange }: StepFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
        <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Isi informasi identitas SKBDN sesuai dokumen fisik. Data ini digunakan untuk monitoring dan audit oleh Keuangan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nomor SKBDN" required error={errors.skbdn_number}>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="skbdn_number"
              value={form.skbdn_number}
              onChange={onChange}
              placeholder="SKBDN-2026-0001"
              className={`${inputClass(errors.skbdn_number)} pl-9 font-mono`}
            />
          </div>
        </Field>

        <Field label="Nomor Kontrak" required error={errors.contract_number}>
          <div className="relative">
            <FileBadge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="contract_number"
              value={form.contract_number}
              onChange={onChange}
              placeholder="KTR-PSR-2026-088"
              className={`${inputClass(errors.contract_number)} pl-9 font-mono`}
            />
          </div>
        </Field>
      </div>

      <Field label="Bank Penerbit" required error={errors.issuing_bank}>
        <div className="relative">
          <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="issuing_bank"
            value={form.issuing_bank}
            onChange={onChange}
            placeholder="mis: Bank Mandiri"
            list="bank-suggestions"
            className={`${inputClass(errors.issuing_bank)} pl-9`}
          />
          <datalist id="bank-suggestions">
            {POPULAR_BANKS.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>
      </Field>

      <Field label="Jenis Barang" required error={errors.goods_type}>
        <div className="relative">
          <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="goods_type"
            value={form.goods_type}
            onChange={onChange}
            placeholder="mis: Urea Granul 46%, NPK Phonska 15-15-15"
            className={`${inputClass(errors.goods_type)} pl-9`}
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tonase" required error={errors.tonnage} hint="Dalam satuan ton">
          <div className="relative">
            <Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="tonnage"
              type="number"
              value={form.tonnage}
              onChange={onChange}
              placeholder="500"
              min="0"
              step="0.1"
              className={`${inputClass(errors.tonnage)} pl-9 pr-12`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">Ton</span>
          </div>
        </Field>

        <Field label="Harga per Ton" required error={errors.price_per_ton} hint="Dalam Rupiah">
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold">Rp</span>
            <input
              name="price_per_ton"
              type="number"
              value={form.price_per_ton}
              onChange={onChange}
              placeholder="4500000"
              min="0"
              className={`${inputClass(errors.price_per_ton)} pl-16`}
            />
          </div>
        </Field>
      </div>

      {/* Total auto-compute */}
      {(form.tonnage && form.price_per_ton) && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Harga (Otomatis)</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {formatNumber(parseFloat(form.tonnage))} Ton × {formatRupiah(parseFloat(form.price_per_ton))}
            </p>
          </div>
          <p className="text-xl font-bold text-emerald-700">
            {formatRupiah(parseFloat(form.tonnage) * parseFloat(form.price_per_ton))}
          </p>
        </div>
      )}

      <Field label="Negara Asal" required error={errors.country_of_origin}>
        <div className="relative">
          <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="country_of_origin"
            value={form.country_of_origin}
            onChange={onChange}
            placeholder="mis: Indonesia"
            className={`${inputClass(errors.country_of_origin)} pl-9`}
          />
        </div>
      </Field>
    </div>
  );
}

// ─── STEP 3: Validitas ────────────────────────────────────────────────────
function StepValidity({ form, errors, onChange }: StepFormProps) {
  // Hitung durasi otomatis
  const duration = useMemo(() => {
    if (!form.date_of_issue || !form.expired_date) return null;
    const diff = new Date(form.expired_date).getTime() - new Date(form.date_of_issue).getTime();
    return Math.ceil(diff / 86_400_000);
  }, [form.date_of_issue, form.expired_date]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 bg-purple-50 border border-purple-100 rounded-xl p-3">
        <Info size={15} className="text-purple-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-800 leading-relaxed">
          <strong>Penting:</strong> SKBDN yang sudah lewat tanggal expired tidak dapat diproses. Pastikan tanggal sesuai dengan dokumen fisik.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date of Issue (Tanggal Terbit)" required error={errors.date_of_issue}>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="date_of_issue"
              type="date"
              value={form.date_of_issue}
              onChange={onChange}
              className={`${inputClass(errors.date_of_issue)} pl-9`}
            />
          </div>
        </Field>

        <Field label="Expired Date (Tanggal Kadaluarsa)" required error={errors.expired_date}>
          <div className="relative">
            <CalendarClock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="expired_date"
              type="date"
              value={form.expired_date}
              onChange={onChange}
              min={form.date_of_issue}
              className={`${inputClass(errors.expired_date)} pl-9`}
            />
          </div>
        </Field>
      </div>

      {duration !== null && (
        <div className={`rounded-xl p-4 border ${
          duration < 0 ? "bg-red-50 border-red-200"
          : duration < 30 ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              duration < 0 ? "bg-red-100 text-red-600"
              : duration < 30 ? "bg-amber-100 text-amber-600"
              : "bg-blue-100 text-blue-600"
            }`}>
              <CalendarClock size={18} />
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${
                duration < 0 ? "text-red-700"
                : duration < 30 ? "text-amber-700"
                : "text-blue-700"
              }`}>
                {duration < 0 ? "TANGGAL TIDAK VALID" : "Masa Berlaku SKBDN"}
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {duration < 0 ? "Expired sebelum tanggal terbit" : `${duration} hari`}
              </p>
            </div>
          </div>
        </div>
      )}

      <Field label="Catatan untuk Sales / Keuangan" hint="Opsional · dilihat saat verifikasi">
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows={3}
          placeholder="mis: Mohon diproses segera, dibutuhkan sebelum akhir bulan..."
          className={`${inputClass(false)} resize-none`}
        />
      </Field>
    </div>
  );
}

// ─── STEP 4: Review ────────────────────────────────────────────────────────
function StepReview({ form, file }: { form: UploadFormState; file: globalThis.File | null }) {
  const total = (parseFloat(form.tonnage) || 0) * (parseFloat(form.price_per_ton) || 0);
  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3">
        <CheckCircle2 size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-800 leading-relaxed">
          Periksa kembali data SKBDN sebelum mengirim. Setelah dikirim, data akan diteruskan ke Sales AP2 untuk diverifikasi.
        </p>
      </div>

      {/* Card preview */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor SKBDN</p>
            <p className="text-base font-bold text-gray-900 font-mono mt-0.5 truncate">{form.skbdn_number || "—"}</p>
            <p className="text-xs text-gray-500 mt-1">{form.title}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-base font-bold text-emerald-600 mt-0.5">{formatRupiah(total)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          {(
            [
              ["Kontrak",       form.contract_number,       true],
              ["Bank",          form.issuing_bank,          false],
              ["Jenis Barang",  form.goods_type,            false],
              ["Negara Asal",   form.country_of_origin,     false],
              ["Tonase",        form.tonnage ? `${formatNumber(parseFloat(form.tonnage))} Ton` : null, false],
              ["Harga/Ton",     form.price_per_ton ? formatRupiah(parseFloat(form.price_per_ton)) : null, false],
              ["Date of Issue", form.date_of_issue,         false],
              ["Expired Date",  form.expired_date,          false],
            ] as [string, string | null, boolean][]
          ).map(([label, value, mono]) => (
            <div key={label}>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
              <p className={`text-gray-700 font-medium mt-0.5 ${mono ? "font-mono" : ""} truncate`}>
                {value || <span className="text-gray-300 italic">—</span>}
              </p>
            </div>
          ))}
        </div>

        {file && (
          <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
            <div className="w-8 h-8 bg-red-50 rounded-lg border border-red-100 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────
const STEPS = [
  { key: "file",      label: "File & Dasar",   shortLabel: "File"     },
  { key: "skbdn",     label: "Detail SKBDN",   shortLabel: "Detail"   },
  { key: "validity",  label: "Validitas",      shortLabel: "Validitas"},
  { key: "review",    label: "Review & Kirim", shortLabel: "Review"   },
];

const EMPTY_FORM: UploadFormState = {
  title: "", doc_type: "draft", description: "", notes: "",
  skbdn_number: "", contract_number: "", issuing_bank: "",
  goods_type: "", tonnage: "", price_per_ton: "",
  country_of_origin: "Indonesia",
  date_of_issue: "", expired_date: "",
};

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reuploadDocId?: string | null;
  initialData?: Document | null;
}

export default function UploadDocumentModal({ isOpen, onClose, reuploadDocId = null, initialData = null }: UploadDocumentModalProps) {
  const { mutateAsync: createDoc,   isPending: creating }   = useCreateDraft();
  const { mutateAsync: reuploadDoc, isPending: reuploading } = useReuploadDocument();
  const isPending = creating || reuploading;

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  // Prefill saat reupload
  useEffect(() => {
    if (isOpen && reuploadDocId && initialData) {
      setForm({
        title: initialData.title || "",
        doc_type: initialData.doc_type || "draft",
        description: initialData.description || "",
        notes: "",
        skbdn_number: initialData.skbdn_number || "",
        contract_number: initialData.contract_number || "",
        issuing_bank: initialData.issuing_bank || "",
        goods_type: initialData.goods_type || "",
        tonnage: initialData.tonnage?.toString() || "",
        price_per_ton: initialData.price_per_ton?.toString() || "",
        country_of_origin: initialData.country_of_origin || "Indonesia",
        date_of_issue: initialData.date_of_issue ? (initialData.date_of_issue.split("T")[0] ?? "") : "",
        expired_date:  initialData.expired_date  ? (initialData.expired_date.split("T")[0] ?? "")  : "",
      });
    }
  }, [isOpen, reuploadDocId, initialData]);

  // Reset saat modal ditutup
  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
      setForm(EMPTY_FORM);
      setFile(null);
      setErrors({});
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(prevErrors => ({ ...prevErrors, [name]: "" }));
  };

  // Validation per step
  const validateStep = (idx: number): boolean => {
    const errs: FormErrors = {};
    if (idx === 0) {
      if (!form.title.trim() || form.title.trim().length < 3) errs.title = "Judul minimal 3 karakter";
      if (!file) errs.file = "File dokumen wajib diunggah";
      else {
        const allowed = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowed.includes(file.type)) errs.file = "Tipe file harus PDF/JPG/PNG";
        if (file.size > 10 * 1024 * 1024) errs.file = "Ukuran maksimal 10 MB";
      }
    } else if (idx === 1) {
      if (!form.skbdn_number.trim())                     errs.skbdn_number     = "Nomor SKBDN wajib diisi";
      if (!form.contract_number.trim())                  errs.contract_number  = "Nomor kontrak wajib diisi";
      if (!form.issuing_bank.trim())                     errs.issuing_bank     = "Bank penerbit wajib diisi";
      if (!form.goods_type.trim())                       errs.goods_type       = "Jenis barang wajib diisi";
      if (!form.tonnage || parseFloat(form.tonnage) <= 0)         errs.tonnage      = "Tonase harus > 0";
      if (!form.price_per_ton || parseFloat(form.price_per_ton) <= 0) errs.price_per_ton = "Harga harus > 0";
      if (!form.country_of_origin.trim())                errs.country_of_origin = "Negara asal wajib diisi";
    } else if (idx === 2) {
      if (!form.date_of_issue) errs.date_of_issue = "Date of Issue wajib diisi";
      if (!form.expired_date)  errs.expired_date  = "Expired Date wajib diisi";
      if (form.date_of_issue && form.expired_date) {
        if (new Date(form.expired_date) <= new Date(form.date_of_issue)) {
          errs.expired_date = "Expired harus setelah Date of Issue";
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(stepIdx)) {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }
  };
  const handlePrev = () => setStepIdx(i => Math.max(0, i - 1));

  const handleSubmit = async () => {
    // Validate all steps once more
    for (let i = 0; i < 3; i++) {
      if (!validateStep(i)) { setStepIdx(i); return; }
    }

    // Guard eksplisit: validateStep(0) di atas sudah memastikan file terisi
    // secara runtime, tapi TypeScript tidak bisa menelusuri jaminan itu lintas
    // pemanggilan fungsi — guard ini juga jadi pengaman ganda yang sah.
    if (!file) {
      setStepIdx(0);
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", form.title.trim());
    fd.append("doc_type", form.doc_type);
    fd.append("description", form.description.trim());
    fd.append("notes", form.notes.trim());
    fd.append("skbdn_number",     form.skbdn_number.trim());
    fd.append("contract_number",  form.contract_number.trim());
    fd.append("issuing_bank",     form.issuing_bank.trim());
    fd.append("goods_type",       form.goods_type.trim());
    fd.append("tonnage",          form.tonnage);
    fd.append("price_per_ton",    form.price_per_ton);
    fd.append("country_of_origin",form.country_of_origin.trim());
    fd.append("date_of_issue",    form.date_of_issue);
    fd.append("expired_date",     form.expired_date);

    try {
      if (reuploadDocId) {
        await reuploadDoc({ id: reuploadDocId, formData: fd });
      } else {
        await createDoc(fd);
      }
      setSuccess(true);
      setTimeout(() => { onClose(); }, 1400);
    } catch {
      // error sudah ditangani di hook
    }
  };

  const fileError = errors.file;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">
              {reuploadDocId ? "Upload Versi Baru SKBDN" : "Upload SKBDN Baru"}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {reuploadDocId
                ? "Setelah revisi diminta"
                : "Surat Kredit Berdokumen Dalam Negeri · 4 langkah"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        {!success && (
          <div className="px-5 pt-4 pb-2 flex-shrink-0 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1">
              {STEPS.map((step, idx) => {
                const isActive = idx === stepIdx;
                const isDone = idx < stepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                        isActive ? "bg-blue-600 text-white border-blue-600"
                        : isDone ? "bg-green-500 text-white border-green-500"
                        : "bg-white text-gray-400 border-gray-200"
                      }`}>
                        {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>
                      <div className="min-w-0 hidden sm:block">
                        <p className={`text-xs font-semibold truncate ${isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded-full transition-all ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 sm:hidden text-center">
              Langkah {stepIdx + 1} dari {STEPS.length}: <strong>{STEPS[stepIdx]?.label}</strong>
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <p className="text-base font-bold text-gray-800">SKBDN berhasil dikirim!</p>
              <p className="text-sm text-gray-500">
                {reuploadDocId
                  ? "Versi baru menunggu verifikasi Sales AP2..."
                  : "Menunggu verifikasi dari Sales AP2..."}
              </p>
            </div>
          ) : (
            <>
              {stepIdx === 0 && <StepFile     form={form} errors={errors} onChange={handleChange} file={file} setFile={setFile} fileError={fileError} isReupload={!!reuploadDocId}/>}
              {stepIdx === 1 && <StepSKBDN    form={form} errors={errors} onChange={handleChange}/>}
              {stepIdx === 2 && <StepValidity form={form} errors={errors} onChange={handleChange}/>}
              {stepIdx === 3 && <StepReview   form={form} file={file}/>}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!success && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            {stepIdx > 0 ? (
              <button
                onClick={handlePrev}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 transition-all disabled:opacity-50"
              >
                <ChevronLeft size={15} /> Kembali
              </button>
            ) : (
              <button
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Batal
              </button>
            )}

            <div className="text-[11px] text-gray-400">
              {stepIdx + 1} / {STEPS.length}
            </div>

            {stepIdx < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm"
              >
                Lanjut <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 size={15} className="animate-spin"/> Mengirim...</>
                  : <><ArrowRight size={15}/> Kirim SKBDN</>
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
