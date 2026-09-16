import api from "./axios";
import type {
  ApiResponse,
  LoginResponse,
  User,
} from "@/types";

// PERBAIKAN BUG: field sebelumnya "phone" tidak cocok dengan JSON tag backend
// (UpdateProfileRequest di auth_service.go pakai `json:"phone_number"`).
// Selama ini update nomor telepon dari halaman Settings akan diam-diam
// diabaikan backend karena key JSON yang dikirim tidak dikenali. Field
// "position" juga dihapus karena tidak ada di backend sama sekali.
export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone_number?: string;
  company_name?: string;
}

// PERBAIKAN BUG KRITIS: field "old_password" tidak cocok dengan backend
// (ChangePasswordRequest di auth_service.go mewajibkan `json:"current_password"`).
// Akibatnya fitur "Ganti Password" akan SELALU gagal dengan pesan "password
// saat ini salah" — backend membaca current_password sebagai string kosong
// (key JSON tidak dikenali), lalu bcrypt.CompareHashAndPassword terhadap
// string kosong pasti gagal, walau user mengetik password lama dengan benar.
export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>("/auth/login", { email, password }),

  getMe: () =>
    api.get<ApiResponse<User>>("/me"),

  refresh: (refresh_token: string) =>
    api.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      "/auth/refresh",
      { refresh_token },
    ),

  updateProfile: (data: UpdateProfilePayload) =>
    api.put<ApiResponse<User>>("/auth/profile", data),

  changePassword: (data: ChangePasswordPayload) =>
    api.put<ApiResponse<null>>("/auth/password", data),
};
