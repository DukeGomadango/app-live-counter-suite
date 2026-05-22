"use client";

import React from "react";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { 
  type PanelOverlay, 
  type PartitionStroke, 
  isPartitionLine,
  PartitionCurve,
  OverlayShape
} from "../../lib/panelTypes";
import { smoothPoints, pointsToBezierChain } from "../../lib/panelStrokeUtils";
import { OverlayItem } from "./OverlayItem";

interface PanelCanvasProps {
  captureRef: React.RefObject<HTMLDivElement | null>;
  imageDataUrl: string | null;
  resolvedBgUrl: string | null;
  imageAspectRatio: number | undefined;
  isLightMode: boolean;
  isEditMode: boolean;
  isLineStep: boolean;
  activeFilters: string[];
  filterIntensity: number;
  filterShowLabel: boolean;
  overlays: PanelOverlay[];
  selectedOverlayId: string | null;
  resolvedOverlayUrls: Record<string, string>;
  imageBoundsPct: { x: number; y: number; width: number; height: number } | null;
  
  // Handlers from useOverlayInteraction
  onPointerDownCapture: (e: React.PointerEvent) => void;
  onPointerMoveCapture: (e: React.PointerEvent) => void;
  onPointerUpCapture: (e: React.PointerEvent) => void;
  onPointerLeaveCapture: (e: React.PointerEvent) => void;
  
  // Handlers from usePanelDrawing
  partitionStrokes: PartitionStroke[];
  selectedLineIndex: number | null;
  lineDrawStart: { x: number; y: number } | null;
  lineDrawEnd: { x: number; y: number } | null;
  lineSegmentMode: "line" | "curve";
  lineToolMode: "pen" | "hand";
  strokePreviewPoints: { x: number; y: number }[];
  onLineDrawPointerDown: (e: React.PointerEvent) => void;
  onLineDrawPointerMove: (e: React.PointerEvent) => void;
  onLineDrawPointerUp: (e: React.PointerEvent) => void;
  
  isDrawingFree: boolean;
  freeDrawPreviewPoints: { x: number; y: number }[];
  onFreeDrawStart: (e: React.PointerEvent<HTMLDivElement>) => void;
  onFreeDrawMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onFreeDrawEnd: () => void;
  
  // General handlers
  onImageUploadClick: () => void;
  onImageDrop: (e: React.DragEvent) => void;
  onAddOverlayClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onOverlayPointerDown: (overlay: PanelOverlay, e: React.PointerEvent) => void;
  onOverlayPointerMove: (overlay: PanelOverlay, e: React.PointerEvent) => void;
  onOverlayPointerUp: (overlay: PanelOverlay, e: React.PointerEvent) => void;
  onOverlayPointerLeave: () => void;
  onOverlayClick: (overlayId: string, e: React.MouseEvent) => void;
  onOverlayDelete: (overlayId: string, e: React.MouseEvent) => void;
  pushOverlayHistory: (current: PanelOverlay[]) => void;
  addShape: OverlayShape | null;
}

