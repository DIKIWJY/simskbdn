import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { annotationAPI } from "@/api/annotation.api";
import type {
  Annotation,
  AnnotationSummaryResponse,
  AnnotationSavePayload,
} from "@/types";

/**
 * usePageAnnotation — fetch satu halaman anotasi PDF.
 *
 * Returns full Annotation object with annotation_data (Fabric.js canvas JSON).
 * Used by: DocumentAnnotatorClient, AP2DocumentAnnotatorClient
 *
 * Saat halaman belum dianotasi, backend return canvas kosong:
 *   { annotation_data: { version: "5.3.0", objects: [] } }
 */
export function usePageAnnotation(
  docId: string,
  versionId: string,
  page: number,
): UseQueryResult<Annotation> {
  return useQuery({
    queryKey: ["annotation", docId, versionId, page] as const,
    queryFn: async () => {
      const res = await annotationAPI.getPage(docId, versionId, page);
      // Backend membungkus dalam ApiResponse.data
      return res.data.data ?? {
        document_id: docId,
        version_id: versionId,
        page_number: page,
        annotation_data: { version: "5.3.0", objects: [] },
      };
    },
    enabled: !!docId && !!versionId && page > 0,
    staleTime: Infinity, // anotasi hanya berubah jika user secara aktif menyimpan
  });
}

/**
 * useAnnotationSummary — fetch ringkasan halaman mana saja yang sudah dianotasi.
 *
 * Returns AnnotationSummaryResponse = { document_id, pages: [{page_number, has_data, item_count}] }
 * Used by: PageNavigator (dot indicator per halaman)
 */
export function useAnnotationSummary(
  docId: string,
  versionId: string,
): UseQueryResult<AnnotationSummaryResponse> {
  return useQuery({
    queryKey: ["annotation-summary", docId, versionId] as const,
    queryFn: async () => {
      const res = await annotationAPI.getSummary(docId, versionId);
      return (
        res.data.data ?? {
          document_id: docId,
          pages: [],
        }
      );
    },
    enabled: !!docId && !!versionId,
  });
}

export interface AutoSaveControls {
  scheduleSave: (payload: AnnotationSavePayload) => void;
  cancelSave: () => void;
}

/**
 * useAutoSave — debounced auto-save canvas state (1.2 detik setelah perubahan terakhir).
 *
 * Dipanggil dari DocumentAnnotatorClient dan AP2DocumentAnnotatorClient setiap kali
 * canvas berubah (onModified callback dari Fabric.js).
 */
export function useAutoSave(docId: string): AutoSaveControls {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate } = useMutation({
    mutationFn: (payload: AnnotationSavePayload) =>
      annotationAPI.savePage(docId, payload),
    onSuccess: (_, payload) => {
      // Invalidate summary agar dot indicator per halaman ikut update
      void qc.invalidateQueries({
        queryKey: ["annotation-summary", docId],
      });
      // Invalidate halaman yang baru disimpan
      void qc.invalidateQueries({
        queryKey: ["annotation", docId, payload.version_id, payload.page_number],
      });
    },
    onError: (err) => {
      console.error("[AutoSave] Gagal menyimpan anotasi:", err);
    },
  });

  const scheduleSave = useCallback(
    (payload: AnnotationSavePayload) => {
      if (!payload) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        mutate(payload);
      }, 1_200);
    },
    [mutate],
  );

  const cancelSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { scheduleSave, cancelSave };
}
