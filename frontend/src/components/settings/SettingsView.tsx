"use client";
// Padanan dari pages/settings/SettingsPage.jsx — dipakai bersama oleh
// /buyer/settings, /finance/settings, /ap2/settings, /admin/settings.

import { useState, type ReactNode } from "react";
import { User, Mail, Building2, Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, Shield, Bell, Palette } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useMutation } from "@tanstack/react-query";
import { authAPI, type UpdateProfilePayload, type ChangePasswordPayload } from "@/api/auth.api";
import toast from "react-hot-toast";
import axios from "axios";
import type { UserRole } from "@/types";

function getErrMsg(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}

function Field({ label, error, children, hint }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{error}</p>}
    </div>
  );
}

const inputCls = (err?: boolean | string) =>
  `w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/15 bg-white ${err ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`;

type FieldErrors = Record<string, string>;
interface PasswordFormState {
  current: string;
  new: string;
  confirm: string;
}

export default function SettingsView() {
  const { user, updateUser } = useAuthStore();

  const [profile, setProfile] = useState<UpdateProfilePayload>({
    name:         user?.name || "",
    email:        user?.email || "",
    company_name: user?.company_name || "",
    phone_number: user?.phone_number || "",
  });
  const [profileErr, setProfileErr] = useState<FieldErrors>({});

  const [pw, setPw] = useState<PasswordFormState>({ current: "", new: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwErr, setPwErr] = useState<FieldErrors>({});

  const profileMut = useMutation({
    mutationFn: (d: UpdateProfilePayload) => authAPI.updateProfile(d),
    onSuccess: (r) => {
      if (r.data.data) updateUser(r.data.data);
      toast.success("Profil berhasil diperbarui!");
      setProfileErr({});
    },
    onError: (e) => toast.error(getErrMsg(e, "Gagal memperbarui profil")),
  });

  const pwMut = useMutation({
    mutationFn: (d: ChangePasswordPayload) => authAPI.changePassword(d),
    onSuccess: () => {
      toast.success("Password berhasil diubah!");
      setPw({ current: "", new: "", confirm: "" });
      setPwErr({});
    },
    onError: (e) => toast.error(getErrMsg(e, "Gagal mengubah password")),
  });

  const validateProfile = (): boolean => {
    const err: FieldErrors = {};
    if (!profile.name?.trim())  err.name  = "Nama wajib diisi";
    if (!profile.email?.trim()) err.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) err.email = "Format email tidak valid";
    setProfileErr(err);
    return Object.keys(err).length === 0;
  };

  const validatePw = (): boolean => {
    const err: FieldErrors = {};
    if (!pw.current)              err.current = "Password saat ini wajib diisi";
    if (!pw.new)                  err.new     = "Password baru wajib diisi";
    // PERBAIKAN: batas minimal disamakan dengan backend (ChangePasswordRequest
    // mewajibkan min=8). Kode asli mengecek < 6 — tidak sinkron dengan backend,
    // sehingga user bisa lolos validasi frontend tapi tetap ditolak backend
    // dengan pesan error mentah yang membingungkan.
    else if (pw.new.length < 8)   err.new     = "Password minimal 8 karakter";
    if (!pw.confirm)              err.confirm = "Konfirmasi password wajib diisi";
    else if (pw.new !== pw.confirm) err.confirm = "Konfirmasi password tidak cocok";
    setPwErr(err);
    return Object.keys(err).length === 0;
  };

  const initials = user?.name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  // CATATAN AUDIT: ROLE_LABEL/ROLE_COLOR di kode asli tidak menyertakan "ap2"
  // (pola yang sama juga ada di components/layout/Header.jsx ROLE_BADGE).
  // Efeknya cuma kosmetik — badge role untuk user ap2 akan menampilkan teks
  // mentah "ap2" dengan warna abu-abu default, bukan patah/error. Dipertahankan
  // apa adanya sesuai kode asli; lihat laporan akhir untuk daftar lengkap.
  const ROLE_LABEL: Partial<Record<UserRole, string>> = { buyer: "Pembeli", ap2: "AP2", finance: "Keuangan", admin: "Admin" };
  const ROLE_COLOR: Partial<Record<UserRole, string>> = { buyer: "bg-blue-50 text-blue-700", ap2: "bg-teal-50 text-teal-700", finance: "bg-amber-50 text-amber-700", admin: "bg-indigo-50 text-indigo-700" };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Akun</h2>
        <p className="text-sm text-gray-500 mt-0.5">Kelola informasi profil dan keamanan akun Anda</p>
      </div>

      {/* Banner avatar */}
      <div className="rounded-2xl p-6 flex items-center gap-5" style={{background:"linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"}}>
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold text-white flex-shrink-0 border-2 border-white/30">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-base">{user?.name}</p>
          <p className="text-white/70 text-sm mt-0.5">{user?.email}</p>
          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 text-xs font-semibold text-white">
            <Shield size={11}/>{(user?.role && ROLE_LABEL[user.role]) || user?.role}
          </span>
        </div>
        {user?.company_name && (
          <div className="hidden sm:flex flex-col items-end text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-wider">Perusahaan</p>
            <p className="text-white font-semibold text-sm mt-0.5">{user.company_name}</p>
          </div>
        )}
      </div>

      {/* 2 kolom */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">

        {/* ── Kolom kiri: Profil + Password ── */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="Informasi Profil" subtitle="Perbarui nama dan informasi kontak Anda">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap *" error={profileErr.name}>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={profile.name} onChange={e => setProfile(p=>({...p, name: e.target.value}))}
                      className={"pl-9 " + inputCls(profileErr.name)} placeholder="Nama lengkap"/>
                  </div>
                </Field>
                <Field label="Email *" error={profileErr.email}>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={profile.email} onChange={e => setProfile(p=>({...p, email: e.target.value}))}
                      type="email" className={"pl-9 " + inputCls(profileErr.email)} placeholder="email@domain.com"/>
                  </div>
                </Field>
              </div>
              <Field label="Nama Perusahaan" hint="Nama perusahaan yang akan ditampilkan di sistem">
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input value={profile.company_name} onChange={e => setProfile(p=>({...p, company_name: e.target.value}))}
                    className={"pl-9 " + inputCls(false)} placeholder="PT. Perusahaan Anda"/>
                </div>
              </Field>
              <Field label="Nomor WhatsApp" hint="Format: 628xxxxxxxxxx — untuk menerima notifikasi via WhatsApp">
                <div className="relative">
                  <Bell size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input value={profile.phone_number || ""} onChange={e => setProfile(p=>({...p, phone_number: e.target.value}))}
                    className={"pl-9 " + inputCls(false)} placeholder="6281234567890" type="tel" pattern="[0-9]*"/>
                </div>
              </Field>
              <div className="flex justify-end pt-1">
                <button onClick={() => validateProfile() && profileMut.mutate(profile)} disabled={profileMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-sm">
                  {profileMut.isPending ? <><Loader2 size={14} className="animate-spin"/>Menyimpan...</> : <><CheckCircle2 size={14}/>Simpan Profil</>}
                </button>
              </div>
            </div>
          </Section>

          <Section title="Ubah Password" subtitle="Pastikan akun Anda menggunakan password yang kuat">
            <div className="space-y-4">
              {(
                [
                  { key: "current", label: "Password Saat Ini *" },
                  { key: "new",     label: "Password Baru *", hint: "Minimal 8 karakter" },
                  { key: "confirm", label: "Konfirmasi Password Baru *" },
                ] as { key: keyof PasswordFormState; label: string; hint?: string }[]
              ).map(({ key, label, hint }) => (
                <Field key={key} label={label} error={pwErr[key]} hint={hint}>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={pw[key]} onChange={e => setPw(p=>({...p, [key]: e.target.value}))}
                      type={showPw[key] ? "text" : "password"}
                      className={"pl-9 pr-10 " + inputCls(pwErr[key])} placeholder="••••••••"/>
                    <button type="button" onClick={() => setShowPw(s=>({...s, [key]: !s[key]}))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw[key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </Field>
              ))}
              <div className="flex justify-end pt-1">
                <button onClick={() => validatePw() && pwMut.mutate({ current_password: pw.current, new_password: pw.new })}
                  disabled={pwMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-sm">
                  {pwMut.isPending ? <><Loader2 size={14} className="animate-spin"/>Mengubah...</> : <><Lock size={14}/>Ubah Password</>}
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Kolom kanan: Info akun + tips ── */}
        <div className="space-y-4">
          <Section title="Informasi Akun" subtitle="Detail akun Anda di sistem">
            <div className="space-y-0">
              {[
                ["Nama", user?.name || "—"],
                ["Email", user?.email || "—"],
                ["Role", (user?.role && ROLE_LABEL[user.role]) || user?.role],
                ["Perusahaan", user?.company_name || "—"],
                ["Status", user?.is_active !== false ? "Aktif" : "Nonaktif"],
                ["ID Akun", (user?.id?.slice(0, 8) || "—") + "..."],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-medium text-gray-400">{k}</span>
                  <span className="text-xs font-semibold text-gray-800 text-right max-w-[60%] break-all">{v}</span>
                </div>
              ))}
            </div>
            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${(user?.role && ROLE_COLOR[user.role]) || "bg-gray-50 text-gray-600"}`}>
              <Shield size={11}/>{(user?.role && ROLE_LABEL[user.role]) || user?.role}
            </div>
          </Section>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertCircle size={13}/> Tips Keamanan Akun
            </p>
            {["Gunakan password minimal 8 karakter","Gabungkan huruf besar, angka & simbol","Jangan pakai password yang sama di banyak tempat","Perbarui password secara berkala"].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5"/>
                <p className="text-[11px] text-amber-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-green-800 flex items-center gap-1.5">
              <Bell size={13}/> Notifikasi WhatsApp
            </p>
            <p className="text-[11px] text-green-700 leading-relaxed">
              Isi nomor WhatsApp untuk menerima notifikasi perubahan status SKBDN secara real-time.
            </p>
            <p className="text-[10px] text-green-600 font-mono bg-green-100 px-2 py-1 rounded">Format: 628xxxxxxxxxx</p>
          </div>
        </div>
      </div>
    </div>
  );
}