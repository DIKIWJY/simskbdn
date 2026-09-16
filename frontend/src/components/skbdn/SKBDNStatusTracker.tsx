import { Check, Clock, Circle, AlertTriangle } from "lucide-react";
import type { DocumentStatus } from "@/types";

interface FlowStep {
  id: string;
  label: string;
  sub: string;
  statuses: string[];
}

type StepState = "done" | "active" | "attention" | "pending" | "error";

/**
 * SKBDN Flow Steps — urutan alur berdasarkan business process
 *
 * BUG SEBELUMNYA:
 * - draft_revision_buyer salah diletakkan di step 2 (finance_draft) → seharusnya step 1 (ap2_verify)
 *   karena ketika AP2/Finance mengembalikan draft, buyer harus upload ulang dan proses dimulai dari AP2 lagi
 * - draft_approved salah di step 2 → seharusnya step 3 (final) karena Finance sudah setujui draft,
 *   buyer sekarang perlu upload Final
 * - Step terakhir diganti dari "Approved" → "Verified" sesuai permintaan
 */
const FLOW: FlowStep[] = [
  {
    id:       "submit",
    label:    "Draft Dikirim",
    sub:      "Buyer mengirim draft SKBDN",
    statuses: ["draft_submitted"],
  },
  {
    id:       "ap2_verify",
    label:    "Verifikasi AP2",
    sub:      "AP2 memverifikasi kelengkapan draft",
    // draft_submitted: dokumen baru masuk ke AP2, sedang menunggu
    // draft_revision_buyer: AP2/Finance kembalikan draft ke Buyer
    statuses: ["draft_revision_buyer"],
  },
  {
    id:       "finance_draft",
    label:    "Review Keuangan",
    sub:      "Keuangan mereview dan menyetujui draft",
    statuses: ["draft_under_review"],
  },
  {
    id:       "final",
    label:    "Upload Final",
    sub:      "Buyer mengupload Final SKBDN",
    statuses: ["draft_approved", "final_submitted", "final_under_review", "revision_requested"],
  },
  {
    id:       "verified",
    label:    "Verified",
    sub:      "SKBDN telah diverifikasi dan disetujui.",
    statuses: ["approved", "disbursed"],
  },
];

/**
 * Tentukan index step saat ini berdasarkan status.
 * -1 berarti status terminal (rejected / expired).
 */
function getStepIndex(status?: string | null): number {
  if (!status) return 0;
  if (["rejected", "expired"].includes(status)) return -1;
  // draft_submitted = dokumen masuk ke AP2, tampilkan step AP2 (index 1) sebagai "active"
  if (status === "draft_submitted") return 1;
  for (let i = FLOW.length - 1; i >= 0; i--) {
    if (FLOW[i]?.statuses.includes(status)) return i;
  }
  return 0;
}

/**
 * Tentukan state visual setiap step.
 * "attention" = butuh tindakan, ditandai dengan ikon jam/segitiga.
 */
function getStepState(stepIdx: number, currentIdx: number, status?: string | null): StepState {
  if (currentIdx === -1) return "error";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) {
    // FIXED: tambahkan draft_approved sebagai attention di step 3 (Upload Final)
    // agar buyer tahu mereka perlu upload final sekarang
    const needsAction = [
      "draft_revision_buyer",  // dikembalikan AP2/Finance → buyer upload ulang
      "draft_approved",         // Finance setujui draft → buyer upload final
      "revision_requested",     // Finance minta revisi final → buyer perbaiki
    ];
    if (status && needsAction.includes(status)) return "attention";
    return "active";
  }
  return "pending";
}

/** Label kontekstual di bawah step saat "attention" */
function getAttentionLabel(status?: string | null): string {
  switch (status) {
    case "draft_revision_buyer": return "⚠️ Draft dikembalikan — upload ulang yang sudah diperbaiki";
    case "draft_approved":       return "✅ Draft disetujui — silakan upload Final SKBDN dari bank";
    case "revision_requested":   return "⚠️ Final perlu direvisi — upload ulang sesuai catatan";
    default:                     return "Perlu tindakan";
  }
}

interface SKBDNStatusTrackerProps {
  status?: DocumentStatus | string | null;
}

export default function SKBDNStatusTracker({ status }: SKBDNStatusTrackerProps) {
  if (!status) return null;

  const currentIdx = getStepIndex(status);
  const isError    = currentIdx === -1;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold text-gray-900">Progress Dokumen</p>
        {isError && (
          <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
            {status === "rejected" ? "Ditolak" : "Kadaluarsa"}
          </span>
        )}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="sm:hidden space-y-0">
        {FLOW.map((step, i) => {
          const state = getStepState(i, currentIdx, status);
          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepDot state={state} size="sm" />
                {i < FLOW.length - 1 && (
                  <div
                    className={`w-0.5 h-8 mt-1 ${
                      state === "done" ? "bg-blue-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <div className="pb-6 pt-0.5 min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    state === "done"      ? "text-blue-600"
                  : state === "active"   ? "text-gray-900"
                  : state === "attention"? "text-amber-700"
                  : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{step.sub}</p>
                {state === "attention" && (
                  <p className="text-[11px] font-semibold text-amber-600 mt-1">
                    {getAttentionLabel(status)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-start gap-0">
        {FLOW.map((step, i) => {
          const state  = getStepState(i, currentIdx, status);
          const isLast = i === FLOW.length - 1;
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center min-w-0">
              {/* Connector row */}
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      getStepState(i - 1, currentIdx, status) === "done" || state !== "pending"
                        ? "bg-blue-400"
                        : "bg-gray-200"
                    }`}
                  />
                )}
                <StepDot state={state} />
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 ${
                      state === "done" ? "bg-blue-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Label bawah */}
              <div className="mt-2.5 text-center px-1">
                <p
                  className={`text-xs font-semibold leading-tight ${
                    state === "done"       ? "text-blue-600"
                  : state === "active"    ? "text-gray-900"
                  : state === "attention" ? "text-amber-700"
                  : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{step.sub}</p>

                {state === "active" && (
                  <span className="inline-block mt-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wide">
                    Saat ini
                  </span>
                )}
                {state === "attention" && (
                  <span className="inline-block mt-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100 uppercase tracking-wide">
                    Perlu Aksi
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error state banner */}
      {isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-700 text-center">
            Dokumen ini{" "}
            <strong>{status === "rejected" ? "ditolak" : "telah kadaluarsa"}</strong>
            {" "}— proses tidak dapat dilanjutkan.
          </p>
        </div>
      )}
    </div>
  );
}

/** Dot indicator per step */
function StepDot({ state, size = "md" }: { state: StepState; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7" : "w-8 h-8";

  if (state === "done") return (
    <div className={`${sz} rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0`}>
      <Check size={size === "sm" ? 13 : 14} className="text-white" strokeWidth={2.5} />
    </div>
  );

  if (state === "active") return (
    <div className={`${sz} rounded-full bg-white border-2 border-blue-500 flex items-center justify-center flex-shrink-0`}>
      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
    </div>
  );

  if (state === "attention") return (
    <div className={`${sz} rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center flex-shrink-0`}>
      <AlertTriangle size={size === "sm" ? 12 : 13} className="text-amber-500" />
    </div>
  );

  if (state === "error") return (
    <div className={`${sz} rounded-full bg-red-50 border-2 border-red-300 flex items-center justify-center flex-shrink-0`} />
  );

  // pending
  return (
    <div className={`${sz} rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0`}>
      <Circle size={size === "sm" ? 8 : 10} className="text-gray-300" fill="currentColor" />
    </div>
  );
}