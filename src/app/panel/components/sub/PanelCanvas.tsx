"use client";

import React from "react";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { 
  type PanelOverlay, 
  type PartitionStroke, 
  isPartitionLine,
  PartitionCurve,
  OverlayShape,
  getCustomOverlayCentroid,
  getFreeOverlayCentroid
} from "../../lib/panelTypes";
import { smoothPoints, pointsToBezierChain } from "../../lib/panelStrokeUtils";
import { getTriangleTextAnchor } from "../../lib/panelUtils";
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
      className={`relative w-full flex items-center justify-center rounded-xl ${
        isLineStep ? "overflow-visible" : "overflow-hidden"
      } ${
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
                  const left = imageBoundsPct.x - margin;
                  const top = imageBoundsPct.y - margin;
                  const width = imageBoundsPct.width + margin * 2;
                  const height = imageBoundsPct.height + margin * 2;
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
            {/* SVG Vector Drawing Layer for all overlays */}
            {!isLineStep && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {overlays.map((o) => {
                  const rotation = o.rotation ?? 0;
                  const opacity = (o.opacity ?? 100) / 100;
                  const isFree = o.shape === "free";
                  const isImage = o.shape === "image";
                  const isCustom = o.shape === "custom" && o.parts && o.parts.length > 0;

                  const freePoints = isFree && !o.pathD && o.points && o.points.length >= 2
                    ? o.points.map((p) => `${p.x},${p.y}`).join(" ")
                    : "";

                  const centroid = getLocalCentroid(o);
                  const labelText = o.label;
                  const countText = o.targetType === "number"
                    ? `${o.count}${o.target > 0 ? `/${o.target}` : ""}`
                    : o.targetText || "";

                  const fontSizeLabel = o.labelFontSize ? `${o.labelFontSize}pt` : "0.55rem";
                  const fontSizeCount = o.fontSize ? `${o.fontSize}pt` : "0.75rem";
                  const textColor = isLightMode ? "#1f2937" : "#f3f4f6";

                  const resolvedOverlayUrl = resolvedOverlayUrls[o.id];

                  return (
                    <g
                      key={o.id}
                      transform={`translate(${o.x}, ${o.y}) rotate(${rotation}, ${o.width / 2}, ${o.height / 2})`}
                      opacity={opacity}
                      style={{ pointerEvents: isFree ? "none" : "auto", cursor: "pointer" }}
                      onClick={(e) => onOverlayClick(o.id, e)}
                      onPointerDown={(e) => onOverlayPointerDown(o, e)}
                      onPointerMove={(e) => onOverlayPointerMove(o, e)}
                      onPointerUp={(e) => onOverlayPointerUp(o, e)}
                      onPointerLeave={onOverlayPointerLeave}
                    >
                      {o.shape === "rect" && (
                        <rect x={0} y={0} width={o.width} height={o.height} fill={o.color} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
                      )}
                      {o.shape === "circle" && (
                        <ellipse cx={o.width / 2} cy={o.height / 2} rx={o.width / 2} ry={o.height / 2} fill={o.color} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
                      )}
                      {o.shape === "triangle" && (
                        <polygon points={getTrianglePoints(0, 0, o.width, o.height, o.triangleKind)} fill={o.color} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
                      )}
                      {isFree && o.pathD && (
                        <g transform={`scale(${o.width / 100}, ${o.height / 100})`}>
                          <path
                            d={o.pathD}
                            fill={o.color}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth={0.5}
                            style={{ pointerEvents: "auto" }}
                          />
                        </g>
                      )}
                      {isFree && freePoints && (
                        <polygon
                          points={freePoints}
                          fill={o.color}
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth={0.5}
                          style={{ pointerEvents: "auto" }}
                        />
                      )}
                      {isImage && resolvedOverlayUrl && (
                        <image href={resolvedOverlayUrl} x={0} y={0} width={o.width} height={o.height} preserveAspectRatio="xMidYMid meet" />
                      )}
                      {isCustom && o.parts && o.parts.map((part) => {
                        const color = part.color ?? o.color;
                        const rot = part.rotation ?? 0;
                        const cx = part.x + part.width / 2;
                        const cy = part.y + part.height / 2;
                        return (
                          <g key={part.id} transform={`rotate(${rot}, ${cx}, ${cy})`}>
                            {part.shape === "rect" && (
                              <rect x={part.x} y={part.y} width={part.width} height={part.height} fill={color} />
                            )}
                            {part.shape === "circle" && (
                              <ellipse cx={cx} cy={cy} rx={part.width / 2} ry={part.height / 2} fill={color} />
                            )}
                            {part.shape === "triangle" && (
                              <polygon points={getTrianglePoints(part.x, part.y, part.width, part.height, part.triangleKind)} fill={color} />
                            )}
                          </g>
                        );
                      })}

                      {/* Text Renderings */}
                      {labelText && (
                        (() => {
                          const defaultY = countText ? centroid.y - (o.labelFontSize ? o.labelFontSize * 0.4 : 1.5) : centroid.y;
                          const x = centroid.x + (o.labelOffsetX ?? 0);
                          const y = defaultY + (o.labelOffsetY ?? 0);
                          return (
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={textColor}
                              fontWeight="500"
                              style={{
                                pointerEvents: "none",
                                userSelect: "none",
                                fontSize: fontSizeLabel,
                                fontFamily: "inherit",
                              }}
                            >
                              {labelText}
                            </text>
                          );
                        })()
                      )}
                      {countText && (
                        (() => {
                          const defaultY = labelText ? centroid.y + (o.fontSize ? o.fontSize * 0.4 : 2) : centroid.y;
                          const x = centroid.x + (o.countOffsetX ?? 0);
                          const y = defaultY + (o.countOffsetY ?? 0);
                          return (
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={textColor}
                              fontWeight="700"
                              style={{
                                pointerEvents: "none",
                                userSelect: "none",
                                fontSize: fontSizeCount,
                                fontFamily: "inherit",
                              }}
                            >
                              {countText}
                            </text>
                          );
                        })()
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* HTML Edit Handles Layer (Renders ONLY for the selected overlay) */}
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

// Geometric helpers for unified SVG drawing
function getTrianglePoints(x: number, y: number, w: number, h: number, kind: string | undefined): string {
  switch (kind) {
    case "rightTop":
    case "diagDownUpper":
      return `${x},${y} ${x + w},${y} ${x},${y + h}`;
    case "rightBottom":
    case "diagUpLower":
      return `${x},${y} ${x + w},${y + h} ${x},${y + h}`;
    case "isoLeft":
      return `${x},${y + h * 0.5} ${x + w},${y} ${x + w},${y + h}`;
    case "isoRight":
      return `${x + w},${y + h * 0.5} ${x},${y} ${x},${y + h}`;
    case "diagDownLower":
      return `${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
    case "diagUpUpper":
      return `${x},${y} ${x + w},${y} ${x + w},${y + h}`;
    default: // "iso" or standard triangle
      return `${x + w * 0.5},${y} ${x + w},${y + h} ${x},${y + h}`;
  }
}

function getLocalCentroid(o: PanelOverlay): { x: number; y: number } {
  if (o.shape === "custom" && o.parts?.length) {
    const c = getCustomOverlayCentroid(o.parts);
    return { x: (c.x * o.width) / 100, y: (c.y * o.height) / 100 };
  }
  if (o.shape === "free" && o.width && o.height) {
    const c = getFreeOverlayCentroid(o);
    if (c) {
      return { x: c.x - o.x, y: c.y - o.y };
    }
  }
  if (o.shape === "triangle") {
    const anchor = getTriangleTextAnchor(o.triangleKind);
    return { x: (anchor.x * o.width) / 100, y: (anchor.y * o.height) / 100 };
  }
  return { x: o.width / 2, y: o.height / 2 };
}
