"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Clock, PanelTopOpen, LayoutGrid, CircleDot, Dices, ArrowRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/* ───── Types & Constants ───── */

interface ToolItem {
  id: string;
  path: string;
  labelEn: string;
  labelJa: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
  accentHex: string;
  bgGradient: string;
}

const OTHER_TOOLS: ToolItem[] = [
  {
    id: "panel",
    path: "/panel",
    labelEn: "Panel",
    labelJa: "パネルオープン",
    description: "画像に覆いをかけてタップでオープン。目標人数やチャンネル登録者数の達成で徐々に剥がす演出、AI読み取り防止に最適。",
    icon: PanelTopOpen,
    accentHex: "#8b5cf6",
    bgGradient: "from-violet-500/20 via-purple-500/5 to-transparent",
  },
  {
    id: "calculator",
    path: "/calculator",
    labelEn: "Calculator",
    labelJa: "配信電卓",
    description: "四則演算、分数、確率計算を瞬時に行うサポート電卓。ゲームのダメージ検証や、確率の即時計算に役立ちます。",
    icon: Calculator,
    accentHex: "#22d3ee",
    bgGradient: "from-cyan-500/20 via-teal-500/5 to-transparent",
  },
  {
    id: "clock",
    path: "/clock",
    labelEn: "Clock",
    labelJa: "配信時計・タイマー",
    description: "現在時刻・ストップウォッチ・カウントダウンタイマーを搭載。デジタル／アナログ表示対応で配信枠に溶け込みます。",
    icon: Clock,
    accentHex: "#f97316",
    bgGradient: "from-orange-500/20 via-red-500/5 to-transparent",
  },
  {
    id: "split",
    path: "/split",
    labelEn: "Split",
    labelJa: "スプリットビュー",
    description: "カウンター、タイマー、ガチャなどの複数ツールを1画面に分割して並列表示。ワンクリックで切り替える神操作パネル。",
    icon: LayoutGrid,
    accentHex: "#34d399",
    bgGradient: "from-emerald-500/20 via-teal-500/5 to-transparent",
  },
  {
    id: "roulette",
    path: "/roulette",
    labelEn: "Roulette",
    labelJa: "直感ルーレット",
    description: "項目と比率を入れてパッと回せる高演出ルーレット。リスナーのコメントやお題決め、ゲーム内抽選をリアルタイムで決定。",
    icon: CircleDot,
    accentHex: "#fbbf24",
    bgGradient: "from-amber-500/20 via-yellow-500/5 to-transparent",
  },
  {
    id: "slot",
    path: "/slot",
    labelEn: "Slot",
    labelJa: "3連スロット",
    description: "順押し・目押し対応、図柄や確率もカスタム可能な超高機能スロット。配信企画の演出や、サブスク抽選会の最高潮に。",
    icon: Dices,
    accentHex: "#14b8a6",
    bgGradient: "from-teal-500/20 via-emerald-500/5 to-transparent",
  },
];

/* ───── SVG Animated Previews for each tool ───── */

function PanelPreviewSvg({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" fill="none" className="opacity-60">
      {/* Image frame */}
      <rect x="10" y="5" width="100" height="70" rx="6" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Panel tiles peeling away */}
      <rect x="10" y="5" width="25" height="23" rx="2" fill={color} opacity="0.15" />
      <rect x="35" y="5" width="25" height="23" rx="2" fill={color} opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="60" y="5" width="25" height="23" rx="2" fill={color} opacity="0.08" />
      <rect x="85" y="5" width="25" height="23" rx="2" fill={color} opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.02;0.2" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
      </rect>
      <rect x="10" y="28" width="25" height="23" rx="2" fill={color} opacity="0.12">
        <animate attributeName="opacity" values="0.12;0.02;0.12" dur="2s" repeatCount="indefinite" begin="1s" />
      </rect>
      <rect x="35" y="28" width="25" height="23" rx="2" fill={color} opacity="0.05" />
      {/* Sparkle icon */}
      <text x="60" y="60" fill={color} fontSize="16" opacity="0.3">✨</text>
    </svg>
  );
}