export function PanelCanvas({
  captureRef,
  imageDataUrl,
  resolvedBgUrl,
  imageAspectRatio,
  isLightMode,
  isEditMode,
  isLineStep,
  activeFilters,
  filterIntensity,
  filterShowLabel,
  overlays,
  selectedOverlayId,
  resolvedOverlayUrls,
  imageBoundsPct,
  onPointerDownCapture,
  onPointerMoveCapture,
  onPointerUpCapture,
  onPointerLeaveCapture,
  partitionStrokes,
  selectedLineIndex,
  lineDrawStart,
  lineDrawEnd,
  lineSegmentMode,
  lineToolMode,
  strokePreviewPoints,
  onLineDrawPointerDown,
  onLineDrawPointerMove,
  onLineDrawPointerUp,
  isDrawingFree,
  freeDrawPreviewPoints,
  onFreeDrawStart,
  onFreeDrawMove,
  onFreeDrawEnd,
  onImageUploadClick,
  onImageDrop,
  onAddOverlayClick,
  onOverlayPointerDown,
  onOverlayPointerMove,
  onOverlayPointerUp,
  onOverlayPointerLeave,
  onOverlayClick,
  onOverlayDelete,
  pushOverlayHistory,
  addShape,
}: PanelCanvasProps) {
  return (
    <div
      ref={captureRef}
      className={`relative w-full flex items-center justify-center overflow-hidden rounded-xl ${
        isEditMode ? "max-w-full max-h-full" : "max-w-4xl min-h-[45vmin]"
      }`}
      style={{
        aspectRatio: imageDataUrl && typeof imageAspectRatio === "number" ? imageAspectRatio : 16 / 9,
        background: imageDataUrl ? "transparent" : (isLightMode ? "#e0e0e0" : "#1a1a2e"),
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={!imageDataUrl ? onImageDrop : undefined}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
      onPointerLeave={isDrawingFree ? onFreeDrawEnd : onPointerLeaveCapture}
      onPointerCancel={isDrawingFree ? onFreeDrawEnd : onPointerLeaveCapture}
      onClick={addShape && addShape !== "free" ? onAddOverlayClick : undefined}
      onPointerDown={addShape === "free" ? onFreeDrawStart : undefined}
      onPointerMove={isDrawingFree ? onFreeDrawMove : undefined}
      onPointerUp={isDrawingFree ? onFreeDrawEnd : undefined}
    >
      {!imageDataUrl ? (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer ${isLightMode ? "text-gray-500" : "text-white/50"}`}
          onClick={onImageUploadClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onImageDrop}
        >
          <ImagePlus size={48} />
          <span className="text-sm font-medium text-center px-4">
            ここをクリックするか、画像をドラッグ＆ドロップしてアップロード
          </span>
        </div>
      ) : (
        <>
          {(resolvedBgUrl ?? (imageDataUrl && imageDataUrl.startsWith("data:") ? imageDataUrl : undefined)) && (
            <Image
              src={resolvedBgUrl ?? imageDataUrl!}
              alt="パネル画像"
              fill
              unoptimized
              className="object-contain pointer-events-none"
            />
          )}
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

          {isLineStep && (
            <>
              <svg
                className="absolute w-full h-full pointer-events-none overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={
                  imageBoundsPct && imageBoundsPct.width > 0 && imageBoundsPct.height > 0
                    ? {
                        left: `${imageBoundsPct.x}%`,
                        top: `${imageBoundsPct.y}%`,
                        width: `${imageBoundsPct.width}%`,
                        height: `${imageBoundsPct.height}%`,
                      }
                    : { left: 0, top: 0, width: "100%", height: "100%" }
                }
              >
                <rect x={0} y={0} width={100} height={100} fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth={0.5} strokeDasharray="2 2" />
                {partitionStrokes.flatMap((stroke, strokeIdx) =>
                  stroke.segments.map((seg, segIdx) =>
                    isPartitionLine(seg) ? (
                      <line
                        key={`${strokeIdx}-${segIdx}`}
                        x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                        stroke={strokeIdx === selectedLineIndex ? "rgba(251,191,36,0.95)" : "rgba(139,92,246,0.9)"}
                        strokeWidth={strokeIdx === selectedLineIndex ? 1.4 : 0.8}
                        strokeLinecap="round"
                      />
                    ) : (
                      (() => {
                        const curve = seg as PartitionCurve;
                        return (
                          <path
                            key={`${strokeIdx}-${segIdx}`}
                            d={`M ${curve.x1} ${curve.y1} Q ${curve.cpx} ${curve.cpy} ${curve.x2} ${curve.y2}`}
                            fill="none"
                            stroke={strokeIdx === selectedLineIndex ? "rgba(251,191,36,0.95)" : "rgba(139,92,246,0.9)"}
                            strokeWidth={strokeIdx === selectedLineIndex ? 1.4 : 0.8}
                            strokeLinecap="round"
                          />
                        );
                      })()
                    )
                  )
                )}
                {lineDrawStart && lineDrawEnd && (
                  lineSegmentMode === "curve" && strokePreviewPoints.length >= 2 ? (
                    (() => {
                      const smoothed = smoothPoints(strokePreviewPoints, 5);
                      const segments = pointsToBezierChain(smoothed) as PartitionCurve[];
                      const d = segments.length > 0
                        ? `M ${segments[0]!.x1} ${segments[0]!.y1}` + segments.map((s) => ` Q ${s.cpx} ${s.cpy} ${s.x2} ${s.y2}`).join(" ")
                        : "";
                      return <path d={d} fill="none" stroke="rgba(251,191,36,0.95)" strokeWidth={1} strokeLinecap="round" strokeDasharray="2 2" />;
                    })()
                  ) : lineSegmentMode === "curve" ? (
                    (() => {
                      const dx = lineDrawEnd.x - lineDrawStart.x;
                      const dy = lineDrawEnd.y - lineDrawStart.y;
                      const cpx = (lineDrawStart.x + lineDrawEnd.x) / 2 - 0.2 * dy;
                      const cpy = (lineDrawStart.y + lineDrawEnd.y) / 2 + 0.2 * dx;
                      return <path d={`M ${lineDrawStart.x} ${lineDrawStart.y} Q ${cpx} ${cpy} ${lineDrawEnd.x} ${lineDrawEnd.y}`} fill="none" stroke="rgba(251,191,36,0.95)" strokeWidth={1} strokeLinecap="round" strokeDasharray="2 2" />;
                    })()
                  ) : (
                    <line x1={lineDrawStart.x} y1={lineDrawStart.y} x2={lineDrawEnd.x} y2={lineDrawEnd.y} stroke="rgba(251,191,36,0.95)" strokeWidth={1} strokeLinecap="round" strokeDasharray="2 2" />
                  )
                )}
              </svg>
              <div
                className={`absolute overflow-visible touch-none ${lineToolMode === "pen" ? "cursor-crosshair" : "cursor-grab"}`}
                style={(() => {
                  const margin = 10;
                  if (!imageBoundsPct || imageBoundsPct.width <= 0 || imageBoundsPct.height <= 0) return { left: 0, top: 0, width: "100%", height: "100%" };
                  const left = Math.max(0, imageBoundsPct.x - margin);
                  const top = Math.max(0, imageBoundsPct.y - margin);
                  const width = Math.min(100 - left, imageBoundsPct.width + margin * 2);
                  const height = Math.min(100 - top, imageBoundsPct.height + margin * 2);
                  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
                })()}
                onPointerDown={onLineDrawPointerDown}
                onPointerMove={onLineDrawPointerMove}
                onPointerUp={onLineDrawPointerUp}
              />
            </>
          )}

          <div
            className="absolute overflow-hidden"
            style={{
              ...(imageBoundsPct && imageBoundsPct.width > 0 && imageBoundsPct.height > 0
                ? { left: `${imageBoundsPct.x}%`, top: `${imageBoundsPct.y}%`, width: `${imageBoundsPct.width}%`, height: `${imageBoundsPct.height}%` }
                : { left: 0, top: 0, right: 0, bottom: 0 }),
              pointerEvents: isLineStep ? "none" : undefined,
            }}
          >
            {!isLineStep && overlays.map((overlay) => (
              <OverlayItem
                key={overlay.id}
                overlay={overlay}
                isEditMode={isEditMode}
                selected={selectedOverlayId === overlay.id}
                isLightMode={isLightMode}
                resolvedOverlayUrl={resolvedOverlayUrls[overlay.id]}
                onPointerDown={onOverlayPointerDown}
                onPointerMove={onOverlayPointerMove}
                onPointerUp={onOverlayPointerUp}
                onPointerLeave={onOverlayPointerLeave}
                onClick={(e) => onOverlayClick(overlay.id, e)}
                onDelete={(e) => onOverlayDelete(overlay.id, e)}
                pushOverlayHistory={pushOverlayHistory}
              />
            ))}
            {isDrawingFree && freeDrawPreviewPoints.length > 1 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points={freeDrawPreviewPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(139,92,246,0.3)" stroke="rgba(139,92,246,0.8)" strokeWidth={0.5} />
              </svg>
            )}
          </div>
        </>
      )}
    </div>
  );
}
