"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, PanelTopOpen, Menu, ImagePlus, Share2, Save, List, Pencil, Eye, Trash2, Edit3 } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImageCropModal from "@/components/ImageCropModal";
import { toPng } from "html-to-image";
import { generateShareUrl, getTimestampForFilename, shareImageWithText } from "@/lib/share";
import {
  type PanelState,
  type PanelOverlay,
  type SavedPanel,
  type SavedCustomShape,
  type CustomPart,
  type FilterType,
  type OverlayShape,
  createOverlayId,
  createDefaultOverlay,
  createImageOverlay,
  createCustomOverlay,
  getPartClipPath,
  getCustomOverlayCentroid,
} from "@/lib/panelTypes";
import CustomShapeEditorModal from "@/components/CustomShapeEditorModal";

const defaultPanelState: PanelState = {
  imageDataUrl: null,
  activeFilters: [],
  filterIntensity: 50,
  filterShowLabel: false,
  overlays: [],
  isEditMode: true,
};

const GRID_SNAP_PERCENT = 2;
function snapToGrid(v: number): number {
  return Math.round(v / GRID_SNAP_PERCENT) * GRID_SNAP_PERCENT;
}

function snapToNearestGuide(v: number, guides: number[], threshold = 2): number {
  if (!guides.length) return v;
  let snapped = v;
  let bestDiff = threshold + 0.001;
  for (const g of guides) {
    const d = Math.abs(v - g);
    if (d < bestDiff) {
      bestDiff = d;
      snapped = g;
    }
  }
  return snapped;
}

/** 三角形オーバーレイの種類ごとに、見た目の重心（バウンディングボックス内 0–100%）を返す。ラベル・数字を幅広い位置に置く用 */
function getTriangleTextAnchor(kind: PanelOverlay["triangleKind"]): { x: number; y: number } {
  switch (kind) {
    case "rightTop":
      return { x: 100 / 3, y: 100 / 3 };
    case "rightBottom":
      return { x: 100 / 3, y: 200 / 3 };
    case "isoLeft":
      return { x: 200 / 3, y: 50 };
    case "isoRight":
      return { x: 100 / 3, y: 50 };
    case "diagDownUpper":
      return { x: 100 / 3, y: 100 / 3 };
    case "diagDownLower":
      return { x: 200 / 3, y: 200 / 3 };
    case "diagUpUpper":
      return { x: 200 / 3, y: 100 / 3 };
    case "diagUpLower":
      return { x: 100 / 3, y: 200 / 3 };
    default:
      return { x: 50, y: 200 / 3 };
  }
}

function getImageBoundsPct(
  frameRect: DOMRect,
  imageAspectRatio?: number | null
): { x: number; y: number; width: number; height: number } {
  const frameAR = frameRect.width / frameRect.height;
  const imgAR = imageAspectRatio && imageAspectRatio > 0 ? imageAspectRatio : 16 / 9;
  // object-contain と同様のロジックで、画像の実表示領域を0〜100%座標で返す
  if (imgAR > frameAR) {
    // 横長画像: 幅100%、高さは余白あり
    const width = 100;
    const height = (frameAR / imgAR) * 100;
    const y = (100 - height) / 2;
    return { x: 0, y, width, height };
  } else {
    // 縦長 or 正方形: 高さ100%、幅は余白あり
    const height = 100;
    const width = (imgAR / frameAR) * 100;
    const x = (100 - width) / 2;
    return { x, y: 0, width, height };
  }
}

const TAP_WINDOW_MS = 200;

const DIAL_SIZE = 48;
const DIAL_R = 20;

