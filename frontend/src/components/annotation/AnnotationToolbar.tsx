"use client";

import { useState } from "react";
import {
  MousePointer2,
  Highlighter,
  Strikethrough,
  Square,
  Type,
  ArrowRight,
  PenLine,
  Trash2,
  Undo2,
  Save,
  CheckCircle2,
  Loader2,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import type { AnnotationTool } from "./FabricCanvas";

interface ToolDef {
  id: AnnotationTool;
  icon: LucideIcon;
  label: string;
  group: "nav" | "draw";
}

const TOOLS: ToolDef[] = [
  { id: "select", icon: MousePointer2, label: "Pilih", group: "nav" },
  { id: "highlight", icon: Highlighter, label: "Highlight", group: "draw" },
  { id: "strikethrough", icon: Strikethrough, label: "Coret", group: "draw" },
  { id: "rectangle", icon: Square, label: "Kotak", group: "draw" },
  { id: "text", icon: Type, label: "Teks", group: "draw" },
  { id: "arrow", icon: ArrowRight, label: "Panah", group: "draw" },
  { id: "freehand", icon: PenLine, label: "Bebas", group: "draw" },
];

const PRESET_COLORS = [
  "#EF4444", // merah
  "#F97316", // oranye
  "#EAB308", // kuning
  "#22C55E", // hijau
  "#3B82F6", // biru
  "#8B5CF6", // ungu
  "#EC4899", // pink
  "#14B8A6", // teal
];

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (toolId: AnnotationTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onSave: () => void;
  isSaving: boolean;
  savedAt?: string | Date | null;
  onRequestRevision?: () => void;
}

export default function AnnotationToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  onDelete,
  onSave,
  isSaving,
  savedAt,
  onRequestRevision,
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const formatTime = (date?: string | Date | null): string | null => {
    if (!date) return null;
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div
      className="
      flex items-center gap-2 flex-wrap
      bg-white border border-gray-100 rounded-xl
      shadow-sm px-3 py-2.5
    "
    >
      {/* ── Tool buttons ── */}
      <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              title={tool.label}
              className={`
                p-2 rounded-md transition-all duration-150
                ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white/60"
                }
              `}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      {/* ── Divider ── */}
      <div className="w-px h-6 bg-gray-200" />

      {/* ── Color picker ── */}
      <div className="relative">
        <div className="flex items-center gap-1.5">
          {/* Warna preset */}
          {PRESET_COLORS.slice(0, 5).map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`
                w-5 h-5 rounded-full transition-all duration-150 flex-shrink-0
                ${
                  activeColor === color
                    ? "ring-2 ring-offset-1 ring-gray-400 scale-110"
                    : "hover:scale-110"
                }
              `}
              style={{ background: color }}
              title={color}
            />
          ))}

          {/* More colors */}
          <button
            onClick={() => setShowColorPicker((s) => !s)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg
                       bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500"
            title="Warna lain"
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-gray-300"
              style={{ background: activeColor }}
            />
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Color picker popup */}
        {showColorPicker && (
          <div
            className="absolute top-full left-0 mt-2 z-50 bg-white
                           rounded-xl shadow-xl border border-gray-100 p-3"
          >
            <HexColorPicker
              color={activeColor}
              onChange={onColorChange}
              style={{ width: "180px" }}
            />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onColorChange(c);
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                  style={{ background: c }}
                />
              ))}
            </div>
            <button
              onClick={() => setShowColorPicker(false)}
              className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="w-px h-6 bg-gray-200" />

      {/* ── Aksi canvas ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDelete}
          title="Hapus objek terpilih (Del)"
          className="p-2 rounded-lg text-gray-400 hover:text-red-500
                     hover:bg-red-50 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Status save ── */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            Menyimpan...
          </div>
        ) : savedAt ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 size={12} />
            Tersimpan {formatTime(savedAt)}
          </div>
        ) : null}

        {/* Manual save */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            text-xs font-medium
            bg-gray-50 hover:bg-gray-100 text-gray-700
            border border-gray-200
            transition-all disabled:opacity-50
          "
        >
          <Save size={13} />
          Simpan
        </button>

        {/* Kirim revisi */}
        {onRequestRevision && (
          <button
            onClick={onRequestRevision}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-medium text-white
              bg-red-500 hover:bg-red-600
              transition-all
            "
          >
            Minta Revisi
          </button>
        )}
      </div>
    </div>
  );
}
