"use client";
// Padanan dari pages/admin/UploadForBuyer.jsx — dipakai bersama oleh
// /admin/upload-buyer DAN /ap2/upload-buyer (lihat AppRoutes.jsx lama:
// keduanya me-lazy-import file yang sama persis).

import { useState, useEffect, type ChangeEvent, type ReactNode } from "react";
import {
  Search, Loader2, Upload, CheckCircle2,
  User, Building2, Mail, ArrowRight, FileText,
  Hash, Banknote, Package, Scale, Globe, Calendar,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { formatRupiah } from "@/components/skbdn/utils";
import api from "@/api/axios";
import toast from "react-hot-toast";
import axios from "axios";
import type { ApiResponse } from "@/types";

/** Bentuk item buyer dari GET /buyers — lihat document_handler.go GetBuyerList
 * (BuyerItem struct: id, name, email, company_name — array polos). */
interface BuyerItem {
  id: string;
  name: string;
  email: string;
  company_name: string;
}

interface UploadFormState {
  title: string;
  skbdn_number: string;
  contract_number: string;
  issuing_bank: string;
  goods_type: string;
  tonnage: string;
  price_per_ton: string;
  country_of_origin: string;
  date_of_issue: string;
  expired_date: string;
  notes: string;
}

const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-all";

const EMPTY: UploadFormState = {
  title:"", skbdn_number:"", contract_number:"", issuing_bank:"",
  goods_type:"", tonnage:"", price_per_ton:"",
  country_of_origin:"Indonesia", date_of_issue:"", expired_date:"", notes:"",
};

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function getErrMsg(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}

export default function UploadForBuyerView() {
  const [buyers, setBuyers]     = useState<BuyerItem[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [buyerQ, setBuyerQ]     = useState("");
  const [buyer, setBuyer]       = useState<BuyerItem | null>(null);
  const [file, setFile]         = useState<globalThis.File | null>(null);
  const [form, setForm]         = useState<UploadFormState>(EMPTY);
  const [success, setSuccess]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<BuyerItem[]>>("/buyers")
      .then(r => setBuyers(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingB(false));
  }, []);

  const fc = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const total = (parseFloat(form.tonnage)||0) * (parseFloat(form.price_per_ton)||0);
  const filtered = buyers.filter(b =>
    (b.name + b.company_name + b.email).toLowerCase().includes(buyerQ.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!buyer) { toast.error("Pilih buyer dulu"); return; }
    if (!file) { toast.error("File diperlukan"); return; }
    if (!form.title.trim()) { toast.error("Judul harus diisi"); return; }
    const fd = new FormData();
    fd.append("file", file); fd.append("doc_type", "draft");
    Object.entries(form).forEach(([k,v]) => { if(v) fd.append(k,v); });
    setSubmitting(true);
    try {
      await api.post(`/documents/for-buyer/${buyer.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(`Draft SKBDN berhasil dibuat atas nama ${buyer.name}!`);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setBuyer(null); setForm(EMPTY); setFile(null); }, 3000);
    } catch(e) { toast.error(getErrMsg(e, "Gagal membuat dokumen")); }
    setSubmitting(false);
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload SKBDN untuk Buyer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload Draft SKBDN atas nama akun Buyer yang dipilih</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-500"/>
          <p className="text-sm font-semibold text-green-800">Draft SKBDN berhasil dibuat atas nama {buyer?.name}!</p>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5 items-start">
        {/* ── Kolom kiri: Pilih Buyer ─────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">1. Pilih Buyer</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{buyers.length} buyer terdaftar</p>
            </div>
            <button onClick={() => { setLoadingB(true); api.get<ApiResponse<BuyerItem[]>>("/buyers").then(r => setBuyers(r.data?.data||[])).finally(()=>setLoadingB(false)); }}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
              <RefreshCw size={13}/>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={buyerQ} onChange={e => setBuyerQ(e.target.value)}
                placeholder="Cari nama, perusahaan, email..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50/50 transition-all"/>
            </div>
          </div>

          {/* Buyer list */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: 200 }}>
            {loadingB ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-gray-300"/>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center px-4">
                <User size={28} className="text-gray-200 mb-2"/>
                <p className="text-sm text-gray-400">Tidak ada buyer ditemukan</p>
              </div>
            ) : filtered.map(b => (
              <button key={b.id} onClick={() => setBuyer(b)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-gray-50 last:border-0 ${
                  buyer?.id === b.id
                    ? "bg-blue-50 border-l-2 border-l-blue-500"
                    : "hover:bg-gray-50"
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  buyer?.id === b.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {b.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${buyer?.id === b.id ? "text-blue-700" : "text-gray-800"}`}>
                    {b.name}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{b.company_name}</p>
                </div>
                {buyer?.id === b.id && <ChevronRight size={14} className="text-blue-500 flex-shrink-0"/>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Kolom kanan: Form detail atau placeholder ───────────────── */}
        <div className="lg:col-span-3">
          {!buyer ? (
            /* Placeholder saat belum pilih buyer */
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-20 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <User size={26} className="text-blue-400"/>
              </div>
              <p className="text-sm font-semibold text-gray-700">Belum ada buyer dipilih</p>
              <p className="text-xs text-gray-400 mt-1.5 max-w-xs">
                Pilih buyer dari daftar di sebelah kiri untuk mulai mengisi detail SKBDN
              </p>
              <div className="flex items-center gap-2 mt-5 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 font-medium">
                <ArrowRight size={13}/> Pilih buyer terlebih dahulu
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Buyer terpilih */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {buyer.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{buyer.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-white/70 text-[11px]">
                    <span className="flex items-center gap-1"><Building2 size={10}/>{buyer.company_name}</span>
                    <span className="flex items-center gap-1"><Mail size={10}/>{buyer.email}</span>
                  </div>
                </div>
                <button onClick={() => setBuyer(null)}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-all">
                  Ganti
                </button>
              </div>

              {/* Form SKBDN */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">2. Detail SKBDN</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Isi data dokumen SKBDN yang akan dikirim atas nama buyer</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Judul */}
                  <div>
                    <FieldLabel required>Judul Dokumen</FieldLabel>
                    <input name="title" value={form.title} onChange={fc}
                      placeholder="SKBDN Urea Granul 500 Ton Q2-2026" className={inp}/>
                  </div>

                  {/* SKBDN + Kontrak */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Nomor SKBDN</FieldLabel>
                      <input name="skbdn_number" value={form.skbdn_number} onChange={fc}
                        placeholder="SKBDN-2026-0001" className={inp}/>
                    </div>
                    <div>
                      <FieldLabel>Nomor Kontrak</FieldLabel>
                      <input name="contract_number" value={form.contract_number} onChange={fc}
                        placeholder="KTR-2026-001" className={inp}/>
                    </div>
                  </div>

                  {/* Bank + Barang */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Bank Penerbit</FieldLabel>
                      <input name="issuing_bank" value={form.issuing_bank} onChange={fc}
                        placeholder="Bank Mandiri" className={inp}/>
                    </div>
                    <div>
                      <FieldLabel>Jenis Barang</FieldLabel>
                      <input name="goods_type" value={form.goods_type} onChange={fc}
                        placeholder="Urea Granul 46%" className={inp}/>
                    </div>
                  </div>

                  {/* Tonase + Harga */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Tonase (Ton)</FieldLabel>
                      <input name="tonnage" type="number" value={form.tonnage} onChange={fc}
                        placeholder="500" className={inp}/>
                    </div>
                    <div>
                      <FieldLabel>Harga per Ton (Rp)</FieldLabel>
                      <input name="price_per_ton" type="number" value={form.price_per_ton} onChange={fc}
                        placeholder="4500000" className={inp}/>
                    </div>
                  </div>

                  {/* Total nilai */}
                  {total > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                        <Banknote size={14}/> Total Nilai SKBDN
                      </span>
                      <span className="text-sm font-extrabold text-emerald-700">{formatRupiah(total)}</span>
                    </div>
                  )}

                  {/* Negara + Tanggal */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Negara Asal</FieldLabel>
                      <input name="country_of_origin" value={form.country_of_origin} onChange={fc} className={inp}/>
                    </div>
                    <div>
                      <FieldLabel>Date of Issue</FieldLabel>
                      <input name="date_of_issue" type="date" value={form.date_of_issue} onChange={fc} className={inp}/>
                    </div>
                    <div>
                      <FieldLabel>Expired Date</FieldLabel>
                      <input name="expired_date" type="date" value={form.expired_date} onChange={fc} className={inp}/>
                    </div>
                  </div>

                  {/* Upload file */}
                  <div>
                    <FieldLabel required>File Draft SKBDN (PDF/JPG/PNG)</FieldLabel>
                    {file ? (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <FileText size={16} className="text-blue-500 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-blue-400">{(file.size/1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => setFile(null)} className="text-[11px] text-red-500 hover:underline">Hapus</button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 p-4 bg-gray-50 border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl cursor-pointer transition-all">
                        <Upload size={18} className="text-gray-400"/>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Klik untuk upload file</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">PDF, JPG, PNG — maks 10 MB</p>
                        </div>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => setFile(e.target.files?.[0] || null)}/>
                      </label>
                    )}
                  </div>

                  {/* Catatan */}
                  <div>
                    <FieldLabel>Catatan (opsional)</FieldLabel>
                    <textarea name="notes" value={form.notes} onChange={fc} rows={2}
                      placeholder="Catatan tambahan untuk buyer atau tim Keuangan..."
                      className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-400 resize-none bg-white transition-all"/>
                  </div>

                  {/* Submit */}
                  <button onClick={handleSubmit}
                    disabled={submitting || !file || !form.title.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all shadow-sm mt-2">
                    {submitting ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>}
                    {submitting ? "Mengirim..." : `Buat Draft SKBDN atas nama ${buyer.name}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
