"use client";

import { useRouter } from "next/navigation";
import { FileText, Building2, Clock, Eye, ChevronRight } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import { useUpdateFinanceStatus } from "@/hooks/useFinance";
import type { Document, DocumentType } from "@/types";

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (d < 60)    return "Baru saja";
  if (d < 3600)  return `${Math.floor(d / 60)} menit lalu`;
  if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
  return `${Math.floor(d / 86400)} hari lalu`;
}

const TYPE_STYLE: Partial<Record<DocumentType, string>> = {
  draft: "bg-orange-50 text-orange-600 border-orange-200",
  final: "bg-purple-50 text-purple-600 border-purple-200",
};

interface ReviewDocumentCardProps {
  doc: Document;
  onReview: (doc: Document) => void;
}

export default function ReviewDocumentCard({ doc, onReview }: ReviewDocumentCardProps) {
  const router = useRouter();
  const { mutate: updateStatus, isPending } = useUpdateFinanceStatus();

  const canAnnotate = ["under_review", "revision_requested"].includes(doc.status);
  const isReceived  = doc.status === "final_sent_to_finance";

  const handleStartReview = () => {
    if (isReceived) {
      // Ubah status ke under_review dulu, lalu buka annotator
      updateStatus(
        { id: doc.id, status: "under_review", notes: "Mulai direview oleh keuangan" },
        { onSuccess: () => router.push(`/finance/documents/${doc.id}/annotate`) }
      );
    } else if (canAnnotate) {
      router.push(`/finance/documents/${doc.id}/annotate`);
    } else {
      onReview(doc);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Top stripe berdasar status */}
      <div className={`h-1 w-full ${
        doc.status === "approved"          ? "bg-green-500" :
        doc.status === "revision_requested"? "bg-red-400" :
        doc.status === "under_review"      ? "bg-blue-500" : "bg-amber-400"
      }`}/>

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-red-400"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate leading-snug">{doc.title}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 size={11} className="text-gray-400 flex-shrink-0"/>
              <p className="text-xs text-gray-400 truncate">{doc.buyer?.company_name || doc.buyer?.name || "Buyer"}</p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <StatusBadge status={doc.status}/>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${TYPE_STYLE[doc.doc_type] || "bg-gray-50 text-gray-500 border-gray-200"}`}>{doc.doc_type}</span>
          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">v{doc.current_version}</span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4 mt-auto">
          <Clock size={11}/>
          <span>Diterima {formatRelativeTime(doc.updated_at)}</span>
        </div>

        {/* Action button */}
        <button
          onClick={handleStartReview}
          disabled={isPending}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isPending
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : canAnnotate || isReceived
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
          }`}
        >
          {isPending ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Memproses...</>
          ) : canAnnotate ? (
            <><Eye size={15}/>Buka & Anotasi</>
          ) : isReceived ? (
            <><Eye size={15}/>Mulai Review</>
          ) : (
            <><ChevronRight size={15}/>Lihat Detail</>
          )}
        </button>
      </div>
    </div>
  );
}
