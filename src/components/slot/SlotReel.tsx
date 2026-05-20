"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { SlotSymbol } from "@/lib/slot";
import EmojiGlyph from "@/components/icons/EmojiGlyph";

/** 減速カーブ（始めは回転速度と同じ→終盤でじりじり止まる）。cubic-bezier の t=0 での傾きで duration を決め、ストップ初速を SPIN_SPEED に揃える */
const SPIN_EASE = [0.1, 0.78, 0.62, 0.98] as const;
const EASE_INITIAL_SLOPE = 0.78 / 0.1;

const CELL_HEIGHT = 56;
const SPIN_SPEED = 600; // px per second (when spinning) — 5x of original 120
const MIN_COAST_PX = 80; // 止まる前に最低この分は進んでから減速（ホップ感を防ぐ）
const STOP_DURATION_MIN = 0.25;
const STOP_DURATION_MAX = 2.2;

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
  isTurboMode?: boolean;
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
  isTurboMode = false,
}: SlotReelProps) {
  const y = useMotionValue(0);
  const displayY = useTransform(y, (v) => -v);
  const rows = visibleRows === 3 ? 3 : 1;
  const windowHeight = CELL_HEIGHT * rows;
  const stripLen = symbols.length * CELL_HEIGHT;
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animateStopRef = useRef<ReturnType<typeof animate> | null>(null);
  const currentSpinSpeed = isTurboMode ? SPIN_SPEED * 3 : SPIN_SPEED;

  useEffect(() => {
    if (symbols.length === 0) return;
    if (!isSpinning || stoppedIndex !== null) return;
    const step = (t: number) => {
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;
      const prev = y.get();
      let next = prev + currentSpinSpeed * dt;
      if (next >= stripLen) next -= stripLen;
      y.set(next);
      rafRef.current = requestAnimationFrame(step);
    };
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isSpinning, stoppedIndex, symbols.length, stripLen, y, currentSpinSpeed]);

  useEffect(() => {
    if (symbols.length === 0 || stoppedIndex === null) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const offset =
      rows === 3
        ? ((stoppedIndex - 1 + symbols.length) % symbols.length) * CELL_HEIGHT
        : stoppedIndex * CELL_HEIGHT;
    const targetY = offset === 0 ? 0 : stripLen - offset;
    const currentY = y.get();
    const norm = (v: number) => ((v % stripLen) + stripLen) % stripLen;
    // 回転方向（y 増加）に進んでから減速して止める。最短経路だとホップして見えるので避ける
    let to: number =
      currentY <= targetY ? targetY : targetY + stripLen;
    let dist = to - currentY;
    if (dist < MIN_COAST_PX && dist > 0) {
      to += stripLen;
      dist = to - currentY;
    }
    // ストップ初速が回転速度と同じになるよう duration を決める（慣性で自然に減速）
    const duration = isTurboMode ? 0.15 : Math.min(
      STOP_DURATION_MAX,
      Math.max(STOP_DURATION_MIN, (dist / currentSpinSpeed) * EASE_INITIAL_SLOPE)
    );
    animateStopRef.current = animate(currentY, to, {
      type: "tween",
      duration,
      ease: SPIN_EASE,
      onUpdate: (v) => y.set(norm(v)),
    });
    return () => {
      animateStopRef.current?.stop();
    };
  }, [stoppedIndex, symbols.length, rows, stripLen, y, currentSpinSpeed, isTurboMode]);

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
      <EmojiGlyph emoji={s.label} role={s.role} size={26} />
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
        <div style={{ transform: "scaleY(-1)", height: "100%", minHeight: windowHeight }}>
          <motion.div
            className="flex flex-col items-center justify-center w-full"
            style={{
              y: displayY,
              width: 80,
            }}
          >
            <div style={{ transform: "scaleY(-1)" }}>
              {stripContent}
            </div>
          </motion.div>
        </div>
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
