import api from "./axios";
import type {
  ApiResponse,
  Annotation,
  AnnotationSummaryResponse,
  AnnotationSavePayload,
} from "@/types";

export const annotationAPI = {
  /** GET /documents/:id/annotations/page/:page?version_id=...
   * Returns full Annotation object with annotation_data (Fabric.js canvas JSON)
   */
  getPage: (docId: string, versionId: string, page: number) =>
    api.get<ApiResponse<Annotation>>(
      `/documents/${docId}/annotations/page/${page}`,
      { params: { version_id: versionId } },
    ),

  /** POST /documents/:id/annotations
   * Save canvas state for one page
   */
  savePage: (docId: string, payload: AnnotationSavePayload) =>
    api.post<ApiResponse<Annotation>>(
      `/documents/${docId}/annotations`,
      payload,
    ),

  /** GET /documents/:id/annotations/summary?version_id=...
   * Returns AnnotationSummaryResponse = { document_id, pages: [{page_number, has_data, item_count}] }
   */
  getSummary: (docId: string, versionId: string) =>
    api.get<ApiResponse<AnnotationSummaryResponse>>(
      `/documents/${docId}/annotations/summary`,
      { params: { version_id: versionId } },
    ),

  /** GET /documents/:id/annotations?version_id=...
   * Returns all annotated pages for a version
   */
  getAllPages: (docId: string, versionId: string) =>
    api.get<ApiResponse<Annotation[]>>(
      `/documents/${docId}/annotations`,
      { params: { version_id: versionId } },
    ),

  /** DELETE /documents/:id/annotations/object
   * Remove a single annotation object from a page
   */
  deleteObject: (docId: string, annotationId: string, objectId: string) =>
    api.delete<ApiResponse<null>>(
      `/documents/${docId}/annotations/object`,
      { data: { annotation_id: annotationId, object_id: objectId } },
    ),

  /** PATCH /annotations/:ann_id/resolve
   * Mark an annotation page as resolved/unresolved
   */
  markResolved: (annId: string, resolved: boolean) =>
    api.patch<ApiResponse<null>>(`/annotations/${annId}/resolve`, { resolved }),
};
