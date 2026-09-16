import api from "./axios";
import type {
  ApiResponse,
  Document,
  DocumentStats,
  User,
  UserRole,
  ActivityLogEntry,
  PaginatedResponse,
} from "@/types";

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  company_name?: string;
  position?: string;
  phone?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  company_name?: string;
  position?: string;
  phone?: string;
  is_active?: boolean;
}

export interface GetUsersParams {
  role?: UserRole | "";
  search?: string;
}

export const adminAPI = {
  createUser: (data: CreateUserPayload) =>
    api.post<ApiResponse<User>>("/admin/users", data),

  // PERBAIKAN TIPE: backend GetAllUsers (admin_handler.go) mengembalikan
  // array User polos lewat SuccessResponse(c, ..., responses) — BUKAN
  // PaginatedResponse<User>. Handler itu juga tidak membaca query param
  // "page"/"limit" sama sekali, jadi selalu mengembalikan SEMUA user.
  // CATATAN: ini berarti pagination di halaman admin/users saat ini murni
  // dihitung di sisi frontend dari total data yang diterima, bukan pagination
  // sungguhan dari server. Didokumentasikan di sini agar tidak membingungkan
  // di masa depan — bukan bug yang saya perbaiki sepihak karena menyangkut
  // desain API, tapi tipe TypeScript-nya harus jujur mencerminkan ini.
  getUsers: (params: GetUsersParams = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.set("role", params.role);
    if (params.search) q.set("search", params.search);
    return api.get<ApiResponse<User[]>>(
      `/admin/users?${q.toString()}`,
    );
  },

  updateUser: (id: string, data: UpdateUserPayload) =>
    api.put<ApiResponse<User>>(`/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/users/${id}`),

  toggleUser: (id: string) =>
    api.patch<ApiResponse<User>>(`/admin/users/${id}/toggle`),

  getStats: () =>
    api.get<ApiResponse<DocumentStats>>("/admin/stats"),

  getDocuments: (status = "") =>
    api.get<ApiResponse<PaginatedResponse<Document>>>(
      `/admin/all-documents${status ? `?status=${status}` : ""}`,
    ),

  // PERBAIKAN TIPE: backend GetSystemActivity membungkus hasil sebagai
  // {activity: [...], generated_at: "..."} — bukan array polos.
  getActivity: () =>
    api.get<ApiResponse<{ activity: ActivityLogEntry[]; generated_at: string }>>(
      "/admin/activity",
    ),
};
