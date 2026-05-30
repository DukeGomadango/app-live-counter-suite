"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { type PanelOverlay } from "../../lib/panelTypes";

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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onDelete,
}: OverlayItemProps) {
  if (overlay.hidden) return null;
  if (!isEditMode || !selected) return null;

  const rotation = overlay.rotation ?? 0;

  return (
    <div
      className="absolute pointer-events-auto select-none"
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        width: `${overlay.width}%`,
        height: `${overlay.height}%`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
        zIndex: 50,
      }}
      onPointerDown={(e) => onPointerDown(overlay, e)}
      onPointerMove={(e) => onPointerMove(overlay, e)}
      onPointerUp={(e) => onPointerUp(overlay, e)}
      onPointerLeave={onPointerLeave}
    >
      {/* Selection dashed border */}
      <div className="absolute inset-0 border-2 border-dashed border-violet-500 pointer-events-none" style={{ zIndex: 10 }} />

      {/* Decorative dashed circle */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle cx="50" cy="50" r="58" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} strokeDasharray="4 3" />
      </svg>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-0 right-0 w-6 h-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shrink-0 shadow border-2 border-white pointer-events-auto"
        style={{ zIndex: 25 }}
        title="削除"
      >
        <Trash2 size={12} />
      </button>

      {/* Rotation Dial */}
      <div
        data-handle="rotate"
        className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto"
        style={{ zIndex: 20, width: 32, height: 24 }}
      >
        <div className="w-8 h-5 rounded bg-violet-500/80 flex items-center justify-center">
          <span className="text-xs text-white">↻</span>
        </div>
      </div>

      {/* Corner Resize Handles */}
      {(["se", "sw", "ne", "nw"] as const).map((h) => (
        <div
          key={h}
          data-handle={h}
          className="absolute flex items-center justify-center cursor-nwse-resize pointer-events-auto"
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

      {/* Side Resize Handles */}
      {(["n", "s", "e", "w"] as const).map((h) => (
        <div
          key={h}
          data-handle={h}
          className="absolute flex items-center justify-center cursor-pointer pointer-events-auto"
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
    </div>
  );
}
