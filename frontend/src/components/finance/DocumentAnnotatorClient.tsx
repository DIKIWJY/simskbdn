"use client";
// Padanan dari pages/finance/DocumentAnnotatorPage.jsx.
//
// PENTING: komponen ini WAJIB dimuat lewat next/dynamic(..., { ssr:false })
// dari page.jsx-nya (lihat app/(dashboard)/finance/documents/[id]/annotate/page.jsx).
// Alasan: baik "fabric" (dipakai di FabricCanvas) maupun "pdfjs-dist" (baris
// GlobalWorkerOptions.workerSrc di bawah) mengakses API browser (document,
// canvas, dsb.) langsung saat modulnya di-import — bukan cuma saat dipakai.
// Kalau file ini di-render di server (termasuk SSR awal untuk Client
// Component biasa di Next.js), proses tersebut akan crash karena API
// tersebut tidak ada di Node.js. "use client" saja TIDAK cukup untuk
// mencegah ini — harus dynamic import dengan ssr:false.

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useDocument, useDocumentVersions } from "@/hooks/useDocuments";
import {
  useAutoSave,
  useAnnotationSummary,
  usePageAnnotation,
} from "@/hooks/useAnnotation";
import { documentAPI } from "@/api/document.api";
import { financeAPI } from "@/api/finance.api";
import { annotationAPI } from "@/api/annotation.api";

import PDFPageRenderer, { type PDFDocumentLike } from "@/components/annotation/PDFPageRenderer";
import FabricCanvas, { type FabricCanvasHandle, type AnnotationTool } from "@/components/annotation/FabricCanvas";
import AnnotationToolbar from "@/components/annotation/AnnotationToolbar";
import PageNavigator from "@/components/annotation/PageNavigator";
import RevisionRequestModal, { type RevisionSubmitPayload } from "@/components/annotation/RevisionRequestModal";
import StatusBadge from "@/components/ui/StatusBadge";
import type { AnnotationSavePayload, DocumentStatus } from "@/types";

