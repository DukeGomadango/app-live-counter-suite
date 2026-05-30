"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, BarChart3 } from "lucide-react";

/* ───── Types ───── */

interface StreamConsoleProps {
  onCountChange: (count: number) => void;
  isMobile: boolean;
}

interface FloatingParticle {
  id: number;
  value: string;
  x: number;
}

/* ───── Counter Widget ───── */

function CounterWidget({
  count,
  onIncrement,
  isLightMode,
}: {
  count: number;
  onIncrement: () => void;
  isLightMode: boolean;
}) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback(() => {
    onIncrement();
    const id = nextId.current++;
    const x = Math.random() * 60 - 30;
    setParticles((prev) => [...prev, { id, value: "+1", x }]);
  }, [onIncrement]);

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Format count with drum-roll style digits
  const digits = String(count).padStart(4, "0").split("");

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            isLightMode ? "text-neutral-400" : "text-white/40"
          }`}
        >
          Counter
        </span>
      </div>

      {/* Drum-roll display */}
      <div className="relative flex items-center justify-center gap-[2px]">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, y: 0, x: p.x, scale: 0.7 }}
              animate={{ opacity: [0, 1, 0], y: -70, scale: [0.7, 1.1, 0.8] }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={() => removeParticle(p.id)}
              className="absolute top-0 left-1/2 -translate-x-1/2 text-purple-400 font-bold text-sm pointer-events-none select-none"
              style={{ textShadow: "0 0 12px rgba(168,85,247,0.5)" }}
            >
              {p.value}
            </motion.span>
          ))}
        </AnimatePresence>

        {digits.map((digit, i) => (
          <motion.span
            key={`${i}-${digit}`}
            initial={{ y: -16, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
            }}
            className={`inline-flex items-center justify-center w-9 h-12 text-center text-2xl font-black rounded-lg ${
              isLightMode
                ? "bg-neutral-100/80 text-neutral-800"
                : "bg-white/5 text-white"
            }`}
            style={{
              fontFamily: "var(--font-outfit), var(--font-montserrat), monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {digit}
          </motion.span>
        ))}
      </div>

      {/* Increment button */}
      <button
        onClick={handleClick}
        className={`group flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 dango-btn-tier1 ${
          isLightMode
            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
            : "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
        }`}
        style={
          { "--btn-glow-color": "rgba(168,85,247,0.5)" } as React.CSSProperties
        }
      >
        <Plus size={16} strokeWidth={3} />
        カウント
      </button>
    </div>
  );
}

/* ───── Chart Widget (Mini live preview) ───── */

function ChartWidget({ history, isLightMode }: { history: number[]; isLightMode: boolean }) {
  const max = Math.max(...history, 1);
  const barCount = history.length;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <BarChart3
          size={12}
          className={isLightMode ? "text-blue-500" : "text-blue-400"}
        />
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            isLightMode ? "text-neutral-400" : "text-white/40"
          }`}
        >
          Live Chart
        </span>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-[3px] h-16 w-full max-w-[180px]">
        {history.map((val, i) => {
          const height = Math.max(4, (val / max) * 100);
          const opacity = 0.4 + (i / barCount) * 0.6;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex-1 rounded-t-sm"
              style={{
                background: isLightMode
                  ? `rgba(59, 130, 246, ${opacity})`
                  : `rgba(96, 165, 250, ${opacity})`,
                minWidth: "3px",
              }}
            />
          );
        })}
      </div>

      <p
        className={`text-xs font-medium ${
          isLightMode ? "text-neutral-500" : "text-white/50"
        }`}
      >
        計 {history[history.length - 1] ?? 0}
      </p>
    </div>
  );
}

/* ───── Gacha Widget ───── */

