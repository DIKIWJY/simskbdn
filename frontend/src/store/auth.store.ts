import { create } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import type { User, UserRole } from "@/types";

// ─── State shape ─────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuth: boolean;
  _hasHydrated: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface AuthActions {
  setHasHydrated: (val: boolean) => void;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isRole: (role: UserRole) => boolean;
  isBuyer: () => boolean;
  isFinance: () => boolean;
}

type AuthStore = AuthState & AuthActions;

// ─── Slice persisted ke localStorage ─────────────────────────────────────────

type PersistedSlice = Pick<
  AuthState,
  "user" | "accessToken" | "refreshToken" | "isAuth"
>;

const persistConfig: PersistOptions<AuthStore, PersistedSlice> = {
  name: "pusri-auth",
  partialize: (s): PersistedSlice => ({
    user: s.user,
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    isAuth: s.isAuth,
  }),
  onRehydrateStorage: () => (state) => {
    state?.setHasHydrated(true);
  },
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuth: false,
      _hasHydrated: false,

      // Actions
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);
        }
        set({ user, accessToken, refreshToken, isAuth: true });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          try {
            window.__wsManager?.disconnect();
          } catch (_) {
            // ignore
          }
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuth: false,
        });
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },

      updateUser: (user) => set({ user }),

      isRole: (role) => get().user?.role === role,
      isBuyer: () => get().user?.role === "buyer",
      isFinance: () => get().user?.role === "finance",
    }),
    persistConfig,
  ),
);
