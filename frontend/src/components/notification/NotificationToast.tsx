"use client";

import { Bell, FileText, Eye, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import { useWSEvent } from "@/hooks/useWebSocket";
import { useNotificationStore } from "@/store/notification.store";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { ApiNotification, WSEventName } from "@/types";

interface EventConfigEntry {
  Icon: LucideIcon;
  color: string;
  bg: string;
}

const EVENT_CONFIG: Partial<Record<WSEventName, EventConfigEntry>> = {
  document_submitted:            { Icon: FileText,     color: "text-blue-500",   bg: "bg-blue-50"   },
  document_received:             { Icon: FileText,     color: "text-blue-500",   bg: "bg-blue-50"   },
  document_under_review:         { Icon: Eye,          color: "text-amber-500",  bg: "bg-amber-50"  },
  document_revision_requested:   { Icon: AlertTriangle,color: "text-orange-500", bg: "bg-orange-50" },
  document_approved:             { Icon: CheckCircle2, color: "text-green-500",  bg: "bg-green-50"  },
};

export default function NotificationToast() {
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s: { addNotification: (n: ApiNotification) => void }) => s.addNotification);

  // PERBAIKAN BUG: sebelumnya kode mengakses `data.event` untuk menentukan
  // ikon/warna toast — tapi payload WebSocket dari backend (lihat
  // pkg/websocket/hub.go NotificationPayload) TIDAK PERNAH menyertakan field
  // "event" di dalam payload itu sendiri (nama event ada di ENVELOPE luar,
  // bukan di payload). Akibatnya `EVENT_CONFIG[data.event]` selalu undefined
  // dan toast SELALU menampilkan ikon lonceng generik, tidak pernah ikon
  // spesifik per jenis event. Diperbaiki dengan meneruskan nama event secara
  // eksplisit dari tiap pemanggilan useWSEvent di bawah.
  const handleWSEvent = (eventName: WSEventName, data: ApiNotification) => {
    if (!data) return;
    addNotification(data);

    // Invalidate document list queries for all roles
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["finance-documents"] });
    qc.invalidateQueries({ queryKey: ["document-stats"] });
    qc.invalidateQueries({ queryKey: ["finance-stats"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });

    // If event includes a specific document_id, also refresh that document's detail/history/versions
    const docId = data.document_id;
    if (docId) {
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-versions", docId] });
      qc.invalidateQueries({ queryKey: ["document-history", docId] });
      qc.invalidateQueries({ queryKey: ["finance-document", docId] });
      qc.invalidateQueries({ queryKey: ["finance-doc-versions", docId] });
      qc.invalidateQueries({ queryKey: ["finance-doc-history", docId] });
    }

    const cfg = EVENT_CONFIG[eventName] ?? { Icon: Bell, color: "text-blue-500", bg: "bg-blue-50" };
    const { Icon } = cfg;

    toast(
      () => (
        <div className="flex items-start gap-3 max-w-xs">
          <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={15} className={cfg.color}/>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{data.title || "Notifikasi baru"}</p>
            {data.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{data.message}</p>}
          </div>
        </div>
      ),
      { duration: 4500 }
    );
  };

  useWSEvent<ApiNotification>("document_submitted",          (d) => handleWSEvent("document_submitted", d));
  useWSEvent<ApiNotification>("document_received",           (d) => handleWSEvent("document_received", d));
  useWSEvent<ApiNotification>("document_under_review",       (d) => handleWSEvent("document_under_review", d));
  useWSEvent<ApiNotification>("document_revision_requested", (d) => handleWSEvent("document_revision_requested", d));
  useWSEvent<ApiNotification>("document_approved",           (d) => handleWSEvent("document_approved", d));

  return null;
}