function RotationDial({
  value,
  onChange,
  isLightMode,
}: {
  value: number;
  onChange: (deg: number) => void;
  isLightMode: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const getAngle = useCallback((clientX: number, clientY: number) => {
    const svg = ref.current;
    if (!svg) return value;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(-(clientY - cy), clientX - cx) * (180 / Math.PI);
    const rotation = Math.round(angle - 90);
    return Math.max(-360, Math.min(360, rotation));
  }, [value]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as SVGElement).setPointerCapture(e.pointerId);
      onChange(getAngle(e.clientX, e.clientY));
    },
    [getAngle, onChange]
  );
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons !== 1) return;
      onChange(getAngle(e.clientX, e.clientY));
    },
    [getAngle, onChange]
  );

  const rad = ((value + 90) * Math.PI) / 180;
  const handX = 24 + DIAL_R * Math.cos(rad);
  const handY = 24 - DIAL_R * Math.sin(rad);
  const stroke = isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)";

  return (
    <svg
      ref={ref}
      width={DIAL_SIZE}
      height={DIAL_SIZE}
      className="cursor-grab active:cursor-grabbing touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => (e.target as SVGElement).releasePointerCapture(e.pointerId)}
      onPointerLeave={(e) => (e.target as SVGElement).releasePointerCapture(e.pointerId)}
    >
      <circle cx="24" cy="24" r={DIAL_R} fill="none" stroke={stroke} strokeWidth={2} />
      <line x1="24" y1="24" x2={handX} y2={handY} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export default function PanelContent({
  isSplitMode = false,
}: {
  isSplitMode?: boolean;
  isRightPane?: boolean;
} = {}) {
  const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("panel-light-mode", false);
  const [panelState, setPanelState] = useLocalStorage<PanelState>("panel-state", defaultPanelState);
  const [savedPanels, setSavedPanels] = useLocalStorage<SavedPanel[]>("panel-saved-list", []);
  const [savedCustomShapes, setSavedCustomShapes] = useLocalStorage<SavedCustomShape[]>("panel-custom-shapes", []);
  const [customShapeModalOpen, setCustomShapeModalOpen] = useState(false);
  const [customShapeEditingId, setCustomShapeEditingId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [achievedOverlayId, setAchievedOverlayId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [addShape, setAddShape] = useState<OverlayShape | null>(null);
  const [isDrawingFree, setIsDrawingFree] = useState(false);
  const [freeDrawPreviewPoints, setFreeDrawPreviewPoints] = useState<{ x: number; y: number }[]>([]);
  const freePointsRef = useRef<{ x: number; y: number }[]>([]);
  const [panelToDeleteId, setPanelToDeleteId] = useState<string | null>(null);
  const [renamePanelId, setRenamePanelId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingCropDataUrl, setPendingCropDataUrl] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const tapPendingRef = useRef(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageOverlayInputRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<{ id: string; startX: number; startY: number; startOX: number; startOY: number } | null>(null);
  const resizeRef = useRef<{
    id: string;
    handle: "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startOX: number;
    startOY: number;
  } | null>(null);
  const rotateRef = useRef<{ id: string; startAngle: number; startRotation: number; centerX: number; centerY: number } | null>(null);
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchRef = useRef<{
    id: string;
    initialDistance: number;
    initialW: number;
    initialH: number;
    initialRotation: number;
    initialAngle: number;
  } | null>(null);
  const overlayClipboardRef = useRef<PanelOverlay | null>(null);
  const OVERLAY_HISTORY_MAX = 50;
  const overlayHistoryRef = useRef<PanelOverlay[][]>([]);
  const DRAG_THRESHOLD_PX = 5;

  const pushOverlayHistory = useCallback((current: PanelOverlay[]) => {
    const snapshot = current.map((o) => ({ ...o }));
    overlayHistoryRef.current = [...overlayHistoryRef.current, snapshot].slice(-OVERLAY_HISTORY_MAX);
  }, []);

  const { imageDataUrl, imageAspectRatio, activeFilters, filterIntensity: rawFilterIntensity, filterShowLabel, overlays, isEditMode } = panelState;
  const filterIntensity = rawFilterIntensity ?? 50;
  const setOverlays = useCallback(
    (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => {
      setPanelState((s) => ({ ...s, overlays: updater(s.overlays) }));
    },
    [setPanelState]
  );

  useEffect(() => {
    if (isSplitMode) return;
    if (isLightMode) document.body.classList.add("light-mode");
    else document.body.classList.remove("light-mode");
    return () => document.body.classList.remove("light-mode");
  }, [isLightMode, isSplitMode]);

  // Migrate old state without filterIntensity
  useEffect(() => {
    setPanelState((s) => (typeof (s as PanelState).filterIntensity === "number" ? s : { ...s, filterIntensity: 50 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const key = e.key;

      // Backspace / Delete: 選択中の覆いを削除
      if ((key === "Backspace" || key === "Delete") && !e.ctrlKey && !e.metaKey) {
        if (!selectedOverlayId) return;
        const current = overlays;
        const exists = current.some((o) => o.id === selectedOverlayId);
        if (!exists) return;
        e.preventDefault();
        pushOverlayHistory(current);
        setOverlays((prev) => prev.filter((p) => p.id !== selectedOverlayId));
        setSelectedOverlayId(null);
        return;
      }

      if (!e.ctrlKey && !e.metaKey) return;
      const lower = key?.toLowerCase();
      if (lower === "z") {
        e.preventDefault();
        const prev = overlayHistoryRef.current.pop();
        if (prev) setPanelState((s) => ({ ...s, overlays: prev }));
        return;
      }
      if (lower === "c") {
        if (!selectedOverlayId) return;
        const o = overlays.find((x) => x.id === selectedOverlayId);
        if (o) overlayClipboardRef.current = { ...o };
        return;
      }
      if (lower === "x") {
        if (!selectedOverlayId) return;
        const o = overlays.find((x) => x.id === selectedOverlayId);
        if (o) {
          overlayClipboardRef.current = { ...o };
          pushOverlayHistory(overlays);
          setOverlays((prev) => prev.filter((p) => p.id !== selectedOverlayId));
          setSelectedOverlayId(null);
          e.preventDefault();
        }
        return;
      }
      if (lower === "v") {
        const clip = overlayClipboardRef.current;
        if (!clip) return;
        e.preventDefault();
        pushOverlayHistory(overlays);
        const dup: PanelOverlay = { ...clip, id: createOverlayId(), x: clip.x + 3, y: clip.y + 3 };
        setOverlays((prev) => [...prev, dup]);
        setSelectedOverlayId(dup.id);
        return;
      }
      if (lower === "d") {
        if (!selectedOverlayId) return;
        const o = overlays.find((x) => x.id === selectedOverlayId);
        if (!o) return;
        e.preventDefault();
        pushOverlayHistory(overlays);
        const dup: PanelOverlay = {
          ...o,
          id: createOverlayId(),
          x: snapToGrid(Math.min(100 - o.width, o.x + 3)),
          y: snapToGrid(Math.min(100 - o.height, o.y + 3)),
        };
        setOverlays((prev) => [...prev, dup]);
        setSelectedOverlayId(dup.id);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, selectedOverlayId, overlays, setOverlays, setPanelState, pushOverlayHistory]);

  const applyImageWithAspect = useCallback(
    (dataUrl: string, aspectRatio: number) => {
      setPanelState((s) => ({ ...s, imageDataUrl: dataUrl, imageAspectRatio: aspectRatio }));
    },
    [setPanelState]
  );

  const handleCropConfirm = useCallback(
    (result: { dataUrl: string; aspectRatio: number }) => {
      applyImageWithAspect(result.dataUrl, result.aspectRatio);
      setPendingCropDataUrl(null);
    },
    [applyImageWithAspect]
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPendingCropDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    []
  );

  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPendingCropDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleOverlayTap = useCallback(
    (overlay: PanelOverlay) => {
      if (overlay.shape === "image") return;
      if (overlay.targetType === "text") {
        setAchievedOverlayId(overlay.id);
        return;
      }
      if (overlay.targetType === "number") {
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === overlay.id ? { ...o, count: o.count + 1 } : o
          )
        );
        const nextCount = overlay.count + 1;
        if (overlay.target > 0 && nextCount >= overlay.target) {
          setAchievedOverlayId(overlay.id);
        }
      }
    },
    [setOverlays]
  );

  const getRect = useCallback(() => captureRef.current?.getBoundingClientRect(), []);
  const clientToPct = useCallback((clientX: number, clientY: number) => {
    const rect = getRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, [getRect]);

  const handlePointerDown = useCallback(
    (overlay: PanelOverlay, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.target as HTMLElement;
      if (el.closest("button") || el.closest("input")) return;
      const handle = el.closest("[data-handle]")?.getAttribute("data-handle");
      const rect = getRect();
      if (!rect) return;

      if (isEditMode && selectedOverlayId === overlay.id) {
        if (handle === "rotate") {
          e.preventDefault();
          pushOverlayHistory(overlays);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          const centerX = rect.left + (overlay.x + overlay.width / 2) / 100 * rect.width;
          const centerY = rect.top + (overlay.y + overlay.height / 2) / 100 * rect.height;
          const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          rotateRef.current = {
            id: overlay.id,
            startAngle,
            startRotation: overlay.rotation ?? 0,
            centerX,
            centerY,
          };
          tapPendingRef.current = false;
          return;
        }
        if (handle === "se" || handle === "sw" || handle === "ne" || handle === "nw" || handle === "n" || handle === "s" || handle === "e" || handle === "w") {
          e.preventDefault();
          pushOverlayHistory(overlays);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          resizeRef.current = {
            id: overlay.id,
            handle: handle as "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w",
            startX: e.clientX,
            startY: e.clientY,
            startW: overlay.width,
            startH: overlay.height,
            startOX: overlay.x,
            startOY: overlay.y,
          };
          tapPendingRef.current = false;
          return;
        }
        if (handle) return;
        if (activePointersRef.current.size >= 2) return;
        pushOverlayHistory(overlays);
        dragRef.current = {
          id: overlay.id,
          startX: e.clientX,
          startY: e.clientY,
          startOX: overlay.x,
          startOY: overlay.y,
        };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapPendingRef.current = true;
      tapTimerRef.current = setTimeout(() => {
        tapPendingRef.current = false;
        tapTimerRef.current = null;
      }, TAP_WINDOW_MS);
    },
    [isEditMode, selectedOverlayId, getRect, overlays, pushOverlayHistory]
  );

  const handleOverlayPointerMove = useCallback(
    (overlay: PanelOverlay, e: React.PointerEvent) => {
      const rect = getRect();
      if (!rect) return;

      if (rotateRef.current?.id === overlay.id) {
        e.preventDefault();
        const centerX = rect.left + (overlay.x + overlay.width / 2) / 100 * rect.width;
        const centerY = rect.top + (overlay.y + overlay.height / 2) / 100 * rect.height;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const deg = (angle - rotateRef.current.startAngle) * (180 / Math.PI);
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === overlay.id ? { ...o, rotation: snapToGrid(rotateRef.current!.startRotation + deg) } : o
          )
        );
        return;
      }

      if (resizeRef.current?.id === overlay.id) {
        e.preventDefault();
        const dxPct = ((e.clientX - resizeRef.current.startX) / rect.width) * 100;
        const dyPct = ((e.clientY - resizeRef.current.startY) / rect.height) * 100;
        const { handle, startW, startH, startOX, startOY } = resizeRef.current;
        let x = startOX,
          y = startOY,
          w = startW,
          h = startH;
        if (handle === "se") {
          w = Math.max(4, startW + dxPct);
          h = Math.max(4, startH + dyPct);
        } else if (handle === "sw") {
          x = startOX + dxPct;
          w = Math.max(4, startW - dxPct);
          h = Math.max(4, startH + dyPct);
        } else if (handle === "ne") {
          y = startOY + dyPct;
          w = Math.max(4, startW + dxPct);
          h = Math.max(4, startH - dyPct);
        } else if (handle === "nw") {
          x = startOX + dxPct;
          y = startOY + dyPct;
          w = Math.max(4, startW - dxPct);
          h = Math.max(4, startH - dyPct);
        } else if (handle === "n") {
          y = startOY + dyPct;
          h = Math.max(4, startH - dyPct);
        } else if (handle === "s") {
          h = Math.max(4, startH + dyPct);
        } else if (handle === "e") {
          w = Math.max(4, startW + dxPct);
        } else if (handle === "w") {
          x = startOX + dxPct;
          w = Math.max(4, startW - dxPct);
        }
        setOverlays((prev) =>
          prev.map((o) => (o.id === overlay.id ? { ...o, x, y, width: w, height: h } : o))
        );
        tapPendingRef.current = false;
        return;
      }

      if (dragRef.current?.id === overlay.id) {
        e.preventDefault();
        const dist = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
        if (dist > DRAG_THRESHOLD_PX) tapPendingRef.current = false;
        const startPct = clientToPct(dragRef.current.startX, dragRef.current.startY);
        const nowPct = clientToPct(e.clientX, e.clientY);
        const dx = nowPct.x - startPct.x;
        const dy = nowPct.y - startPct.y;

        // 基本の移動位置（グリッドスナップ＋枠内に収める）
        let nx = dragRef.current.startOX + dx;
        let ny = dragRef.current.startOY + dy;
        nx = snapToGrid(nx);
        ny = snapToGrid(ny);
        nx = Math.max(0, Math.min(100 - overlay.width, nx));
        ny = Math.max(0, Math.min(100 - overlay.height, ny));

        // 中心・端・他の覆いにスナップ
        const xGuides: number[] = [];
        const yGuides: number[] = [];

        // 枠全体の端・中心
        xGuides.push(0, 50 - overlay.width / 2, 100 - overlay.width);
        yGuides.push(0, 50 - overlay.height / 2, 100 - overlay.height);

        // 他の覆いとの整列
        overlays.forEach((o) => {
          if (o.id === overlay.id) return;
          // x方向: 左端・右端・中央を揃える
          xGuides.push(
            o.x, // 左端
            o.x + o.width - overlay.width, // 右端
            o.x + o.width / 2 - overlay.width / 2 // 中央
          );
          // y方向
          yGuides.push(
            o.y,
            o.y + o.height - overlay.height,
            o.y + o.height / 2 - overlay.height / 2
          );
        });

        const snappedX = snapToNearestGuide(nx, xGuides, 2.5);
        const snappedY = snapToNearestGuide(ny, yGuides, 2.5);

        setOverlays((prev) =>
          prev.map((o) =>
            o.id === overlay.id
              ? {
                  ...o,
                  x: Math.max(0, Math.min(100 - overlay.width, snappedX)),
                  y: Math.max(0, Math.min(100 - overlay.height, snappedY)),
                }
              : o
          )
        );
      }
    },
    [getRect, clientToPct, setOverlays]
  );

  const handleOverlayPointerUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    rotateRef.current = null;
  }, []);

  const handleCapturePointerDown = useCallback(
    (e: React.PointerEvent) => {
      activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      const map = activePointersRef.current;
      if (map.size === 2 && selectedOverlayId) {
        const arr = Array.from(map.values());
        const p0 = arr[0];
        const p1 = arr[1];
        if (!p0 || !p1) return;
        const dist = Math.hypot(p1.clientX - p0.clientX, p1.clientY - p0.clientY);
        const angle = Math.atan2(p1.clientY - p0.clientY, p1.clientX - p0.clientX);
        const overlay = overlays.find((o) => o.id === selectedOverlayId);
        if (overlay && dist > 5) {
          pushOverlayHistory(overlays);
          dragRef.current = null;
          resizeRef.current = null;
          rotateRef.current = null;
          pinchRef.current = {
            id: overlay.id,
            initialDistance: dist,
            initialW: overlay.width,
            initialH: overlay.height,
            initialRotation: overlay.rotation ?? 0,
            initialAngle: angle,
          };
        }
      }
    },
    [selectedOverlayId, overlays, pushOverlayHistory]
  );

  const handleCapturePointerMove = useCallback(
    (e: React.PointerEvent) => {
      activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      const pinch = pinchRef.current;
      if (!pinch || activePointersRef.current.size !== 2) return;
      const arr = Array.from(activePointersRef.current.values());
      const p0 = arr[0];
      const p1 = arr[1];
      if (!p0 || !p1) return;
      const dist = Math.hypot(p1.clientX - p0.clientX, p1.clientY - p0.clientY);
      const angle = Math.atan2(p1.clientY - p0.clientY, p1.clientX - p0.clientX);
      const scale = dist / pinch.initialDistance;
      const angleDeg = (angle - pinch.initialAngle) * (180 / Math.PI);
      const newW = Math.max(4, Math.min(100, pinch.initialW * scale));
      const newH = Math.max(4, Math.min(100, pinch.initialH * scale));
      const newRotation = pinch.initialRotation + angleDeg;
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === pinch.id ? { ...o, width: newW, height: newH, rotation: newRotation } : o
        )
      );
    },
    [setOverlays]
  );

  const handleCapturePointerUp = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;
  }, []);

  const handleCapturePointerLeaveOrCancel = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;
  }, []);

  const handlePointerUp = useCallback(
    (overlay: PanelOverlay, e: React.PointerEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("button") || el.closest("input")) return;
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      if (tapPendingRef.current) {
        tapPendingRef.current = false;
        if (!isEditMode) handleOverlayTap(overlay);
      }
    },
    [handleOverlayTap, isEditMode]
  );

  const handleConfirmAchieve = useCallback(() => {
    if (achievedOverlayId) {
      setOverlays((prev) => prev.filter((o) => o.id !== achievedOverlayId));
      setAchievedOverlayId(null);
    }
  }, [achievedOverlayId, setOverlays]);

  const handleAddOverlayAtPoint = useCallback(
    (shape: OverlayShape, clientX: number, clientY: number) => {
      if (shape === "free" || !captureRef.current) return;
      const rect = captureRef.current.getBoundingClientRect();
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = Math.max(0, Math.min(100, snapToGrid(x)));
      y = Math.max(0, Math.min(100, snapToGrid(y)));
      const newOverlay = createDefaultOverlay(shape, x, y);
      const half = 8;
      newOverlay.x = Math.max(0, snapToGrid(x - half));
      newOverlay.y = Math.max(0, snapToGrid(y - half));
      newOverlay.width = snapToGrid(half * 2) || GRID_SNAP_PERCENT;
      newOverlay.height = snapToGrid(half * 2) || GRID_SNAP_PERCENT;
      setOverlays((prev) => [...prev, newOverlay]);
      setSelectedOverlayId(newOverlay.id);
    },
    [setOverlays]
  );

  const handleAddTriangleStripes = useCallback(
    (rows: number) => {
      if (!captureRef.current || !imageDataUrl) return;
      const rect = captureRef.current.getBoundingClientRect();
      const { x: imgX, y: imgY, width: imgW, height: imgH } = getImageBoundsPct(rect, imageAspectRatio ?? undefined);
      const rowH = imgH / rows;
      const newOverlays: PanelOverlay[] = [];
      for (let row = 0; row < rows; row++) {
        const y0 = imgY + row * rowH;
        const h = row === rows - 1 ? imgY + imgH - y0 : rowH;
        const x0 = imgX;
        const w = imgW;
        // 各段を対角線で2つの三角に分割（隙間ゼロMECE）。スナップは使わない。
        const useDownward = row % 2 === 0; // 段ごとに対角線の向きを交互に
        const upper = createDefaultOverlay("triangle", x0, y0);
        upper.x = x0;
        upper.y = y0;
        upper.width = w;
        upper.height = h;
        upper.triangleKind = useDownward ? "diagDownUpper" : "diagUpUpper";
        upper.rotation = 0;
        const lower = createDefaultOverlay("triangle", x0, y0);
        lower.x = x0;
        lower.y = y0;
        lower.width = w;
        lower.height = h;
        lower.triangleKind = useDownward ? "diagDownLower" : "diagUpLower";
        lower.rotation = 0;
        newOverlays.push(upper, lower);
      }
      pushOverlayHistory(overlays);
      setOverlays((prev) => [...prev, ...newOverlays]);
    },
    [imageAspectRatio, imageDataUrl, overlays, pushOverlayHistory, setOverlays]
  );

  const handleCustomShapeConfirm = useCallback(
    (parts: CustomPart[]) => {
      if (customShapeEditingId) {
        pushOverlayHistory(overlays);
        setOverlays((prev) =>
          prev.map((o) => (o.id === customShapeEditingId ? { ...o, parts } : o))
        );
      } else {
        pushOverlayHistory(overlays);
        const cx = 50 - 10;
        const cy = 50 - 10;
        const newOverlay = createCustomOverlay(parts, cx, cy, 20, 20);
        setOverlays((prev) => [...prev, newOverlay]);
        setSelectedOverlayId(newOverlay.id);
      }
      setCustomShapeModalOpen(false);
      setCustomShapeEditingId(null);
    },
    [customShapeEditingId, overlays, pushOverlayHistory, setOverlays]
  );

  const handleSaveCustomTemplate = useCallback(
    (name: string, parts: CustomPart[]) => {
      const newTemplate: SavedCustomShape = {
        id: createOverlayId(),
        name: name.trim() || "カスタム図形",
        savedAt: Date.now(),
        parts: [...parts],
      };
      setSavedCustomShapes((prev) => [...prev, newTemplate]);
    },
    [setSavedCustomShapes]
  );

  const handleAddOverlay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!addShape || addShape === "free" || addShape === "custom") return;
      if (!captureRef.current) return;
      e.preventDefault();
      pushOverlayHistory(overlays);
      handleAddOverlayAtPoint(addShape, e.clientX, e.clientY);
      setAddShape(null);
    },
    [addShape, overlays, handleAddOverlayAtPoint, pushOverlayHistory]
  );

  const handleAddRectGrid = useCallback(
    (cols: number, rows: number) => {
      if (!captureRef.current) return;
      const rect = captureRef.current.getBoundingClientRect();
      const { x: imgX, y: imgY, width: imgW, height: imgH } = getImageBoundsPct(rect, imageAspectRatio ?? undefined);
      const tileW = imgW / cols;
      const tileH = imgH / rows;
      const newOverlays: PanelOverlay[] = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const baseX = imgX + col * tileW;
          const baseY = imgY + row * tileH;
          const o = createDefaultOverlay("rect", baseX, baseY);
          o.x = snapToGrid(baseX);
          o.y = snapToGrid(baseY);
          // 最終列・行だけ誤差補正を入れて、画像領域の端とずれにくくする
          const rawW = col === cols - 1 ? imgX + imgW - o.x : tileW;
          const rawH = row === rows - 1 ? imgY + imgH - o.y : tileH;
          o.width = snapToGrid(rawW);
          o.height = snapToGrid(rawH);
          newOverlays.push(o);
        }
      }
      pushOverlayHistory(overlays);
      setOverlays((prev) => [...prev, ...newOverlays]);
    },
    [imageAspectRatio, overlays, pushOverlayHistory, setOverlays]
  );

  const handleFreeDrawStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (addShape !== "free" || !captureRef.current) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const rect = captureRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const start = [{ x, y }];
      freePointsRef.current = start;
      setFreeDrawPreviewPoints(start);
      setIsDrawingFree(true);
    },
    [addShape]
  );

  const handleFreeDrawMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawingFree || !captureRef.current) return;
      const rect = captureRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const next = [...freePointsRef.current, { x, y }];
      freePointsRef.current = next;
      setFreeDrawPreviewPoints(next);
    },
    [isDrawingFree]
  );

  const handleFreeDrawEnd = useCallback(() => {
    if (!isDrawingFree) return;
    const points = freePointsRef.current;
    if (points.length < 3) {
      setIsDrawingFree(false);
      setFreeDrawPreviewPoints([]);
      freePointsRef.current = [];
      return;
    }
    pushOverlayHistory(overlays);
    let minX = 100, minY = 100, maxX = 0, maxY = 0;
    points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const newOverlay = createDefaultOverlay("free", minX, minY);
    newOverlay.x = minX;
    newOverlay.y = minY;
    newOverlay.width = maxX - minX || 10;
    newOverlay.height = maxY - minY || 10;
    newOverlay.points = points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
    setOverlays((prev) => [...prev, newOverlay]);
    setIsDrawingFree(false);
    setFreeDrawPreviewPoints([]);
    freePointsRef.current = [];
    setAddShape(null);
  }, [isDrawingFree, setOverlays, overlays, pushOverlayHistory]);

  const handleDeleteSavedPanel = useCallback(() => {
    if (panelToDeleteId) {
      setSavedPanels((prev) => prev.filter((p) => p.id !== panelToDeleteId));
      setPanelToDeleteId(null);
    }
  }, [panelToDeleteId, setSavedPanels]);

  const handleRenameSavedPanel = useCallback(
    (saved: SavedPanel) => {
      setRenamePanelId(saved.id);
      setRenameValue(saved.name);
    },
    []
  );

  const handleRenameSubmit = useCallback(() => {
    if (!renamePanelId || !renameValue.trim()) {
      setRenamePanelId(null);
      return;
    }
    setSavedPanels((prev) =>
      prev.map((p) => (p.id === renamePanelId ? { ...p, name: renameValue.trim() } : p))
    );
    setRenamePanelId(null);
    setRenameValue("");
  }, [renamePanelId, renameValue, setSavedPanels]);

  const handleSavePanel = useCallback(() => {
    const name = prompt("保存名を入力", `パネル ${savedPanels.length + 1}`);
    if (!name?.trim()) return;
    const saved: SavedPanel = {
      id: `saved-${Date.now()}`,
      name: name.trim(),
      savedAt: Date.now(),
      state: { ...panelState },
    };
    setSavedPanels((prev) => [...prev, saved]);
    setIsMenuOpen(false);
  }, [panelState, savedPanels.length, setSavedPanels]);

  const handleLoadPanel = useCallback(
    (saved: SavedPanel) => {
      const state = saved.state;
      setPanelState({
        ...defaultPanelState,
        ...state,
        filterIntensity: state.filterIntensity ?? 50,
        imageAspectRatio: state.imageAspectRatio ?? undefined,
      });
      setSelectedOverlayId(null);
      setIsMenuOpen(false);
    },
    [setPanelState]
  );

  const handleShare = useCallback(async () => {
    const el = captureRef.current;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: isLightMode ? "#f5f3ff" : "#0f0a1e",
        pixelRatio: 2,
      });
      const filename = `panel-${getTimestampForFilename()}.png`;
      const shared = await shareImageWithText(dataUrl, "", filename);
      if (shared) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
      window.open(generateShareUrl(""), "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("Panel image export failed:", err);
    }
  }, [isLightMode]);

  const toggleFilter = useCallback(
    (filter: FilterType) => {
      setPanelState((s) => ({
        ...s,
        activeFilters: s.activeFilters.includes(filter)
          ? s.activeFilters.filter((f) => f !== filter)
          : [...s.activeFilters, filter],
      }));
    },
    [setPanelState]
  );

  const headerBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.92)";
  const iconColor = isLightMode ? "text-gray-800" : "text-white";
  const iconHover = isLightMode ? "hover:bg-gray-200" : "hover:bg-white/20";
  const splitPaneBg = isSplitMode ? (isLightMode ? undefined : "#0a051e") : undefined;
  const splitLightBg =
    "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";

  return (
    <div
      className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}
      style={splitPaneBg ? { background: splitPaneBg } : undefined}
    >
      {isSplitMode && isLightMode && (
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />
      )}

      {/* Header */}
      <div
        className={`shrink-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 ${isSplitMode ? "relative min-h-[56px]" : "fixed top-0"}`}
        style={{
          background: isSplitMode ? (isLightMode ? "#f8f9fa" : "#0a051e") : headerBg,
          backdropFilter: isSplitMode ? "none" : "blur(12px)",
          borderBottom: isSplitMode ? "none" : `1px solid ${isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
          <button
            onClick={() => {
              setPanelState((s) => ({ ...s, isEditMode: !s.isEditMode }));
              if (isEditMode) setAddShape(null);
            }}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title={isEditMode ? "パネル明けモードに切り替え" : "編集モードに切り替え"}
          >
            {isEditMode ? <Eye size={16} /> : <Pencil size={16} />}
            <span className="sr-only">{isEditMode ? "編集" : "パネル明け"}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title="画像を保存して X で共有"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title="メニュー"
          >
            <Menu size={16} />
          </button>
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title={isLightMode ? "ダークモード" : "ライトモード"}
          >
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>

      {/* Hamburger menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/40"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed left-0 top-[56px] bottom-0 w-72 max-w-[85vw] z-[91] overflow-y-auto scroll-touch p-4"
              style={{
                background: isLightMode ? "rgba(255,255,255,0.98)" : "rgba(20,10,40,0.98)",
                borderRight: `1px solid ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <div className={`space-y-4 ${isLightMode ? "text-gray-800" : "text-white"}`}>
                <h3 className="font-bold flex items-center gap-2">
                  <PanelTopOpen size={18} /> パネル
                </h3>
                <button
                  onClick={handleSavePanel}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                >
                  <Save size={16} /> 現在のパネルを保存
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                >
                  <Share2 size={16} /> 画像を保存して X で共有
                </button>
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <List size={14} /> 保存したパネル
                  </h4>
                  <ul className="space-y-1">
                    {savedPanels.length === 0 ? (
                      <li className="text-sm opacity-70">保存したパネルはありません</li>
                    ) : (
                      savedPanels.map((s) => (
                        <li key={s.id} className="flex items-center gap-1 group">
                          {renamePanelId === s.id ? (
                            <>
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") { setRenamePanelId(null); setRenameValue(""); } }}
                                onBlur={handleRenameSubmit}
                                className="flex-1 min-w-0 px-2 py-1 rounded text-sm border bg-transparent"
                                autoFocus
                              />
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleLoadPanel(s)}
                                className="flex-1 min-w-0 text-left px-2 py-1.5 rounded text-sm hover:bg-white/10 truncate"
                              >
                                {s.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRenameSavedPanel(s)}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 shrink-0"
                                title="名前を変更"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPanelToDeleteId(s.id)}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 shrink-0"
                                title="削除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main
        className={`relative z-10 flex-1 flex flex-col min-h-0 overflow-auto scroll-touch ${isSplitMode ? "pt-0" : "pt-[56px]"}`}
      >
        {/* Toolbar (edit mode only) */}
        {isEditMode && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 p-2 border-b" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <input
              ref={imageOverlayInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file?.type.startsWith("image/")) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  const newOverlay = createImageOverlay(dataUrl, 42.5, 42.5);
                  setPanelState((s) => {
                    pushOverlayHistory(s.overlays);
                    return { ...s, overlays: [...s.overlays, newOverlay] };
                  });
                  setSelectedOverlayId(newOverlay.id);
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm border border-violet-500/40 bg-violet-500/10 text-violet-400"
            >
              <ImagePlus size={14} /> 画像を選択
            </button>
            <button
              onClick={() => imageOverlayInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <ImagePlus size={14} /> 画像を追加
            </button>
            <span className="text-xs opacity-70">覆いの形:</span>
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
                    setCustomShapeEditingId(null);
                    setCustomShapeModalOpen(true);
                    setAddShape(null);
                    setIsDrawingFree(false);
                    return;
                  }
                  if (!captureRef.current) {
                    setAddShape(addShape === shape ? null : shape);
                    setIsDrawingFree(false);
                    return;
                  }
                  // クイック追加: 図形ボタンで中央付近に1つ出す
                  const rect = captureRef.current.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  pushOverlayHistory(overlays);
                  handleAddOverlayAtPoint(shape, centerX, centerY);
                  setAddShape(null);
                  setIsDrawingFree(false);
                }}
                className={`px-2 py-1 rounded text-xs ${addShape === shape ? "bg-violet-500/30 text-white" : isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/10 text-white/80"}`}
              >
                {shape === "rect" ? "四角" : shape === "circle" ? "丸" : shape === "triangle" ? "三角" : shape === "custom" ? "カスタム" : "自由"}
              </button>
            ))}
            <span className="text-xs opacity-70 ml-2">MECE:</span>
            <button
              type="button"
              onClick={() => handleAddRectGrid(2, 2)}
              className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
            >
              四角2×2
            </button>
            <button
              type="button"
              onClick={() => handleAddRectGrid(3, 3)}
              className="px-2 py-1 rounded text-xs border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
            >
              四角3×3
            </button>
            <button
              type="button"
              onClick={() => handleAddTriangleStripes(3)}
              className="px-2 py-1 rounded text-xs border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            >
              三角3段
            </button>
            <span className="text-xs opacity-70 ml-2">フィルター:</span>
            {(["noise", "grid", "blur"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={`px-2 py-1 rounded text-xs ${activeFilters.includes(f) ? "bg-violet-500/30 text-white" : isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/10 text-white/80"}`}
              >
                {f === "noise" ? "ノイズ" : f === "grid" ? "グリッド" : "ぼかし"}
              </button>
            ))}
            <label className="flex items-center gap-1 text-xs opacity-80">
              <input
                type="checkbox"
                checked={filterShowLabel}
                onChange={(e) => setPanelState((s) => ({ ...s, filterShowLabel: e.target.checked }))}
                className="rounded"
              />
              AI読み取り防止
            </label>
            <span className="text-xs opacity-70 ml-2">強さ:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={filterIntensity}
              onChange={(e) => setPanelState((s) => ({ ...s, filterIntensity: Number(e.target.value) }))}
              className="w-20 h-1.5 accent-violet-500"
            />
            <span className="text-[10px] tabular-nums opacity-70">{filterIntensity}</span>
          </div>
        )}

        {/* Capture area: image + filters + overlays */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <div
            ref={captureRef}
            className="relative w-full max-w-4xl max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl"
            style={{
              aspectRatio: imageDataUrl && typeof imageAspectRatio === "number" ? imageAspectRatio : 16 / 9,
              background: imageDataUrl ? "transparent" : (isLightMode ? "#e0e0e0" : "#1a1a2e"),
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={!imageDataUrl ? handleImageDrop : undefined}
            onPointerDownCapture={handleCapturePointerDown}
            onPointerMoveCapture={handleCapturePointerMove}
            onPointerUpCapture={handleCapturePointerUp}
            {...({
              onPointerLeaveCapture: handleCapturePointerLeaveOrCancel,
              onPointerCancelCapture: handleCapturePointerLeaveOrCancel,
            } as React.ComponentProps<"div">)}
            onClick={addShape && addShape !== "free" ? handleAddOverlay : undefined}
            onPointerDown={addShape === "free" ? handleFreeDrawStart : undefined}
            onPointerMove={isDrawingFree ? handleFreeDrawMove : undefined}
            onPointerUp={isDrawingFree ? handleFreeDrawEnd : undefined}
            onPointerLeave={isDrawingFree ? handleFreeDrawEnd : undefined}
            onPointerCancel={isDrawingFree ? handleFreeDrawEnd : undefined}
          >
            {!imageDataUrl ? (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer ${isLightMode ? "text-gray-500" : "text-white/50"}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
              >
                <ImagePlus size={48} />
                <span className="text-sm font-medium text-center px-4">
                  ここをクリックするか、画像をドラッグ＆ドロップしてアップロード
                </span>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Data URL from upload */}
                <img
                  src={imageDataUrl}
                  alt="パネル画像"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                {/* Filter layers */}
                {activeFilters.includes("blur") && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backdropFilter: `blur(${2 * (filterIntensity / 50)}px)`,
                      WebkitBackdropFilter: `blur(${2 * (filterIntensity / 50)}px)`,
                    }}
                  />
                )}
                {activeFilters.includes("noise") && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: 0.15 + (filterIntensity / 100) * 0.4,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                      backgroundSize: "128px 128px",
                    }}
                  />
                )}
                {activeFilters.includes("grid") && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: 0.05 + (filterIntensity / 100) * 0.15,
                      backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                )}
                {filterShowLabel && activeFilters.length > 0 && (
                  <div
                    className={`absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-bold ${isLightMode ? "bg-black/20 text-gray-800" : "bg-white/20 text-white"}`}
                  >
                    AI読み取り防止
                  </div>
                )}
                {/* Overlays */}
                {overlays.map((overlay) => {
                  const isFree = overlay.shape === "free";
                  const isImage = overlay.shape === "image";
                  const isCustom = overlay.shape === "custom" && overlay.parts && overlay.parts.length > 0;
                  const freePoints = isFree && overlay.points && overlay.points.length >= 2
                    ? overlay.points
                        .map((p) => {
                          const x = overlay.width ? (p.x / overlay.width) * 100 : 0;
                          const y = overlay.height ? (p.y / overlay.height) * 100 : 0;
                          return `${x},${y}`;
                        })
                        .join(" ")
                    : "";
                  const rotation = overlay.rotation ?? 0;
                  const selected = selectedOverlayId === overlay.id;
                  return (
                    <div
                      key={overlay.id}
                      className="absolute cursor-pointer select-none flex flex-col items-center justify-center overflow-hidden"
                      style={{
                        left: `${overlay.x}%`,
                        top: `${overlay.y}%`,
                        width: `${overlay.width}%`,
                        height: `${overlay.height}%`,
                        minWidth: 24,
                        minHeight: 24,
                        transform: `${overlay.flipX ? "scaleX(-1) " : ""}rotate(${rotation}deg)`,
                        transformOrigin: "center center",
                        opacity: (overlay.opacity ?? 100) / 100,
                        background: isFree || isImage || isCustom ? "transparent" : overlay.color,
                        border: selected ? `2px solid ${overlay.color}` : "1px solid rgba(255,255,255,0.3)",
                        borderRadius: isCustom ? 0 : overlay.shape === "circle" ? "50%" : overlay.shape === "rect" ? 0 : 4,
                        clipPath: isCustom
                          ? undefined
                          : overlay.shape === "triangle"
                            ? overlay.triangleKind === "rightTop"
                              ? "polygon(0 0, 100% 0, 0 100%)"
                              : overlay.triangleKind === "rightBottom"
                              ? "polygon(0 0, 100% 100%, 0 100%)"
                              : overlay.triangleKind === "isoLeft"
                              ? "polygon(0 50%, 100% 0, 100% 100%)"
                              : overlay.triangleKind === "isoRight"
                              ? "polygon(100% 50%, 0 0, 0 100%)"
                              : overlay.triangleKind === "diagDownUpper"
                              ? "polygon(0 0, 100% 0, 0 100%)" // 左上三角（対角線 左上→右下）
                              : overlay.triangleKind === "diagDownLower"
                              ? "polygon(100% 0, 100% 100%, 0 100%)" // 右下三角
                              : overlay.triangleKind === "diagUpUpper"
                              ? "polygon(0 0, 100% 0, 100% 100%)" // 右上三角（対角線 右上→左下）
                              : overlay.triangleKind === "diagUpLower"
                              ? "polygon(0 0, 100% 100%, 0 100%)" // 左下三角
                              : "polygon(50% 0%, 100% 100%, 0% 100%)"
                            : undefined,
                      }}
                      onPointerDown={(e) => handlePointerDown(overlay, e)}
                      onPointerMove={(e) => handleOverlayPointerMove(overlay, e)}
                      onPointerUp={(e) => {
                        handleOverlayPointerUp();
                        handlePointerUp(overlay, e);
                      }}
                      onPointerLeave={() => {
                        handleOverlayPointerUp();
                        if (tapTimerRef.current) {
                          clearTimeout(tapTimerRef.current);
                          tapTimerRef.current = null;
                        }
                        tapPendingRef.current = false;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditMode) setSelectedOverlayId(selectedOverlayId === overlay.id ? null : overlay.id);
                      }}
                    >
                      {isImage && overlay.imageDataUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- overlay Data URL */}
                          <img src={overlay.imageDataUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
                        </>
                      ) : null}
                      {isFree && freePoints ? (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon points={freePoints} fill={overlay.color} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
                        </svg>
                      ) : null}
                      {isCustom && overlay.parts ? (
                        <>
                          {overlay.parts.map((part) => {
                            const clipPath = getPartClipPath(part);
                            const color = part.color ?? overlay.color;
                            const rot = part.rotation ?? 0;
                            return (
                              <div
                                key={part.id}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${part.x}%`,
                                  top: `${part.y}%`,
                                  width: `${part.width}%`,
                                  height: `${part.height}%`,
                                  transform: `rotate(${rot}deg)`,
                                  transformOrigin: "center center",
                                  background: color,
                                  borderRadius: part.shape === "circle" ? "50%" : part.shape === "rect" ? 0 : 4,
                                  clipPath: clipPath ?? undefined,
                                }}
                              />
                            );
                          })}
                        </>
                      ) : null}
                      {!isImage && (isFree ? (overlay.points && overlay.points.length > 0) : isCustom ? overlay.parts?.length : true) ? (
                        <div
                          className={`relative z-10 flex flex-col items-center justify-center p-0.5 ${
                            isEditMode ? "pointer-events-none" : ""
                          } ${overlay.shape === "triangle" ? "" : isCustom ? "" : "w-full h-full"}`}
                          style={
                            isCustom && overlay.parts?.length
                              ? {
                                  position: "absolute",
                                  left: `${getCustomOverlayCentroid(overlay.parts).x}%`,
                                  top: `${getCustomOverlayCentroid(overlay.parts).y}%`,
                                  transform: `${overlay.flipX ? "scaleX(-1) " : ""}translate(-50%, -50%)`,
                                  maxWidth: "90%",
                                }
                              : overlay.shape === "triangle"
                              ? {
                                  position: "absolute",
                                  left: `${getTriangleTextAnchor(overlay.triangleKind).x}%`,
                                  top: `${getTriangleTextAnchor(overlay.triangleKind).y}%`,
                                  transform: `${overlay.flipX ? "scaleX(-1) " : ""}translate(-50%, -50%)`,
                                  maxWidth: "90%",
                                }
                              : overlay.flipX
                              ? {
                                  transform: "scaleX(-1)",
                                }
                              : undefined
                          }
                        >
                          {overlay.label ? (
                            <span className={`text-[10px] font-medium truncate w-full text-center ${isLightMode ? "text-gray-800" : "text-white/90"}`}>
                              {overlay.label}
                            </span>
                          ) : null}
                          <span className={`text-sm font-bold tabular-nums ${isLightMode ? "text-gray-900" : "text-white"}`}>
                            {overlay.targetType === "number" ? (
                              <>
                                {overlay.count}
                                {overlay.target > 0 && <span className="opacity-60">/{overlay.target}</span>}
                              </>
                            ) : (
                              <span className="text-xs font-medium px-1 truncate max-w-full block">
                                {overlay.targetText || "（テキスト）"}
                              </span>
                            )}
                          </span>
                        </div>
                      ) : null}
                      {isEditMode && selected ? (
                        <>
                          {/* 円形ガイド（傾き用） */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                            <circle cx="50" cy="50" r="58" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} strokeDasharray="4 3" />
                          </svg>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushOverlayHistory(overlays);
                              setOverlays((prev) => prev.filter((p) => p.id !== overlay.id));
                              setSelectedOverlayId(null);
                            }}
                            className="absolute top-0 right-0 w-6 h-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shrink-0 shadow border-2 border-white"
                            style={{ zIndex: 25 }}
                            title="削除"
                          >
                            <Trash2 size={12} />
                          </button>
                          <div
                            data-handle="rotate"
                            className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing"
                            style={{ zIndex: 20, width: 32, height: 24 }}
                          >
                            <div className="w-8 h-5 rounded bg-violet-500/80 flex items-center justify-center">
                              <span className="text-xs text-white">↻</span>
                            </div>
                          </div>
                          {(["se", "sw", "ne", "nw"] as const).map((h) => (
                            <div
                              key={h}
                              data-handle={h}
                              className="absolute flex items-center justify-center cursor-nwse-resize"
                              style={{
                                top: h.includes("n") ? -12 : undefined,
                                bottom: h.includes("s") ? -12 : undefined,
                                left: h.includes("w") ? -12 : undefined,
                                right: h.includes("e") ? -12 : undefined,
                                width: 28,
                                height: 28,
                                zIndex: 20,
                              }}
                            >
                              <div className="w-3 h-3 rounded-full bg-violet-500 border-2 border-white" />
                            </div>
                          ))}
                          {(["n", "s", "e", "w"] as const).map((h) => (
                            <div
                              key={h}
                              data-handle={h}
                              className="absolute flex items-center justify-center cursor-pointer"
                              style={{
                                top: h === "n" ? -12 : h === "s" ? undefined : "50%",
                                bottom: h === "s" ? -12 : undefined,
                                left: h === "w" ? -12 : h === "e" ? undefined : "50%",
                                right: h === "e" ? -12 : undefined,
                                transform:
                                  h === "n" || h === "s"
                                    ? "translateX(-50%)"
                                    : h === "e" || h === "w"
                                    ? "translateY(-50%)"
                                    : undefined,
                                width: 28,
                                height: 28,
                                zIndex: 20,
                              }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-white" />
                            </div>
                          ))}
                        </>
                      ) : null}
                    </div>
                  );
                })}
                {/* Free draw preview */}
                {isDrawingFree && freeDrawPreviewPoints.length > 1 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={freeDrawPreviewPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="rgba(139,92,246,0.3)"
                      stroke="rgba(139,92,246,0.8)"
                      strokeWidth={0.5}
                    />
                  </svg>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected overlay edit (edit mode) */}
        {isEditMode && selectedOverlayId && (() => {
          const o = overlays.find((x) => x.id === selectedOverlayId);
          if (!o) return null;
          const isImageOverlay = o.shape === "image";
          return (
            <div
              className="shrink-0 p-3 border-t flex flex-wrap items-center gap-3"
              style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}
            >
              {!isImageOverlay ? (
                <>
                  <span className="text-sm font-medium">何を:</span>
                  <input
                    type="text"
                    value={o.label ?? ""}
                    onChange={(e) =>
                      setOverlays((prev) =>
                        prev.map((p) => (p.id === o.id ? { ...p, label: e.target.value } : p))
                      )
                    }
                    placeholder="例: 景品、コメント"
                    className="w-28 px-2 py-1 rounded border text-sm"
                  />
                  <span className="text-sm font-medium">目標:</span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      checked={o.targetType === "number"}
                      onChange={() =>
                        setOverlays((prev) =>
                          prev.map((p) => (p.id === o.id ? { ...p, targetType: "number" as const, targetText: "" } : p))
                        )
                      }
                    />
                    数値
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      checked={o.targetType === "text"}
                      onChange={() =>
                        setOverlays((prev) =>
                          prev.map((p) => (p.id === o.id ? { ...p, targetType: "text" as const, target: 0, count: 0 } : p))
                        )
                      }
                    />
                    日本語
                  </label>
                  {o.targetType === "number" ? (
                    <input
                      type="number"
                      min={0}
                      value={o.target}
                      onChange={(e) =>
                        setOverlays((prev) =>
                          prev.map((p) => (p.id === o.id ? { ...p, target: Math.max(0, parseInt(e.target.value, 10) || 0) } : p))
                        )
                      }
                      className="w-16 px-2 py-1 rounded border text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={o.targetText}
                      onChange={(e) =>
                        setOverlays((prev) =>
                          prev.map((p) => (p.id === o.id ? { ...p, targetText: e.target.value } : p))
                        )
                      }
                      placeholder="目標テキスト"
                      className="flex-1 min-w-[120px] px-2 py-1 rounded border text-sm"
                    />
                  )}
                </>
              ) : null}
              <span className="text-sm font-medium">色:</span>
              <input
                type="color"
                value={o.color}
                onChange={(e) =>
                  setOverlays((prev) =>
                    prev.map((p) => (p.id === o.id ? { ...p, color: e.target.value } : p))
                  )
                }
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <span className="text-sm font-medium">透明度:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={o.opacity ?? 100}
                onChange={(e) =>
                  setOverlays((prev) =>
                    prev.map((p) => (p.id === o.id ? { ...p, opacity: Number(e.target.value) } : p))
                  )
                }
                className="w-20 h-1.5 accent-violet-500"
              />
              <span className="text-xs tabular-nums opacity-70 w-8">{o.opacity ?? 100}%</span>
              <span className="text-sm font-medium">回転:</span>
              <RotationDial
                value={Math.round(o.rotation ?? 0)}
                onChange={(deg) =>
                  setOverlays((prev) =>
                    prev.map((p) => (p.id === o.id ? { ...p, rotation: Math.max(-360, Math.min(360, deg)) } : p))
                  )
                }
                isLightMode={isLightMode}
              />
              <input
                type="number"
                min={-360}
                max={360}
                value={Math.round(o.rotation ?? 0)}
                onChange={(e) =>
                  setOverlays((prev) =>
                    prev.map((p) => (p.id === o.id ? { ...p, rotation: Math.max(-360, Math.min(360, parseInt(e.target.value, 10) || 0)) } : p))
                  )
                }
                className="w-14 px-2 py-1 rounded border text-sm"
              />
              <span className="text-xs opacity-70">度</span>
              <button
                onClick={() => {
                  if (!o) return;
                  pushOverlayHistory(overlays);
                  setOverlays((prev) =>
                    prev.map((p) => (p.id === o.id ? { ...p, flipX: !p.flipX } : p))
                  );
                }}
                className="px-2 py-1 rounded text-sm bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
              >
                左右反転
              </button>
              {o.shape === "custom" && o.parts && o.parts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomShapeEditingId(o.id);
                    setCustomShapeModalOpen(true);
                  }}
                  className="px-2 py-1 rounded text-sm bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                >
                  図形を編集
                </button>
              ) : null}
              <button
                onClick={() => {
                  pushOverlayHistory(overlays);
                  setOverlays((prev) => prev.filter((p) => p.id !== o.id));
                  setSelectedOverlayId(null);
                }}
                className="px-2 py-1 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                削除
              </button>
            </div>
          );
        })()}
      </main>

      <ConfirmDialog
        open={achievedOverlayId !== null}
        message="達成しますか？"
        confirmLabel="はい"
        cancelLabel="いいえ"
        onConfirm={handleConfirmAchieve}
        onCancel={() => setAchievedOverlayId(null)}
        danger={false}
      />
      <ConfirmDialog
        open={panelToDeleteId !== null}
        message="本当にこの保存パネルを削除しますか？"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={handleDeleteSavedPanel}
        onCancel={() => setPanelToDeleteId(null)}
        danger
      />
      <ImageCropModal
        open={pendingCropDataUrl !== null}
        imageDataUrl={pendingCropDataUrl}
        onConfirm={handleCropConfirm}
        onCancel={() => setPendingCropDataUrl(null)}
        isLightMode={isLightMode}
      />
      <CustomShapeEditorModal
        open={customShapeModalOpen}
        initialParts={
          customShapeEditingId
            ? (overlays.find((x) => x.id === customShapeEditingId)?.parts ?? [])
            : []
        }
        savedTemplates={savedCustomShapes}
        onConfirm={handleCustomShapeConfirm}
        onCancel={() => {
          setCustomShapeModalOpen(false);
          setCustomShapeEditingId(null);
        }}
        onSaveTemplate={handleSaveCustomTemplate}
        isLightMode={isLightMode}
      />
    </div>
  );
}
