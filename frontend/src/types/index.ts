// ─────────────────────────────────────────────────────────────────────────────
// SIMSKBDN — src/types/index.ts
// Sumber kebenaran tunggal untuk seluruh type di aplikasi.
// SEMUA field disesuaikan 1:1 dengan JSON response backend Go.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole = "buyer" | "finance" | "ap2" | "admin";

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_name?: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ─── Document Status ─────────────────────────────────────────────────────────

export type DocumentStatus =
  | "draft_submitted"
  | "draft_under_review"
  | "draft_verified_ap2"
  | "draft_approved"
  | "draft_revision_buyer"
  | "final_submitted"
  | "final_under_review"
  | "final_sent_to_finance"
  | "revision_requested"
  | "approved"
  | "disbursed"
  | "rejected"
  | "expired"
  | "under_review"
  | "pending_review"
  | "forwarded"
  | "submitted"
  | "received_sales";

// ─── Document ────────────────────────────────────────────────────────────────

export type DocumentType = "draft" | "final";

export interface Document {
  id: string;
  buyer_id: string;
  buyer?: User;
  doc_type: DocumentType;
  title: string;
  description?: string;
  skbdn_number: string;
  contract_number?: string;
  issuing_bank?: string;
  goods_type: string;
  tonnage: number;
  price_per_ton: number;
  total_price: number;
  country_of_origin?: string;
  date_of_issue?: string;
  expired_date?: string;
  status: DocumentStatus;
  current_version: number;
  forwarded_by?: string;
  reviewed_by?: string;
  approved_at?: string;
  disbursed_at?: string;
  created_at: string;
  updated_at: string;
  versions?: DocumentVersion[];
}

/**
 * DocumentDetailResponse — bentuk ASLI response dari GET /documents/:id.
 * Backend (document_handler.go → GetDocument) membungkus dokumen bersama
 * URL file dalam satu objek — BUKAN objek Document polos:
 *
 *   gin.H{"document": doc, "file_url": fileURL, "download_url": downloadURL}
 *
 * Semua pemanggil useDocument()/useFinanceDocument() harus unwrap lewat
 * `docData?.document`, bukan mengakses field Document langsung di docData.
 */
export interface DocumentDetailResponse {
  document: Document;
  file_url: string;
  download_url: string;
}

// ─── Document Version ────────────────────────────────────────────────────────

export type DocVersionType = "draft_initial" | "draft_revision" | "final" | "final_revision";

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  version_type: DocVersionType;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  is_current: boolean;
  upload_notes?: string;
  revision_reason?: string;
  requested_by?: string;
  uploaded_by: string;
  uploader?: User;
  uploaded_at: string;
}

// ─── Document History (Timeline) ─────────────────────────────────────────────

export interface DocumentHistoryEntry {
  id: string;
  document_id: string;
  from_status?: DocumentStatus;
  to_status: DocumentStatus;
  notes?: string;
  created_by: string;
  actor?: User;
  version_ref?: number;
  created_at: string;
}

// ─── Document Stats — matches backend models.MonitoringStats exactly ──────────

export interface DocumentStats {
  total: number;
  pending_review: number;
  under_review: number;
  need_revision: number;
  draft_approved: number;
  approved: number;
  rejected: number;
  expired: number;
  expiring_soon: number;
  disbursed: number;
  total_value: number;
  approved_value: number;
  total_tonnage: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Generic API Response wrapper ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface ApiNotification {
  id?: string;
  user_id?: string;
  document_id?: string;
  title: string;
  message: string;
  notif_type?: string;
  is_read?: boolean;
  status?: DocumentStatus;
  actor_name?: string;
  actor_role?: string;
  created_at?: string;
}

export interface StoreNotification {
  id: string;
  title: string;
  message: string;
  documentId?: string;
  status?: DocumentStatus;
  actorName?: string;
  actorRole?: string;
  createdAt: string;
  isRead: boolean;
}

// ─── Annotation ───────────────────────────────────────────────────────────────

/**
 * AnnotationObject — satu objek di canvas Fabric.js
 * Disimpan dalam annotation_data.objects di backend.
 */
export interface AnnotationObject {
  id: string;
  type: string;
  [key: string]: unknown; // properti Fabric.js tambahan (left, top, fill, dsb.)
}

/**
 * AnnotationItem — ringkasan satu objek anotasi (dari Summary field di backend)
 * Sesuai dengan models.AnnotationItem di Go.
 */
export interface AnnotationItem {
  object_id: string;
  type: string;
  comment?: string;
  color?: string;
  page_number: number;
  created_at: string;
  is_resolved: boolean;
}

/**
 * Annotation — full annotation object dari backend, sesuai models.Annotation di Go.
 * Dipakai oleh: annotationAPI.getPage(), usePageAnnotation()
 *
 * Field kritis untuk Fabric.js:
 *   annotation_data.objects → array objek canvas yang di-load ke Fabric
 */
export interface Annotation {
  id?: string;
  document_id: string;
  version_id: string;
  page_number: number;
  annotator_id?: string;
  annotator?: User;
  /** Canvas JSON dari Fabric.js — langsung dipakai fabricCanvas.loadJSON() */
  annotation_data: Record<string, unknown>;
  summary?: AnnotationItem[];
  is_resolved?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * AnnotationPageSummary — satu entri di daftar halaman yang punya anotasi.
 * Sesuai dengan models.PageAnnotation di Go.
 * Field names sesuai JSON tag backend: has_data, item_count, annotation_id.
 */
export interface AnnotationPageSummary {
  page_number: number;
  has_data: boolean;
  item_count: number;
  annotation_id?: string;
}

/**
 * AnnotationSummaryResponse — response dari GET /documents/:id/annotations/summary
 * Sesuai dengan models.AnnotationSummaryResponse di Go.
 */
export interface AnnotationSummaryResponse {
  document_id: string;
  total_pages?: number;
  pages: AnnotationPageSummary[];
}

/** Payload yang dikirim ke API saat auto-save */
export interface AnnotationSavePayload {
  version_id: string;
  page_number: number;
  canvas_json: Record<string, unknown>;
  items?: AnnotationItem[];
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  document_id?: string;
  from_status?: DocumentStatus;
  to_status: DocumentStatus;
  notes?: string;
  created_by: string;
  actor?: User;
  version_ref?: number;
  created_at: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";

export type NavBadgeKey = "notif" | "pending" | "review";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  exact?: boolean;
  badge?: NavBadgeKey;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NavConfig {
  label: string;
  groups: NavGroup[];
}

export type NavConfigMap = Record<UserRole, NavConfig>;

// ─── WebSocket ────────────────────────────────────────────────────────────────

export type WSEventName =
  | "document_submitted"
  | "document_received"
  | "document_under_review"
  | "document_revision_requested"
  | "document_approved"
  | "annotation_saved"
  | "notification"
  | "any"
  | string;

export interface WSConnectionEvent {
  status: "connected" | "disconnected";
}

export interface WSMessage {
  event?: WSEventName;
  payload?: unknown;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export type ColorVariant =
  | "blue" | "green" | "amber" | "red"
  | "indigo" | "gray" | "emerald" | "teal" | "orange";

export interface WithClassName {
  className?: string;
}

export interface WithLoading {
  loading?: boolean;
}
