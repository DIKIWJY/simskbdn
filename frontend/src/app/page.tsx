"use client"; // memakai useState/useEffect (scroll listener) & Link interaktif

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Users,
  Bell,
  Lock,
  FileCheck,
  Send,
  AlertCircle,
  Eye,
  BarChart2,
} from "lucide-react";

/* ─── Navbar ──────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 py-2" : "bg-transparent py-4"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo(0, 0)}
          >
            {/* Tempat memasukkan logo */}
            <img
              src="assets/pusri.png" /* Ganti ini dengan link/path file logo Anda */
              alt="Logo Website"
              className="w-40 h-40 object-contain transition-all duration-300 group-hover:opacity-80"
            />

            {/* Jika sebelumnya ada teks nama website di sebelahnya, bisa diletakkan di bawah sini */}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 bg-slate-900/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
            {["Tentang", "Alur Proses", "Fitur", "Kontak"].map((m) => (
              <a
                key={m}
                href={`#${m.toLowerCase().replace(" ", "-")}`}
                className={`text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${scrolled ? "text-slate-600 hover:text-blue-600" : "text-white/80 hover:text-white"}`}
              >
                {m}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={`hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${scrolled ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-blue-600/20 hover:-translate-y-0.5" : "bg-white text-blue-900 hover:bg-blue-50 shadow-lg hover:shadow-white/20 hover:-translate-y-0.5"}`}
            >
              Masuk Sistem
            </Link>
            <button
              onClick={() => setOpen((o) => !o)}
              className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}`}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute w-full bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-2xl transition-all duration-300 origin-top ${open ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"}`}
      >
        <div className="px-4 pt-4 pb-6 space-y-2">
          {["Tentang", "Alur Proses", "Fitur", "Kontak"].map((m) => (
            <a
              key={m}
              href={`#${m.toLowerCase().replace(" ", "-")}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-bold text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              {m}
            </a>
          ))}
          <div className="pt-4 px-2">
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
            >
              Masuk ke Sistem
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#0f172a]">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid-pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-8 items-center">
          <div className="lg:col-span-7 z-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-400/20 backdrop-blur-xl rounded-full text-blue-300 text-xs font-bold tracking-widest uppercase mb-8 shadow-inner shadow-blue-400/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Sistem Informasi Resmi PT Pusri
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight text-balance">
              Monitoring{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-200">
                SKBDN
              </span>
              <br />
              Terintegrasi
            </h1>
            <p className="text-lg sm:text-xl text-slate-300/90 leading-relaxed mb-10 max-w-2xl font-light mx-auto lg:mx-0 text-balance">
              Platform digital enterprise untuk monitoring Surat Kredit
              Berdokumen Dalam Negeri secara real-time antara Buyer, Sales AP2,
              dan Keuangan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-2">
                  Masuk ke Sistem{" "}
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </Link>
              <a
                href="#alur-proses"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/50 border border-slate-700/50 text-white hover:bg-slate-800 hover:border-slate-600 backdrop-blur-md rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1"
              >
                Pelajari Alur Proses
              </a>
            </div>
          </div>

          {/* Stats card - Premium Glassmorphism */}
          <div className="hidden lg:block lg:col-span-5 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 blur-3xl opacity-20 rounded-[3rem]"></div>
            <div className="relative bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5">
              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                <p className="text-slate-300 text-sm font-bold tracking-widest uppercase">
                  Live Status
                </p>
                <span className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold rounded-full flex items-center gap-2 shadow-inner shadow-green-500/20">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>{" "}
                  Online System
                </span>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: FileText,
                    label: "Total Dokumen",
                    value: "1,247",
                    color: "text-blue-400",
                    bg: "bg-blue-500/10 border-blue-500/20",
                  },
                  {
                    icon: CheckCircle2,
                    label: "Disetujui",
                    value: "892",
                    color: "text-green-400",
                    bg: "bg-green-500/10 border-green-500/20",
                  },
                  {
                    icon: Clock,
                    label: "Sedang Diproses",
                    value: "234",
                    color: "text-amber-400",
                    bg: "bg-amber-500/10 border-amber-500/20",
                  },
                  {
                    icon: AlertCircle,
                    label: "Perlu Revisi",
                    value: "121",
                    color: "text-rose-400",
                    bg: "bg-rose-500/10 border-rose-500/20",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="group flex items-center gap-5 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-default"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center border ${s.bg} shadow-lg`}
                    >
                      <s.icon size={24} className={s.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">
                        {s.label}
                      </p>
                      <p className="text-white font-black text-2xl tracking-tight">
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Tentang ─────────────────────────────────────────── */
function Tentang() {
  return (
    <section id="tentang" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold tracking-widest mb-6 border border-blue-100">
              <Shield size={14} /> TENTANG SISTEM
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-[1.1] text-balance">
              Platform Sentralisasi
              <br />
              Monitoring SKBDN
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              SKBDN (Surat Kredit Berdokumen Dalam Negeri) adalah instrumen
              pembayaran krusial. Sistem ini mendigitalisasi dan memantau
              seluruh alur dokumen secara transparan antara pihak-pihak terkait
              di lingkungan PT Pupuk Sriwidjaja Palembang.
            </p>
            <div className="flex items-start gap-5 p-6 bg-slate-50 border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
              <div className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-2xl flex-shrink-0">
                <Lock size={24} className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-2">
                  Akses Enterprise Terbatas
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sistem beroperasi dengan standar keamanan tinggi. Pembuatan
                  akun eksklusif dikelola langsung oleh Administrator Pusri
                  berdasarkan permintaan resmi pihak terkait.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-transparent rounded-3xl -m-6 -z-10"></div>
            {[
              {
                icon: FileText,
                title: "Drafting",
                desc: "Pengiriman draft awal secara digital",
                color: "blue",
              },
              {
                icon: CheckCircle2,
                title: "Verifikasi AP2",
                desc: "Pengecekan validitas oleh tim Sales",
                color: "teal",
              },
              {
                icon: Eye,
                title: "Review Keuangan",
                desc: "Pemeriksaan komprehensif dokumen",
                color: "amber",
              },
              {
                icon: Shield,
                title: "Approval",
                desc: "Persetujuan akhir dengan rekam jejak",
                color: "indigo",
              },
            ].map((f, i) => {
              const cmap: Record<string, string> = {
                blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/50",
                teal: "bg-teal-50 text-teal-600 border-teal-100 shadow-teal-100/50",
                amber:
                  "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50",
                indigo:
                  "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50",
              };
              const cls = cmap[f.color] ?? cmap.blue!;
              return (
                <div
                  key={f.title}
                  className={`bg-white rounded-3xl p-6 border ${cls.split(" ")[2]} shadow-lg ${cls.split(" ")[3]} hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${cls.split(" ").slice(0, 2).join(" ")} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <f.icon size={24} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Alur Proses ─────────────────────────────────────── */
function AlurProses() {
  const steps = [
    {
      no: 1,
      role: "Buyer",
      icon: Send,
      color: "blue",
      title: "Kirim Draft SKBDN",
      desc: "Buyer mengirimkan Draft SKBDN ke sistem untuk diverifikasi oleh Sales AP2.",
      detail: [
        "Upload dokumen draft",
        "Isi formulir transaksi",
        "Submit ke tim AP2",
      ],
    },
    {
      no: 2,
      role: "Sales AP2",
      icon: FileCheck,
      color: "teal",
      title: "Verifikasi Draft",
      desc: "Tim AP2 memeriksa kelengkapan. Jika tidak sesuai, dokumen dikembalikan (Return).",
      detail: ["Cek keabsahan", "Validasi kelengkapan", "Approval tahap awal"],
    },
    {
      no: 3,
      role: "Sales AP2",
      icon: ArrowRight,
      color: "teal",
      title: "Eskalasi ke Keuangan",
      desc: "Draft yang valid diteruskan sebagai Final SKBDN ke departemen Keuangan.",
      detail: [
        "Generate final form",
        "Eskalasi dokumen",
        "Notifikasi otomatis",
      ],
    },
    {
      no: 4,
      role: "Keuangan",
      icon: Eye,
      color: "amber",
      title: "Review Mendalam",
      desc: "Pemeriksaan komprehensif. Keuangan dapat memberikan anotasi langsung pada PDF.",
      detail: ["Review detail", "Digital annotation", "Analisis syarat"],
    },
    {
      no: 5,
      role: "Keuangan",
      icon: CheckCircle2,
      color: "green",
      title: "Keputusan Akhir",
      desc: "Penentuan status akhir: Disetujui (Approved), Revisi, atau Ditolak (Rejected).",
      detail: ["Final approval", "Trigger notifikasi", "Dokumen diarsipkan"],
    },
  ];

  interface StepColorCfg {
    bg: string;
    light: string;
    text: string;
    border: string;
    ring: string;
  }

  const colorMap: Record<string, StepColorCfg> = {
    blue: {
      bg: "bg-blue-600",
      light: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      ring: "ring-blue-100",
    },
    teal: {
      bg: "bg-teal-600",
      light: "bg-teal-50",
      text: "text-teal-700",
      border: "border-teal-200",
      ring: "ring-teal-100",
    },
    amber: {
      bg: "bg-amber-500",
      light: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      ring: "ring-amber-100",
    },
    green: {
      bg: "bg-green-600",
      light: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      ring: "ring-green-100",
    },
  };

  return (
    <section
      id="alur-proses"
      className="py-24 bg-slate-50 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 bg-slate-200/50 text-slate-700 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Workflow System
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-6 text-balance">
            Alur Proses Transparan
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto text-balance">
            Siklus lengkap dari inisiasi draft hingga validasi akhir yang
            terstruktur dan mudah dipantau.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Solid Gradient Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-200 via-teal-200 to-green-200 md:-translate-x-0.5 rounded-full" />

          <div className="space-y-16">
            {steps.map((s, i) => {
              const c = colorMap[s.color] ?? colorMap.blue!;
              const isRight = i % 2 === 1;
              return (
                <div
                  key={s.no}
                  className={`relative flex items-center gap-8 md:gap-0 ${isRight ? "md:flex-row-reverse" : ""}`}
                >
                  {/* Timeline Number */}
                  <div
                    className={`absolute left-2 md:left-1/2 md:-translate-x-1/2 w-14 h-14 rounded-full ${c.bg} text-white font-black text-xl flex items-center justify-center shadow-xl z-10 ring-8 ${c.ring} group hover:scale-110 transition-transform duration-300`}
                  >
                    {s.no}
                  </div>

                  {/* Content Card */}
                  <div
                    className={`ml-20 md:ml-0 md:w-[45%] ${isRight ? "md:mr-auto md:pr-16" : "md:ml-auto md:pl-16"}`}
                  >
                    <div
                      className={`bg-white rounded-3xl border ${c.border} p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group`}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div
                          className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${c.light} ${c.text}`}
                        >
                          Role: {s.role}
                        </div>
                        <div
                          className={`w-10 h-10 rounded-full ${c.light} flex items-center justify-center`}
                        >
                          <s.icon size={20} className={`${c.text}`} />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-slate-600 text-base leading-relaxed mb-6">
                        {s.desc}
                      </p>

                      <ul className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                        {s.detail.map((d) => (
                          <li
                            key={d}
                            className="flex items-center gap-3 text-sm text-slate-700 font-semibold"
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${c.bg}`}
                            />{" "}
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Fitur ───────────────────────────────────────────── */
function Fitur() {
  const features = [
    {
      icon: BarChart2,
      title: "Real-time Dashboard",
      desc: "Pantau metrik dan status seluruh dokumen SKBDN secara instan dalam satu layar eksekutif.",
    },
    {
      icon: Bell,
      title: "Smart Notification",
      desc: "Pemberitahuan email dan in-app otomatis setiap kali ada pergerakan atau perubahan status dokumen.",
    },
    {
      icon: FileCheck,
      title: "In-app PDF Annotation",
      desc: "Fitur eksklusif bagi Keuangan untuk mencoret atau memberi catatan revisi langsung pada file PDF.",
    },
    {
      icon: TrendingUp,
      title: "Audit Trail Log",
      desc: "Seluruh riwayat aktivitas dan persetujuan terekam utuh untuk keperluan audit internal.",
    },
    {
      icon: Shield,
      title: "Keamanan Berlapis",
      desc: "Sistem otorisasi RBAC (Role-Based Access Control) memastikan privasi dokumen tingkat tinggi.",
    },
    {
      icon: Users,
      title: "Kolaborasi B2B",
      desc: "Menjembatani Buyer eksternal dan Departemen internal Pusri dalam satu ekosistem digital terpusat.",
    },
  ];

  return (
    <section id="fitur" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold tracking-widest uppercase rounded-full mb-4 border border-blue-100">
            Kapabilitas Sistem
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-6">
            Fitur Unggulan
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto text-balance">
            Dirancang spesifik untuk mengeliminasi hambatan administratif dan
            mempercepat SLA dokumen.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, index) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl p-8 border border-slate-100 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors duration-300 shadow-sm">
                <f.icon
                  size={28}
                  className="text-blue-600 group-hover:text-white transition-colors duration-300"
                />
              </div>
              <h3 className="font-bold text-slate-900 text-xl mb-3">
                {f.title}
              </h3>
              <p className="text-slate-600 text-base leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Cara Mendapatkan Akses ──────────────────────────── */
function CaraAkses() {
  const steps = [
    {
      no: "01",
      title: "Hubungi Pusri",
      desc: "Inisiasi komunikasi dengan representatif administrasi PT Pusri Palembang.",
    },
    {
      no: "02",
      title: "Verifikasi Data",
      desc: "Pusri memvalidasi legalitas dan kelengkapan dokumen perusahaan Anda.",
    },
    {
      no: "03",
      title: "Pemberian Akses",
      desc: "Administrator IT Pusri men-generate akun aman (secure credentials).",
    },
    {
      no: "04",
      title: "Sistem Go Live",
      desc: "Login ke sistem dan mulai digitalisasi proses SKBDN Anda.",
    },
  ];

  return (
    <section className="py-24 bg-slate-900 border-t border-slate-800 text-white relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6">
            Prosedur Akses Sistem
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto text-balance">
            Sistem bersifat *closed-ecosystem*. Pendaftaran mandiri
            dinonaktifkan untuk menjaga integritas keamanan data.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.no} className="relative text-center group">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-[2px] bg-gradient-to-r from-blue-500/50 to-transparent" />
              )}
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-slate-700 text-blue-400 font-black text-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 group-hover:-translate-y-2 group-hover:shadow-blue-500/30 transition-all duration-300">
                  {s.no}
                </div>
                <h3 className="font-bold text-white text-xl mb-3">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed px-4">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Kontak ──────────────────────────────────────────── */
function Kontak() {
  return (
    <section id="kontak" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 rounded-[3rem] p-8 sm:p-16 relative overflow-hidden shadow-2xl shadow-blue-900/20">
          {/* Abstract blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 opacity-80"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/50 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3"></div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-white">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight text-balance">
                Butuh Dukungan
                <br />
                Teknis Sistem?
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-10 max-w-md">
                Tim IT Support Pusri siap membantu memandu Anda atau
                menyelesaikan kendala teknis terkait portal SKBDN.
              </p>
              <div className="space-y-6 bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20">
                {[
                  {
                    icon: MapPin,
                    label: "Jl. Mayor Zen, Palembang 30118",
                    title: "Headquarters",
                  },
                  {
                    icon: Phone,
                    label: "+62 711 712345",
                    title: "Corporate Phone",
                  },
                  {
                    icon: Mail,
                    label: "skbdn@pusri.co.id",
                    title: "Email Support",
                  },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <c.icon size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">
                        {c.title}
                      </p>
                      <p className="text-white text-lg font-medium">
                        {c.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-10 shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <Lock size={28} className="text-blue-600" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-slate-900">
                Portal Akses
              </h3>
              <p className="text-slate-600 text-base leading-relaxed mb-8">
                Gunakan ID Pengguna dan Kata Sandi terenkripsi yang telah
                didistribusikan oleh Administrator untuk masuk.
              </p>
              <Link
                href="/login"
                className="group flex items-center justify-center gap-2 w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-1"
              >
                Akses Dashboard{" "}
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500 text-center font-medium">
                  Lupa kredensial akses? Hubungi{" "}
                  <a
                    href="mailto:skbdn@pusri.co.id"
                    className="text-blue-600 font-bold hover:underline"
                  >
                    IT Support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <div>
            <span className="block text-base font-bold text-white tracking-wide">
              PT Pupuk Sriwidjaja Palembang
            </span>
            <span className="block text-xs font-semibold text-slate-500 tracking-wider">
              SISTEM INFORMASI SKBDN
            </span>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500">
          © {new Date().getFullYear()} PT Pusri. Hak Cipta Dilindungi
          Undang-Undang.
        </p>
      </div>
    </footer>
  );
}

/* ─── Main Export ─────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="font-sans antialiased text-slate-900 bg-white selection:bg-blue-200 selection:text-blue-900 scroll-smooth">
      <Navbar />
      <main>
        <Hero />
        <Tentang />
        <AlurProses />
        <Fitur />
        <CaraAkses />
        <Kontak />
      </main>
      <Footer />
    </div>
  );
}
