export const metadata = {
  title: "Akses Ditolak — SIMSKBDN",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-slate-50">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">
        🚫
      </div>
      <p className="text-lg font-bold text-slate-800">Akses Ditolak</p>
      <p className="text-sm text-slate-500">
        Anda tidak memiliki izin mengakses halaman ini
      </p>
      <a href="/" className="mt-1 text-sm text-blue-600 underline">
        Kembali ke Beranda
      </a>
    </div>
  );
}
