import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { documentAPI } from "@/api/document.api";
import type {
  Document,
  DocumentDetailResponse,
  DocumentHistoryEntry,
  DocumentVersion,
  DocumentStats,
  DocumentStatus,
  PaginatedResponse,
} from "@/types";
import type { GetDocumentsParams, UpdateStatusPayload } from "@/api/document.api";
import toast from "react-hot-toast";
import axios from "axios";

const STATUS_MESSAGES: Partial<Record<DocumentStatus, string>> = {
  draft_under_review:   "Draft diteruskan ke Keuangan",
  draft_approved:       "Draft SKBDN disetujui! Buyer akan dinotifikasi untuk upload Final.",
  draft_revision_buyer: "Draft dikembalikan ke Buyer",
  final_under_review:   "Final SKBDN mulai direview",
  approved:             "Final SKBDN disetujui",
  revision_requested:   "Permintaan revisi dikirim ke Buyer",
  rejected:             "SKBDN ditolak",
};

const KEYS = {
  documents: (p: GetDocumentsParams) => ["finance-documents", p] as const,
  stats:     ()                       => ["finance-stats"]        as const,
  detail:    (id: string)             => ["finance-document", id] as const,
  versions:  (id: string)             => ["finance-doc-versions", id] as const,
  history:   (id: string)             => ["finance-doc-history", id]  as const,
};

function inv(qc: ReturnType<typeof useQueryClient>, id?: string): void {
  void qc.invalidateQueries({ queryKey: ["finance-documents"] });
  void qc.invalidateQueries({ queryKey: ["finance-stats"] });
  void qc.invalidateQueries({ queryKey: ["documents"] });
  void qc.invalidateQueries({ queryKey: ["document-stats"] });
  if (id) {
    void qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    void qc.invalidateQueries({ queryKey: KEYS.versions(id) });
    void qc.invalidateQueries({ queryKey: KEYS.history(id) });
    void qc.invalidateQueries({ queryKey: ["document", id] });
  }
}

export function useFinanceDocuments(
  p: GetDocumentsParams = {},
): UseQueryResult<PaginatedResponse<Document>> {
  return useQuery({
    queryKey: KEYS.documents(p),
    queryFn:  () => documentAPI.getAll(p).then((r) => r.data.data!),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useFinanceStats(): UseQueryResult<DocumentStats> {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn:  () => documentAPI.getStats().then((r) => r.data.data!),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useFinanceDocument(id: string): UseQueryResult<DocumentDetailResponse> {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => documentAPI.getById(id).then((r) => r.data.data!),
    enabled: !!id,
  });
}

export function useFinanceDocumentVersions(id: string): UseQueryResult<DocumentVersion[]> {
  return useQuery({
    queryKey: KEYS.versions(id),
    queryFn:  () => documentAPI.getVersions(id).then((r) => r.data.data!),
    enabled: !!id,
  });
}

export function useFinanceDocumentHistory(id: string): UseQueryResult<DocumentHistoryEntry[]> {
  return useQuery({
    queryKey: KEYS.history(id),
    queryFn:  () => documentAPI.getHistory(id).then((r) => r.data.data!),
    enabled: !!id,
  });
}

export function useUpdateFinanceStatus(): UseMutationResult<
  unknown,
  Error,
  { id: string; status: DocumentStatus; notes?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: DocumentStatus; notes?: string }) =>
      documentAPI.updateStatusFinance(id, { status, notes }),
    onSuccess: (_, v) => {
      inv(qc, v.id);
      toast.success(STATUS_MESSAGES[v.status] ?? "Status diperbarui!");
    },
    onError: (e) => {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: string } | undefined)?.error
        : undefined;
      toast.error(msg ?? "Gagal mengubah status");
    },
  });
}
