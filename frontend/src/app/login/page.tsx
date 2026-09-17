"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Info } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

import { authAPI } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { UserRole } from "@/types";

// Peta role → path dashboard
// CATATAN AUDIT: di kode asli (pages/auth/LoginPage.jsx), peta ini TIDAK
// menyertakan "ap2" — sementara peta yang senada di routes/AppRoutes.jsx
// (di dalam PublicRoute) sudah benar menyertakan ap2. Akibatnya, kalau user
// dengan role "ap2" login, redirect awal akan gagal (jatuh ke "/login").
// Ini adalah bug pre-existing di kode asli Anda. Karena react-router-dom
// sudah dihapus, guard "PublicRoute" versi Next.js (di bawah, lihat
// useEffect) mengambil alih redirect setelah login, jadi saya sekaligus
// memperbaiki peta ini agar konsisten dan "ap2" tidak lagi tertinggal.
const ROLE_PATHS: Record<UserRole, string> = {
  buyer: "/buyer",
  finance: "/finance",
  ap2: "/ap2",
  admin: "/admin",
};

type LoginFormState = { email: string; password: string };
type LoginErrors = Partial<Record<keyof LoginFormState, string>>;

function getErrMsg(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuth, user, _hasHydrated } = useAuthStore();

  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState("");

  // Padanan dari <PublicRoute> di routes/AppRoutes.jsx (Vite): kalau user
  // sudah login, langsung lempar ke dashboard sesuai role-nya alih-alih
  // menampilkan form login lagi.
  useEffect(() => {
    if (_hasHydrated && isAuth && user?.role) {
      router.replace(ROLE_PATHS[user.role] || "/buyer");
    }
  }, [_hasHydrated, isAuth, user, router]);

  // PERBAIKAN (ditemukan saat audit ulang): PublicRoute versi asli menahan
  // render form login dengan spinner sampai status login diketahui pasti
  // (_hasHydrated true), baru redirect kalau ternyata sudah login. Versi
  // saya sebelumnya langsung render form dulu baru redirect via efek —
  // untuk user yang sudah login lalu buka /login (mis. lewat tombol back),
  // ini bisa memunculkan kedipan singkat form login sebelum dialihkan.
  // Diperbaiki agar identik dengan perilaku asli.
  if (!_hasHydrated || (isAuth && user?.role)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name as keyof LoginFormState]) setErrors((er) => ({ ...er, [name]: "" }));
    if (serverErr) setServerErr("");
  };

  const validate = (): boolean => {
    const errs: LoginErrors = {};
    if (!form.email) errs.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Format email tidak valid";
    if (!form.password) errs.password = "Password wajib diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerErr("");
    try {
      const { data } = await authAPI.login(form.email, form.password);
      if (!data.data) throw new Error("Format respons tidak valid");
      const { access_token, refresh_token, user: loggedInUser } = data.data;
      setAuth(loggedInUser, access_token, refresh_token);
      toast.success(`Selamat datang, ${loggedInUser.name}!`);
      router.push(ROLE_PATHS[loggedInUser.role] || "/login");
    } catch (err) {
      setServerErr(getErrMsg(err, "Login gagal, coba lagi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Masuk ke Sistem</h2>
        <p className="text-gray-500 text-sm mt-1">
          Sistem Informasi Monitoring SKBDN — PT Pupuk Sriwidjaja Palembang
        </p>
      </div>

      {/* Info: tidak ada registrasi mandiri */}
      <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-200 p-3.5">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Akun dibuat oleh <strong>Administrator Pusri</strong>. Hubungi bagian admin
          untuk mendapatkan akun akses sistem.
        </p>
      </div>

      {/* Error server */}
      {serverErr && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 p-3.5">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{serverErr}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="nama@perusahaan.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          icon={Mail}
          autoComplete="email"
          autoFocus
        />

        <Input
          label="Password"
          name="password"
          type={showPass ? "text" : "password"}
          placeholder="Masukkan password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          icon={Lock}
          autoComplete="current-password"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors"
          size="lg"
        >
          {loading ? "Sedang masuk..." : "Masuk"}
        </Button>
      </form>

      {/* Demo accounts hint */}
      <div className="mt-8 rounded-lg bg-gray-50 border border-gray-100 p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Akun demo (development):</p>
        <div className="space-y-1">
          {(
            [
              ["Buyer", "buyer@pusri.com"],
              ["Finance", "finance@pusri.com"],
              ["AP2", "ap2@pusri.com"],
              ["Admin", "admin@pusri.com"],
            ] as const
          ).map(([role, email]) => (
            <button
              key={role}
              type="button"
              onClick={() => setForm({ email, password: "password123" })}
              className="w-full text-left flex items-center justify-between rounded px-2 py-1 hover:bg-gray-100 transition-colors group"
            >
              <span className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{role}</span>
                {" — "}
                {email}
              </span>
              <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Pakai →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
