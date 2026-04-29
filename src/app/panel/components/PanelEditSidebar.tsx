"use client";

import { useRef } from "react";
import { ImagePlus, Pencil, Hand } from "lucide-react";
import type { PanelState, PanelOverlay, PartitionStroke, FilterType, OverlayShape } from "../lib/panelTypes";
import { DEFAULT_OVERLAY_COLOR } from "../lib/panelTypes";
import { parseHexToRgb, rgbToHex, normalizeHex, rgbToHsl, hslToRgb } from "../lib/panelUtils";
import RotationDial from "./RotationDial";

export type PanelSidebarTabId = "image" | "lines" | "overlay" | "shapes";

export interface PanelEditSidebarProps {
  tab: PanelSidebarTabId;
  setTab: (t: PanelSidebarTabId) => void;
  isLightMode: boolean;
  editSidebarRef: React.RefObject<HTMLDivElement | null>;
  effectiveSidebarWidth: number;
  // 画像タブ
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageOverlayInputRef: React.RefObject<HTMLInputElement | null>;
  imageDataUrl: string | null;
  setPendingCropDataUrl: (url: string | null) => void;
  // 線で切り分けタブ
  setPanelState: React.Dispatch<React.SetStateAction<PanelState>>;
  isLineStep: boolean;
  lineToolMode: "pen" | "hand";
  setLineToolMode: (m: "pen" | "hand") => void;
  lineSegmentMode: "line" | "curve";
  setLineSegmentMode: (m: "line" | "curve") => void;
  partitionStrokes: PartitionStroke[];
  setPartitionStrokes: (updater: (prev: PartitionStroke[]) => PartitionStroke[]) => void;
  selectedLineIndex: number | null;
  setSelectedLineIndex: (i: number | null) => void;
  onGenerateRegions: () => void;
  // 覆いタブ
  selectedOverlay: PanelOverlay | null;
  overlays: PanelOverlay[];
  setOverlays: (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => void;
  targetNumberDraft: { overlayId: string; value: string } | null;
  setTargetNumberDraft: React.Dispatch<React.SetStateAction<{ overlayId: string; value: string } | null>>;
  favoriteColors: string[];
  setFavoriteColors: React.Dispatch<React.SetStateAction<string[]>>;
  pushOverlayHistory: (overlays: PanelOverlay[]) => void;
  setSelectedOverlayId: (id: string | null) => void;
  setCustomShapeEditingId: (id: string | null) => void;
  setCustomShapeModalOpen: (open: boolean) => void;
  // 図形タブ
  addShape: OverlayShape | null;
  setAddShape: (s: OverlayShape | null) => void;
  setIsDrawingFree: (v: boolean) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  onAddOverlayAtPoint: (shape: "rect" | "circle" | "triangle", clientX: number, clientY: number) => void;
  onAddRectGrid: (cols: number, rows: number) => void;
  onAddTriangleStripes: (layers: number) => void;
  activeFilters: FilterType[];
  toggleFilter: (f: FilterType) => void;
  filterShowLabel: boolean;
  filterIntensity: number;
  setCustomShapeModalOpenForNew: () => void;
}

export default function PanelEditSidebar({
  tab,
  setTab,
  isLightMode,
  editSidebarRef,
  effectiveSidebarWidth,
  fileInputRef,
  imageOverlayInputRef,
  imageDataUrl,
  setPendingCropDataUrl,
  setPanelState,
  isLineStep,
  lineToolMode,
  setLineToolMode,
  lineSegmentMode,
  setLineSegmentMode,
  partitionStrokes,
  setPartitionStrokes,
  selectedLineIndex,
  setSelectedLineIndex,
  onGenerateRegions,
  selectedOverlay: o,
  overlays,
  setOverlays,
  targetNumberDraft,
  setTargetNumberDraft,
  favoriteColors,
  setFavoriteColors,
  pushOverlayHistory,
  setSelectedOverlayId,
  setCustomShapeEditingId,
  setCustomShapeModalOpen,
  addShape,
  setAddShape,
  setIsDrawingFree,
  captureRef,
  onAddOverlayAtPoint,
  onAddRectGrid,
  onAddTriangleStripes,
  activeFilters,
  toggleFilter,
  filterShowLabel,
  filterIntensity,
  setCustomShapeModalOpenForNew,
}: PanelEditSidebarProps) {
  const slSquareRef = useRef<HTMLDivElement>(null);
  const hStripRef = useRef<HTMLDivElement>(null);
  /** パレット上でドラッグ中か（リサイズ時の誤反応を防ぐ）。ドラッグ中は開始時の rect を使いレイアウト変化で色が飛ばないようにする */
  const colorPickerDraggingRef = useRef<"sl" | "h" | null>(null);
  const colorPickerRectRef = useRef<DOMRect | null>(null);
  return (
    <div
      ref={editSidebarRef}
      className="shrink-0 min-w-0 overflow-y-auto overflow-x-hidden border-r flex flex-col w-full"
      style={{
        width: effectiveSidebarWidth,
        minWidth: 200,
        maxWidth: 560,
        borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
      }}
    >
      {/* タブ: 画像 | 線で切り分け | 覆い | 図形 */}
      <div className="shrink-0 flex flex-wrap border-b p-1 gap-1" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
        <button
          type="button"
          onClick={() => setTab("image")}
          className={`flex-1 min-w-0 px-2 py-2 rounded text-sm font-medium transition-colors ${tab === "image" ? (isLightMode ? "bg-sky-500/25 text-sky-700 ring-1 ring-sky-500/40" : "bg-sky-500/30 text-sky-200 ring-1 ring-sky-400/50") : "opacity-70 hover:opacity-100"}`}
        >
          画像
        </button>
        <button
          type="button"
          onClick={() => setTab("lines")}
          className={`flex-1 min-w-0 px-2 py-2 rounded text-sm font-medium transition-colors ${tab === "lines" ? (isLightMode ? "bg-amber-500/25 text-amber-700 ring-1 ring-amber-500/40" : "bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50") : "opacity-70 hover:opacity-100"}`}
        >
          線で切り分け
        </button>
        <button
          type="button"
          onClick={() => setTab("overlay")}
          className={`flex-1 min-w-0 px-2 py-2 rounded text-sm font-medium transition-colors ${tab === "overlay" ? (isLightMode ? "bg-violet-500/20 text-violet-700" : "bg-violet-500/25 text-violet-200") : "opacity-70 hover:opacity-100"}`}
        >
          覆い
        </button>
        <button
          type="button"
          onClick={() => setTab("shapes")}
          className={`flex-1 min-w-0 px-2 py-2 rounded text-sm font-medium transition-colors ${tab === "shapes" ? (isLightMode ? "bg-violet-500/20 text-violet-700" : "bg-violet-500/25 text-violet-200") : "opacity-70 hover:opacity-100"}`}
        >
          図形
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-3 p-3 pb-10">
        {tab === "image" && (
          <>
            <div className="text-sm font-medium opacity-80 w-full">画像</div>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-sm border border-sky-500/40 bg-sky-500/10 text-sky-400"
              >
                <ImagePlus size={14} /> 画像を選択
              </button>
              <button
                onClick={() => imageOverlayInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 text-amber-400"
              >
                <ImagePlus size={14} /> 画像を追加
              </button>
              {imageDataUrl ? (
                <button
                  type="button"
                  onClick={() => setPendingCropDataUrl(imageDataUrl)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-sm border border-sky-500/40 bg-sky-500/10 text-sky-400"
                >
                  画像のトリミング
                </button>
              ) : null}
            </div>
          </>
        )}

        {tab === "lines" && (
          <>
            <div className="text-sm font-medium opacity-80 w-full">線で切り分け</div>
            <button
              type="button"
              onClick={() => setPanelState((s) => ({ ...s, panelEditStep: "lines" }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium border-2 border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25"
            >
              線で切り分けを開始
            </button>
            {isLineStep ? (
              <div className="w-full flex flex-col gap-2 pt-2 border-t" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
                <div className="text-sm font-medium opacity-80">線の編集</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLineToolMode("pen")}
                    title="ペン：線を引く"
                    className={`p-1.5 rounded border ${lineToolMode === "pen" ? "border-violet-500/60 bg-violet-500/20 text-violet-300" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineToolMode("hand")}
                    title="手：線を選択・移動"
                    className={`p-1.5 rounded border ${lineToolMode === "hand" ? "border-violet-500/60 bg-violet-500/20 text-violet-300" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <Hand size={18} />
                  </button>
                </div>
                {lineToolMode === "pen" && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLineSegmentMode("line")}
                      title="直線"
                      className={`px-2 py-1 rounded text-xs border ${lineSegmentMode === "line" ? "border-violet-500/50 bg-violet-500/15" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      直線
                    </button>
                    <button
                      type="button"
                      onClick={() => setLineSegmentMode("curve")}
                      title="曲線（2次ベジェ）"
                      className={`px-2 py-1 rounded text-xs border ${lineSegmentMode === "curve" ? "border-violet-500/50 bg-violet-500/15" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      曲線
                    </button>
                  </div>
                )}
                <div className="text-xs opacity-70">
                  {lineToolMode === "pen"
                    ? (lineSegmentMode === "curve" ? "ペン（曲線）：ドラッグで軌道に沿ったなめらかな曲線を引く" : "ペン（直線）：ドラッグで線を引く")
                    : "手：線をクリックで選択・ドラッグで移動・Deleteで削除"}
                </div>
                {selectedLineIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedLineIndex === null) return;
                      setPartitionStrokes((prev) => prev.filter((_, i) => i !== selectedLineIndex));
                      setSelectedLineIndex(null);
                    }}
                    className="px-2 py-1 rounded text-xs border border-red-500/40 bg-red-500/10 text-red-400"
                  >
                    選択中の線を削除
                  </button>
                )}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => { setPartitionStrokes((prev) => prev.slice(0, -1)); setSelectedLineIndex(null); }}
                    disabled={partitionStrokes.length === 0}
                    className="px-2 py-1 rounded text-xs border border-amber-500/40 bg-amber-500/10 text-amber-400 disabled:opacity-40"
                  >
                    やり直し（1本削除）
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPartitionStrokes(() => []); setSelectedLineIndex(null); }}
                    disabled={partitionStrokes.length === 0}
                    className="px-2 py-1 rounded text-xs border border-amber-500/40 bg-amber-500/10 text-amber-400 disabled:opacity-40"
                  >
                    クリア
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onGenerateRegions}
                  className="w-full px-3 py-2 rounded text-sm font-medium border border-violet-500/40 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                >
                  領域を生成
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedLineIndex(null); setPanelState((s) => ({ ...s, panelEditStep: "overlays" })); }}
                  className="w-full px-2 py-1 rounded text-xs opacity-70 hover:opacity-100"
                >
                  図形編集に戻る
                </button>
              </div>
            ) : null}
          </>
        )}

        {tab === "overlay" && (
          <>
            <div className="text-sm font-medium opacity-80 w-full">選択中の覆いを編集</div>
            {o ? (
              <div className="w-full min-w-0 flex flex-col gap-3">
                {o.shape !== "image" ? (
                  <>
                    <div className="w-full flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium shrink-0">何を:</span>
                      <input
                        type="text"
                        value={o.label ?? ""}
                        onChange={(e) => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, label: e.target.value } : p)))}
                        placeholder="例: 景品、コメント"
                        className="flex-1 min-w-[7rem] px-2 py-1 rounded border text-sm"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] opacity-70">サイズ:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={o.labelFontSize ?? 8}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, labelFontSize: val } : p)));
                          }}
                          className="w-12 px-1 py-0.5 rounded border text-[10px]"
                        />
                        <span className="text-[10px] opacity-70">pt</span>
                      </div>
                    </div>
                    <div className="w-full flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium shrink-0">目標:</span>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          checked={o.targetType === "number"}
                          onChange={() => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, targetType: "number" as const, targetText: "" } : p)))}
                        />
                        数値
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          checked={o.targetType === "text"}
                          onChange={() => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, targetType: "text" as const, target: 0, count: 0 } : p)))}
                        />
                        日本語
                      </label>
                    </div>
                    {o.targetType === "number" ? (
                      <input
                        type="number"
                        min={0}
                        value={targetNumberDraft?.overlayId === o.id ? targetNumberDraft.value : String(o.target)}
                        onFocus={() => setTargetNumberDraft({ overlayId: o.id, value: String(o.target) })}
                        onChange={(e) =>
                          setTargetNumberDraft((prev) =>
                            prev?.overlayId === o.id ? { ...prev, value: e.target.value } : { overlayId: o.id, value: e.target.value }
                          )
                        }
                        onBlur={() => {
                          if (targetNumberDraft?.overlayId !== o.id) return;
                          const n = Math.max(0, parseInt(targetNumberDraft.value, 10) || 0);
                          setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, target: n } : p)));
                          setTargetNumberDraft(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          if (targetNumberDraft?.overlayId !== o.id) return;
                          const n = Math.max(0, parseInt(targetNumberDraft.value, 10) || 0);
                          setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, target: n } : p)));
                          setTargetNumberDraft(null);
                          (e.target as HTMLInputElement).blur();
                        }}
                        className="w-16 px-2 py-1 rounded border text-sm shrink-0"
                      />
                    ) : (
                      <input
                        type="text"
                        value={o.targetText}
                        onChange={(e) => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, targetText: e.target.value } : p)))}
                        placeholder="目標テキスト"
                        className="flex-1 min-w-[120px] px-2 py-1 rounded border text-sm"
                      />
                    )}
                    <div className="w-full flex items-center gap-2">
                      <span className="text-sm font-medium shrink-0">文字サイズ:</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={o.fontSize ?? 10}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, fontSize: val } : p)));
                        }}
                        className="w-16 px-2 py-1 rounded border text-sm"
                      />
                      <span className="text-xs opacity-70 shrink-0">pt</span>
                    </div>
                  </>
                ) : null}
                <div className="w-full flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium shrink-0">色:</span>
                  <div
                    className="w-8 h-8 rounded border-2 shrink-0 border-white/30"
                    style={{ background: o.color ?? DEFAULT_OVERLAY_COLOR }}
                    title="現在の色"
                  />
                  {favoriteColors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {favoriteColors.map((fav, idx) => (
                        <button
                          key={`fav-${fav}-${idx}`}
                          type="button"
                          onClick={() => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, color: fav } : p)))}
                          className="w-6 h-6 rounded border border-white/30 hover:border-white/60 transition-colors shrink-0"
                          style={{ background: fav }}
                          title={fav}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {(() => {
                  const color = o.color ?? DEFAULT_OVERLAY_COLOR;
                  const rgb = parseHexToRgb(color);
                  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                  const updateFromHsl = (h: number, s: number, l: number) => {
                    const { r, g, b } = hslToRgb(h, s, l);
                    setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, color: rgbToHex(r, g, b) } : p)));
                  };
                  const handleSlDown = (e: React.PointerEvent) => {
                    const el = slSquareRef.current;
                    if (el) colorPickerRectRef.current = el.getBoundingClientRect();
                    colorPickerDraggingRef.current = "sl";
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  };
                  const handleSlMove = (e: React.PointerEvent) => {
                    if (colorPickerDraggingRef.current !== "sl" || e.buttons !== 1) return;
                    const rect = colorPickerRectRef.current;
                    if (!rect) return;
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    const s = Math.max(0, Math.min(1, x)) * 100;
                    const l = Math.max(0, Math.min(1, 1 - y)) * 100;
                    updateFromHsl(hsl.h, s, l);
                  };
                  const handleSlUp = (e: React.PointerEvent) => {
                    colorPickerDraggingRef.current = null;
                    colorPickerRectRef.current = null;
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  };
                  const handleHDown = (e: React.PointerEvent) => {
                    const el = hStripRef.current;
                    if (el) colorPickerRectRef.current = el.getBoundingClientRect();
                    colorPickerDraggingRef.current = "h";
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  };
                  const handleHMove = (e: React.PointerEvent) => {
                    if (colorPickerDraggingRef.current !== "h" || e.buttons !== 1) return;
                    const rect = colorPickerRectRef.current;
                    if (!rect) return;
                    const y = (e.clientY - rect.top) / rect.height;
                    const h = Math.max(0, Math.min(360, y * 360));
                    updateFromHsl(h, hsl.s, hsl.l);
                  };
                  const handleHUp = (e: React.PointerEvent) => {
                    colorPickerDraggingRef.current = null;
                    colorPickerRectRef.current = null;
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  };
                  return (
                    <div className="flex flex-col gap-2 p-2 rounded border bg-black/20 border-white/15 w-full min-w-0">
                      <div className="flex gap-2 items-stretch w-full min-w-0">
                        <div
                          ref={slSquareRef}
                          className="relative flex-1 min-w-0 aspect-square rounded border border-white/30 cursor-crosshair touch-none"
                          style={{
                            backgroundImage: `linear-gradient(to bottom, transparent 0%, black 100%), linear-gradient(to right, white 0%, hsl(${hsl.h}, 100%, 50%) 100%)`,
                          }}
                          onPointerDown={handleSlDown}
                          onPointerMove={handleSlMove}
                          onPointerUp={handleSlUp}
                          onPointerLeave={handleSlUp}
                        >
                          <div
                            className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none"
                            style={{
                              left: `${hsl.s}%`,
                              top: `${100 - hsl.l}%`,
                              transform: "translate(-50%, -50%)",
                              background: color,
                            }}
                          />
                        </div>
                        <div
                          ref={hStripRef}
                          className="relative w-5 shrink-0 self-stretch rounded border border-white/30 cursor-ns-resize touch-none"
                          style={{
                            background: "linear-gradient(to bottom, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
                          }}
                          onPointerDown={handleHDown}
                          onPointerMove={handleHMove}
                          onPointerUp={handleHUp}
                          onPointerLeave={handleHUp}
                        >
                          <div
                            className="absolute left-1/2 w-4 h-1.5 -translate-x-1/2 rounded border-2 border-white shadow pointer-events-none"
                            style={{ top: `${(hsl.h / 360) * 100}%`, transform: "translate(-50%, -50%)" }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-white/70">
                        <span className="font-mono">{color}</span>
                        <span className="font-mono tabular-nums">R {rgb.r} G {rgb.g} B {rgb.b}</span>
                      </div>
                      {favoriteColors.length > 0 ? (
                        <div>
                          <span className="text-xs opacity-80">お気に入り:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {favoriteColors.map((fav, idx) => (
                              <div key={`${fav}-${idx}`} className="relative group">
                                <button type="button" onClick={() => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, color: fav } : p)))} className="w-6 h-6 rounded border-2 border-white/30 hover:border-white/60 transition-colors shrink-0" style={{ background: fav }} title={fav} />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setFavoriteColors((prev) => prev.filter((_, i) => i !== idx)); }}
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-opacity"
                                  title="お気に入りから削除"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const normalized = normalizeHex(color);
                          if (!normalized) return;
                          setFavoriteColors((prev) => (prev.some((c) => normalizeHex(c) === normalized) ? prev : [...prev, normalized]));
                        }}
                        className="px-2 py-1 rounded text-xs border border-white/20 bg-white/10 hover:bg-white/15 transition-colors"
                      >
                        現在の色を登録
                      </button>
                    </div>
                  );
                })()}
                <div className="w-full flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium shrink-0">透明度:</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={o.opacity ?? 100}
                    onChange={(e) => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, opacity: Number(e.target.value) } : p)))}
                    className="flex-1 min-w-[5rem] h-1.5 accent-violet-500"
                  />
                  <span className="text-xs tabular-nums opacity-70 w-8 shrink-0">{o.opacity ?? 100}%</span>
                </div>
                <div className="w-full flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium shrink-0">回転:</span>
                  <RotationDial
                    value={Math.round(o.rotation ?? 0)}
                    onChange={(deg) => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, rotation: Math.max(-360, Math.min(360, deg)) } : p)))}
                    isLightMode={isLightMode}
                  />
                  <input
                    type="number"
                    min={-360}
                    max={360}
                    value={Math.round(o.rotation ?? 0)}
                    onChange={(e) => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, rotation: Math.max(-360, Math.min(360, parseInt(e.target.value, 10) || 0)) } : p)))}
                    className="w-14 px-2 py-1 rounded border text-sm"
                  />
                  <span className="text-xs opacity-70 shrink-0">度</span>
                </div>
                <div className="w-full flex flex-wrap gap-2">
                  <button
                    onClick={() => { pushOverlayHistory(overlays); setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, flipX: !p.flipX } : p))); }}
                    className="px-2 py-1 rounded text-sm bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
                  >
                    左右反転
                  </button>
                  {o.shape === "custom" && o.parts && o.parts.length > 0 ? (
                    <button type="button" onClick={() => { setCustomShapeEditingId(o.id); setCustomShapeModalOpen(true); }} className="px-2 py-1 rounded text-sm bg-violet-500/20 text-violet-400 hover:bg-violet-500/30">
                      図形を編集
                    </button>
                  ) : null}
                  <button
                    onClick={() => { pushOverlayHistory(overlays); setOverlays((prev) => prev.filter((p) => p.id !== o.id)); setSelectedOverlayId(null); }}
                    className="px-2 py-1 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm opacity-70 py-4">
                覆いをクリックすると
                <br />
                ここで編集できます
              </div>
            )}
          </>
        )}

        {tab === "shapes" && (
          <>
            <div className="text-sm font-medium opacity-80 w-full">覆いの形・追加</div>
            <div className="w-full flex flex-wrap gap-1.5">
              {(["rect", "circle", "triangle", "custom", "free"] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => {
                    if (shape === "free") {
                      setAddShape(addShape === shape ? null : shape);
                      setIsDrawingFree(false);
                      return;
                    }
                    if (shape === "custom") {
                      setCustomShapeModalOpenForNew();
                      setAddShape(null);
                      setIsDrawingFree(false);
                      return;
                    }
                    if (!captureRef.current) {
                      setAddShape(addShape === shape ? null : shape);
                      setIsDrawingFree(false);
                      return;
                    }
                    const rect = captureRef.current.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    pushOverlayHistory(overlays);
                    onAddOverlayAtPoint(shape, centerX, centerY);
                    setAddShape(null);
                    setIsDrawingFree(false);
                  }}
                  className={`px-2 py-1 rounded text-xs ${addShape === shape ? "bg-violet-500/30 text-white" : isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/10 text-white/80"}`}
                >
                  {shape === "rect" ? "四角" : shape === "circle" ? "丸" : shape === "triangle" ? "三角" : shape === "custom" ? "カスタム" : "自由"}
                </button>
              ))}
            </div>
            <div className="w-full flex flex-wrap items-center gap-1.5">
              <span className="text-xs opacity-70 shrink-0">MECE:</span>
              <button type="button" onClick={() => onAddRectGrid(2, 2)} className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20">四角2×2</button>
              <button type="button" onClick={() => onAddRectGrid(3, 3)} className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20">四角3×3</button>
              <button type="button" onClick={() => onAddTriangleStripes(3)} className="px-2 py-1 rounded text-xs border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">三角3段</button>
            </div>
            <div className="w-full flex flex-wrap items-center gap-1.5">
              <span className="text-xs opacity-70 shrink-0">フィルター:</span>
              {(["noise", "grid", "blur"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFilter(f)}
                  className={`px-2 py-1 rounded text-xs ${activeFilters.includes(f) ? "bg-violet-500/30 text-white" : isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/10 text-white/80"}`}
                >
                  {f === "noise" ? "ノイズ" : f === "grid" ? "グリッド" : "ぼかし"}
                </button>
              ))}
            </div>
            <div className="w-full flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-xs opacity-80">
                <input type="checkbox" checked={filterShowLabel} onChange={(e) => setPanelState((s) => ({ ...s, filterShowLabel: e.target.checked }))} className="rounded" />
                AI読み取り防止
              </label>
              <span className="text-xs opacity-70">強さ:</span>
              <input type="range" min={0} max={100} value={filterIntensity} onChange={(e) => setPanelState((s) => ({ ...s, filterIntensity: Number(e.target.value) }))} className="flex-1 min-w-[4rem] h-1.5 accent-violet-500" />
              <span className="text-[10px] tabular-nums opacity-70">{filterIntensity}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
