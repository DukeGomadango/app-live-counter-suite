"use client";

import React from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { 
  type PanelOverlay, 
  getPartClipPath,
  getCustomOverlayCentroid, 
  getFreeOverlayCentroid 
} from "../../lib/panelTypes";
import { getTriangleTextAnchor } from "../../lib/panelUtils";
import { isIdbKey } from "../../lib/panelImageStore";

interface OverlayItemProps {
  overlay: PanelOverlay;
  isEditMode: boolean;
  selected: boolean;
  isLightMode: boolean;
  resolvedOverlayUrl: string | undefined;
  onPointerDown: (overlay: PanelOverlay, e: React.PointerEvent) => void;
  onPointerMove: (overlay: PanelOverlay, e: React.PointerEvent) => void;
  onPointerUp: (overlay: PanelOverlay, e: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  pushOverlayHistory: (current: PanelOverlay[]) => void;
}

export function OverlayItem({
  overlay,
  isEditMode,
  selected,
  isLightMode,
  resolvedOverlayUrl,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onClick,
  onDelete,
}: OverlayItemProps) {
  if (overlay.hidden) return null;

  const isFree = overlay.shape === "free";
  const isImage = overlay.shape === "image";
  const isCustom = overlay.shape === "custom" && overlay.parts && overlay.parts.length > 0;
  
  const freePoints = isFree && !overlay.pathD && overlay.points && overlay.points.length >= 2
    ? overlay.points
        .map((p) => {
          const x = overlay.width ? (p.x / overlay.width) * 100 : 0;
          const y = overlay.height ? (p.y / overlay.height) * 100 : 0;
          return `${x},${y}`;
        })
        .join(" ")
    : "";
  const freePathD = isFree ? overlay.pathD : undefined;
  const rotation = overlay.rotation ?? 0;

  const labelColor = isLightMode ? "text-gray-800" : "text-white/90";
  const countColor = isLightMode ? "text-gray-900" : "text-white";

  return (
    <div
      className="absolute cursor-pointer select-none flex flex-col items-center justify-center overflow-hidden relative"
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
        pointerEvents: isFree ? "none" : undefined,
        background: isFree || isImage || isCustom ? "transparent" : overlay.color,
        border: isFree ? (selected ? `2px solid ${overlay.color}` : "none") : selected ? `2px solid ${overlay.color}` : "1px solid rgba(255,255,255,0.3)",
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
              ? "polygon(0 0, 100% 0, 0 100%)"
              : overlay.triangleKind === "diagDownLower"
              ? "polygon(100% 0, 100% 100%, 0 100%)"
              : overlay.triangleKind === "diagUpUpper"
              ? "polygon(0 0, 100% 0, 100% 100%)"
              : overlay.triangleKind === "diagUpLower"
              ? "polygon(0 0, 100% 100%, 0 100%)"
              : "polygon(50% 0%, 100% 100%, 0% 100%)"
            : undefined,
      }}
      onPointerDown={!isFree ? (e) => onPointerDown(overlay, e) : undefined}
      onPointerMove={!isFree ? (e) => onPointerMove(overlay, e) : undefined}
      onPointerUp={!isFree ? (e) => onPointerUp(overlay, e) : undefined}
      onPointerLeave={!isFree ? onPointerLeave : undefined}
      onClick={!isFree ? onClick : undefined}
    >
      {isImage && overlay.imageDataUrl ? (() => {
        const src =
          resolvedOverlayUrl ??
          (overlay.imageDataUrl && !isIdbKey(overlay.imageDataUrl) ? overlay.imageDataUrl : undefined);
        return src ? (
          <Image src={src} alt="" fill unoptimized className="object-contain pointer-events-none" />
        ) : null;
      })() : null}
      {isFree && (freePathD || freePoints) ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {freePathD ? (
            <path
              d={freePathD}
              fill={overlay.color}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={0.5}
              style={{ pointerEvents: "auto" }}
              onPointerDown={(e) => onPointerDown(overlay, e)}
              onPointerMove={(e) => onPointerMove(overlay, e)}
              onPointerUp={(e) => onPointerUp(overlay, e)}
              onPointerLeave={onPointerLeave}
              onClick={onClick}
            />
          ) : (
            <polygon
              points={freePoints}
              fill={overlay.color}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={0.5}
              style={{ pointerEvents: "auto" }}
              onPointerDown={(e) => onPointerDown(overlay, e)}
              onPointerMove={(e) => onPointerMove(overlay, e)}
              onPointerUp={(e) => onPointerUp(overlay, e)}
              onPointerLeave={onPointerLeave}
              onClick={onClick}
            />
          )}
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

      {!isImage && (isFree ? ((overlay.points && overlay.points.length > 0) || !!overlay.pathD) : isCustom ? overlay.parts?.length : true) ? (
        <div
          className={`relative z-10 flex flex-col items-center justify-center p-0.5 ${
            isEditMode ? "pointer-events-none" : ""
          } ${overlay.shape === "triangle" ? "" : isCustom ? "" : isFree ? "" : "w-full h-full"}`}
          style={(() => {
            if (isCustom && overlay.parts?.length) {
              const c = getCustomOverlayCentroid(overlay.parts);
              return {
                position: "absolute" as const,
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: `${overlay.flipX ? "scaleX(-1) " : ""}translate(-50%, -50%)`,
                maxWidth: "90%",
              };
            }
            if (isFree && overlay.width && overlay.height) {
              const c = getFreeOverlayCentroid(overlay);
              if (c) {
                const leftPct = ((c.x - overlay.x) / overlay.width) * 100;
                const topPct = ((c.y - overlay.y) / overlay.height) * 100;
                return {
                  position: "absolute" as const,
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: `${overlay.flipX ? "scaleX(-1) " : ""}translate(-50%, -50%)`,
                  maxWidth: "90%",
                };
              }
            }
            if (overlay.shape === "triangle") {
              const anchor = getTriangleTextAnchor(overlay.triangleKind);
              return {
                position: "absolute" as const,
                left: `${anchor.x}%`,
                top: `${anchor.y}%`,
                transform: `${overlay.flipX ? "scaleX(-1) " : ""}translate(-50%, -50%)`,
                maxWidth: "90%",
              };
            }
            if (overlay.flipX) return { transform: "scaleX(-1)" };
            return undefined;
          })()}
        >
          {overlay.label ? (
            <span
              className={`font-medium truncate w-full text-center ${labelColor}`}
              style={{ fontSize: overlay.labelFontSize ? `${overlay.labelFontSize}pt` : "10px" }}
            >
              {overlay.label}
            </span>
          ) : null}
          <span
            className={`font-bold tabular-nums ${countColor}`}
            style={{ fontSize: overlay.fontSize ? `${overlay.fontSize}pt` : undefined }}
          >
            {overlay.targetType === "number" ? (
              <>
                {overlay.count}
                {overlay.target > 0 && <span className="opacity-60" style={{ fontSize: overlay.fontSize ? "0.7em" : undefined }}>/{overlay.target}</span>}
              </>
            ) : (
              <span
                className="font-medium px-1 truncate max-w-full block"
                style={{ fontSize: overlay.fontSize ? undefined : "0.75rem" }}
              >
                {overlay.targetText || "（テキスト）"}
              </span>
            )}
          </span>
        </div>
      ) : null}

      {isEditMode && selected ? (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="50" cy="50" r="58" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} strokeDasharray="4 3" />
          </svg>
          <button
            type="button"
            onClick={onDelete}
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
}
