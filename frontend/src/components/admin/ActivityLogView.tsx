"use client";
// Padanan dari pages/admin/ActivityLog.jsx — dipakai bersama oleh
// /admin/activity DAN /ap2/activity (lihat AppRoutes.jsx lama).

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search, RefreshCw, Clock } from "lucide-react";
import { adminAPI } from "@/api/admin.api";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import { formatDate, formatRelativeTime } from "@/components/skbdn/utils";
import type { UserRole } from "@/types";

// CATATAN AUDIT: ACTOR_COLORS di kode asli tidak menyertakan "ap2" (pola yang
// sama berulang di beberapa file lain — lihat laporan akhir). Efeknya cuma
// kosmetik: avatar aktor ber-role ap2 memakai warna abu-abu default alih-alih
// warna khusus. Dipertahankan apa adanya.
const ACTOR_COLORS: Partial<Record<UserRole, string>> = {
  buyer:   "bg-blue-100 text-blue-700",
  ap2:     "bg-teal-100 text-teal-700",
  finance: "bg-amber-100 text-amber-700",
  admin:   "bg-indigo-100 text-indigo-700",
};

const PAGE_SIZE = 20;

export default function ActivityLogView() {
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => adminAPI.getActivity().then(r => r.data?.data?.activity || []),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const all = data || [];
  const filtered = all.filter(a => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      a.notes?.toLowerCase().includes(q) ||
      a.actor?.name?.toLowerCase().includes(q) ||
      a.to_status?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activities = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Log Aktivitas</h1>
          <p className="text-sm text-gray-500">Riwayat semua perubahan status dokumen SKBDN</p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(1); }}
          placeholder="Cari nama, status, atau catatan..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-all"/>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4"/>
                  <div className="h-3 bg-gray-100 rounded w-1/2"/>
                </div>
              </div>
            ))
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Activity size={36} className="text-gray-200"/>
              <p className="text-sm text-gray-400 font-medium">
                {searchQ ? "Tidak ada hasil pencarian" : "Belum ada aktivitas"}
              </p>
            </div>
          ) : activities.map((a, i) => (
            <div key={a.id || i} className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                (a.actor?.role && ACTOR_COLORS[a.actor.role]) || "bg-gray-100 text-gray-600"
              }`}>
                {a.actor?.name?.charAt(0)?.toUpperCase() || "S"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{a.actor?.name || "Sistem"}</span>
                  <span className="text-gray-300">→</span>
                  <StatusBadge status={a.to_status}/>
                  {(a.version_ref ?? 0) > 0 && (
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{a.version_ref}</span>
                  )}
                </div>

                {a.notes && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{a.notes}</p>
                )}

                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={10}/> {formatRelativeTime(a.created_at)}</span>
                  <span>{formatDate(a.created_at, { withTime: true })}</span>
                  {a.from_status && (
                    <span>dari <code className="bg-gray-100 px-1 rounded text-[9px]">{a.from_status}</code></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} total={filtered.length}
          onPageChange={setPage} label="aktivitas"/>
      </div>
    </div>
  );
}