import { ArrowLeft, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function DocumentAnnotatorClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentLike | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#EF4444");
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showRevModal, setShowRevModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [versionId, setVersionId] = useState("");

  const fabricRef = useRef<FabricCanvasHandle>(null);
  const pageLoaded = useRef<Record<number, boolean>>({}); // cache: sudah load halaman berapa saja

  // ── Hooks data ─────────────────────────────────────────────────────────
  const { data: docData } = useDocument(id);
  const { data: versions } = useDocumentVersions(id); // fetch versions secara terpisah — lebih reliable
  const doc = docData?.document;
  const fileURL = docData?.file_url;
  // Read-only jika status bukan dalam fase review aktif
  const EDITABLE_STATUSES: DocumentStatus[] = [
    "under_review",
    "draft_under_review",
    "final_under_review",
    "draft_submitted",
    "final_submitted",
  ];
  const isReadOnly = !doc?.status || !EDITABLE_STATUSES.includes(doc.status);

  const { data: summary } = useAnnotationSummary(id, versionId);
  const { data: pageAnn } = usePageAnnotation(id, versionId, currentPage);
  const { scheduleSave } = useAutoSave(id);

  const annotatedPages =
    summary?.pages?.filter((p) => p.has_data).map((p) => p.page_number) ?? [];

  // ── Load PDF ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fileURL) return;
    setPdfLoading(true);
    getDocument(fileURL)
      .promise.then((pdf: PDFDocumentLike) => {
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setPdfLoading(false);
      })
      .catch(() => {
        toast.error("Gagal memuat file PDF");
        setPdfLoading(false);
      });
  }, [fileURL]);

  // ── Set versionId dari data dokumen ─────────────────────────────────────
  // Pakai hook versions terpisah (lebih reliable dari doc.versions yang
  // kadang kosong karena timing response)
  useEffect(() => {
    if (versions?.length && doc) {
      const latest = versions.find(
        (v) => v.version_number === doc.current_version,
      ) ?? versions[0];
      if (latest?.id) setVersionId(latest.id);
    }
  }, [versions, doc]);

  // ── Load anotasi ke canvas saat ganti halaman ────────────────────────────
  useEffect(() => {
    if (!fabricRef.current || !pageAnn) return;
    fabricRef.current.loadJSON(pageAnn.annotation_data ?? { objects: [] });
    pageLoaded.current[currentPage] = true;
  }, [pageAnn, currentPage]);

  // ── Canvas selesai render: simpan dimensi ────────────────────────────────
  const handlePDFRendered = useCallback((_canvas: HTMLCanvasElement, w: number, h: number) => {
    setCanvasSize({ w, h });
  }, []);

  // ── Build payload anotasi dari canvas saat ini ───────────────────────────
  const buildPayload = useCallback((): AnnotationSavePayload | null => {
    if (!fabricRef.current || !versionId) return null;
    const canvasJSON = fabricRef.current.getJSON();
    const objects = (canvasJSON.objects as Record<string, unknown>[]) ?? [];

    const items = objects.map((obj) => {
      const fill = typeof obj.fill === "string" ? obj.fill : "";
      const type =
        obj.type === "rect" && fill.includes("rgba")
          ? "highlight"
          : obj.type === "rect"
            ? "rectangle"
            : obj.type === "line"
              ? "strikethrough"
              : obj.type === "i-text"
                ? "text"
                : obj.type === "path"
                  ? "freehand"
                  : String(obj.type ?? "");
      return {
        object_id: String(obj.id ?? ""),
        type,
        color: (typeof obj.stroke === "string" && obj.stroke) || fill,
        page_number: currentPage,
        created_at: new Date().toISOString(),
        is_resolved: false,
      };
    });

    return {
      version_id: versionId,
      page_number: currentPage,
      canvas_json: canvasJSON,
      items,
    };
  }, [versionId, currentPage]);

  // ── Auto-save dipanggil setiap canvas berubah ───────────────────────────
  const handleCanvasModified = useCallback(() => {
    const payload = buildPayload();
    if (!payload) return;
    scheduleSave(payload);
    setSavedAt(null); // reset, akan diisi setelah save sukses
  }, [buildPayload, scheduleSave]);

  // ── Manual save ─────────────────────────────────────────────────────────
  const handleManualSave = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;
    setIsSaving(true);
    try {
      await annotationAPI.savePage(id, payload);
      setSavedAt(new Date());
      toast.success("Anotasi disimpan!");
    } catch {
      toast.error("Gagal menyimpan anotasi");
    } finally {
      setIsSaving(false);
    }
  }, [buildPayload, id]);

  // ── Simpan halaman saat ini sebelum pindah halaman ──────────────────────
  const handlePageChange = async (newPage: number) => {
    if (newPage === currentPage) return;
    // Simpan dulu kalau ada perubahan
    const payload = buildPayload();
    if (payload && !isReadOnly) {
      annotationAPI.savePage(id, payload).catch(() => {});
    }
    setCurrentPage(newPage);
  };

  // ── Request revisi ──────────────────────────────────────────────────────
  // PERBAIKAN BUG: RevisionRequestModal mengirim { notes, file, mode } (lihat
  // komentar "PERUBAHAN" di file itu), tapi mutationFn di sini sebelumnya
  // hanya menerima `notes` sebagai string polos. Akibatnya seluruh objek
  // {notes, file, mode} akan terkirim ke backend sebagai field "notes" —
  // backend Go akan menolak/salah-parsing karena mengharapkan string, bukan
  // objek. Diperbaiki dengan destructuring payload yang benar.
  const { mutate: requestRevision, isPending: isRevPending } = useMutation({
    mutationFn: async ({ notes }: RevisionSubmitPayload) => {
      // 1. ambil canvas terakhir
      const payload = buildPayload();

      // 2. simpan annotation dulu (WAJIB)
      if (payload) {
        await annotationAPI.savePage(id, payload);
      }

      // 3. baru update status revisi
      return financeAPI.updateStatus(id, {
        status: "revision_requested",
        notes,
      });
    },

    onSuccess: () => {
      toast.success("Permintaan revisi berhasil dikirim ke Buyer!");
      qc.invalidateQueries({ queryKey: ["document", id] });
      setShowRevModal(false);
      router.push(`/finance/documents/${id}`);
    },

    onError: () => {
      toast.error("Gagal mengirim permintaan revisi");
    },
  });

  // ── Approve ─────────────────────────────────────────────────────────────
  const { mutate: approveDoc, isPending: isApprovePending } = useMutation({
    mutationFn: () =>
      financeAPI.updateStatus(id, {
        status: "approved",
        notes: "Dokumen disetujui oleh keuangan",
      }),
    onSuccess: () => {
      toast.success("Dokumen berhasil disetujui!");
      qc.invalidateQueries({ queryKey: ["document", id] });
      router.push(`/finance/documents/${id}`);
    },
    onError: () => toast.error("Gagal menyetujui dokumen"),
  });

  // ── Keyboard shortcut ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
          fabricRef.current?.deleteSelected();
        }
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleManualSave]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h))] -m-4 lg:-m-6 overflow-hidden">
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5
                       bg-white border-b border-gray-100 flex-shrink-0 gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => router.push(`/finance/documents/${id}`)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700
                       hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {doc?.title ?? "Memuat..."}
            </p>
            <p className="text-[11px] text-gray-400">
              {doc?.buyer?.name} · v{doc?.current_version}
            </p>
          </div>
          {doc && <StatusBadge status={doc.status} />}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          <button
            onClick={() => setScale((s) => Math.max(0.8, s - 0.2))}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700
                       hover:bg-white transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-medium text-gray-600 min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700
                       hover:bg-white transition-colors"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Approve button - simpan anotasi dulu sebelum setujui */}
        {!isReadOnly && (
          <button
            onClick={async () => {
              // Simpan semua anotasi terlebih dahulu sebelum setujui
              const payload = buildPayload();
              if (payload) {
                try { await annotationAPI.savePage(id, payload); } catch {}
              }
              approveDoc();
            }}
            disabled={isApprovePending}
            className="
              flex items-center gap-1.5 px-4 py-2 rounded-lg
              text-sm font-medium text-white
              bg-green-600 hover:bg-green-700
              disabled:opacity-50 transition-colors
            "
          >
            {isApprovePending ? "..." : "✓ Setujui"}
          </button>
        )}

        {/* Minta Revisi — langsung kirim, tidak perlu buka modal lagi
            karena kita sudah berada di mode anotasi */}
        {!isReadOnly && (
          <button
            onClick={async () => {
              // 1. Simpan anotasi final
              const payload = buildPayload();
              if (payload) {
                setIsSaving(true);
                try { await annotationAPI.savePage(id, payload); setSavedAt(new Date()); }
                catch { toast.error("Gagal menyimpan anotasi — coba lagi"); setIsSaving(false); return; }
                setIsSaving(false);
              }
              // 2. Kirim permintaan revisi ke Buyer
              requestRevision({ notes: "Silakan cek anotasi pada dokumen untuk detail revisi.", file: null, mode: "annotate" });
            }}
            disabled={isRevPending || isSaving}
            className="
              flex items-center gap-1.5 px-4 py-2 rounded-lg
              text-sm font-medium text-white
              bg-red-500 hover:bg-red-600
              disabled:opacity-50 transition-colors
            "
          >
            {isRevPending || isSaving ? "Mengirim..." : "⚑ Minta Revisi"}
          </button>
        )}
      </div>

      {/* ── Toolbar anotasi ── */}
      {!isReadOnly && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
          <AnnotationToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            activeColor={activeColor}
            onColorChange={setActiveColor}
            onDelete={() => fabricRef.current?.deleteSelected()}
            onSave={handleManualSave}
            isSaving={isSaving}
            savedAt={savedAt}
            onRequestRevision={() => setShowRevModal(true)}
          />
        </div>
      )}

      {/* ── Main content: sidebar + PDF + canvas ── */}
      <div className="flex flex-1 min-h-0">
        {/* Page navigator sidebar */}
        <div
          className="w-20 flex-shrink-0 border-r border-gray-100
                         bg-white overflow-hidden"
        >
          {pdfDoc && (
            <PageNavigator
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              annotatedPages={annotatedPages}
            />
          )}
        </div>

        {/* PDF + canvas area */}
        <div className="flex-1 overflow-auto bg-gray-100 flex justify-center py-6 px-4">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-8 h-8 border-2 border-green-500 border-t-transparent
                                 rounded-full animate-spin"
                />
                <p className="text-sm text-gray-400">Memuat PDF...</p>
              </div>
            </div>
          ) : pdfDoc ? (
            <div
              className="relative shadow-xl"
              style={{ display: "inline-block" }}
            >
              {/* PDF render */}
              <PDFPageRenderer
                pdfDoc={pdfDoc}
                pageNumber={currentPage}
                scale={scale}
                onRendered={handlePDFRendered}
              />

              {/* Fabric canvas di atas PDF */}
              {canvasSize.w > 0 && (
                <FabricCanvas
                  ref={fabricRef}
                  width={canvasSize.w}
                  height={canvasSize.h}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  onModified={handleCanvasModified}
                  readOnly={isReadOnly}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Tidak bisa memuat PDF
            </div>
          )}
        </div>
      </div>

      {/* ── Modal request revisi ── */}
      <RevisionRequestModal
        isOpen={showRevModal}
        onClose={() => setShowRevModal(false)}
        isLoading={isRevPending}
        onSubmit={requestRevision}
      />
    </div>
  );
}
