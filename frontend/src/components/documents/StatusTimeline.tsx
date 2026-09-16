import { CheckCircle2, AlertCircle, Send, Eye, XCircle, RotateCcw, FileCheck, Banknote, Clock, Shield, type LucideIcon } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import { formatDate } from "../skbdn/utils";
import type { DocumentHistoryEntry, DocumentStatus } from "@/types";

interface StatusIconEntry {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const STATUS_ICON: Partial<Record<DocumentStatus, StatusIconEntry>> = {
  draft_submitted:      { icon: Send,         color: "text-blue-500",    bg: "bg-blue-50" },
  draft_under_review:   { icon: Eye,          color: "text-amber-500",   bg: "bg-amber-50" },
  draft_revision_buyer: { icon: RotateCcw,    color: "text-orange-500",  bg: "bg-orange-50" },
  draft_approved:       { icon: CheckCircle2, color: "text-teal-500",    bg: "bg-teal-50" },
  final_submitted:      { icon: FileCheck,    color: "text-purple-500",  bg: "bg-purple-50" },
  final_under_review:   { icon: Eye,          color: "text-indigo-500",  bg: "bg-indigo-50" },
  revision_requested:   { icon: AlertCircle,  color: "text-red-500",     bg: "bg-red-50" },
  approved:             { icon: CheckCircle2, color: "text-green-500",   bg: "bg-green-50" },
  rejected:             { icon: XCircle,      color: "text-red-600",     bg: "bg-red-100" },
  expired:              { icon: Clock,        color: "text-gray-500",    bg: "bg-gray-100" },
  disbursed:            { icon: Banknote,     color: "text-emerald-500", bg: "bg-emerald-50" },
  // Legacy
  submitted:             { icon: Send,         color: "text-blue-500",   bg: "bg-blue-50" },
  draft_verified_ap2:    { icon: Shield,       color: "text-teal-500",   bg: "bg-teal-50" },
  final_sent_to_finance: { icon: Send,         color: "text-purple-500", bg: "bg-purple-50" },
  under_review:          { icon: Eye,          color: "text-amber-500",  bg: "bg-amber-50" },
  received_sales:        { icon: CheckCircle2, color: "text-teal-500",   bg: "bg-teal-50" },
};

interface StatusTimelineProps {
  history?: DocumentHistoryEntry[];
}

export default function StatusTimeline({ history = [] }: StatusTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Belum ada riwayat status
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {[...history].reverse().map((h, i) => {
        const cfg = STATUS_ICON[h.to_status] || { icon: Send, color: "text-gray-400", bg: "bg-gray-100" };
        const Icon = cfg.icon;
        const isFirst = i === 0;

        return (
          <div key={h.id || i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} ${isFirst ? "ring-2 ring-offset-1 ring-blue-300" : ""}`}>
                <Icon size={13} className={cfg.color}/>
              </div>
              {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1"/>}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={h.to_status}/>
                {(h.version_ref ?? 0) > 0 && (
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{h.version_ref}</span>
                )}
              </div>
              {h.notes && (
                <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">{h.notes}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {h.actor?.name || "Sistem"} · {formatDate(h.created_at, { withTime: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
