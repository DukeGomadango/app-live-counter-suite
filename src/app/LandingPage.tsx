"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sun, Moon, LayoutGrid, List, ChevronDown, ChevronRight, Check } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import DataLinkModal from "@/components/DataLinkModal";
import PwaInstallChip from "@/components/PwaInstallChip";
import { TOOLS_BY_CATEGORY } from "@/lib/tools";
import { SITE_CONFIG } from "@/lib/site";
import { LP_FAQ_GROUPED } from "@/lib/lp-faq";
import { LP_CHANGELOG, type ChangelogImportance } from "@/lib/lp-changelog";

const LP_ACCENT = "#a855f7";

type LayoutMode = "cards" | "strip";
type UseCase = {
  title: string;
  body: string;
  toolPath: string;
  toolLabel: string;
};

const USE_CASES: UseCase[] = [
  {
    title: "耐久配信の進行管理に",
    body: "人数カウンターで到達人数や目標値をすぐ更新できます。",
    toolPath: "/counter",
    toolLabel: "人数カウンター",
  },
  {
    title: "参加型企画の集計に",
    body: "チャートで加算・減算を視覚的にまとめられます。",
    toolPath: "/flowchart",
    toolLabel: "チャート",
  },
  {
    title: "演出企画の盛り上げに",
    body: "ガチャやルーレットで配信中の抽選演出を作れます。",
    toolPath: "/gacha",
    toolLabel: "ガチャ",
  },
];

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
  const [showHeaderCta, setShowHeaderCta] = useState(false);
  const [dataLinkOpen, setDataLinkOpen] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setShowHeaderCta(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // クローラー・GSCフェッチ用: 初期HTMLに必ず本文を出す。テーマ/レイアウトはマウント前はデフォルトで hydration 一致させる。
  const effectiveLight = mounted ? isLightMode : false;
  const effectiveLayout = mounted ? layoutMode : "cards";

  const panelBg = effectiveLight
    ? "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.84) 100%)"
    : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
  const panelBorder = effectiveLight
    ? "1px solid rgba(15,23,42,0.12)"
    : "1px solid rgba(255,255,255,0.1)";
  const panelShadow = effectiveLight
    ? "0 8px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"
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
        <div className="flex items-center gap-2">
          <Link
            href="/counter"
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
              showHeaderCta ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
            } ${
              effectiveLight ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-purple-500 text-white hover:bg-purple-400"
            }`}
          >
            今すぐ使う
          </Link>
          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-2 rounded-xl transition-colors shrink-0 ${effectiveLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
            title={effectiveLight ? "ダークモードに切替" : "ライトモードに切替"}
            aria-label={effectiveLight ? "ダークモードに切替" : "ライトモードに切替"}
          >
            {effectiveLight ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Background orbs */}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${effectiveLight ? "mix-blend-multiply opacity-10" : "opacity-80"}`}
        aria-hidden
      >
        <motion.div
          animate={{ x: [0, 60, -30, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.85, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full blur-[100px]"
          style={{
            background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 70%)`,
            opacity: effectiveLight ? 0.32 : 0.6,
          }}
        />
        <motion.div
          animate={{ x: [0, -60, 30, 0], y: [0, 60, -30, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 60%)`,
            opacity: effectiveLight ? 0.24 : 0.5,
          }}
        />
      </div>

      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center px-4 md:px-3 pt-[56px] pb-14 md:pb-6 md:overflow-y-auto scroll-touch">
        {/* Hero: ヘッダーとの間に余白を取って「へばりつき」を解消 */}
        <header className="w-full max-w-5xl mx-auto mt-8 md:mt-12 px-2 sm:px-3 py-2 sm:py-3 text-center md:text-left shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
            <div className="flex flex-col justify-center">
              <p className={`text-xs font-semibold tracking-wide ${effectiveLight ? "text-neutral-500" : "text-white/55"}`}>
                {SITE_CONFIG.name}
              </p>
              <h1
                className="mt-2 text-3xl sm:text-4xl md:text-4xl font-black leading-tight"
                style={{ color: LP_ACCENT, textShadow: `0 0 24px ${LP_ACCENT}50` }}
              >
                あなたの配信を、
                <br />
                もっと面白く、もっと直感的に。
              </h1>
              <p
                className={`mt-3 text-sm sm:text-base font-medium max-w-xl ${effectiveLight ? "text-neutral-600" : "text-white/75"}`}
              >
                完全無料・登録不要。人数管理、抽選演出、進行管理をブラウザだけで今すぐ始められます。
              </p>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                <Link
                  href="/counter"
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    effectiveLight ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-purple-500 text-white hover:bg-purple-400"
                  }`}
                >
                  今すぐブラウザで使う
                </Link>
                <Link
                  href="#lp-tools"
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    effectiveLight ? "bg-black/8 hover:bg-black/12 text-neutral-800" : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  ツールを見る
                </Link>
                <button
                  type="button"
                  onClick={() => setDataLinkOpen(true)}
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    effectiveLight ? "bg-black/8 hover:bg-black/12 text-neutral-800" : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  データを連携
                </button>
              </div>
            </div>
            <div className="rounded-2xl p-3 sm:p-4 bg-transparent">
              <p className={`text-xs font-medium ${effectiveLight ? "text-neutral-500" : "text-white/60"}`}>ライブプレビュー</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="col-span-2 rounded-xl p-3" style={{ background: "linear-gradient(135deg, #a855f730, transparent)" }}>
                  <p className={`text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>人数カウンター</p>
                  <p className="text-2xl font-black text-purple-400 tracking-wide">1,248</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #60a5fa30, transparent)" }}>
                  <p className={`text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>チャート</p>
                  <p className="text-sm font-bold text-blue-300">+300 / -120</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #facc1530, transparent)" }}>
                  <p className={`text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>ガチャ</p>
                  <p className="text-sm font-bold text-yellow-300">SSR 3.0%</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="w-full max-w-5xl mx-auto mt-14 md:mt-20" aria-labelledby="lp-usecase-heading">
          <h2
            id="lp-usecase-heading"
            className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}
          >
            ユースケース
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {USE_CASES.map((useCase) => (
              <article key={useCase.title} className="p-1 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="relative h-7 w-7 shrink-0">
                    <span
                      className="absolute inset-0 rounded-full blur-md opacity-45"
                      style={{ background: useCase.toolPath === "/counter" ? "#a855f7" : useCase.toolPath === "/flowchart" ? "#60a5fa" : "#facc15" }}
                    />
                    <span
                      className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ background: useCase.toolPath === "/counter" ? "#a855f7" : useCase.toolPath === "/flowchart" ? "#60a5fa" : "#facc15" }}
                    />
                  </span>
                  <h3 className={`text-sm font-bold ${effectiveLight ? "text-neutral-900" : "text-white"}`}>{useCase.title}</h3>
                  <p className={`text-xs leading-relaxed max-w-[20rem] ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>{useCase.body}</p>
                </div>
                <Link
                  href={useCase.toolPath}
                  className={`mt-3 inline-flex items-center justify-center rounded-lg py-1 px-2 text-xs font-medium transition-colors ${
                    effectiveLight ? "text-neutral-700 hover:bg-black/7" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {useCase.toolLabel}を見る →
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ヒーローとツールの区切り線 */}
        <div
          className="w-full max-w-5xl mx-auto mt-16 md:mt-24 h-[1px] opacity-40"
          style={{ background: `linear-gradient(90deg, transparent, ${LP_ACCENT}, transparent)` }}
          aria-hidden
        />

        {effectiveLayout === "strip" ? (
          /* B: ストリップ表示（ツール・ゲームの2セクション） */
          <div className="w-full max-w-4xl mx-auto mt-14 md:mt-16 py-6 md:py-8 space-y-10">
            {(["tools", "games"] as const).map((cat) => (
              <section key={cat} aria-labelledby={`strip-heading-${cat}`}>
                <h2
                  id={`strip-heading-${cat}`}
                  className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}
                >
                  {cat === "tools" ? "ツール" : "ゲーム"}
                </h2>
                <div className="flex flex-wrap justify-center gap-4 md:gap-5">
                  {TOOLS_BY_CATEGORY[cat].map((tool, i) => {
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
              </section>
            ))}
          </div>
        ) : (
          /* A: カード表示（ツール・ゲームの2セクション） */
          <div id="lp-tools" className="w-full max-w-4xl mx-auto mt-14 md:mt-16 py-6 md:py-8 space-y-10">
            {(["tools", "games"] as const).map((cat) => (
              <section key={cat} aria-labelledby={`cards-heading-${cat}`}>
                <h2
                  id={`cards-heading-${cat}`}
                  className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}
                >
                  {cat === "tools" ? "ツール" : "ゲーム"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 md:[grid-auto-rows:minmax(0,1fr)]">
                  {[...TOOLS_BY_CATEGORY[cat]].sort((a, b) => a.lpPriority - b.lpPriority).map((tool, i) => {
                    const Icon = tool.icon;
                    return (
                      <motion.article
                        key={tool.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        whileHover={{
                          y: -4,
                          boxShadow: effectiveLight
                            ? `0 18px 36px rgba(0,0,0,0.14), 0 0 0 1px ${tool.accentHex}30, inset 0 1px 0 rgba(255,255,255,0.6)`
                            : `0 18px 52px rgba(0,0,0,0.52), 0 0 24px ${tool.accentHex}25, inset 0 1px 0 rgba(255,255,255,0.05)`,
                        }}
                        className="rounded-2xl overflow-hidden transition-all duration-200 md:min-h-0 md:flex md:flex-col"
                        style={{
                          background: panelBg,
                          backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
                          WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
                          border: panelBorder,
                          boxShadow: panelShadow,
                        }}
                      >
                        <Link href={tool.path} className="p-3 sm:p-4 md:p-4 flex flex-col md:min-h-0 md:flex-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 rounded-2xl">
                          <div
                            className="h-[2px] opacity-70 -mx-3 sm:-mx-4 md:-mx-4 mb-3"
                            style={{ background: `linear-gradient(90deg, transparent, ${tool.accentHex}, transparent)` }}
                            aria-hidden
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                              style={{ background: `${tool.accentHex}20`, color: tool.accentHex }}
                            >
                              <Icon size={18} strokeWidth={2} className="md:w-4 md:h-4" />
                            </span>
                            <h3 className={`font-bold text-base sm:text-lg md:text-base leading-tight tracking-tight ${effectiveLight ? "text-neutral-900" : "text-white"}`}>
                              {tool.labelJa}
                            </h3>
                          </div>
                          <p
                            className={`mt-2 text-xs sm:text-sm md:text-xs ${
                              tool.lpSpan === "large" ? "line-clamp-3 md:line-clamp-4" : "line-clamp-2 md:line-clamp-3"
                            } leading-normal w-full flex-1 min-h-0 ${effectiveLight ? "text-neutral-500" : "text-white/60"}`}
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
                          <span className={`mt-2 text-sm self-end opacity-0 transition-all duration-200 group-hover:opacity-100 ${effectiveLight ? "text-neutral-500 group-hover:text-neutral-700" : "text-white/40 group-hover:text-white/70"}`}>
                            →
                          </span>
                        </Link>
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <section className="w-full max-w-5xl mx-auto mt-16 md:mt-24 mb-4" aria-labelledby="lp-strength-heading">
          <h2
            id="lp-strength-heading"
            className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}
          >
            すぐ使える理由
          </h2>
          <div className="flex flex-wrap gap-2.5 md:gap-3">
            {["完全無料", "登録不要", "スマホ対応（PWA）"].map((point) => (
              <span
                key={point}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold ${
                  effectiveLight ? "bg-black/5 text-neutral-700" : "bg-white/10 text-white/85"
                }`}
              >
                <Check size={14} className="mr-1.5 shrink-0" aria-hidden />
                {point}
              </span>
            ))}
          </div>
        </section>

        <div className="w-full max-w-5xl mx-auto mt-8">
          <div
            className={`mx-auto w-fit flex items-center justify-center gap-1 rounded-xl p-1 ${effectiveLight ? "bg-black/6" : "bg-white/5"}`}
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
          <div className="mt-3 flex justify-center">
            <PwaInstallChip effectiveLight={effectiveLight} />
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto mt-20 md:mt-32">
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>
            サポート情報
          </h2>
        </div>

        {/* FAQ: 一段で「よくある質問」のみ表示→開くとカテゴリ→二段でカテゴリ開くと Q/A */}
        <section
          className="w-full max-w-2xl mx-auto mt-2 rounded-2xl overflow-hidden shrink-0"
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

        <footer className="w-full max-w-5xl mx-auto mt-12 md:mt-16 pb-4 text-center">
          <div
            className={`h-px w-full mb-5 bg-gradient-to-r ${effectiveLight ? "from-transparent via-black/15 to-transparent" : "from-transparent via-white/20 to-transparent"}`}
            aria-hidden
          />
          <div className="text-xs sm:text-sm flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
            <Link
              href="/terms"
              className={`underline-offset-2 transition-colors ${effectiveLight ? "text-neutral-500 hover:text-neutral-800" : "text-white/45 hover:text-white/80"}`}
            >
              利用規約
            </Link>
            <span className={effectiveLight ? "text-neutral-300" : "text-white/25"} aria-hidden>
              |
            </span>
            <Link
              href="/privacy-policy"
              className={`underline-offset-2 transition-colors ${effectiveLight ? "text-neutral-500 hover:text-neutral-800" : "text-white/45 hover:text-white/80"}`}
            >
              プライバシーポリシー
            </Link>
            <span className={effectiveLight ? "text-neutral-300" : "text-white/25"} aria-hidden>
              |
            </span>
            <Link
              href="https://x.com/dukegomadango"
              target="_blank"
              rel="noopener noreferrer"
              className={`underline-offset-2 transition-colors ${effectiveLight ? "text-neutral-500 hover:text-neutral-800" : "text-white/45 hover:text-white/80"}`}
            >
              運営者情報
            </Link>
          </div>
          <p className={`mt-3 text-[11px] sm:text-xs ${effectiveLight ? "text-neutral-400" : "text-white/35"}`}>© 2026 だんごツール</p>
        </footer>
      </main>
      <DataLinkModal isOpen={dataLinkOpen} onClose={() => setDataLinkOpen(false)} isLightMode={effectiveLight} />
    </div>
  );
}
