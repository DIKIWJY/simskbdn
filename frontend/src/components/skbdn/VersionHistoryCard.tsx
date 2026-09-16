"use client";

import { useState } from "react";
import { FileText, ChevronDown, Check, AlertTriangle, Eye, RefreshCw, type LucideIcon } from "lucide-react";
import { formatDate, formatFileSize, formatRelativeTime } from "./utils";
import { documentAPI } from "@/api/document.api";
import type { DocumentVersion, DocVersionType } from "@/types";

interface VTConfigEntry {
  label: string;
  color: string;
  Icon: LucideIcon;
}

const VT_CONFIG: Partial<Record<DocVersionType, VTConfigEntry>> = {
  draft_initial:  { label: "Draft Pertama", color: "bg-blue-100 text-blue-700 border-blue-200",      Icon: FileText   },
  draft_revision: { label: "Draft Revisi",  color: "bg-orange-100 text-orange-700 border-orange-200", Icon: RefreshCw },
  final:          { label: "Final SKBDN",   color: "bg-green-100 text-green-700 border-green-200",   Icon: Check     },
  final_revision: { label: "Final Revisi",  color: "bg-amber-100 text-amber-700 border-amber-200",   Icon: RefreshCw },
};

function VersionBadge({ versionType }: { versionType?: DocVersionType | string }) {
  const cfg = VT_CONFIG[versionType as DocVersionType] ?? { label: versionType || "Draft", color: "bg-gray-100 text-gray-600 border-gray-200", Icon: FileText };
  const I = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border ${cfg.color}`}>
      <I size={9}/> {cfg.label}
    </span>
  );
}

interface VersionRowProps {
  version: DocumentVersion;
  isLatest: boolean;
  isFirst: boolean;
  expanded: boolean;
  onToggle: () => void;
  onView: (version: DocumentVersion) => void;
}

function VersionRow({ version, isLatest, isFirst, expanded, onToggle, onView }: VersionRowProps) {
  const hasRevisionContext = version.revision_reason && version.revision_reason.trim();

  return (
    <div className={`border rounded-xl transition-all ${
      isLatest
        ? "border-blue-200 bg-blue-50/30 ring-1 ring-blue-100"
        : "border-gray-200 bg-white"
    }`}>
      {/* Header */}
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50/50 rounded-xl transition-colors text-left">
        {/* Version number */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          isLatest ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600"
        }`}>
          v{version.version_number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <VersionBadge versionType={version.version_type} />
            {isLatest && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-600 text-white rounded uppercase tracking-wider">
                <Check size={8} /> AKTIF
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {version.file_name} · {formatFileSize(version.file_size)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {formatRelativeTime(version.uploaded_at)}
            {version.uploader?.name ? ` · ${version.uploader.name}` : ""}
          </p>
        </div>

        {hasRevisionContext && !expanded && (
          <span title="Ada catatan revisi">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
          </span>
        )}
        <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3.5 space-y-3 bg-white rounded-b-xl">

          {/* Catatan revisi yang diminta (kenapa Buyer upload versi ini) */}
          {hasRevisionContext && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle size={10} /> Alasan Revisi Diminta
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">{version.revision_reason}</p>
              {version.requested_by && (
                <p className="text-[10px] text-amber-600 mt-1">— {version.requested_by}</p>
              )}
            </div>
          )}

          {/* Catatan Buyer saat upload */}
          {version.upload_notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Catatan Upload</p>
              <p className="text-xs text-gray-700 leading-relaxed">{version.upload_notes}</p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-gray-400 font-medium">Tanggal Upload</p>
              <p className="text-gray-700 mt-0.5">{formatDate(version.uploaded_at, { withTime: true })}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Tipe File</p>
              <p className="text-gray-700 font-mono mt-0.5">
                {(version.mime_type || "").split("/")[1]?.toUpperCase() || "—"}
              </p>
            </div>
          </div>

          <button onClick={() => onView(version)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
            <Eye size={13} /> Lihat / Download Versi {version.version_number}
          </button>
        </div>
      )}
    </div>
  );
}

interface VersionHistoryCardProps {
  docId: string;
  versions?: DocumentVersion[];
  loading?: boolean;
  className?: string;
}

export default function VersionHistoryCard({ docId, versions = [], loading, className = "" }: VersionHistoryCardProps) {
  const [expandedIdx, setExpandedIdx] = useState(0);

  const handleView = async (version: DocumentVersion) => {
    try {
      const res = await documentAPI.getVersionURL(docId, version.version_number);
      const url = res.data?.data?.url;
      if (url) window.open(url, "_blank", "noopener");
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
        <div className="space-y-2 animate-pulse">
          {[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}
        </div>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 text-center ${className}`}>
        <FileText size={28} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Belum ada versi file</p>
      </div>
    );
  }

  const draftCount = versions.filter(v => ["draft_initial","draft_revision"].includes(v.version_type)).length;
  const finalCount = versions.filter(v => ["final","final_revision"].includes(v.version_type)).length;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Riwayat Versi File</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {versions.length} versi · {draftCount} draft{finalCount > 0 ? ` · ${finalCount} final` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          {draftCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-full">
              {draftCount} Draft
            </span>
          )}
          {finalCount > 0 && (
            <span className="text-[10px] font-bold bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full">
              {finalCount} Final
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {versions.map((v, idx) => (
          <VersionRow
            key={v.id || idx}
            version={v}
            isLatest={idx === 0}
            isFirst={idx === versions.length - 1}
            expanded={expandedIdx === idx}
            onToggle={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            onView={handleView}
          />
        ))}
      </div>

      {versions.length > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Semua versi tersimpan untuk keperluan <strong>audit trail</strong>.
            File lama tetap bisa diakses kapanpun.
          </p>
        </div>
      )}
    </div>
  );
}
