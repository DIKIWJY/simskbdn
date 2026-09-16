import api from "./axios";
import type {
  ApiResponse,
  Document,
  DocumentDetailResponse,
  DocumentVersion,
  DocumentHistoryEntry,
  DocumentStats,
  PaginatedResponse,
  DocumentStatus,
} from "@/types";

export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
  date_from?: string;
  date_to?: string;
  expiring_soon?: boolean;
}

/** Payload untuk AP2 verify dan Finance review — sesuai backend UpdateStatusRequest */
export interface UpdateStatusPayload {
  status: DocumentStatus;
  notes?: string;
}

export const documentAPI = {
  // ── Read ─────────────────────────────────────────────────────────────────
  getAll: (params: GetDocumentsParams = {}) =>
    api.get<ApiResponse<PaginatedResponse<Document>>>("/documents", { params }),

  getStats: () =>
    api.get<ApiResponse<DocumentStats>>("/documents/stats"),

  getById: (id: string) =>
    api.get<ApiResponse<DocumentDetailResponse>>(`/documents/${id}`),

  getHistory: (id: string) =>
    api.get<ApiResponse<DocumentHistoryEntry[]>>(`/documents/${id}/history`),

  getVersions: (id: string) =>
    api.get<ApiResponse<DocumentVersion[]>>(`/documents/${id}/versions`),

  getVersionURL: (id: string, ver: number) =>
    api.get<ApiResponse<{ url: string }>>(`/documents/${id}/versions/${ver}/url`),

  // ── Buyer upload ──────────────────────────────────────────────────────────
  createDraft: (formData: FormData) =>
    api.post<ApiResponse<Document>>("/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  reuploadDraft: (id: string, formData: FormData) =>
    api.post<ApiResponse<Document>>(
      `/documents/${id}/reupload-draft`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    ),

  uploadFinal: (id: string, formData: FormData) =>
    api.post<ApiResponse<Document>>(
      `/documents/${id}/upload-final`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    ),

  reuploadFinal: (id: string, formData: FormData) =>
    api.post<ApiResponse<Document>>(
      `/documents/${id}/reupload-final`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    ),

  // ── AP2 verify — PUT /documents/:id/verify ────────────────────────────────
  // Mengirim { status, notes } sesuai backend UpdateStatusRequest.
  // Status yang valid untuk AP2: draft_under_review, draft_revision_buyer,
  //   final_under_review, revision_requested
  verifyAP2: (id: string, data: UpdateStatusPayload) =>
    api.put<ApiResponse<Document>>(`/documents/${id}/verify`, data),

  // ── Finance review — PUT /documents/:id/review ────────────────────────────
  updateStatusFinance: (id: string, data: UpdateStatusPayload) =>
    api.put<ApiResponse<Document>>(`/documents/${id}/review`, data),

  // ── Admin ─────────────────────────────────────────────────────────────────
  updateStatusAdmin: (id: string, data: UpdateStatusPayload) =>
    api.put<ApiResponse<Document>>(`/documents/${id}/status`, data),

  // ── Revision attachment (AP2/Finance) ─────────────────────────────────────
  uploadRevisionAttachment: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ApiResponse<{ url: string }>>(
      `/documents/${id}/revision-attachment`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
};
