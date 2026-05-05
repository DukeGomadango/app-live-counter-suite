"use client";

import { useState, useCallback, useRef } from "react";
import { 
  type PanelOverlay, 
  type PartitionStroke, 
  type PanelState,
  type PanelEditStep,
  type OverlayShape,
  isPartitionLine,
  PartitionSegment,
  PartitionCurve,
  createOverlayId
} from "../lib/panelTypes";
import { 
  findStrokeIndexAt 
} from "../lib/panelUtils";
import { 
  smoothPoints, 
  pointsToBezierChain 
} from "../lib/panelStrokeUtils";

const LINE_HIT_THRESHOLD = 3;

interface DrawingProps {
  isLineStep: boolean;
  lineToolMode: "pen" | "hand";
  lineSegmentMode: "line" | "curve";
  partitionStrokes: PartitionStroke[];
  setPartitionStrokes: React.Dispatch<React.SetStateAction<PartitionStroke[]>>;
  addShape: OverlayShape | null;
  setAddShape: (s: OverlayShape | null) => void;
  setOverlays: (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => void;
  pushOverlayHistory: (current: PanelOverlay[]) => void;
  clientToPctForLine: (clientX: number, clientY: number) => { x: number; y: number };
  clientToPct: (clientX: number, clientY: number) => { x: number; y: number };
}

export function usePanelDrawing({
  isLineStep,
  lineToolMode,
  lineSegmentMode,
  partitionStrokes,
  setPartitionStrokes,
  addShape,
  setAddShape,
  setOverlays,
  pushOverlayHistory,
  clientToPctForLine,
  clientToPct
}: DrawingProps) {
  const [lineDrawStart, setLineDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [lineDrawEnd, setLineDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const strokePointsRef = useRef<{ x: number; y: number }[]>([]);
  const [strokePreviewPoints, setStrokePreviewPoints] = useState<{ x: number; y: number }[]>([]);
  const lineDragRef = useRef<{ strokeIndex: number; startP: { x: number; y: number }; originalSegments: PartitionSegment[] } | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  const [isDrawingFree, setIsDrawingFree] = useState(false);
  const [freeDrawPreviewPoints, setFreeDrawPreviewPoints] = useState<{ x: number; y: number }[]>([]);
  const freePointsRef = useRef<{ x: number; y: number }[]>([]);

  const handleLineDrawPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isPrimary = e.button === 0 || e.pointerType === "touch";
      if (!isLineStep || !isPrimary) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const p = clientToPctForLine(e.clientX, e.clientY);
      if (lineToolMode === "hand") {
        // partitionStrokes is passed from props
        const hit = findStrokeIndexAt(partitionStrokes, p.x, p.y, LINE_HIT_THRESHOLD);
        if (hit !== null && partitionStrokes[hit]) {
          setSelectedLineIndex(hit);
          const stroke = partitionStrokes[hit]!;
          const originalSegments = stroke.segments.map((seg): PartitionSegment => {
            if (isPartitionLine(seg)) return { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 };
            const c = seg as PartitionCurve;
            return { type: "curve" as const, x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, cpx: c.cpx, cpy: c.cpy };
          });
          lineDragRef.current = { strokeIndex: hit, startP: p, originalSegments };
          return;
        }
        setSelectedLineIndex(null);
        lineDragRef.current = null;
        return;
      }
      setSelectedLineIndex(null);
      lineDragRef.current = null;
      setLineDrawStart(p);
      setLineDrawEnd(p);
      if (lineSegmentMode === "curve") {
        strokePointsRef.current = [{ x: p.x, y: p.y }];
        setStrokePreviewPoints([{ x: p.x, y: p.y }]);
      }
    },
    [isLineStep, lineToolMode, lineSegmentMode, clientToPctForLine, partitionStrokes]
  );

  const handleLineDrawPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isLineStep) return;
      if (lineDragRef.current) {
        const p = clientToPctForLine(e.clientX, e.clientY);
        const { strokeIndex, startP, originalSegments } = lineDragRef.current;
        const dx = p.x - startP.x;
        const dy = p.y - startP.y;
        const clamp = (v: number) => Math.max(0, Math.min(100, v));
        const moved = originalSegments.map((seg) => {
          if (isPartitionLine(seg)) {
            return { x1: clamp(seg.x1 + dx), y1: clamp(seg.y1 + dy), x2: clamp(seg.x2 + dx), y2: clamp(seg.y2 + dy) };
          }
          const curve = seg as PartitionCurve;
          return { type: "curve" as const, x1: clamp(curve.x1 + dx), y1: clamp(curve.y1 + dy), x2: clamp(curve.x2 + dx), y2: clamp(curve.y2 + dy), cpx: clamp(curve.cpx + dx), cpy: clamp(curve.cpy + dy) };
        });
        setPartitionStrokes((prev) => prev.map((stroke, i) => (i === strokeIndex ? { segments: moved } : stroke)));
        return;
      }
      if (!lineDrawStart) return;
      const p = clientToPctForLine(e.clientX, e.clientY);
      if (lineSegmentMode === "curve") {
        const pts = strokePointsRef.current;
        const last = pts[pts.length - 1];
        if (last && (last.x - p.x) ** 2 + (last.y - p.y) ** 2 >= 0.3 ** 2) {
          const next = [...pts, { x: p.x, y: p.y }];
          strokePointsRef.current = next;
          setStrokePreviewPoints(next);
        }
      }
      setLineDrawEnd(p);
    },
    [isLineStep, lineDrawStart, lineSegmentMode, clientToPctForLine, setPartitionStrokes]
  );

  const handleLineDrawPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const isPrimary = e.button === 0 || e.pointerType === "touch";
      if (!isLineStep || !isPrimary) return;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      if (lineDragRef.current) {
        lineDragRef.current = null;
        return;
      }
      const end = clientToPctForLine(e.clientX, e.clientY);
      const clampPct = (v: number) => Math.max(0, Math.min(100, v));

      if (lineDrawStart && (lineDrawStart.x !== end.x || lineDrawStart.y !== end.y)) {
        if (lineSegmentMode === "curve") {
          const pts = strokePointsRef.current;
          if (pts.length >= 2) {
            const smoothed = smoothPoints(pts, 5);
            const segments = pointsToBezierChain(smoothed);
            if (segments.length > 0) {
              setPartitionStrokes((prev) => [...prev, { segments }]);
            }
          }
        } else {
          const x1 = clampPct(lineDrawStart.x);
          const y1 = clampPct(lineDrawStart.y);
          const x2 = clampPct(end.x);
          const y2 = clampPct(end.y);
          setPartitionStrokes((prev) => [...prev, { segments: [{ x1, y1, x2, y2 }] }]);
        }
      }
      setLineDrawStart(null);
      setLineDrawEnd(null);
      strokePointsRef.current = [];
      setStrokePreviewPoints([]);
    },
    [isLineStep, lineDrawStart, lineSegmentMode, clientToPctForLine, setPartitionStrokes]
  );

  // Free drawing
  const handleFreeDrawStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (addShape !== "free") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const p = clientToPct(e.clientX, e.clientY);
      const start = [{ x: p.x, y: p.y }];
      freePointsRef.current = start;
      setFreeDrawPreviewPoints(start);
      setIsDrawingFree(true);
    },
    [addShape, clientToPct]
  );

  const handleFreeDrawMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawingFree) return;
      const p = clientToPct(e.clientX, e.clientY);
      const next = [...freePointsRef.current, { x: p.x, y: p.y }];
      freePointsRef.current = next;
      setFreeDrawPreviewPoints(next);
    },
    [isDrawingFree, clientToPct]
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
    // Access to setOverlays and pushOverlayHistory from props
    setOverlays((prev) => {
      pushOverlayHistory(prev);
      let minX = 100, minY = 100, maxX = 0, maxY = 0;
      points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      // Import helper to create overlay
      const id = createOverlayId();
      const newOverlay: PanelOverlay = {
        id,
        shape: "free",
        x: minX,
        y: minY,
        width: maxX - minX || 10,
        height: maxY - minY || 10,
        points: points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
        color: "rgba(139,92,246,0.6)", // Default color
        count: 0,
        target: 0,
        targetType: "number",
      };
      return [...prev, newOverlay];
    });
    setIsDrawingFree(false);
    setFreeDrawPreviewPoints([]);
    freePointsRef.current = [];
    setAddShape(null);
  }, [isDrawingFree, setOverlays, pushOverlayHistory, setAddShape]);

  return {
    lineDrawStart, lineDrawEnd,
    strokePreviewPoints,
    selectedLineIndex, setSelectedLineIndex,
    isDrawingFree, freeDrawPreviewPoints,
    handleLineDrawPointerDown,
    handleLineDrawPointerMove,
    handleLineDrawPointerUp,
    handleFreeDrawStart,
    handleFreeDrawMove,
    handleFreeDrawEnd,
    setLineDrawStart, setLineDrawEnd,
    setStrokePreviewPoints,
    setIsDrawingFree
  };
}