function CalculatorPreviewSvg({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" fill="none" className="opacity-60">
      {/* Calculator body */}
      <rect x="25" y="5" width="70" height="70" rx="8" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Display */}
      <rect x="32" y="12" width="56" height="16" rx="4" fill={color} opacity="0.1" />
      <text x="82" y="25" textAnchor="end" fill={color} fontSize="11" fontWeight="bold" opacity="0.6">
        42.5
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />
      </text>
      {/* Buttons grid */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={32 + col * 15}
            y={34 + row * 11}
            width="11"
            height="8"
            rx="2"
            fill={color}
            opacity={0.08 + (row === 0 && col === 3 ? 0.15 : 0)}
          >
            {row === 1 && col === 2 && (
              <animate attributeName="opacity" values="0.08;0.25;0.08" dur="1.5s" repeatCount="indefinite" />
            )}
          </rect>
        ))
      )}
    </svg>
  );
}

function ClockPreviewSvg({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" fill="none" className="opacity-60">
      {/* Clock face */}
      <circle cx="60" cy="40" r="30" stroke={color} strokeWidth="1" opacity="0.3" />
      <circle cx="60" cy="40" r="2" fill={color} opacity="0.5" />
      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 60 + Math.cos(angle) * 25;
        const y1 = 40 + Math.sin(angle) * 25;
        const x2 = 60 + Math.cos(angle) * 28;
        const y2 = 40 + Math.sin(angle) * 28;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" opacity="0.3" />;
      })}
      {/* Hour hand */}
      <line x1="60" y1="40" x2="60" y2="22" stroke={color} strokeWidth="2" opacity="0.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 60 40" to="360 60 40" dur="43200s" repeatCount="indefinite" />
      </line>
      {/* Minute hand */}
      <line x1="60" y1="40" x2="60" y2="16" stroke={color} strokeWidth="1.5" opacity="0.4" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 60 40" to="360 60 40" dur="3600s" repeatCount="indefinite" />
      </line>
      {/* Second hand */}
      <line x1="60" y1="40" x2="60" y2="14" stroke={color} strokeWidth="0.8" opacity="0.6" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 60 40" to="360 60 40" dur="10s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

function SplitPreviewSvg({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" fill="none" className="opacity-60">
      {/* Split layout frames */}
      <rect x="10" y="8" width="48" height="64" rx="4" stroke={color} strokeWidth="1" opacity="0.3" />
      <rect x="62" y="8" width="48" height="30" rx="4" stroke={color} strokeWidth="1" opacity="0.3" />
      <rect x="62" y="42" width="48" height="30" rx="4" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Content indicators */}
      <rect x="18" y="20" width="32" height="3" rx="1.5" fill={color} opacity="0.15" />
      <rect x="18" y="28" width="24" height="3" rx="1.5" fill={color} opacity="0.1" />
      <circle cx="34" cy="50" r="8" stroke={color} strokeWidth="1" opacity="0.2">
        <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
      </circle>
      <rect x="70" y="16" width="24" height="14" rx="2" fill={color} opacity="0.08">
        <animate attributeName="opacity" values="0.08;0.18;0.08" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <rect x="70" y="50" width="32" height="3" rx="1.5" fill={color} opacity="0.12" />
      <rect x="70" y="56" width="20" height="3" rx="1.5" fill={color} opacity="0.08" />
    </svg>
  );
}

function RoulettePreviewSvg({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" fill="none" className="opacity-60">
      {/* Wheel */}
      <circle cx="60" cy="40" r="28" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Segments */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const x = 60 + Math.cos(rad) * 28;
        const y = 40 + Math.sin(rad) * 28;
        return <line key={i} x1="60" y1="40" x2={x} y2={y} stroke={color} strokeWidth="0.8" opacity="0.2" />;
      })}
      {/* Spinning indicator */}
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 60 40" to="360 60 40" dur="4s" repeatCount="indefinite" />
        <circle cx="60" cy="14" r="3" fill={color} opacity="0.5" />
      </g>
      {/* Center dot */}
      <circle cx="60" cy="40" r="4" fill={color} opacity="0.3" />
      {/* Pointer */}
      <polygon points="60,8 56,2 64,2" fill={color} opacity="0.5" />
    </svg>
  );
}