function GachaWidget({ isLightMode }: { isLightMode: boolean }) {
  const [result, setResult] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const rarities = useMemo(() => [
    { label: "SSR", color: "#facc15", weight: 3 },
    { label: "SR", color: "#a855f7", weight: 12 },
    { label: "R", color: "#3b82f6", weight: 35 },
    { label: "N", color: "#6b7280", weight: 50 },
  ], []);

  const handleDraw = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);

    const roll = Math.random() * 100;
    let cumulative = 0;
    let drawn = rarities[rarities.length - 1] ?? { label: "N", color: "#6b7280", weight: 50 };
    for (const r of rarities) {
      cumulative += r.weight;
      if (roll < cumulative) {
        drawn = r;
        break;
      }
    }

    const frameId = requestAnimationFrame(() => {
      void frameId;
      setTimeout(() => {
        setResult(drawn.label);
        setIsFlipping(false);
      }, 500);
    });
  }, [isFlipping, rarities]);

  const currentRarity = rarities.find((r) => r.label === result);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <Sparkles
          size={12}
          className={isLightMode ? "text-yellow-500" : "text-yellow-400"}
        />
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            isLightMode ? "text-neutral-400" : "text-white/40"
          }`}
        >
          Gacha
        </span>
      </div>

      {/* 3D Flip Card */}
      <div className="relative w-20 h-24" style={{ perspective: "600px" }}>
        <motion.div
          animate={{
            rotateY: isFlipping ? 180 : 0,
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full h-full rounded-xl flex items-center justify-center text-xl font-black ${
            isLightMode
              ? "bg-neutral-100 border border-neutral-200"
              : "bg-white/5 border border-white/10"
          }`}
          style={{
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            color: currentRarity?.color ?? (isLightMode ? "#a3a3a3" : "#666"),
            textShadow: currentRarity
              ? `0 0 16px ${currentRarity.color}50`
              : "none",
          }}
        >
          {result ?? "?"}
        </motion.div>
      </div>

      <button
        onClick={handleDraw}
        disabled={isFlipping}
        className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 dango-btn-tier2 ${
          isLightMode
            ? "bg-yellow-500/90 text-white shadow-lg shadow-yellow-500/15"
            : "bg-yellow-500/80 text-black shadow-lg shadow-yellow-500/20"
        }`}
        style={
          { "--btn-glow-color": "rgba(234,179,8,0.4)" } as React.CSSProperties
        }
      >
        <Sparkles size={14} />
        ガチャ
      </button>
    </div>
  );
}

/* ───── Stream Console (Exported) ───── */

export default function StreamConsole({
  onCountChange,
  isMobile,
}: StreamConsoleProps) {
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsLightMode(document.documentElement.classList.contains("light"));
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Observe theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        setIsLightMode(document.documentElement.classList.contains("light"));
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleIncrement = useCallback(() => {
    const nextCount = count + 1;
    setCount(nextCount);
    onCountChange(nextCount);
    setHistory((prev) => {
      const updated = [...prev.slice(-7), nextCount];
      return updated;
    });
  }, [count, onCountChange]);

  /* ── Mobile: horizontal swipe cards ── */
  if (isMobile) {
    return (
      <div className="w-full mt-6">
        <div className="snap-carousel px-[4vw] gap-3 pb-3">
          {/* Counter Card */}
          <div
            className={`snap-carousel-item w-[82vw] rounded-2xl p-5 lp-glass lp-glass-purple ${
              isLightMode ? "" : ""
            }`}
          >
            <CounterWidget
              count={count}
              onIncrement={handleIncrement}
              isLightMode={isLightMode}
            />
          </div>
          {/* Chart Card */}
          <div className="snap-carousel-item w-[82vw] rounded-2xl p-5 lp-glass lp-glass-cyan">
            <ChartWidget history={history} isLightMode={isLightMode} />
          </div>
          {/* Gacha Card */}
          <div className="snap-carousel-item w-[82vw] rounded-2xl p-5 lp-glass lp-glass-yellow">
            <GachaWidget isLightMode={isLightMode} />
          </div>
        </div>
      </div>
    );
  }

  /* ── PC: 2-column grid layout ── */
  return (
    <div className="w-full">
      <p
        className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${
          isLightMode ? "text-neutral-400" : "text-white/40"
        }`}
      >
        Stream Console
      </p>
      <div className="grid grid-cols-2 gap-3">
        {/* Counter takes full left column */}
        <div className="row-span-2 rounded-2xl p-4 lp-glass lp-glass-purple lp-glass-neon">
          <CounterWidget
            count={count}
            onIncrement={handleIncrement}
            isLightMode={isLightMode}
          />
        </div>
        {/* Chart top-right */}
        <div className="rounded-2xl p-4 lp-glass lp-glass-cyan lp-glass-neon">
          <ChartWidget history={history} isLightMode={isLightMode} />
        </div>
        {/* Gacha bottom-right */}
        <div className="rounded-2xl p-4 lp-glass lp-glass-yellow lp-glass-neon">
          <GachaWidget isLightMode={isLightMode} />
        </div>
      </div>
    </div>
  );
}
