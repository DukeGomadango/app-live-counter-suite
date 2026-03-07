"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import type { SlotSymbol } from "@/lib/slot";

/** ルーレットと同様の減速カーブ（終盤でじりじり止まる） */
const SPIN_EASE = [0.1, 0.78, 0.62, 0.98] as const;

const CELL_HEIGHT = 56;
const SPIN_SPEED = 600; // px per second (when spinning) — 5x of original 120
const STOP_DURATION = 0.4;

interface SlotReelProps {
  symbols: SlotSymbol[];
  isSpinning: boolean;
  stoppedIndex: number | null;
  onStop: () => void;
  canStop: boolean;
  isLightMode?: boolean;
  accentColor?: string;
  /** リーチ時（左・中が揃いこのリールだけ回転中）のハイライト */
  isReach?: boolean;
  /** 表示行数（1＝1段、3＝3段） */
  visibleRows?: 1 | 3;
}

export default function SlotReel({
  symbols,
  isSpinning,
  stoppedIndex,
  onStop,
  canStop,
  isLightMode = false,
  accentColor = "#a855f7",
  isReach = false,
  visibleRows = 1,
}: SlotReelProps) {
  const y = useMotionValue(0);
  const rows = visibleRows === 3 ? 3 : 1;
  const windowHeight = CELL_HEIGHT * rows;
  const stripLen = symbols.length * CELL_HEIGHT;
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animateStopRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;
    if (!isSpinning || stoppedIndex !== null) return;
    y.set(0);
    const step = (t: number) => {
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;
      const prev = y.get();
      const next = prev - SPIN_SPEED * dt;
      y.set(next <= -stripLen ? next + stripLen : next);
      rafRef.current = requestAnimationFrame(step);
    };
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isSpinning, stoppedIndex, symbols.length, stripLen, y]);

  useEffect(() => {
    if (symbols.length === 0 || stoppedIndex === null) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const targetY =
      rows === 3
        ? -((stoppedIndex - 1 + symbols.length) % symbols.length) * CELL_HEIGHT
        : -(stoppedIndex * CELL_HEIGHT);
    const currentY = y.get();
    animateStopRef.current = animate(currentY, targetY, {
      type: "tween",
      duration: STOP_DURATION,
      ease: SPIN_EASE,
      onUpdate: (v) => y.set(v),
    });
    return () => {
      animateStopRef.current?.stop();
    };
  }, [stoppedIndex, symbols.length, rows, y]);

  if (symbols.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 p-4"
        style={{ minHeight: CELL_HEIGHT + 48 }}
      >
        <span className="text-lg text-white/50">—</span>
        <button type="button" disabled className="px-4 py-2 rounded-lg text-sm bg-white/10 text-white/40 cursor-not-allowed">
          ストップ
        </button>
      </div>
    );
  }

  const stripContent = [...symbols, ...symbols].map((s, i) => (
    <div
      key={`${s.id}-${i}`}
      className={`flex items-center justify-center shrink-0 font-bold text-xl ${isLightMode ? "text-gray-900" : "text-white"}`}
      style={{ height: CELL_HEIGHT }}
    >
      {s.label}
    </div>
  ));

  return (
    <div className="flex flex-col items-center gap-2">
      {isReach && (
        <span className="text-xs font-bold text-amber-400 animate-pulse">REACH</span>
      )}
      <div
        className="relative overflow-hidden rounded-xl border-2 transition-colors"
        style={{
          height: windowHeight,
          width: 80,
          boxShadow: "inset 0 8px 16px -8px rgba(0,0,0,0.4), inset 0 -8px 16px -8px rgba(0,0,0,0.4)",
          borderColor: isReach ? accentColor : canStop ? "rgb(251 191 36)" : isLightMode ? "rgb(229 231 235)" : "rgba(255,255,255,0.2)",
          background: isLightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.2)",
        }}
      >
        <motion.div
          className="flex flex-col items-center justify-center w-full"
          style={{
            y,
            width: 80,
          }}
        >
          {stripContent}
        </motion.div>
      </div>
      <button
        type="button"
        disabled={!canStop}
        onClick={onStop}
        className={`w-full max-w-[80px] px-4 py-2 rounded-lg text-sm font-medium transition ${
          canStop
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : isLightMode
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white/10 text-white/40 cursor-not-allowed"
        }`}
      >
        ストップ
      </button>
    </div>
  );
}