function SlotPreviewSvg({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" fill="none" className="opacity-60">
      {/* Slot machine frame */}
      <rect x="15" y="10" width="90" height="60" rx="6" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* 3 reels */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={25 + i * 28} y="18" width="22" height="44" rx="3" stroke={color} strokeWidth="0.8" opacity="0.2" />
          {/* Reel symbol */}
          <text
            x={36 + i * 28}
            y="44"
            textAnchor="middle"
            fill={color}
            fontSize="14"
            fontWeight="bold"
            opacity="0.4"
          >
            {["7", "★", "♦"][i]}
            <animate
              attributeName="y"
              values="44;38;44"
              dur={`${1.5 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </text>
        </g>
      ))}
      {/* Horizontal line (payline) */}
      <line x1="22" y1="40" x2="98" y2="40" stroke={color} strokeWidth="0.8" opacity="0.15" />
    </svg>
  );
}

const TOOL_PREVIEWS: Record<string, React.ComponentType<{ color: string }>> = {
  panel: PanelPreviewSvg,
  calculator: CalculatorPreviewSvg,
  clock: ClockPreviewSvg,
  split: SplitPreviewSvg,
  roulette: RoulettePreviewSvg,
  slot: SlotPreviewSvg,
};

export default function ToolRotator({ isMobile = false }: { isMobile?: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const { isLightMode } = useTheme();

  if (isMobile) {
    // Mobile: CSS-only Snap Carousel (overflow-x auto + scroll-snap-type + peep adjacent cards w-[82vw])
    return (
      <div 
        className="w-full flex overflow-x-auto gap-4 scroll-smooth snap-x snap-mandatory py-4 px-4 -mx-4 scrollbar-none"
        style={{ scrollPadding: "0 16px" }}
      >
        {OTHER_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className={`w-[82vw] shrink-0 snap-center rounded-3xl border p-6 flex flex-col justify-between transition-colors duration-300 ${
                isLightMode ? "border-black/5" : "border-white/10"
              }`}
              style={{
                background: isLightMode
                  ? `linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.7) 100%)`
                  : `linear-gradient(135deg, rgba(24, 24, 27, 0.6) 0%, rgba(9, 9, 11, 0.8) 100%)`,
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${tool.accentHex}20`,
                      color: tool.accentHex,
                    }}
                  >
                    <Icon size={20} />
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase opacity-70"
                    style={{ color: tool.accentHex }}
                  >
                    {tool.labelEn}
                  </span>
                </div>
                <h3 className={`text-lg font-black mb-2 font-[family-name:var(--font-plus-jakarta)] ${
                  isLightMode ? "text-slate-900" : "text-white"
                }`}>
                  {tool.labelJa}
                </h3>
                <p className={`text-xs font-[family-name:var(--font-outfit)] leading-relaxed font-medium ${
                  isLightMode ? "text-slate-600" : "text-zinc-400"
                }`}>
                  {tool.description}
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  href={tool.path}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                    isLightMode
                      ? "bg-slate-900/5 border border-slate-900/10 text-slate-900 hover:bg-slate-900/10"
                      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  使ってみる <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // PC: Tab Switcher with spring transitions and AnimatePresence
  const currentTool = (OTHER_TOOLS[activeTab] ?? OTHER_TOOLS[0]) as unknown as ToolItem;
  const ActiveIcon = currentTool.icon;
  const PreviewSvg = TOOL_PREVIEWS[currentTool.id];

  return (
    <div className="w-full grid grid-cols-12 gap-8 items-stretch">
      {/* Left side: Tab navigation */}
      <div className="col-span-5 flex flex-col gap-2">
        {OTHER_TOOLS.map((tool, idx) => {
          const Icon = tool.icon;
          const isActive = idx === activeTab;

          return (
            <button
              key={tool.id}
              onClick={() => setActiveTab(idx)}
              onMouseEnter={() => setActiveTab(idx)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                isActive
                  ? isLightMode
                    ? "border-black/10 bg-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                    : "border-white/15 bg-white/5 shadow-[0_4px_20px_rgba(255,255,255,0.02)]"
                  : isLightMode
                    ? "border-transparent bg-transparent hover:bg-black/2 hover:border-black/5"
                    : "border-transparent bg-transparent hover:bg-white/2 hover:border-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? "scale-105" : "group-hover:scale-105"
                  }`}
                  style={{
                    background: isActive ? `${tool.accentHex}25` : (isLightMode ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)"),
                    color: isActive ? tool.accentHex : (isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)"),
                  }}
                >
                  <Icon size={20} />
                </span>
                <div>
                  <h4
                    className={`text-sm font-black transition-colors duration-300 ${
                      isActive
                        ? isLightMode ? "text-slate-900" : "text-white"
                        : isLightMode ? "text-slate-500 group-hover:text-slate-700" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  >
                    {tool.labelJa}
                  </h4>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {tool.labelEn}
                  </span>
                </div>
              </div>

              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  isLightMode ? "border-black/5" : "border-white/5"
                } ${
                  isActive 
                    ? isLightMode
                      ? "bg-slate-900 text-white scale-100 opacity-100"
                      : "bg-white text-black scale-100 opacity-100"
                    : "scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-90"
                }`}
              >
                <ArrowRight size={10} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Right side: Dynamic details display with spring-slide transition */}
      <div className={`col-span-7 rounded-3xl border backdrop-blur-xl relative overflow-hidden flex flex-col justify-between p-8 transition-colors duration-300 ${
        isLightMode ? "border-black/5 bg-white/35" : "border-white/5 bg-zinc-950/30"
      }`}>
        {/* Decorative corner glows */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`glow-${currentTool.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute top-0 right-0 w-72 h-72 rounded-full bg-gradient-to-br ${currentTool.bgGradient} blur-[60px] pointer-events-none`}
          />
        </AnimatePresence>

        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`header-${currentTool.id}`}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex items-center gap-4 mb-6"
            >
              <span
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${currentTool.accentHex}30, ${currentTool.accentHex}05)`,
                  boxShadow: `0 0 30px ${currentTool.accentHex}20`,
                }}
              >
                <ActiveIcon size={32} style={{ color: currentTool.accentHex }} />
              </span>
              <div>
                <span
                  className="text-xs font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: currentTool.accentHex }}
                >
                  {currentTool.labelEn} Toolkit
                </span>
                <h3 className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 font-[family-name:var(--font-plus-jakarta)] ${
                  isLightMode ? "text-slate-900" : "text-white"
                }`}>
                  {currentTool.labelJa}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={`desc-${currentTool.id}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.05 }}
              className={`text-base font-[family-name:var(--font-outfit)] leading-relaxed font-medium max-w-xl ${
                isLightMode ? "text-slate-600" : "text-zinc-400"
              }`}
            >
              {currentTool.description}
            </motion.p>
          </AnimatePresence>

          {/* SVG Animated Preview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`preview-${currentTool.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="mt-4 flex justify-center items-center h-[160px] md:h-[200px]"
            >
              <div className="w-[80%] max-w-[280px] aspect-[3/2] flex items-center justify-center">
                {PreviewSvg && <PreviewSvg color={currentTool.accentHex} />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={`relative z-10 flex items-center justify-between pt-6 border-t transition-colors duration-300 ${
          isLightMode ? "border-slate-200" : "border-white/5"
        }`}>
          <span className="text-xs font-semibold text-zinc-500">完全無料・登録なし・100%ローカル</span>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={`cta-${currentTool.id}`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={currentTool.path}
                className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all duration-300 active:scale-98 ${
                  isLightMode
                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                    : "bg-white text-black hover:bg-zinc-200 shadow-[0_10px_30px_rgba(255,255,255,0.05)] hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                }`}
              >
                今すぐツールを起動 <ArrowRight size={16} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
