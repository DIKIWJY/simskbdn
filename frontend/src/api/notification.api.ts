import api from "./axios";
import type {
  ApiResponse,
  ApiNotification,
} from "@/types";

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

export const notificationAPI = {
  // PERBAIKAN TIPE: backend GetUserNotifications (document_handler.go)
  // mengembalikan array Notification POLOS lewat SuccessResponse(c, ...,
  // notifs) — bukan PaginatedResponse<ApiNotification>. Handler juga tidak
  // membaca query param apa pun (page/limit/unread_only diabaikan, selalu
  // hardcode limit 50 di sisi server). Parameter GetNotificationsParams
  // dipertahankan di signature untuk kompatibilitas pemanggilan yang sudah
  // ada, tapi backend saat ini mengabaikannya sepenuhnya.
  /** GET /notifications — list hingga 50 notifikasi terbaru milik user yang sedang login */
  getAll: (params: GetNotificationsParams = {}) =>
    api.get<ApiResponse<ApiNotification[]>>(
      "/notifications",
      { params },
    ),

  /** PATCH /notifications/:id/read — tandai satu notifikasi sebagai dibaca */
  markRead: (id: string) =>
    api.patch<ApiResponse<null>>(`/notifications/${id}/read`),

  /** PATCH /notifications/read-all — tandai semua notifikasi sebagai dibaca */
  markAllRead: () =>
    api.patch<ApiResponse<null>>("/notifications/read-all"),

  // CATATAN: getUnreadCount dihapus — endpoint /notifications/unread-count tidak
  // ada di backend. unreadCount dihitung dari store notifikasi lokal (Zustand).
};
