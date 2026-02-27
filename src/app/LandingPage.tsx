"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sun, Moon, LayoutGrid, List, ChevronDown, ChevronRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import { TOOLS } from "@/lib/tools";
import { SITE_CONFIG } from "@/lib/site";
import { LP_FAQ_GROUPED } from "@/lib/lp-faq";
import { LP_CHANGELOG, type ChangelogImportance } from "@/lib/lp-changelog";

const LP_ACCENT = "#a855f7";

type LayoutMode = "cards" | "strip";

/** YYYY-MM-DD を「YYYY年M月D日」にフォーマット */
function formatChangelogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** 重要度を表示用ラベルに */
function importanceLabel(importance: ChangelogImportance): string {
  switch (importance) {
    case "major":
      return "新機能";
    case "normal":
      return "改善";
    case "minor":
      return "バグ修正";
  }
}

export default function LandingPage() {
  const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
  const [layoutMode, setLayoutMode] = useLocalStorage<LayoutMode>("lp-layout-mode", "cards");
  const [mounted, setMounted] = useState(false);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);
  const [faqCategoryOpenIndex, setFaqCategoryOpenIndex] = useState<number | null>(null);
  const [faqQuestionOpenKey, setFaqQuestionOpenKey] = useState<string | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  }, [isLightMode]); // 本文の表示は effectiveLight、body class は実際の設定 isLightMode で同期

  // クローラー・GSCフェッチ用: 初期HTMLに必ず本文を出す。テーマ/レイアウトはマウント前はデフォルトで hydration 一致させる。
  const effectiveLight = mounted ? isLightMode : false;
  const effectiveLayout = mounted ? layoutMode : "cards";

  const panelBg = effectiveLight
    ? "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.15) 100%)"
    : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
  const panelBorder = effectiveLight
    ? "1px solid rgba(255,255,255,0.5)"
    : "1px solid rgba(255,255,255,0.1)";
  const panelShadow = effectiveLight
    ? "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)"
    : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";

  const headerBg = effectiveLight ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";
  const glassBorder = effectiveLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";

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
        <ModeSelector isLightMode={effectiveLight} />
        <button
          type="button"
          onClick={() => setIsLightMode(!isLightMode)}
          className={`p-2 rounded-xl transition-colors shrink-0 ${effectiveLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
          title={effectiveLight ? "ダークモードに切替" : "ライトモードに切替"}
          aria-label={effectiveLight ? "ダークモードに切替" : "ライトモードに切替"}
        >
          {effectiveLight ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
        </button>
      </header>

      {/* Background orbs */}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${effectiveLight ? "mix-blend-multiply opacity-20" : "opacity-80"}`}
        aria-hidden
      >
        <motion.div
          animate={{ x: [0, 60, -30, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.85, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full blur-[100px]"
          style={{
            background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 70%)`,
            opacity: effectiveLight ? 0.5 : 0.6,
          }}
        />
        <motion.div
          animate={{ x: [0, -60, 30, 0], y: [0, 60, -30, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 60%)`,
            opacity: effectiveLight ? 0.4 : 0.5,
          }}
        />
      </div>

      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center px-4 md:px-3 pt-[56px] pb-14 md:pb-6 md:overflow-y-auto scroll-touch">
        {/* Hero: ヘッダーとの間に余白を取って「へばりつき」を解消 */}
        <header
          className="w-full max-w-2xl mx-auto mt-6 md:mt-10 rounded-2xl overflow-hidden px-6 py-8 sm:px-8 sm:py-10 md:py-4 md:px-5 text-center shrink-0"
          style={{
            background: panelBg,
            backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
            WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
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
            className={`mt-3 md:mt-1.5 text-sm sm:text-base md:text-xs font-medium max-w-md mx-auto ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}
          >
            配信・クリエイター向けの無料Webツールキット。
            <br className="md:hidden" />
            人数カウントからフローチャート、ガチャまで。
          </p>
          {/* レイアウト切替: カード / ストリップ */}
          <div
            className={`mt-4 md:mt-3 flex items-center justify-center gap-1 rounded-xl p-1 ${effectiveLight ? "bg-black/6" : "bg-white/5"}`}
            role="tablist"
            aria-label="ツールの表示"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("cards")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${effectiveLayout === "cards" ? (effectiveLight ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : (effectiveLight ? "text-neutral-500 hover:bg-black/8" : "text-white/50 hover:bg-white/10")}`}
              aria-pressed={effectiveLayout === "cards"}
              aria-label="カード表示"
            >
              <LayoutGrid size={14} />
              カード
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("strip")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${effectiveLayout === "strip" ? (effectiveLight ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : (effectiveLight ? "text-neutral-500 hover:bg-black/8" : "text-white/50 hover:bg-white/10")}`}
              aria-pressed={effectiveLayout === "strip"}
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

        {effectiveLayout === "strip" ? (
          /* B: ストリップ表示（大きめのチップで存在感を） */
          <div className="w-full max-w-4xl mx-auto mt-6 md:mt-6 py-6 md:py-8">
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
                      className={`flex items-center gap-4 rounded-2xl px-5 py-4 md:px-6 md:py-4 transition-all duration-200 hover:scale-[1.02] ${effectiveLight ? "hover:bg-white/90 text-neutral-800" : "hover:bg-white/10 text-white"}`}
                      style={{
                        background: effectiveLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(12px)",
                        border: effectiveLight ? "1px solid rgba(0,0,0,0.06)" : `1px solid ${tool.accentHex}25`,
                      }}
                    >
                      <span
                        className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${tool.accentHex}25`, color: tool.accentHex }}
                      >
                        <Icon size={22} strokeWidth={2} className="md:w-6 md:h-6" />
                      </span>
                      <span className="font-semibold text-base md:text-lg whitespace-nowrap">{tool.labelJa}</span>
                      <span className={`text-sm ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>使ってみる</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* A: カード表示（「使ってみる」を行で揃える） */
          <div className="w-full max-w-4xl mx-auto mt-6 md:mt-4 py-6 md:py-8">
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
                      boxShadow: effectiveLight
                        ? `0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px ${tool.accentHex}30, inset 0 1px 0 rgba(255,255,255,0.6)`
                        : `0 16px 48px rgba(0,0,0,0.4), 0 0 24px ${tool.accentHex}25, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    }}
                    className="rounded-2xl overflow-hidden transition-shadow duration-200 md:min-h-0 md:flex md:flex-col"
                    style={{
                      background: panelBg,
                      backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
                      WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
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
                        <h2 className={`font-bold text-base sm:text-lg md:text-base leading-tight tracking-tight ${effectiveLight ? "text-neutral-900" : "text-white"}`}>
                          {tool.labelJa}
                        </h2>
                      </div>
                      <p
                        className={`mt-2 text-xs sm:text-sm md:text-xs line-clamp-2 md:line-clamp-3 leading-normal w-full flex-1 min-h-0 ${effectiveLight ? "text-neutral-500" : "text-white/60"}`}
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
                        className={`mt-3 md:mt-2 shrink-0 inline-flex items-center justify-center rounded-lg py-2 px-3 text-xs md:text-sm font-medium transition-colors ${effectiveLight ? "bg-black/8 hover:bg-black/12 text-neutral-800" : "bg-white/10 hover:bg-white/20 text-white"}`}
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

        {/* FAQ: 一段で「よくある質問」のみ表示→開くとカテゴリ→二段でカテゴリ開くと Q/A */}
        <section
          className="w-full max-w-2xl mx-auto mt-24 md:mt-32 rounded-2xl overflow-hidden shrink-0"
          style={{
            background: panelBg,
            backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
            WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
            border: panelBorder,
            boxShadow: panelShadow,
          }}
          aria-labelledby="lp-faq-heading"
        >
          <div
            className="h-[2px] opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${LP_ACCENT}, transparent)` }}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setFaqSectionOpen(!faqSectionOpen)}
            className={`w-full flex items-center gap-2 px-4 py-3 text-left ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
            aria-expanded={faqSectionOpen}
            aria-controls="lp-faq-body"
          >
            {faqSectionOpen ? (
              <ChevronDown size={18} className="shrink-0" aria-hidden />
            ) : (
              <ChevronRight size={18} className="shrink-0" aria-hidden />
            )}
            <h2
              id="lp-faq-heading"
              className="text-base font-bold"
              style={{ color: LP_ACCENT }}
            >
              よくある質問
            </h2>
          </button>
          <motion.div
            id="lp-faq-body"
            initial={false}
            animate={{ height: faqSectionOpen ? "auto" : 0, opacity: faqSectionOpen ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {LP_FAQ_GROUPED.map((group, catIdx) => {
                const isCategoryOpen = faqCategoryOpenIndex === catIdx;
                return (
                  <div
                    key={catIdx}
                    className={`rounded-xl border overflow-hidden mt-2 first:mt-0 ${effectiveLight ? "border-black/8" : "border-white/10"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setFaqCategoryOpenIndex(isCategoryOpen ? null : catIdx)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
                      aria-expanded={isCategoryOpen}
                      aria-controls={`lp-faq-cat-${catIdx}`}
                    >
                      {isCategoryOpen ? (
                        <ChevronDown size={16} className="shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight size={16} className="shrink-0" aria-hidden />
                      )}
                      <span>{group.category}</span>
                    </button>
                    <motion.div
                      id={`lp-faq-cat-${catIdx}`}
                      initial={false}
                      animate={{ height: isCategoryOpen ? "auto" : 0, opacity: isCategoryOpen ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div>
                        {group.items.map((item, qIdx) => {
                          const questionKey = `${catIdx}-${qIdx}`;
                          const isQuestionOpen = faqQuestionOpenKey === questionKey;
                          return (
                            <div
                              key={qIdx}
                              className={qIdx === 0 ? "" : effectiveLight ? "border-t border-black/8" : "border-t border-white/10"}
                            >
                              <button
                                type="button"
                                onClick={() => setFaqQuestionOpenKey(isQuestionOpen ? null : questionKey)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${effectiveLight ? "text-neutral-700 hover:bg-black/5" : "text-white/90 hover:bg-white/5"}`}
                                style={{ paddingLeft: "calc(0.75rem + 16px + 0.5rem)" }}
                                aria-expanded={isQuestionOpen}
                                aria-controls={`lp-faq-answer-${questionKey}`}
                                id={`lp-faq-question-${questionKey}`}
                              >
                                {isQuestionOpen ? (
                                  <ChevronDown size={14} className="shrink-0 opacity-70" aria-hidden />
                                ) : (
                                  <ChevronRight size={14} className="shrink-0 opacity-70" aria-hidden />
                                )}
                                <span>{item.q}</span>
                              </button>
                              <motion.div
                                id={`lp-faq-answer-${questionKey}`}
                                role="region"
                                aria-labelledby={`lp-faq-question-${questionKey}`}
                                initial={false}
                                animate={{ height: isQuestionOpen ? "auto" : 0, opacity: isQuestionOpen ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <p
                                  className={`px-3 pb-3 pt-0 text-sm leading-relaxed ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}
                                  style={{ paddingLeft: "calc(0.75rem + 16px + 0.5rem + 14px + 0.5rem)" }}
                                >
                                  {item.a}
                                </p>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* 更新履歴: 普段は閉じ、開くと年表表示 */}
        <section
          className="w-full max-w-2xl mx-auto mt-4 mb-8 md:mb-10 rounded-2xl overflow-hidden shrink-0"
          style={{
            background: panelBg,
            backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
            WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
            border: panelBorder,
            boxShadow: panelShadow,
          }}
          aria-labelledby="lp-changelog-heading"
        >
          <div
            className="h-[2px] opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${LP_ACCENT}, transparent)` }}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setChangelogOpen(!changelogOpen)}
            className={`w-full flex items-center gap-2 px-4 py-3 text-left ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
            aria-expanded={changelogOpen}
            aria-controls="lp-changelog-body"
          >
            {changelogOpen ? (
              <ChevronDown size={18} className="shrink-0" aria-hidden />
            ) : (
              <ChevronRight size={18} className="shrink-0" aria-hidden />
            )}
            <h2
              id="lp-changelog-heading"
              className="text-base font-bold"
              style={{ color: LP_ACCENT }}
            >
              更新履歴
            </h2>
          </button>
          <motion.div
            id="lp-changelog-body"
            initial={false}
            animate={{ height: changelogOpen ? "auto" : 0, opacity: changelogOpen ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className={`border-b ${effectiveLight ? "border-neutral-200" : "border-white/20"}`}>
                    <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>
                      日付
                    </th>
                    <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>
                      種別
                    </th>
                    <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>
                      タイトル
                    </th>
                    <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>
                      主な変更
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LP_CHANGELOG.map((entry, i) => (
                    <tr
                      key={i}
                      className={`border-b ${effectiveLight ? "border-neutral-100" : "border-white/10"} ${entry.importance === "major" ? "bg-black/5" : ""}`}
                    >
                      <td className={`py-2 pr-3 align-top whitespace-nowrap ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>
                        {formatChangelogDate(entry.date)}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            entry.importance === "major"
                              ? effectiveLight
                                ? "bg-purple-100 text-purple-800"
                                : "bg-white/20 text-purple-200"
                              : entry.importance === "minor"
                                ? effectiveLight
                                  ? "bg-neutral-100 text-neutral-600"
                                  : "bg-white/10 text-white/50"
                                : effectiveLight
                                  ? "text-neutral-600"
                                  : "text-white/70"
                          }`}
                        >
                          {importanceLabel(entry.importance)}
                        </span>
                      </td>
                      <td
                        className={`py-2 pr-3 align-top font-medium ${
                          entry.importance === "major"
                            ? `font-semibold ${effectiveLight ? "text-neutral-900" : "text-white"}`
                            : effectiveLight
                              ? "text-neutral-800"
                              : "text-white/90"
                        }`}
                      >
                        {entry.title}
                      </td>
                      <td className={`py-2 pr-3 align-top ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>
                        <ul className="list-disc list-inside space-y-0.5">
                          {entry.items.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
