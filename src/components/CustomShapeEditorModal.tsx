"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import {
  type CustomPart,
  type CustomPartShape,
  type SavedCustomShape,
  createPresetPartsWithIds,
  getPartClipPath,
  CUSTOM_PRESET_HEART,
  CUSTOM_PRESET_STAR,
  CUSTOM_PRESET_TRAPEZOID,
  CUSTOM_PRESET_DIAMOND,
  DEFAULT_OVERLAY_COLOR,
} from "@/app/panel/lib/panelTypes";

const CANVAS_SIZE = 320;
const MIN_PART = 4;
const DEFAULT_PART_SIZE = 14;

function partId(): string {
  return `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneParts(parts: CustomPart[]): CustomPart[] {
  return parts.map((p) => ({ ...p, id: partId() }));
}

export interface CustomShapeEditorModalProps {
  open: boolean;
  initialParts?: CustomPart[];
  savedTemplates: SavedCustomShape[];
  onConfirm: (parts: CustomPart[]) => void;
  onCancel: () => void;
  onSaveTemplate: (name: string, parts: CustomPart[]) => void;
  isLightMode?: boolean;
}

export default function CustomShapeEditorModal({
  open,
  initialParts = [],
  savedTemplates,
  onConfirm,
  onCancel,
  onSaveTemplate,
  isLightMode = false,
}: CustomShapeEditorModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [parts, setParts] = useState<CustomPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [addShape, setAddShape] = useState<CustomPartShape | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const dragRef = useRef<{ id: string; startX: number; startY: number; startPX: number; startPY: number } | null>(null);
  const resizeRef = useRef<{
    id: string;
    handle: "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w";
    startX: number;
    startY: number;
    startOX: number;
    startOY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSaveTemplate) setShowSaveTemplate(false);
        else onCancel();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, showSaveTemplate, onCancel]);

  useEffect(() => {
    if (!open) return;
    const nextParts = initialParts.length ? cloneParts(initialParts) : [];
    const id = requestAnimationFrame(() => {
      setParts(nextParts);
      setSelectedPartId(null);
      setAddShape(null);
      setShowSaveTemplate(false);
      setTemplateName("");
    });
    return () => cancelAnimationFrame(id);
  }, [open, initialParts]);

  const getRect = useCallback(() => canvasRef.current?.getBoundingClientRect() ?? null, []);
  const clientToPct = useCallback(
    (clientX: number, clientY: number) => {
      const rect = getRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    [getRect]
  );

  const handleAddPartAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!addShape) return;
      const { x, y } = clientToPct(clientX, clientY);
      const px = Math.max(0, Math.min(100 - DEFAULT_PART_SIZE, x - DEFAULT_PART_SIZE / 2));
      const py = Math.max(0, Math.min(100 - DEFAULT_PART_SIZE, y - DEFAULT_PART_SIZE / 2));
      const newPart: CustomPart = {
        id: partId(),
        shape: addShape,
        x: px,
        y: py,
        width: DEFAULT_PART_SIZE,
        height: DEFAULT_PART_SIZE,
        color: DEFAULT_OVERLAY_COLOR,
      };
      if (addShape === "triangle") newPart.triangleKind = "rightTop";
      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(newPart.id);
      setAddShape(null);
    },
    [addShape, clientToPct]
  );

  const loadPreset = useCallback((preset: Omit<CustomPart, "id">[]) => {
    setParts(createPresetPartsWithIds(preset));
    setSelectedPartId(null);
    setAddShape(null);
  }, []);

  const loadTemplate = useCallback((t: SavedCustomShape) => {
    setParts(cloneParts(t.parts));
    setSelectedPartId(null);
    setAddShape(null);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const name = templateName.trim() || "カスタム図形";
    onSaveTemplate(name, parts);
    setShowSaveTemplate(false);
    setTemplateName("");
  }, [templateName, parts, onSaveTemplate]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, part?: CustomPart) => {
      if (e.button !== 0) return;
      const handle = (e.target as HTMLElement).closest("[data-handle]")?.getAttribute("data-handle");
      const rect = getRect();
      if (!rect) return;

      if (part && handle && ["se", "sw", "ne", "nw", "n", "s", "e", "w"].includes(handle)) {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        resizeRef.current = {
          id: part.id,
          handle: handle as "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w",
          startX: e.clientX,
          startY: e.clientY,
          startOX: part.x,
          startOY: part.y,
          startW: part.width,
          startH: part.height,
        };
        return;
      }

      if (part && selectedPartId === part.id) {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragRef.current = { id: part.id, startX: e.clientX, startY: e.clientY, startPX: part.x, startPY: part.y };
        return;
      }

      if (part) {
        setSelectedPartId(part.id);
        return;
      }

      const { x, y } = clientToPct(e.clientX, e.clientY);
      if (addShape && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        e.preventDefault();
        handleAddPartAt(e.clientX, e.clientY);
        return;
      }
      setSelectedPartId(null);
      setAddShape(null);
    },
    [getRect, selectedPartId, addShape, clientToPct, handleAddPartAt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = getRect();
      if (!rect) return;

      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = ((e.clientX - r.startX) / rect.width) * 100;
        const dy = ((e.clientY - r.startY) / rect.height) * 100;
        const { handle, startOX, startOY, startW, startH } = r;
        let x = startOX;
        let y = startOY;
        let w = startW;
        let h = startH;
        if (handle === "se") {
          w = Math.max(MIN_PART, startW + dx);
          h = Math.max(MIN_PART, startH + dy);
        } else if (handle === "sw") {
          x = startOX + dx;
          w = Math.max(MIN_PART, startW - dx);
          h = Math.max(MIN_PART, startH + dy);
        } else if (handle === "ne") {
          y = startOY + dy;
          w = Math.max(MIN_PART, startW + dx);
          h = Math.max(MIN_PART, startH - dy);
        } else if (handle === "nw") {
          x = startOX + dx;
          y = startOY + dy;
          w = Math.max(MIN_PART, startW - dx);
          h = Math.max(MIN_PART, startH - dy);
        } else if (handle === "n") {
          y = startOY + dy;
          h = Math.max(MIN_PART, startH - dy);
        } else if (handle === "s") h = Math.max(MIN_PART, startH + dy);
        else if (handle === "e") w = Math.max(MIN_PART, startW + dx);
        else if (handle === "w") {
          x = startOX + dx;
          w = Math.max(MIN_PART, startW - dx);
        }
        x = Math.max(0, Math.min(100 - w, x));
        y = Math.max(0, Math.min(100 - h, y));
        setParts((prev) =>
          prev.map((p) => (p.id === r.id ? { ...p, x, y, width: w, height: h } : p))
        );
        return;
      }

      if (dragRef.current) {
        const { x: px, y: py } = clientToPct(e.clientX, e.clientY);
        const startPctX = ((dragRef.current.startX - rect.left) / rect.width) * 100;
        const startPctY = ((dragRef.current.startY - rect.top) / rect.height) * 100;
        const dx = px - startPctX;
        const dy = py - startPctY;
        const part = parts.find((p) => p.id === dragRef.current!.id);
        if (part) {
          const nx = dragRef.current.startPX + dx;
          const ny = dragRef.current.startPY + dy;
          const w = part.width;
          const h = part.height;
          const fx = Math.max(0, Math.min(100 - w, nx));
          const fy = Math.max(0, Math.min(100 - h, ny));
          setParts((prev) =>
            prev.map((p) => (p.id === dragRef.current!.id ? { ...p, x: fx, y: fy } : p))
          );
        }
      }
    },
    [getRect, parts, clientToPct]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    if (parts.length) onConfirm(parts);
    else onCancel();
  }, [parts, onConfirm, onCancel]);

  if (!open) return null;

  const bg = isLightMode ? "bg-white" : "bg-gray-900";
  const border = isLightMode ? "border-gray-200" : "border-gray-700";
  const text = isLightMode ? "text-gray-900" : "text-white";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`${bg} rounded-xl shadow-xl border ${border} max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-3 border-b ${border}`}>
            <h2 className={`text-lg font-semibold ${text}`}>カスタム図形の編集</h2>
            <p className={`text-sm opacity-80 mt-0.5 ${text}`}>
              四角・丸・三角を組み合わせて1つの図形にします。組み合わせた図形の重心に文字が表示されます。
            </p>
          </div>

          <div className={`p-3 flex flex-wrap items-center gap-2 border-b ${border}`}>
            <span className="text-xs opacity-70">追加:</span>
            {(["rect", "circle", "triangle"] as const).map((shape) => (
              <button
                key={shape}
                type="button"
                onClick={() => setAddShape(addShape === shape ? null : shape)}
                className={`px-2 py-1 rounded text-xs border ${addShape === shape ? "bg-violet-500/30 border-violet-500 text-white" : isLightMode ? "border-gray-300 text-gray-700" : "border-gray-600 text-white/90"}`}
              >
                {shape === "rect" ? "四角" : shape === "circle" ? "丸" : "三角"}
              </button>
            ))}
            {selectedPartId && (
              <button
                type="button"
                onClick={() => {
                  setParts((prev) => prev.filter((p) => p.id !== selectedPartId));
                  setSelectedPartId(null);
                }}
                className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1"
              >
                <Trash2 size={12} /> 削除
              </button>
            )}
            <span className="text-xs opacity-70 ml-2">プリセット:</span>
            <button
              type="button"
              onClick={() => loadPreset(CUSTOM_PRESET_HEART)}
              className="px-2 py-1 rounded text-xs border border-pink-500/40 bg-pink-500/10 text-pink-400"
            >
              ♡
            </button>
            <button
              type="button"
              onClick={() => loadPreset(CUSTOM_PRESET_STAR)}
              className="px-2 py-1 rounded text-xs border border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              ☆
            </button>
            <button
              type="button"
              onClick={() => loadPreset(CUSTOM_PRESET_TRAPEZOID)}
              className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400"
            >
              台形
            </button>
            <button
              type="button"
              onClick={() => loadPreset(CUSTOM_PRESET_DIAMOND)}
              className="px-2 py-1 rounded text-xs border border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
            >
              ひし形
            </button>
          </div>

          {savedTemplates.length > 0 && (
            <div className={`p-3 flex flex-wrap items-center gap-2 border-b ${border}`}>
              <span className="text-xs opacity-70">保存済み:</span>
              <select
                className="px-2 py-1 rounded text-sm border bg-transparent"
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) {
                    const t = savedTemplates.find((x) => x.id === id);
                    if (t) loadTemplate(t);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">選択...</option>
                {savedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowSaveTemplate(true)}
                className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400"
              >
                テンプレートに保存
              </button>
            </div>
          )}

          {!savedTemplates.length && (
            <div className={`px-3 py-2 border-b ${border}`}>
              <button
                type="button"
                onClick={() => setShowSaveTemplate(true)}
                className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400"
              >
                テンプレートに保存
              </button>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 flex justify-center">
            <div
              ref={canvasRef}
              className="relative rounded-lg overflow-hidden border-2 border-dashed border-violet-500/40"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, aspectRatio: "1" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {parts.map((part) => {
                const selected = selectedPartId === part.id;
                const color = part.color ?? DEFAULT_OVERLAY_COLOR;
                const clipPath = getPartClipPath(part);
                const rot = part.rotation ?? 0;
                return (
                  <div
                    key={part.id}
                    className="absolute cursor-pointer select-none"
                    style={{
                      left: `${part.x}%`,
                      top: `${part.y}%`,
                      width: `${part.width}%`,
                      height: `${part.height}%`,
                      transform: `rotate(${rot}deg)`,
                      transformOrigin: "center center",
                      background: color,
                      border: selected ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.4)",
                      borderRadius: part.shape === "circle" ? "50%" : part.shape === "rect" ? 0 : 4,
                      clipPath: clipPath ?? undefined,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, part)}
                  >
                    {selected && (
                      <>
                        {(["se", "sw", "ne", "nw"] as const).map((h) => (
                          <div
                            key={h}
                            data-handle={h}
                            className="absolute w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-white cursor-nwse-resize"
                            style={{
                              top: h.includes("n") ? -4 : undefined,
                              bottom: h.includes("s") ? -4 : undefined,
                              left: h.includes("w") ? -4 : undefined,
                              right: h.includes("e") ? -4 : undefined,
                              zIndex: 10,
                            }}
                          />
                        ))}
                        {(["n", "s", "e", "w"] as const).map((h) => (
                          <div
                            key={h}
                            data-handle={h}
                            className="absolute w-2 h-2 rounded-full bg-violet-500 border-2 border-white cursor-pointer"
                            style={{
                              top: h === "n" ? -3 : h === "s" ? undefined : "50%",
                              bottom: h === "s" ? -3 : undefined,
                              left: h === "w" ? -3 : h === "e" ? undefined : "50%",
                              right: h === "e" ? -3 : undefined,
                              transform: h === "n" || h === "s" ? "translateX(-50%)" : "translateY(-50%)",
                              zIndex: 10,
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm hover:bg-violet-600"
            >
              保存して閉じる
            </button>
          </div>
        </motion.div>
      </motion.div>

      {showSaveTemplate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowSaveTemplate(false)}
        >
          <div
            className={`${bg} rounded-xl p-4 shadow-xl border ${border} max-w-sm w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-sm font-semibold ${text}`}>テンプレートに保存</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="名前を入力"
              className={`mt-2 w-full px-3 py-2 rounded border text-sm ${isLightMode ? "border-gray-300" : "border-gray-600 bg-gray-800 text-white"}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSaveTemplate(false)} className="px-3 py-1.5 rounded border text-sm">
                キャンセル
              </button>
              <button type="button" onClick={handleSaveTemplate} className="px-3 py-1.5 rounded bg-violet-500 text-white text-sm">
                保存
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
