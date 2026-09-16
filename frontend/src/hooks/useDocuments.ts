import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { documentAPI, type GetDocumentsParams } from "@/api/document.api";
import type {
  Document,
  DocumentDetailResponse,
  DocumentHistoryEntry,
  DocumentVersion,
  DocumentStats,
  PaginatedResponse,
} from "@/types";
import toast from "react-hot-toast";

// ─── Query key factory ────────────────────────────────────────────────────────

const KEYS = {
  documents: (params?: GetDocumentsParams) => ["documents", params] as const,
  stats: () => ["document-stats"] as const,
  detail: (id: string) => ["document", id] as const,
  history: (id: string) => ["document-history", id] as const,
  versions: (id: string) => ["document-versions", id] as const,
};

// ─── Invalidation helper ──────────────────────────────────────────────────────

function invalidateDoc(qc: ReturnType<typeof useQueryClient>, id?: string): void {
  void qc.invalidateQueries({ queryKey: ["documents"] });
  void qc.invalidateQueries({ queryKey: ["document-stats"] });
  if (id) {
    void qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    void qc.invalidateQueries({ queryKey: KEYS.versions(id) });
    void qc.invalidateQueries({ queryKey: KEYS.history(id) });
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useDocuments(
  params: GetDocumentsParams = {},
): UseQueryResult<PaginatedResponse<Document>> {
  return useQuery({
    queryKey: KEYS.documents(params),
    queryFn: () => documentAPI.getAll(params).then((r) => r.data.data!),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useDocumentStats(): UseQueryResult<DocumentStats> {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: () => documentAPI.getStats().then((r) => r.data.data!),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useDocument(id: string): UseQueryResult<DocumentDetailResponse> {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => documentAPI.getById(id).then((r) => r.data.data!),
    enabled: !!id,
  });
}

export function useDocumentHistory(id: string): UseQueryResult<DocumentHistoryEntry[]> {
  return useQuery({
    queryKey: KEYS.history(id),
    queryFn: () => documentAPI.getHistory(id).then((r) => r.data.data!),
    enabled: !!id,
  });
}

export function useDocumentVersions(id: string): UseQueryResult<DocumentVersion[]> {
  return useQuery({
    queryKey: KEYS.versions(id),
    queryFn: () => documentAPI.getVersions(id).then((r) => r.data.data!),
    enabled: !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDraft(): UseMutationResult<unknown, Error, FormData> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => documentAPI.createDraft(formData),
    onSuccess: () => {
      invalidateDoc(qc);
      toast.success("Draft SKBDN berhasil dikirim!");
    },
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error ?? "Gagal mengirim draft"),
  });
}

// Alias untuk komponen lama
export const useCreateDocument = useCreateDraft;

export function useReuploadDraft(): UseMutationResult<
  unknown,
  Error,
  { id: string; formData: FormData }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      documentAPI.reuploadDraft(id, formData),
    onSuccess: (_, v) => {
      invalidateDoc(qc, v.id);
      toast.success("Draft revisi berhasil dikirim!");
    },
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error ?? "Gagal re-upload draft"),
  });
}

export function useReuploadFinal(): UseMutationResult<
  unknown,
  Error,
  { id: string; formData: FormData }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      documentAPI.reuploadFinal(id, formData),
    onSuccess: (_, v) => {
      invalidateDoc(qc, v.id);
      toast.success("Final SKBDN revisi berhasil dikirim!");
    },
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error ?? "Gagal re-upload final"),
  });
}

export function useReuploadDocument(): UseMutationResult<
  unknown,
  Error,
  { id: string; formData: FormData; doc_type?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      formData,
      doc_type,
    }: {
      id: string;
      formData: FormData;
      doc_type?: string;
    }) =>
      doc_type === "final"
        ? documentAPI.reuploadFinal(id, formData)
        : documentAPI.reuploadDraft(id, formData),
    onSuccess: (_, v) => {
      invalidateDoc(qc, v.id);
      toast.success("Dokumen revisi berhasil dikirim!");
    },
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error ?? "Gagal re-upload"),
  });
}

export function useUploadFinal(): UseMutationResult<
  unknown,
  Error,
  { id: string; formData: FormData }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      documentAPI.uploadFinal(id, formData),
    onSuccess: (_, v) => {
      invalidateDoc(qc, v.id);
      toast.success("Final SKBDN berhasil dikirim!");
    },
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error ?? "Gagal upload Final SKBDN"),
  });
}
