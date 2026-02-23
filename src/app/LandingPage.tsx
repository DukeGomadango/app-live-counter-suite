"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sun, Moon, LayoutGrid, List } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import { TOOLS } from "@/lib/tools";
import { SITE_CONFIG } from "@/lib/site";

const LP_ACCENT = "#a855f7";

type LayoutMode = "cards" | "strip";

export default function LandingPage() {
  const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
  const [layoutMode, setLayoutMode] = useLocalStorage<LayoutMode>("lp-layout-mode", "cards");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  }, [isLightMode]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <span className="text-white/50 text-sm">読み込み中…</span>
      </div>
    );
  }

  const panelBg = isLightMode
    ? "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.15) 100%)"
    : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
  const panelBorder = isLightMode
    ? "1px solid rgba(255,255,255,0.5)"
    : "1px solid rgba(255,255,255,0.1)";
  const panelShadow = isLightMode
    ? "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)"
    : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";

  const headerBg = isLightMode ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";
  const glassBorder = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col relative">
      {/* Fixed top bar: same style as other tool pages */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 min-h-[56px]"
        style={{
          background: headerBg,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${glassBorder}`,
        }}
      >
        <ModeSelector isLightMode={isLightMode} />
        <button
          type="button"
          onClick={() => setIsLightMode(!isLightMode)}
          className={`p-2 rounded-xl transition-colors shrink-0 ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
          title={isLightMode ? "ダークモードに切替" : "ライトモードに切替"}
          aria-label={isLightMode ? "ダークモードに切替" : "ライトモードに切替"}
        >
          {isLightMode ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
        </button>
      </header>

      {/* Background orbs */}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}
        aria-hidden
      >
        <motion.div
          animate={{ x: [0, 60, -30, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.85, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full blur-[100px]"
          style={{
            background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 70%)`,
            opacity: isLightMode ? 0.5 : 0.6,
          }}
        />
        <motion.div
          animate={{ x: [0, -60, 30, 0], y: [0, 60, -30, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 60%)`,
            opacity: isLightMode ? 0.4 : 0.5,
          }}
        />
      </div>

      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center px-4 md:px-3 pt-[56px] pb-14 md:pb-6 md:overflow-y-auto">
        {/* Hero: ヘッダーとの間に余白を取って「へばりつき」を解消 */}
        <header
          className="w-full max-w-2xl mx-auto mt-6 md:mt-10 rounded-2xl overflow-hidden px-6 py-8 sm:px-8 sm:py-10 md:py-4 md:px-5 text-center shrink-0"
          style={{
            background: panelBg,
            backdropFilter: isLightMode ? "blur(20px) saturate(1.2)" : "blur(16px)",
            WebkitBackdropFilter: isLightMode ? "blur(20px) saturate(1.2)" : "blur(16px)",
            border: panelBorder,
            boxShadow: panelShadow,
          }}
        >
          <div
            className="absolute top-0 left-[15%] right-[15%] h-[1.5px] opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${LP_ACCENT}, transparent)` }}
            aria-hidden
          />
          <h1
            className="text-2xl sm:text-3xl md:text-xl font-bold tracking-wide"
            style={{ color: LP_ACCENT, textShadow: `0 0 24px ${LP_ACCENT}50` }}
          >
            {SITE_CONFIG.name}
          </h1>
          <p
            className={`mt-3 md:mt-1.5 text-sm sm:text-base md:text-xs font-medium max-w-md mx-auto ${isLightMode ? "text-neutral-600" : "text-white/70"}`}
          >
            配信・クリエイター向けの無料Webツールキット。
            <br className="md:hidden" />
            人数カウントからフローチャート、ガチャまで。
          </p>
          {/* レイアウト切替: カード / ストリップ */}
          <div
            className={`mt-4 md:mt-3 flex items-center justify-center gap-1 rounded-xl p-1 ${isLightMode ? "bg-black/6" : "bg-white/5"}`}
            role="tablist"
            aria-label="ツールの表示"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("cards")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${layoutMode === "cards" ? (isLightMode ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : (isLightMode ? "text-neutral-500 hover:bg-black/8" : "text-white/50 hover:bg-white/10")}`}
              aria-pressed={layoutMode === "cards"}
              aria-label="カード表示"
            >
              <LayoutGrid size={14} />
              カード
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("strip")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${layoutMode === "strip" ? (isLightMode ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : (isLightMode ? "text-neutral-500 hover:bg-black/8" : "text-white/50 hover:bg-white/10")}`}
              aria-pressed={layoutMode === "strip"}
              aria-label="ストリップ表示"
            >
              <List size={14} />
              ストリップ
            </button>
          </div>
        </header>

        {/* ヒーローとツールの区切り線 */}
        <div
          className="w-full max-w-2xl mx-auto mt-6 md:mt-4 h-[1px] opacity-40"
          style={{ background: `linear-gradient(90deg, transparent, ${LP_ACCENT}, transparent)` }}
          aria-hidden
        />

        {layoutMode === "strip" ? (
          /* B: ストリップ表示（大きめのチップで存在感を） */
          <div className="w-full max-w-4xl mx-auto mt-6 md:mt-6 py-6 md:py-8 md:flex-1 md:flex md:flex-col md:justify-center">
            <div className="flex flex-wrap justify-center gap-4 md:gap-5">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                  >
                    <Link
                      href={tool.path}
                      className={`flex items-center gap-4 rounded-2xl px-5 py-4 md:px-6 md:py-4 transition-all duration-200 hover:scale-[1.02] ${isLightMode ? "hover:bg-white/90 text-neutral-800" : "hover:bg-white/10 text-white"}`}
                      style={{
                        background: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(12px)",
                        border: isLightMode ? "1px solid rgba(0,0,0,0.06)" : `1px solid ${tool.accentHex}25`,
                      }}
                    >
                      <span
                        className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${tool.accentHex}25`, color: tool.accentHex }}
                      >
                        <Icon size={22} strokeWidth={2} className="md:w-6 md:h-6" />
                      </span>
                      <span className="font-semibold text-base md:text-lg whitespace-nowrap">{tool.labelJa}</span>
                      <span className={`text-sm ${isLightMode ? "text-neutral-500" : "text-white/50"}`}>使ってみる</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* A: カード表示（「使ってみる」を行で揃える） */
          <div className="w-full max-w-4xl mx-auto mt-6 md:mt-4 py-6 md:py-8 md:flex-1 md:flex md:flex-col md:justify-center md:min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 md:gap-4 md:[grid-auto-rows:minmax(0,1fr)]">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <motion.article
                    key={tool.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: isLightMode
                        ? `0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px ${tool.accentHex}30, inset 0 1px 0 rgba(255,255,255,0.6)`
                        : `0 16px 48px rgba(0,0,0,0.4), 0 0 24px ${tool.accentHex}25, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    }}
                    className="rounded-2xl overflow-hidden transition-shadow duration-200 md:min-h-0 md:flex md:flex-col"
                    style={{
                      background: panelBg,
                      backdropFilter: isLightMode ? "blur(20px) saturate(1.2)" : "blur(16px)",
                      WebkitBackdropFilter: isLightMode ? "blur(20px) saturate(1.2)" : "blur(16px)",
                      border: panelBorder,
                      boxShadow: panelShadow,
                    }}
                  >
                    <div
                      className="h-[2px] opacity-70"
                      style={{ background: `linear-gradient(90deg, transparent, ${tool.accentHex}, transparent)` }}
                      aria-hidden
                    />
                    <div className="p-3 sm:p-4 md:p-4 flex flex-col md:min-h-0 md:flex-1">
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${tool.accentHex}20`, color: tool.accentHex }}
                        >
                          <Icon size={18} strokeWidth={2} className="md:w-4 md:h-4" />
                        </span>
                        <h2 className={`font-bold text-base sm:text-lg md:text-base leading-tight tracking-tight ${isLightMode ? "text-neutral-900" : "text-white"}`}>
                          {tool.labelJa}
                        </h2>
                      </div>
                      <p
                        className={`mt-2 text-xs sm:text-sm md:text-xs line-clamp-2 md:line-clamp-3 leading-normal w-full flex-1 min-h-0 ${isLightMode ? "text-neutral-500" : "text-white/60"}`}
                        style={{ lineBreak: "strict" }}
                      >
                        {tool.descriptionNarrowBreakAfter ? (
                          <>
                            <span className="block">
                              {tool.description.slice(
                                0,
                                tool.description.indexOf(tool.descriptionNarrowBreakAfter) + tool.descriptionNarrowBreakAfter.length
                              )}
                            </span>
                            <span className="block">
                              {tool.description.slice(
                                tool.description.indexOf(tool.descriptionNarrowBreakAfter) + tool.descriptionNarrowBreakAfter.length
                              )}
                            </span>
                          </>
                        ) : (
                          tool.description
                        )}
                      </p>
                      <Link
                        href={tool.path}
                        className={`mt-3 md:mt-2 shrink-0 inline-flex items-center justify-center rounded-lg py-2 px-3 text-xs md:text-sm font-medium transition-colors ${isLightMode ? "bg-black/8 hover:bg-black/12 text-neutral-800" : "bg-white/10 hover:bg-white/20 text-white"}`}
                        style={{ border: `1px solid ${tool.accentHex}40` }}
                      >
                        使ってみる
                      </Link>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
