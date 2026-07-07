"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, BarChart3, ArrowUpRight } from "lucide-react";
import Link from "next/link";

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

/* ───── Burst Particle (DOM-based neon sparkle) ───── */

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
}

const BURST_COLORS = ["#a855f7", "#ec4899", "#06b6d4", "#eab308", "#22c55e"];

function BurstEffect({ particles, onComplete }: { particles: BurstParticle[]; onComplete: (id: number) => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {particles.map((p) => {
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: p.x, y: p.y, scale: 1 }}
              animate={{ opacity: 0, x: p.x + p.endX, y: p.y + p.endY, scale: 0.3 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={() => onComplete(p.id)}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}50`,
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ───── Counter Widget ───── */

function CounterWidget({
  count,
  onIncrement,
  isLightMode,
  onBurst,
}: {
  count: number;
  onIncrement: () => void;
  isLightMode: boolean;
  onBurst?: (rect: DOMRect) => void;
}) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const nextId = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    onIncrement();
    const id = nextId.current++;
    const x = Math.random() * 60 - 30;
    setParticles((prev) => [...prev, { id, value: "+1", x }]);

    // Trigger burst particles from button position
    if (onBurst && btnRef.current) {
      onBurst(btnRef.current.getBoundingClientRect());
    }
  }, [onIncrement, onBurst]);

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Format count with drum-roll style digits
  const digits = String(count).padStart(4, "0").split("");

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <Link
        href="/counter"
        className="flex items-center gap-1 group/link hover:opacity-80 transition-opacity lp-cursor-expand"
      >
        <span
          className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
            isLightMode ? "text-neutral-400 group-hover/link:text-purple-600" : "text-white/40"
          }`}
        >
          Counter
        </span>
        <ArrowUpRight size={10} className={`opacity-0 group-hover/link:opacity-100 transition-opacity ${isLightMode ? "text-purple-600" : "text-purple-400"}`} />
      </Link>

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
        ref={btnRef}
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
      <Link
        href="/flowchart"
        className="flex items-center gap-1 group/link hover:opacity-80 transition-opacity lp-cursor-expand"
      >
        <BarChart3
          size={12}
          className={`${isLightMode ? "text-blue-500 group-hover/link:text-blue-600" : "text-blue-400"}`}
        />
        <span
          className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
            isLightMode ? "text-neutral-400 group-hover/link:text-blue-600" : "text-white/40"
          }`}
        >
          Live Chart
        </span>
        <ArrowUpRight size={10} className={`opacity-0 group-hover/link:opacity-100 transition-opacity ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
      </Link>

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
      <Link
        href="/gacha"
        className="flex items-center gap-1 group/link hover:opacity-80 transition-opacity lp-cursor-expand"
      >
        <Sparkles
          size={12}
          className={`${isLightMode ? "text-yellow-500 group-hover/link:text-yellow-600" : "text-yellow-400"}`}
        />
        <span
          className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
            isLightMode ? "text-neutral-400 group-hover/link:text-yellow-600" : "text-white/40"
          }`}
        >
          Gacha
        </span>
        <ArrowUpRight size={10} className={`opacity-0 group-hover/link:opacity-100 transition-opacity ${isLightMode ? "text-yellow-600" : "text-yellow-400"}`} />
      </Link>

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
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);
  const burstIdRef = useRef(0);

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

  // Create burst particles at click position relative to console container
  const handleBurst = useCallback((btnRect: DOMRect) => {
    if (!consoleRef.current) return;
    const containerRect = consoleRef.current.getBoundingClientRect();
    const cx = btnRect.left + btnRect.width / 2 - containerRect.left;
    const cy = btnRect.top + btnRect.height / 2 - containerRect.top;

    const newParticles: BurstParticle[] = [];
    const particleCount = isMobile ? 5 : 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const distance = 40 + Math.random() * 60;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      newParticles.push({
        id: burstIdRef.current++,
        x: cx,
        y: cy,
        endX,
        endY,
        color: BURST_COLORS[i % BURST_COLORS.length] as string,
        size: 3 + Math.random() * 4,
      });
    }
    setBurstParticles((prev) => [...prev, ...newParticles]);
  }, [isMobile]);

  const removeBurstParticle = useCallback((id: number) => {
    setBurstParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* ── Mobile: horizontal swipe cards ── */
  if (isMobile) {
    return (
      <div ref={consoleRef} className="w-full mt-6 relative">
        <BurstEffect particles={burstParticles} onComplete={removeBurstParticle} />
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
              onBurst={handleBurst}
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
    <div ref={consoleRef} className="w-full relative">
      <BurstEffect particles={burstParticles} onComplete={removeBurstParticle} />
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
            onBurst={handleBurst}
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
