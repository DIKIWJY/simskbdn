import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

// ─── Extend AxiosRequestConfig untuk flag _retry ─────────────────────────────
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// PERBAIKAN: baseURL ditambahkan /api agar cocok dengan rute backend Go Gin (/api/...)
const api: AxiosInstance = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Instance terpisah untuk refresh — TIDAK pakai interceptor agar tidak infinite loop
const refreshApi: AxiosInstance = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// Request interceptor — tambahkan JWT ke setiap request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Response interceptor — auto-refresh token saat 401
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const original = error.config as InternalAxiosRequestConfig | undefined;
    if (!original) return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem("refresh_token")
            : null;
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await refreshApi.post<{
          data?: { access_token: string; refresh_token?: string };
          access_token?: string;
          refresh_token?: string;
        }>("/auth/refresh", { refresh_token: refreshToken });

        const newToken = data?.data?.access_token ?? data?.access_token;
        const newRefreshToken =
          data?.data?.refresh_token ?? data?.refresh_token;

        if (!newToken) throw new Error("Format token tidak valid");

        localStorage.setItem("access_token", newToken);
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original as AxiosRequestConfig);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          localStorage.clear();
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;