import {
  Hash, FileBadge, Building2, Package, Scale, DollarSign,
  Globe, Calendar, CalendarClock, Banknote, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatRupiah, formatNumber, formatDate } from "./utils";
import type { Document } from "@/types";

interface FieldProps {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  mono?: boolean;
  accent?: boolean;
  span?: 1 | 2;
}

function Field({ icon: Icon, label, value, mono = false, accent = false, span = 1 }: FieldProps) {
  const span2 = span === 2 ? "sm:col-span-2" : "";
  return (
    <div className={`flex items-start gap-3 ${span2}`}>
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`mt-0.5 text-sm ${accent ? "font-bold text-gray-900" : "font-medium text-gray-700"} ${mono ? "font-mono" : ""} break-words`}>
          {value || <span className="text-gray-300 font-normal italic">Belum diisi</span>}
        </p>
      </div>
    </div>
  );
}

interface SKBDNInfoCardProps {
  doc: Document | null | undefined;
  className?: string;
}

export default function SKBDNInfoCard({ doc, className = "" }: SKBDNInfoCardProps) {
  if (!doc) return null;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nomor SKBDN</p>
            <p className="text-lg font-bold text-gray-900 font-mono mt-0.5 truncate">
              {doc.skbdn_number || "—"}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Nilai</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">
              {formatRupiah(doc.total_price)}
            </p>
          </div>
        </div>
      </div>

      {/* Body — 3 sections */}
      <div className="p-5 space-y-6">

        {/* Section 1: Informasi SKBDN */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-3.5 bg-blue-500 rounded-full" />
            Informasi SKBDN
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={FileBadge} label="Nomor Kontrak"     value={doc.contract_number} mono />
            <Field icon={Banknote}  label="Bank Penerbit"     value={doc.issuing_bank} />
            <Field icon={Globe}     label="Negara Asal"       value={doc.country_of_origin} />
            <Field icon={Hash}      label="Versi Saat Ini"    value={`v${doc.current_version || 1}`} mono />
          </div>
        </div>

        {/* Section 2: Barang & Nilai */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-3.5 bg-emerald-500 rounded-full" />
            Barang & Nilai
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={Package}     label="Jenis Barang"     value={doc.goods_type} span={2} />
            <Field icon={Scale}       label="Tonase"           value={doc.tonnage ? `${formatNumber(doc.tonnage)} Ton` : ""} accent />
            <Field icon={DollarSign}  label="Harga per Ton"    value={doc.price_per_ton ? formatRupiah(doc.price_per_ton) : ""} />
          </div>
        </div>

        {/* Section 3: Validitas */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-3.5 bg-amber-500 rounded-full" />
            Validitas
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={Calendar}      label="Tanggal Terbit"   value={formatDate(doc.date_of_issue, { full: true })} />
            <Field icon={CalendarClock} label="Tanggal Expired"  value={formatDate(doc.expired_date, { full: true })} accent />
          </div>
        </div>

        {/* Section 4: Deskripsi */}
        {doc.description && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1 h-3.5 bg-purple-500 rounded-full" />
              Deskripsi
            </p>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
              {doc.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
