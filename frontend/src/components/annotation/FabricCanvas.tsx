"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { fabric } from "fabric";

// Patch Fabric.js agar setiap object punya ID unik
fabric.Object.prototype.toObject = (function (toObject) {
  return function (
    this: fabric.Object,
    propertiesToInclude?: string[],
  ): Record<string, unknown> {
    return toObject.call(this, ["id", ...(propertiesToInclude || [])]);
  };
})(fabric.Object.prototype.toObject);

export type AnnotationTool =
  | "select"
  | "highlight"
  | "strikethrough"
  | "rectangle"
  | "text"
  | "arrow"
  | "freehand";

export interface FabricCanvasHandle {
  loadJSON: (json: { objects?: unknown[] } & Record<string, unknown>) => void;
  getJSON: () => Record<string, unknown>;
  deleteSelected: () => void;
  clear: () => void;
  getObjects: () => fabric.Object[];
}

interface FabricCanvasProps {
  width: number;
  height: number;
  activeTool: AnnotationTool;
  activeColor: string;
  onModified?: () => void;
  readOnly?: boolean;
}

const FabricCanvas = forwardRef<FabricCanvasHandle, FabricCanvasProps>(
  (
    {
      width,
      height,
      activeTool,
      activeColor,
      onModified,
      readOnly = false,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const isDrawing = useRef(false);
    const startPoint = useRef({ x: 0, y: 0 });
    const activeObj = useRef<fabric.Object | null>(null);

    // Expose methods ke parent via ref
    useImperativeHandle(ref, () => ({
      // Load JSON anotasi ke canvas
      loadJSON: (json) => {
        if (!fabricRef.current || !json?.objects) return;
        fabricRef.current.loadFromJSON(json, () => {
          fabricRef.current?.renderAll();
          if (readOnly) {
            fabricRef.current?.getObjects().forEach((obj) => {
              obj.selectable = false;
              obj.evented = false;
            });
          }
        });
      },
      // Export canvas ke JSON
      getJSON: () => fabricRef.current?.toJSON(["id"]) ?? { objects: [] },
      // Hapus objek terpilih
      deleteSelected: () => {
        const obj = fabricRef.current?.getActiveObject();
        if (obj && fabricRef.current) {
          fabricRef.current.remove(obj);
          fabricRef.current.renderAll();
          onModified?.();
        }
      },
      // Clear semua anotasi
      clear: () => {
        fabricRef.current?.clear();
        fabricRef.current?.renderAll();
        onModified?.();
      },
      // Ambil semua objek untuk summary
      getObjects: () => fabricRef.current?.getObjects() ?? [],
    }));

    // Init Fabric canvas
    useEffect(() => {
      if (!canvasRef.current || !width || !height) return;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        selection: !readOnly,
        renderOnAddRemove: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // Styling default selection
      canvas.selectionColor = "rgba(99,102,241,0.05)";
      canvas.selectionBorderColor = "#6366f1";
      canvas.selectionLineWidth = 1;

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }, [width, height, readOnly]);

    // ─── Logika drawing per tool ───────────────────────────────────────────
    const genId = () =>
      `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const addText = useCallback(
      (x: number, y: number) => {
        if (!fabricRef.current) return;
        const text = new fabric.IText("Ketik komentar...", {
          id: genId(),
          left: x,
          top: y,
          fontSize: 13,
          fontFamily: "Geist, sans-serif",
          fill: activeColor,
          backgroundColor: "rgba(255,255,255,0.85)",
          padding: 6,
          borderRadius: 4,
          editable: true,
        });
        fabricRef.current.add(text);
        fabricRef.current.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        onModified?.();
      },
      [activeColor, onModified],
    );

    // Mouse down
    const handleMouseDown = useCallback(
      (opt: fabric.FabricEvent) => {
        if (readOnly) return;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const p = canvas.getPointer(opt.e);

        if (activeTool === "text") {
          addText(p.x, p.y);
          return;
        }

        if (
          (
            [
              "highlight",
              "strikethrough",
              "rectangle",
              "arrow",
              "freehand",
            ] as AnnotationTool[]
          ).includes(activeTool)
        ) {
          canvas.isDrawingMode = activeTool === "freehand";
          if (activeTool === "freehand") {
            canvas.freeDrawingBrush.color = activeColor;
            canvas.freeDrawingBrush.width = 3;
            return;
          }
          canvas.isDrawingMode = false;
          isDrawing.current = true;
          startPoint.current = { x: p.x, y: p.y };

          // Buat objek preview
          if (activeTool === "highlight") {
            activeObj.current = new fabric.Rect({
              id: genId(),
              left: p.x,
              top: p.y,
              width: 1,
              height: 20,
              fill: hexToRgba(activeColor, 0.35),
              stroke: activeColor,
              strokeWidth: 0,
              selectable: true,
              opacity: 0.8,
            });
          } else if (activeTool === "strikethrough") {
            activeObj.current = new fabric.Line([p.x, p.y, p.x, p.y], {
              id: genId(),
              stroke: activeColor,
              strokeWidth: 3,
              selectable: true,
              strokeLineCap: "round",
            });
          } else if (activeTool === "rectangle") {
            activeObj.current = new fabric.Rect({
              id: genId(),
              left: p.x,
              top: p.y,
              width: 1,
              height: 1,
              fill: "transparent",
              stroke: activeColor,
              strokeWidth: 2,
              selectable: true,
            });
          } else if (activeTool === "arrow") {
            activeObj.current = new fabric.Line([p.x, p.y, p.x, p.y], {
              id: genId(),
              stroke: activeColor,
              strokeWidth: 2.5,
              selectable: true,
              strokeLineCap: "round",
            });
          }

          if (activeObj.current) canvas.add(activeObj.current);
        }
      },
      [activeTool, activeColor, readOnly, addText],
    );

    // Mouse move
    const handleMouseMove = useCallback(
      (opt: fabric.FabricEvent) => {
        if (!isDrawing.current || !activeObj.current) return;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const p = canvas.getPointer(opt.e);
        const { x: sx, y: sy } = startPoint.current;

        if (activeTool === "highlight") {
          const w = p.x - sx;
          activeObj.current.set({ width: Math.max(w, 1), scaleX: 1 });
        } else if (activeTool === "strikethrough") {
          activeObj.current.set({ x2: p.x, y2: sy });
        } else if (activeTool === "rectangle") {
          const left = Math.min(sx, p.x);
          const top = Math.min(sy, p.y);
          activeObj.current.set({
            left,
            top,
            width: Math.abs(p.x - sx),
            height: Math.abs(p.y - sy),
          });
        } else if (activeTool === "arrow") {
          activeObj.current.set({ x2: p.x, y2: p.y });
        }
        canvas.renderAll();
      },
      [activeTool],
    );

    // Mouse up
    const handleMouseUp = useCallback(() => {
      if (!isDrawing.current) return;
      isDrawing.current = false;

      // Hapus objek yang terlalu kecil (mis: klik tanpa drag)
      if (activeObj.current) {
        const obj = activeObj.current;
        const tooSmall =
          (obj.type === "rect" &&
            ((obj.width ?? 0) < 5 || (obj.height ?? 0) < 5)) ||
          (obj.type === "line" &&
            Math.abs((obj.x2 ?? 0) - (obj.x1 ?? 0)) < 5 &&
            Math.abs((obj.y2 ?? 0) - (obj.y1 ?? 0)) < 5);

        if (tooSmall) {
          fabricRef.current?.remove(obj);
        } else {
          onModified?.();
        }
        activeObj.current = null;
      }
    }, [onModified]);

    // Pasang event listeners ke canvas
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || readOnly) return;

      canvas.on("mouse:down", handleMouseDown);
      canvas.on("mouse:move", handleMouseMove);
      canvas.on("mouse:up", handleMouseUp);
      canvas.on("object:modified", () => onModified?.());
      canvas.on("path:created", (e) => {
        if (e.path) e.path.id = genId();
        onModified?.();
      });

      // Mode select: bisa klik & drag object
      canvas.isDrawingMode = activeTool === "freehand";
      canvas.selection = activeTool === "select";

      return () => {
        canvas.off("mouse:down");
        canvas.off("mouse:move");
        canvas.off("mouse:up");
        canvas.off("object:modified");
        canvas.off("path:created");
      };
    }, [
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      activeTool,
      onModified,
      readOnly,
    ]);

    // Update cursor sesuai tool
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const cursors: Record<AnnotationTool, string> = {
        select: "default",
        highlight: "crosshair",
        strikethrough: "crosshair",
        rectangle: "crosshair",
        text: "text",
        arrow: "crosshair",
        freehand: "pencil",
      };
      canvas.defaultCursor = cursors[activeTool] || "default";
    }, [activeTool]);

    return (
      <div
        className="absolute top-0 left-0"
        style={{
          width,
          height,
          pointerEvents: readOnly ? "none" : "auto",
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    );
  },
);

FabricCanvas.displayName = "FabricCanvas";
export default FabricCanvas;

// Helper: hex → rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
