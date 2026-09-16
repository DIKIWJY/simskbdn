"use client";

import { useEffect, useRef, useState } from "react";
import { pdfjs } from "react-pdf";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Re-export dengan nama yang lebih deskriptif untuk dipakai komponen lain
// (DocumentAnnotatorClient, AP2DocumentAnnotatorClient) tanpa perlu tahu
// detail import dari pdfjs-dist langsung.
export type PDFDocumentLike = PDFDocumentProxy;

interface PDFPageRendererProps {
  pdfDoc: PDFDocumentLike | null;
  pageNumber: number;
  scale?: number;
  /** callback(canvas, width, height) setelah render selesai */
  onRendered?: (canvas: HTMLCanvasElement, width: number, height: number) => void;
}

export default function PDFPageRenderer({
  pdfDoc,
  pageNumber,
  scale = 1.5,
  onRendered,
}: PDFPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<RenderTask | null>(null); // simpan render task agar bisa di-cancel
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Cancel render sebelumnya kalau belum selesai
        if (renderRef.current) {
          await Promise.resolve(renderRef.current.cancel()).catch(() => {});
        }

        renderRef.current = page.render({
          canvasContext: ctx,
          viewport,
        });

        await renderRef.current.promise;
        if (!cancelled && onRendered) {
          onRendered(canvas, viewport.width, viewport.height);
        }
      } catch (err) {
        const isCancelled = err instanceof Error && err.name === "RenderingCancelledException";
        if (!cancelled && !isCancelled) {
          setError("Gagal render halaman PDF");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div className="relative">
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center
                         bg-white/80 z-10 rounded"
        >
          <div
            className="w-6 h-6 border-2 border-green-500 border-t-transparent
                           rounded-full animate-spin"
          />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-48 text-sm text-red-400">
          {error}
        </div>
      )}
      <canvas ref={canvasRef} className="block shadow-sm" />
    </div>
  );
}

// CATATAN AUDIT: fungsi di bawah ini tidak dipanggil dari mana pun di dalam
// file ini (tidak di-export juga) — sepertinya sisa kode dari iterasi
// sebelumnya. Diikutkan apa adanya sesuai kode asli, hanya diberi tipe.
async function handleDownload(fileUrl: string): Promise<void> {
  try {
    const res = await fetch(fileUrl);

    if (!res.ok) throw new Error("Download failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileUrl.split("/").pop() || "document.pdf";

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
  }
}
