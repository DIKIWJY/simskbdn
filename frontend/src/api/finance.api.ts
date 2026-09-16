import api from "./axios";
import type {
  ApiResponse,
  Document,
  DocumentDetailResponse,
  DocumentVersion,
  DocumentHistoryEntry,
  DocumentStats,
  PaginatedResponse,
  AnnotationSummaryResponse,
} from "@/types";
import type { GetDocumentsParams, UpdateStatusPayload } from "./document.api";

export const financeAPI = {
  getDocuments: (params: GetDocumentsParams = {}) =>
    api.get<ApiResponse<PaginatedResponse<Document>>>("/documents", { params }),

  getStats: () =>
    api.get<ApiResponse<DocumentStats>>("/documents/stats"),

  getById: (id: string) =>
    api.get<ApiResponse<DocumentDetailResponse>>(`/documents/${id}`),

  getVersions: (id: string) =>
    api.get<ApiResponse<DocumentVersion[]>>(`/documents/${id}/versions`),

  /** PUT /documents/:id/review — Finance review status */
  updateStatus: (id: string, data: UpdateStatusPayload) =>
    api.put<ApiResponse<Document>>(`/documents/${id}/review`, data),

  getHistory: (id: string) =>
    api.get<ApiResponse<DocumentHistoryEntry[]>>(`/documents/${id}/history`),

  /** GET /documents/:id/annotations/summary?version_id=... */
  getAnnotationSummary: (id: string, versionId: string) =>
    api.get<ApiResponse<AnnotationSummaryResponse>>(
      `/documents/${id}/annotations/summary`,
      { params: { version_id: versionId } },
    ),
};
