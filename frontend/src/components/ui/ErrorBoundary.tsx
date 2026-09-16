"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || "Terjadi kesalahan tidak terduga";

    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Terjadi Kesalahan</h3>
          <p className="text-sm text-gray-500 mb-1 font-mono bg-gray-50 rounded-lg px-3 py-2 text-left break-all">
            {msg}
          </p>
          <p className="text-xs text-gray-400 mt-3 mb-5">
            Coba refresh halaman. Jika masih error, hubungi administrator.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
          >
            <RefreshCw size={14} /> Refresh Halaman
          </button>
        </div>
      </div>
    );
  }
}
