"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface CropResult {
  dataUrl: string;
  aspectRatio: number;
  /** トリミング結果の Blob（IndexedDB 保存用） */
  blob?: Blob;
}

interface ImageCropModalProps {
  open: boolean;
  imageDataUrl: string | null;
  onConfirm: (result: CropResult) => void;
  onCancel: () => void;
  isLightMode?: boolean;
}

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLE_SIZE = 12;
const MIN_CROP_SIZE = 20;

function clientToImageCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  naturalWidth: number,
  naturalHeight: number
): { x: number; y: number } {
  const x = ((clientX - rect.left) / rect.width) * naturalWidth;
  const y = ((clientY - rect.top) / rect.height) * naturalHeight;
  return {
    x: Math.max(0, Math.min(naturalWidth, x)),
    y: Math.max(0, Math.min(naturalHeight, y)),
  };
}

export default function ImageCropModal({
  open,
  imageDataUrl,
  onConfirm,
  onCancel,
  isLightMode = false,
}: ImageCropModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [, setDragMode] = useState<"move" | ResizeHandle | null>(null);
  const dragModeRef = useRef<"move" | ResizeHandle | null>(null);
  const dragStartRef = useRef<{
    ix: number;
    iy: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const naturalWidth = imageSize?.w ?? 0;
  const naturalHeight = imageSize?.h ?? 0;

  useEffect(() => {
    if (!open || !imageDataUrl) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, imageDataUrl, onCancel]);

  /* eslint-disable react-hooks/set-state-in-effect -- モーダル表示・画像変更時にクロップ状態をリセットするため */
  useEffect(() => {
    if (open && imageDataUrl) {
      setImageSize(null);
      setCropRect(null);
      setDragMode(null);
    }
  }, [open, imageDataUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onImageLoad = useCallback(() => {
    const el = imageRef.current;
    if (!el?.naturalWidth) return;
    setImageSize({ w: el.naturalWidth, h: el.naturalHeight });
    setCropRect({ x: 0, y: 0, w: el.naturalWidth, h: el.naturalHeight });
  }, []);

  useEffect(() => {
    if (!open || !imageDataUrl) return;
    const el = imageRef.current;
    if (el?.complete && el.naturalWidth > 0 && !imageSize) {
      setImageSize({ w: el.naturalWidth, h: el.naturalHeight });
      setCropRect({ x: 0, y: 0, w: el.naturalWidth, h: el.naturalHeight });
    }
  }, [open, imageDataUrl, imageSize]);

  const getRect = useCallback(() => imageRef.current?.getBoundingClientRect() ?? null, []);

  const startMove = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const rect = getRect();
      if (!rect || !cropRect || !naturalWidth || !naturalHeight) return;
      const { x: ix, y: iy } = clientToImageCoords(e.clientX, e.clientY, rect, naturalWidth, naturalHeight);
      dragModeRef.current = "move";
      setDragMode("move");
      dragStartRef.current = { ix, iy, x: cropRect.x, y: cropRect.y, w: cropRect.w, h: cropRect.h };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [getRect, cropRect, naturalWidth, naturalHeight]
  );

  const startResize = useCallback(
    (handle: ResizeHandle) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = getRect();
      if (!rect || !cropRect || !naturalWidth || !naturalHeight) return;
      const { x: ix, y: iy } = clientToImageCoords(e.clientX, e.clientY, rect, naturalWidth, naturalHeight);
      dragModeRef.current = handle;
      setDragMode(handle);
      dragStartRef.current = { ix, iy, x: cropRect.x, y: cropRect.y, w: cropRect.w, h: cropRect.h };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [getRect, cropRect, naturalWidth, naturalHeight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = getRect();
      const mode = dragModeRef.current;
      if (!rect || !naturalWidth || !naturalHeight || !dragStartRef.current || !mode) return;
      const { x: ix, y: iy } = clientToImageCoords(e.clientX, e.clientY, rect, naturalWidth, naturalHeight);
      const s = dragStartRef.current;

      if (mode === "move") {
        const dx = ix - s.ix;
        const dy = iy - s.iy;
        const newX = Math.max(0, Math.min(naturalWidth - s.w, s.x + dx));
        const newY = Math.max(0, Math.min(naturalHeight - s.h, s.y + dy));
        setCropRect({ x: newX, y: newY, w: s.w, h: s.h });
        return;
      }

      const minW = MIN_CROP_SIZE;
      const minH = MIN_CROP_SIZE;
      let x = s.x;
      let y = s.y;
      let w = s.w;
      let h = s.h;

      if (mode.includes("e")) {
        w = Math.max(minW, Math.min(naturalWidth - x, ix - x));
      }
      if (mode.includes("w")) {
        const newX = Math.max(0, Math.min(s.x + s.w - minW, ix));
        x = newX;
        w = s.x + s.w - newX;
      }
      if (mode.includes("s")) {
        h = Math.max(minH, Math.min(naturalHeight - y, iy - y));
      }
      if (mode.includes("n")) {
        const newY = Math.max(0, Math.min(s.y + s.h - minH, iy));
        y = newY;
        h = s.y + s.h - newY;
      }

      setCropRect({ x, y, w, h });
    },
    [getRect, naturalWidth, naturalHeight]
  );

  const handlePointerUp = useCallback(() => {
    dragModeRef.current = null;
    setDragMode(null);
    dragStartRef.current = null;
  }, []);

  const MAX_DIMENSION = 4096;

  const handleApply = useCallback(() => {
    if (!imageDataUrl || !imageSize) return;
    const crop = cropRect && cropRect.w >= 1 && cropRect.h >= 1
      ? cropRect
      : { x: 0, y: 0, w: imageSize.w, h: imageSize.h };
    const imgEl = imageRef.current;
    if (!imgEl) {
      onConfirm({ dataUrl: imageDataUrl, aspectRatio: imageSize.w / imageSize.h });
      return;
    }

    // 出力サイズ（4096px 超ならリサイズ）
    let outW = Math.floor(crop.w);
    let outH = Math.floor(crop.h);
    if (outW > MAX_DIMENSION || outH > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(outW, outH);
      outW = Math.floor(outW * scale);
      outH = Math.floor(outH * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onConfirm({ dataUrl: imageDataUrl, aspectRatio: imageSize.w / imageSize.h });
      return;
    }
    ctx.drawImage(
      imgEl,
      crop.x, crop.y, crop.w, crop.h,
      0, 0, outW, outH
    );

    // PNG 透過画像は PNG 維持、それ以外は JPEG で圧縮
    const isPng = imageDataUrl.startsWith("data:image/png");
    const mimeType = isPng ? "image/png" : "image/jpeg";
    const quality = isPng ? undefined : 0.85;

    // Blob を生成して返す（IndexedDB 保存用）
    canvas.toBlob(
      (blob) => {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        onConfirm({ dataUrl, aspectRatio: crop.w / crop.h, blob: blob ?? undefined });
      },
      mimeType,
      quality
    );
  }, [imageDataUrl, imageSize, cropRect, onConfirm]);

  const hasValidCrop = cropRect && cropRect.w >= 1 && cropRect.h >= 1 && naturalWidth > 0 && naturalHeight > 0;

  return (
    <AnimatePresence>
      {open && imageDataUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            style={{
              background: isLightMode ? "#f3f4f6" : "#1a1a2e",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-modal-title"
          >
            <h2
              id="crop-modal-title"
              className={`text-sm font-bold px-4 py-3 border-b ${isLightMode ? "text-gray-800 border-gray-200" : "text-white/90 border-white/10"}`}
            >
              白い枠をドラッグで動かし、角・辺中央のハンドルでリサイズ
            </h2>
            <div className="flex-1 flex items-center justify-center min-h-0 p-4 overflow-hidden">
              <div className="relative inline-block max-w-full max-h-[60vh]">
                {/* eslint-disable-next-line @next/next/no-img-element -- Data URL from user upload */}
                <img
                  ref={imageRef}
                  src={imageDataUrl}
                  alt=""
                  className="max-w-full max-h-[60vh] w-auto h-auto object-contain select-none touch-none block pointer-events-none"
                  draggable={false}
                  onLoad={onImageLoad}
                />
                {hasValidCrop && (
                  <>
                    <div
                      className="absolute cursor-move"
                      style={{
                        left: `${(cropRect.x / naturalWidth) * 100}%`,
                        top: `${(cropRect.y / naturalHeight) * 100}%`,
                        width: `${(cropRect.w / naturalWidth) * 100}%`,
                        height: `${(cropRect.h / naturalHeight) * 100}%`,
                        border: "2px dashed rgba(255,255,255,0.95)",
                        outline: "2px dashed rgba(255,255,255,0.95)",
                        outlineOffset: "-2px",
                      }}
                      onPointerDown={startMove}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    />
                    {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const).map((handle) => {
                      const isCorner = handle.length === 2;
                      const cursor = isCorner
                        ? (handle === "ne" || handle === "sw" ? "nwse-resize" : "nesw-resize")
                        : (handle === "n" || handle === "s" ? "ns-resize" : "ew-resize");
                      const leftPct = handle.includes("w") ? cropRect.x : handle.includes("e") ? cropRect.x + cropRect.w : cropRect.x + cropRect.w / 2;
                      const topPct = handle.includes("n") ? cropRect.y : handle.includes("s") ? cropRect.y + cropRect.h : cropRect.y + cropRect.h / 2;
                      return (
                        <div
                          key={handle}
                          className="absolute bg-white/60 hover:bg-white/90 rounded-sm pointer-events-auto"
                          style={{
                            left: `${(leftPct / naturalWidth) * 100}%`,
                            top: `${(topPct / naturalHeight) * 100}%`,
                            width: `${HANDLE_SIZE}px`,
                            height: `${HANDLE_SIZE}px`,
                            transform: "translate(-50%, -50%)",
                            cursor,
                            zIndex: 1,
                          }}
                          onPointerDown={startResize(handle)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </div>
            <p className={`text-xs px-4 pb-2 ${isLightMode ? "text-gray-500" : "text-white/50"}`}>
              白い枠をドラッグで移動、四隅と辺の中央のハンドルをドラッグでリサイズできます。「この範囲で使う」でパネルに反映します。
            </p>
            <div className="flex gap-2 justify-end px-4 py-3 border-t" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
              <button
                type="button"
                onClick={onCancel}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLightMode ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : "bg-white/10 text-white/90 hover:bg-white/20"} transition-colors`}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-500 text-white hover:bg-violet-600 transition-colors"
              >
                この範囲で使う
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
