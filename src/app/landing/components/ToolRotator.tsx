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
