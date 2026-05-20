"use client";

import { useEffect, useRef, useState } from "react";
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);
  return reduced;
}

import type { MotionValue } from "framer-motion";

interface ReelCellProps {
  symbol: SlotSymbol;
  index: number;
  y: MotionValue<number>;
  stripLen: number;
  visibleRows: 1 | 3;
  isLightMode: boolean;
  reducedMotion: boolean;
}

function ReelCell({
  symbol,
  index,
  y,
  stripLen,
  visibleRows,
  isLightMode,
  reducedMotion,
}: ReelCellProps) {
  const offsetFromCenter = useTransform(y, (latestY: number) => {
    // ダブル y軸反転 (scaleY(-1)) が適用されているため、物理的なスクロール方向と座標系が反転しています。
    // 物理的なビューポート内のセルのY座標を計算し、ビューポート中心からの距離を求めます。
    const windowHeight = CELL_HEIGHT * visibleRows;
    const viewportCenter = visibleRows === 3 ? CELL_HEIGHT : 0;
    
    // 物理位置の計算式：親と孫に scaleY(-1) が適用されたレイアウト下でのセルの物理Y位置
    const visualY = index * CELL_HEIGHT + latestY - (2 * stripLen - windowHeight);
    
    let diff = visualY - viewportCenter;
    
    // 図柄ループの全長 (stripLen) を基準として、[-stripLen / 2, stripLen / 2] の範囲に diff を丸め込みます。
    // これにより、スロット図柄数が少ない場合や、スクロール中であっても、常に正しい不透明度と3D湾曲が得られます。
    diff = ((diff + stripLen / 2) % stripLen + stripLen) % stripLen - stripLen / 2;
    
    return diff;
  });

  // 立体ドラムロール用の 3D 変形（角度、スケール、奥行き、透明度）
  const rotateX = useTransform(
    offsetFromCenter,
    [-CELL_HEIGHT * 1.5, -CELL_HEIGHT, 0, CELL_HEIGHT, CELL_HEIGHT * 1.5],
    [30, 20, 0, -20, -30]
  );

  const scale = useTransform(
    offsetFromCenter,
    [-CELL_HEIGHT * 1.5, -CELL_HEIGHT, 0, CELL_HEIGHT, CELL_HEIGHT * 1.5],
    [0.85, 0.92, 1, 0.92, 0.85]
  );

  const translateZ = useTransform(
    offsetFromCenter,
    [-CELL_HEIGHT * 1.5, -CELL_HEIGHT, 0, CELL_HEIGHT, CELL_HEIGHT * 1.5],
    [-20, -10, 0, -10, -20]
  );

  const opacity = useTransform(
    offsetFromCenter,
    [-CELL_HEIGHT * 2, -CELL_HEIGHT * 1.5, -CELL_HEIGHT, 0, CELL_HEIGHT, CELL_HEIGHT * 1.5, CELL_HEIGHT * 2],
    [0, 0.4, 0.8, 1, 0.8, 0.4, 0]
  );

  // アクセシビリティまたは1段表示時のフォールバック（シンプルな透明度グラデーションのみ）
  const fallbackOpacity = useTransform(
    offsetFromCenter,
    [-CELL_HEIGHT * 1.5, -CELL_HEIGHT, 0, CELL_HEIGHT, CELL_HEIGHT * 1.5],
    [0.4, 0.8, 1, 0.8, 0.4]
  );

  const style = reducedMotion || visibleRows === 1
    ? {
        height: CELL_HEIGHT,
        opacity: visibleRows === 3 
          ? fallbackOpacity
          : 1,
      }
    : {
        height: CELL_HEIGHT,
        rotateX,
        scale,
        translateZ,
        opacity,
        transformStyle: "preserve-3d" as const,
      };

  return (
    <motion.div
      className={`flex items-center justify-center shrink-0 font-bold text-xl ${
        isLightMode ? "text-gray-900" : "text-white"
      }`}
      style={style}
    >
      <EmojiGlyph emoji={symbol.label} role={symbol.role} size={26} />
    </motion.div>
  );
}

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
  reelIndex?: number;
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
  reelIndex,
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
  const reducedMotion = usePrefersReducedMotion();

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
    <ReelCell
      key={`${s.id}-${i}`}
      symbol={s}
      index={i}
      y={y}
      stripLen={stripLen}
      visibleRows={rows}
      isLightMode={isLightMode}
      reducedMotion={reducedMotion}
    />
  ));

  // スクリーンリーダー向け動的ステータスアナウンス
  const statusText = isSpinning
    ? `${reelIndex !== undefined ? `第${reelIndex + 1}` : "リール"}回転中`
    : stoppedIndex !== null && symbols[stoppedIndex]
      ? `${reelIndex !== undefined ? `第${reelIndex + 1}` : "リール"}停止: ${symbols[stoppedIndex].label}`
      : `${reelIndex !== undefined ? `第${reelIndex + 1}` : "リール"}待機中`;

  return (
    <div className="flex flex-col items-center gap-2">
      {isReach && (
        <span className="text-xs font-bold text-amber-400 animate-pulse">REACH</span>
      )}
      <div
        role="status"
        aria-label={statusText}
        aria-live="polite"
        aria-busy={isSpinning}
        className="relative overflow-hidden rounded-xl border-2 transition-colors"
        style={{
          height: windowHeight,
          width: 80,
          borderColor: isReach ? accentColor : canStop ? "rgb(251 191 36)" : isLightMode ? "rgb(229 231 235)" : "rgba(255,255,255,0.2)",
          background: isLightMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.2)",
          perspective: "800px",
          transformStyle: "preserve-3d",
        }}
      >
        <div style={{ transform: "scaleY(-1)", height: "100%", minHeight: windowHeight, transformStyle: "preserve-3d" }}>
          <motion.div
            className="flex flex-col items-center justify-center w-full"
            style={{
              y: displayY,
              width: 80,
              transformStyle: "preserve-3d",
            }}
          >
            <div style={{ transform: "scaleY(-1)", transformStyle: "preserve-3d" }}>
              {stripContent}
            </div>
          </motion.div>
        </div>

        {/* 立体的な影（3Dシリンダー感を極限まで高めるグラデーションオーバーレイ） */}
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: isLightMode
              ? "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 22%, rgba(255,255,255,0) 78%, rgba(255,255,255,0.85) 100%)"
              : "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.8) 100%)",
            boxShadow: isLightMode
              ? "inset 0 4px 8px rgba(0,0,0,0.03), inset 0 -4px 8px rgba(0,0,0,0.03)"
              : "inset 0 8px 16px rgba(0,0,0,0.65), inset 0 -8px 16px rgba(0,0,0,0.65)",
          }}
        />
      </div>
      <button
        type="button"
        disabled={!canStop}
        onClick={onStop}
        aria-label={reelIndex !== undefined ? `第${reelIndex + 1}リールを停止` : "リールを停止"}
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
