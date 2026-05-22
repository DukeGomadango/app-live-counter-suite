"use client";

import { useCallback, useRef } from "react";
import { type PanelOverlay } from "../lib/panelTypes";
import { 
  snapToGrid, 
  snapToNearestGuide 
} from "../lib/panelUtils";

const TAP_WINDOW_MS = 200;
const DRAG_THRESHOLD_PX = 5;

interface InteractionProps {
  overlays: PanelOverlay[];
  setOverlays: (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => void;
  pushOverlayHistory: (current: PanelOverlay[]) => void;
  selectedOverlayId: string | null;
  setSelectedOverlayIdAndClearDraft: (id: string | null) => void;
  isEditMode: boolean;
  getRect: () => DOMRect | undefined;
}

export function useOverlayInteraction({
  overlays,
  setOverlays,
  pushOverlayHistory,
  selectedOverlayId,
  setSelectedOverlayIdAndClearDraft: _setSelectedOverlayIdAndClearDraft,
  isEditMode,
  getRect
}: InteractionProps) {
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
  const tapPendingRef = useRef(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const isPrimary = e.button === 0 || e.pointerType === "touch";
      if (!isPrimary) return;
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
        let x = startOX, y = startOY, w = startW, h = startH;
        
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

        let nx = snapToGrid(dragRef.current.startOX + dx);
        let ny = snapToGrid(dragRef.current.startOY + dy);
        nx = Math.max(0, Math.min(100 - overlay.width, nx));
        ny = Math.max(0, Math.min(100 - overlay.height, ny));

        const xGuides = [0, 50 - overlay.width / 2, 100 - overlay.width];
        const yGuides = [0, 50 - overlay.height / 2, 100 - overlay.height];

        overlays.forEach((o) => {
          if (o.id === overlay.id) return;
          xGuides.push(o.x, o.x + o.width - overlay.width, o.x + o.width / 2 - overlay.width / 2);
          yGuides.push(o.y, o.y + o.height - overlay.height, o.y + o.height / 2 - overlay.height / 2);
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
    [getRect, clientToPct, setOverlays, overlays]
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
        const p0 = arr[0]!;
        const p1 = arr[1]!;
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
      const p0 = arr[0]!;
      const p1 = arr[1]!;
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

  const resetTapPending = useCallback(() => {
    tapPendingRef.current = false;
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  return {
    handlePointerDown,
    handleOverlayPointerMove,
    handleOverlayPointerUp,
    handleCapturePointerDown,
    handleCapturePointerMove,
    handleCapturePointerUp,
    handleCapturePointerLeaveOrCancel,
    resetTapPending,
    tapPendingRef,
    tapTimerRef
  };
}
