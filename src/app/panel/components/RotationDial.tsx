"use client";

import { useCallback, useRef } from "react";

const DIAL_SIZE = 48;
const DIAL_R = 20;

export default function RotationDial({
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
