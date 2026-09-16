"use client";

import { useState } from "react";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, EyeOff,
  Shield, User, ShoppingBag, BarChart2, X, Loader2,
  CheckCircle2, AlertCircle, Mail, Lock, Building2,
  type LucideIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPI, type UpdateUserPayload, type CreateUserPayload } from "@/api/admin.api";
import toast from "react-hot-toast";
import axios from "axios";
import Pagination from "@/components/ui/Pagination";
import type { User as UserModel, UserRole } from "@/types";

function getErrMsg(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}

interface RoleConfigEntry {
  label: string;
  icon: LucideIcon;
  color: string;
}

const ROLE_CONFIG: Partial<Record<UserRole, RoleConfigEntry>> = {
  buyer:   { label: "Pembeli",  icon: ShoppingBag, color: "text-blue-600 bg-blue-50 border-blue-200" },
  ap2:     { label: "AP2",      icon: Shield,      color: "text-teal-600 bg-teal-50 border-teal-200" },
  finance: { label: "Keuangan", icon: BarChart2,   color: "text-amber-600 bg-amber-50 border-amber-200" },
  admin:   { label: "Admin",    icon: Shield,      color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
};

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, icon: User, color: "text-gray-600 bg-gray-50 border-gray-200" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${cfg.color}`}>
      <Icon size={11}/>{cfg.label}
    </span>
  );
}

type FieldErrors = Record<string, string>;

/** Form state lokal — password dipisah opsional agar bisa "dikosongkan" saat
 * edit tanpa perlu delete-property (yang tidak type-safe untuk field wajib). */
interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  company_name: string;
  phone_number: string;
  is_active: boolean;
}

// ─── Modal Create/Edit User ───────────────────────────────────────────────
interface UserModalProps {
  user: UserModel | null;
  onClose: () => void;
  onSuccess: () => void;
}

function UserModal({ user: editUser, onClose, onSuccess }: UserModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editUser;

  const [form, setForm] = useState<UserFormState>({
    name:         editUser?.name || "",
    email:        editUser?.email || "",
    password:     "",
    role:         editUser?.role || "buyer",
    company_name: editUser?.company_name || "",
    phone_number: editUser?.phone_number || "",
    is_active:    editUser?.is_active !== false,
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (d: CreateUserPayload | UpdateUserPayload) =>
      isEdit ? adminAPI.updateUser(editUser.id, d) : adminAPI.createUser(d as CreateUserPayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(isEdit ? "User berhasil diperbarui" : "User baru berhasil dibuat");
      onSuccess?.();
    },
    onError: (e) => toast.error(getErrMsg(e, "Gagal menyimpan user")),
  });

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.name.trim())  e.name = "Nama wajib diisi";
    if (!form.email.trim()) e.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Format email tidak valid";
    if (!isEdit && !form.password) e.password = "Password wajib untuk user baru";
    if (form.password && form.password.length < 8) e.password = "Password minimal 8 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    // Payload dibangun eksplisit (bukan spread + delete) supaya type-safe:
    // field password hanya disertakan kalau memang diisi.
    const payload: CreateUserPayload | UpdateUserPayload = {
      name: form.name,
      email: form.email,
      role: form.role,
      company_name: form.company_name,
      phone: form.phone_number,
      ...(form.password ? { password: form.password } : {}),
      ...(isEdit ? { is_active: form.is_active } : {}),
    } as CreateUserPayload | UpdateUserPayload;
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? "bg-indigo-50" : "bg-blue-50"}`}>
              <Users size={16} className={isEdit ? "text-indigo-600" : "text-blue-600"}/>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}</h3>
              <p className="text-xs text-gray-400">{isEdit ? `Edit data ${editUser?.name}` : "Buat akun user baru untuk sistem"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Nama Lengkap *</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))}
                placeholder="contoh: Budi Santoso"
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/15 ${errors.name ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Email *</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))}
                type="email" placeholder="contoh: budi@perusahaan.com"
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/15 ${errors.email ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Password {isEdit ? <span className="text-gray-400 normal-case font-normal">(kosongkan jika tidak diubah)</span> : "*"}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={form.password} onChange={e => setForm(f=>({...f, password: e.target.value}))}
                type={showPw ? "text" : "password"} placeholder="Minimal 8 karakter"
                className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/15 ${errors.password ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{errors.password}</p>}
          </div>

          {/* Role + Company row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Role *</label>
              <select value={form.role} onChange={e => setForm(f=>({...f, role: e.target.value as UserRole}))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-blue-400 bg-white focus:ring-2 focus:ring-blue-500/15 transition-all">
                {Object.entries(ROLE_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c?.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Nama Perusahaan</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={form.company_name} onChange={e => setForm(f=>({...f, company_name: e.target.value}))}
                  placeholder="PT. ..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">No. WhatsApp</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={form.phone_number} onChange={e => setForm(f=>({...f, phone_number: e.target.value}))}
                  placeholder="628xxxxxxxxxx" type="tel"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Status aktif (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Status Akun</p>
                <p className="text-xs text-gray-500 mt-0.5">{form.is_active ? "User dapat login ke sistem" : "User tidak dapat login"}</p>
              </div>
              <button type="button" onClick={() => setForm(f=>({...f, is_active: !f.is_active}))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-green-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`}/>
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin"/> Menyimpan...</> : <><CheckCircle2 size={14}/>{isEdit ? "Simpan Perubahan" : "Buat User"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Komponen Utama ───────────────────────────────────────────────────────
export default function UserManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 15;
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserModel | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserModel | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, page],
    queryFn: () => adminAPI.getUsers({ search, role: roleFilter as UserRole | "" }).then(r => r.data.data ?? []),
    staleTime: 10_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminAPI.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User berhasil dihapus");
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(getErrMsg(e, "Gagal menghapus user")),
  });

  // Backend GetAllUsers belum mendukung pagination sungguhan (lihat catatan
  // di admin.api.ts) — data selalu berisi SEMUA user yang cocok filter.
  // Pagination di bawah ini murni dihitung dan ditampilkan di sisi frontend.
  const users = data ?? [];
  const total = users.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Kelola Pengguna</h3>
          <p className="text-sm text-gray-500 mt-0.5">Buat dan kelola akun pengguna sistem</p>
        </div>
        <button onClick={() => { setEditUser(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm">
          <Plus size={15}/> Tambah User
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white transition-all"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl outline-none focus:border-blue-400 bg-white min-w-[160px]">
          <option value="">Semua Role</option>
          {Object.entries(ROLE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c?.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full" >
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Pengguna</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Perusahaan</th>
              <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Role</th>
              <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Status</th>
              <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">WhatsApp</th>
              <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <Users size={32} className="mx-auto text-gray-200 mb-3"/>
                  <p className="text-sm font-medium text-gray-400">Belum ada pengguna</p>
                </td>
              </tr>
            ) : (
              users.map((u, idx) => {
                const init = u.name?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() || "?";
                return (
                  <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-center text-gray-400">{idx+1+(page-1)*LIMIT}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {init}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{u.id?.slice(0,8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700 truncate max-w-[160px]">{u.company_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <RoleBadge role={u.role}/>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${u.is_active !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active !== false ? "bg-green-500" : "bg-red-500"}`}/>
                        {u.is_active !== false ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <p className="text-sm text-gray-600">{u.phone_number || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => { setEditUser(u); setModalOpen(true); }}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit">
                          <Edit2 size={14}/>
                        </button>
                        <button onClick={() => setDeleteConfirm(u)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Hapus">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 bg-gray-50/50">
          <p className="text-xs text-gray-500">
            {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} dari <strong className="text-gray-800">{total}</strong> Total
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              ‹
            </button>
            {[...Array(totalPages)].map((_,i)=>{
              const p=i+1;
              if(p===1||p===totalPages||Math.abs(p-page)<=1) return (
                <button key={p} onClick={()=>setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${p===page?"bg-blue-600 text-white border border-blue-600":"border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"}`}>
                  {p}
                </button>
              );
              if(i>0&&Math.abs(i-page+1)===2) return <span key={`e${i}`} className="text-xs text-gray-400 px-1">…</span>;
              return null;
            })}
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <UserModal
          user={editUser}
          onClose={() => { setModalOpen(false); setEditUser(null); }}
          onSuccess={() => { setModalOpen(false); setEditUser(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-500"/>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Hapus Pengguna</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Yakin ingin menghapus akun <strong className="text-gray-900">{deleteConfirm.name}</strong>?
              User tidak akan bisa login setelahnya.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {deleteMut.isPending ? <><Loader2 size={14} className="animate-spin"/> Menghapus...</> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
