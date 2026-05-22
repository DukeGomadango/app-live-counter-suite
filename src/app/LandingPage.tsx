"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sun, Moon, LayoutGrid, List, Check, ArrowRight } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import DataLinkModal from "@/components/DataLinkModal";
import PwaInstallChip from "@/components/PwaInstallChip";
import { TOOLS_BY_CATEGORY } from "@/lib/tools";
import { SITE_CONFIG } from "@/lib/site";
import { useTheme } from "@/context/ThemeContext";

// Hooks
import { useLpState } from "./landing/hooks/useLpState";

// Components
import { LpFaq } from "./landing/components/LpFaq";
import { LpChangelog } from "./landing/components/LpChangelog";

const LP_ACCENT = "#a855f7";

type UseCase = {
  title: string;
  body: string;
  toolPath: string;
  toolLabel: string;
};

const USE_CASES: UseCase[] = [
  { title: "耐久配信の進行管理に", body: "人数カウンターで到達人数や目標値をすぐ更新できます。", toolPath: "/counter", toolLabel: "人数カウンター" },
  { title: "参加型企画の集計に", body: "チャートで加算・減算を視覚的にまとめられます。", toolPath: "/flowchart", toolLabel: "チャート" },
  { title: "演出企画の盛り上げに", body: "ガチャやルーレットで配信中の抽選演出を作れます。", toolPath: "/gacha", toolLabel: "ガチャ" },
];

export default function LandingPage() {
  const lp = useLpState();
  const { isLightMode, toggleTheme } = useTheme();
  const effectiveLight = isLightMode;

  const panelBg = effectiveLight
    ? "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.84) 100%)"
    : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
  const panelBorder = effectiveLight ? "1px solid rgba(15,23,42,0.12)" : "1px solid rgba(255,255,255,0.1)";
  const panelShadow = effectiveLight
    ? "0 8px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"
    : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";

  const headerBg = effectiveLight ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";
  const glassBorder = effectiveLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col relative">
      <header className="relative shrink-0 z-50 flex items-center justify-between px-3 py-2 min-h-[52px]" style={{ background: headerBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${glassBorder}` }}>
        <ModeSelector isLightMode={effectiveLight} />
        <div className="flex items-center gap-2">
          <Link href="/counter" className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${lp.showHeaderCta ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"} ${effectiveLight ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-purple-500 text-white hover:bg-purple-400"}`}>今すぐ使う</Link>
          <button
                onClick={toggleTheme}
                className={`p-3 rounded-2xl border flex items-center gap-2 dango-btn-tier3 ${
                    isLightMode
                        ? "bg-white border-gray-200 text-gray-700"
                        : "bg-white/5 border-white/10 text-white"
                }`}
                style={{ "--btn-glow-color": isLightMode ? "rgba(234,179,8,0.3)" : "rgba(168,85,247,0.3)" } as React.CSSProperties}
                aria-label="テーマ切り替え"
            >
                {isLightMode ? (
                    <>
                        <Sun size={20} className="text-yellow-500" />
                        <span className="text-sm font-medium">ライト</span>
                    </>
                ) : (
                    <>
                        <Moon size={20} className="text-purple-400" />
                        <span className="text-sm font-medium">ダーク</span>
                    </>
                )}
            </button>
        </div>
      </header>

      <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${effectiveLight ? "mix-blend-multiply opacity-10" : "opacity-80"}`} aria-hidden>
        <motion.div animate={{ x: [0, 60, -30, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.85, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full blur-[100px]" style={{ background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 70%)`, opacity: effectiveLight ? 0.32 : 0.6 }} />
        <motion.div animate={{ x: [0, -60, 30, 0], y: [0, 60, -30, 0], scale: [1, 0.85, 1.15, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[120px]" style={{ background: `radial-gradient(circle, ${LP_ACCENT} 0%, transparent 60%)`, opacity: effectiveLight ? 0.24 : 0.5 }} />
      </div>

      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center px-4 md:px-3 pb-14 md:pb-6 md:overflow-y-auto scroll-touch custom-scrollbar">
        <header className="w-full max-w-5xl mx-auto mt-8 md:mt-12 px-2 sm:px-3 py-2 sm:py-3 text-center md:text-left shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
            <div className="flex flex-col justify-center">
              <p className={`text-xs font-semibold tracking-wide ${effectiveLight ? "text-neutral-500" : "text-white/55"}`}>{SITE_CONFIG.name}</p>
              <h1 className="mt-2 text-3xl sm:text-4xl md:text-4xl font-black leading-tight" style={{ color: LP_ACCENT, textShadow: `0 0 24px ${LP_ACCENT}50` }}>あなたの配信を、<br />もっと面白く、もっと直感的に。</h1>
              <p className={`mt-3 text-sm sm:text-base font-medium max-w-xl ${effectiveLight ? "text-neutral-600" : "text-white/75"}`}>完全無料・登録不要。人数管理、抽選演出、進行管理をブラウザだけで今すぐ始められます。</p>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                <button
                    onClick={() => {
                        const target = document.getElementById("features");
                        target?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-8 py-4 rounded-2xl bg-teal-500 text-white font-bold text-lg shadow-xl shadow-teal-500/20 flex items-center gap-2 dango-btn-tier1"
                    style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
                >
                    無料で使ってみる <ArrowRight size={20} />
                </button>
                <button
                    onClick={() => {
                        const target = document.getElementById("use-cases");
                        target?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg border dango-btn-tier3 ${
                        isLightMode
                            ? "bg-white/80 border-gray-200 text-gray-700"
                            : "bg-white/5 border-white/10 text-white"
                    }`}
                    style={{ "--btn-glow-color": "rgba(255,255,255,0.2)" } as React.CSSProperties}
                >
                    機能を見る
                </button>
              </div>
            </div>
            <div className="rounded-2xl p-3 sm:p-4 bg-transparent">
              <p className={`text-xs font-medium ${effectiveLight ? "text-neutral-500" : "text-white/60"}`}>ライブプレビュー</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="col-span-2 rounded-xl p-3" style={{ background: "linear-gradient(135deg, #a855f730, transparent)" }}><p className={`text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>人数カウンター</p><p className="text-2xl font-black text-purple-400 tracking-wide">1,248</p></div>
                <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #60a5fa30, transparent)" }}><p className={`text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>チャート</p><p className="text-sm font-bold text-blue-300">+300 / -120</p></div>
                <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #facc1530, transparent)" }}><p className={`text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>ガチャ</p><p className="text-sm font-bold text-yellow-300">SSR 3.0%</p></div>
              </div>
            </div>
          </div>
        </header>

        <section id="use-cases" className="w-full max-w-5xl mx-auto mt-14 md:mt-20 scroll-mt-20" aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>ユースケース</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {USE_CASES.map((useCase) => (
              <article key={useCase.title} className="p-1 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="relative h-7 w-7 shrink-0"><span className="absolute inset-0 rounded-full blur-md opacity-45" style={{ background: useCase.toolPath === "/counter" ? "#a855f7" : useCase.toolPath === "/flowchart" ? "#60a5fa" : "#facc15" }} /><span className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: useCase.toolPath === "/counter" ? "#a855f7" : useCase.toolPath === "/flowchart" ? "#60a5fa" : "#facc15" }} /></span>
                  <h3 className={`text-sm font-bold ${effectiveLight ? "text-neutral-900" : "text-white"}`}>{useCase.title}</h3>
                  <p className={`text-xs leading-relaxed max-w-[20rem] ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>{useCase.body}</p>
                </div>
                <Link
                    href={useCase.toolPath}
                    className={`mt-3 inline-flex items-center justify-center rounded-lg py-1 px-2 text-xs font-medium dango-btn-tier3 ${
                        effectiveLight
                            ? "text-neutral-700 hover:bg-black/7"
                            : "text-white/80 hover:bg-white/10"
                    }`}
                    style={{ "--btn-glow-color": "currentColor" } as React.CSSProperties}
                >
                    {useCase.toolLabel}を見る →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <div className="w-full max-w-5xl mx-auto mt-16 md:mt-24 h-[1px] opacity-40" style={{ background: `linear-gradient(90deg, transparent, ${LP_ACCENT}, transparent)` }} aria-hidden />

        <div id="features" className="w-full max-w-4xl mx-auto mt-14 md:mt-16 py-6 md:py-8 space-y-10 scroll-mt-20">
          {(["tools", "games"] as const).map((cat) => (
            <section key={cat} aria-labelledby={`${lp.effectiveLayout}-heading-${cat}`}>
              <h2 id={`${lp.effectiveLayout}-heading-${cat}`} className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>{cat === "tools" ? "ツール" : "ゲーム"}</h2>
              <div className={lp.effectiveLayout === "strip" ? "flex flex-wrap justify-center gap-4 md:gap-5" : "grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 md:[grid-auto-rows:minmax(0,1fr)]"}>
                {[...TOOLS_BY_CATEGORY[cat]].sort((a, b) => a.lpPriority - b.lpPriority).map((tool, i) => {
                  const Icon = tool.icon;
                  return lp.effectiveLayout === "strip" ? (
                    <motion.div key={tool.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }}>
                      <Link href={tool.path} className={`flex items-center gap-4 rounded-2xl px-5 py-4 md:px-6 md:py-4 transition-all duration-200 hover:scale-[1.02] ${effectiveLight ? "hover:bg-white/90 text-neutral-800" : "hover:bg-white/10 text-white"}`} style={{ background: effectiveLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: effectiveLight ? "1px solid rgba(0,0,0,0.06)" : `1px solid ${tool.accentHex}25` }}>
                        <span className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ background: `${tool.accentHex}25`, color: tool.accentHex }}><Icon size={22} strokeWidth={2} className="md:w-6 md:h-6" /></span>
                        <span className="font-semibold text-base md:text-lg whitespace-nowrap">{tool.labelJa}</span>
                        <span className={`text-sm ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>使ってみる</span>
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.article
                      key={tool.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
                      whileHover={{ y: -4, boxShadow: effectiveLight ? `0 18px 36px rgba(0,0,0,0.14), 0 0 0 1px ${tool.accentHex}30, inset 0 1px 0 rgba(255,255,255,0.6)` : `0 18px 52px rgba(0,0,0,0.52), 0 0 24px ${tool.accentHex}25, inset 0 1px 0 rgba(255,255,255,0.05)` }}
                      className="rounded-2xl overflow-hidden transition-all duration-200 md:min-h-0 md:flex md:flex-col" style={{ background: panelBg, backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)", WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)", border: panelBorder, boxShadow: panelShadow }}
                    >
                      <Link href={tool.path} className="p-3 sm:p-4 md:p-4 flex flex-col md:min-h-0 md:flex-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 rounded-2xl">
                        <div className="h-[2px] opacity-70 -mx-3 sm:-mx-4 md:-mx-4 mb-3" style={{ background: `linear-gradient(90deg, transparent, ${tool.accentHex}, transparent)` }} aria-hidden />
                        <div className="flex items-center gap-2 shrink-0"><span className="shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center" style={{ background: `${tool.accentHex}20`, color: tool.accentHex }}><Icon size={18} strokeWidth={2} className="md:w-4 md:h-4" /></span><h3 className={`font-bold text-base sm:text-lg md:text-base leading-tight tracking-tight ${effectiveLight ? "text-neutral-900" : "text-white"}`}>{tool.labelJa}</h3></div>
                        <p className={`mt-2 text-xs sm:text-sm md:text-xs line-clamp-2 md:line-clamp-3 leading-normal w-full flex-1 min-h-0 ${effectiveLight ? "text-neutral-500" : "text-white/60"}`} style={{ lineBreak: "strict" }}>{tool.description}</p>
                        <span className={`mt-2 text-sm self-end opacity-0 transition-all duration-200 group-hover:opacity-100 ${effectiveLight ? "text-neutral-500 group-hover:text-neutral-700" : "text-white/40 group-hover:text-white/70"}`}>→</span>
                      </Link>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="w-full max-w-5xl mx-auto mt-16 md:mt-24 mb-4" aria-labelledby="lp-strength-heading">
          <h2 id="lp-strength-heading" className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>すぐ使える理由</h2>
          <div className="flex flex-wrap gap-2.5 md:gap-3">{["完全無料", "登録不要", "スマホ対応（PWA）"].map((point) => (<span key={point} className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs md:text-sm font-semibold ${effectiveLight ? "bg-black/5 text-neutral-700" : "bg-white/10 text-white/85"}`}><Check size={14} className="mr-1.5 shrink-0" />{point}</span>))}</div>
        </section>

        <div className="w-full max-w-5xl mx-auto mt-8">
          <div className={`mx-auto w-fit flex items-center justify-center gap-1 rounded-xl p-1 ${effectiveLight ? "bg-black/6" : "bg-white/5"}`} role="tablist" aria-label="ツールの表示">
            <button type="button" onClick={() => lp.setLayoutMode("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 dango-btn-tier3 ${lp.effectiveLayout === "cards" ? (effectiveLight ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : (effectiveLight ? "text-neutral-500 hover:bg-black/8" : "text-white/50 hover:bg-white/10")}`} style={{ "--btn-glow-color": "rgba(168,85,247,0.3)" } as React.CSSProperties} aria-pressed={lp.effectiveLayout === "cards"} aria-label="カード表示"><LayoutGrid size={14} />カード</button>
            <button type="button" onClick={() => lp.setLayoutMode("strip")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 dango-btn-tier3 ${lp.effectiveLayout === "strip" ? (effectiveLight ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : (effectiveLight ? "text-neutral-500 hover:bg-black/8" : "text-white/50 hover:bg-white/10")}`} style={{ "--btn-glow-color": "rgba(168,85,247,0.3)" } as React.CSSProperties} aria-pressed={lp.effectiveLayout === "strip"} aria-label="ストリップ表示"><List size={14} />ストリップ</button>
          </div>
          <div className="mt-3 flex justify-center"><PwaInstallChip effectiveLight={effectiveLight} /></div>
        </div>

        <div className="w-full max-w-5xl mx-auto mt-20 md:mt-32"><h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>サポート情報</h2></div>

        <LpFaq sectionOpen={lp.faqSectionOpen} onSectionToggle={() => lp.setFaqSectionOpen(!lp.faqSectionOpen)} categoryOpenIndex={lp.faqCategoryOpenIndex} onCategoryToggle={lp.setFaqCategoryOpenIndex} questionOpenKey={lp.faqQuestionOpenKey} onQuestionToggle={lp.setFaqQuestionOpenKey} effectiveLight={effectiveLight} panelBg={panelBg} panelBorder={panelBorder} panelShadow={panelShadow} accentColor={LP_ACCENT} />

        <LpChangelog open={lp.changelogOpen} onToggle={() => lp.setChangelogOpen(!lp.changelogOpen)} effectiveLight={effectiveLight} panelBg={panelBg} panelBorder={panelBorder} panelShadow={panelShadow} accentColor={LP_ACCENT} />

        <footer className="w-full max-w-5xl mx-auto mt-12 md:mt-16 pb-4 text-center">
          <div className={`h-px w-full mb-5 bg-gradient-to-r ${effectiveLight ? "from-transparent via-black/15 to-transparent" : "from-transparent via-white/20 to-transparent"}`} aria-hidden />
          <div className="text-xs sm:text-sm flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
            <Link href="/terms" className={`underline-offset-2 transition-colors ${effectiveLight ? "text-neutral-500 hover:text-neutral-800" : "text-white/45 hover:text-white/80"}`}>利用規約</Link>
            <span className={effectiveLight ? "text-neutral-300" : "text-white/25"}>|</span>
            <Link href="/privacy-policy" className={`underline-offset-2 transition-colors ${effectiveLight ? "text-neutral-500 hover:text-neutral-800" : "text-white/45 hover:text-white/80"}`}>プライバシーポリシー</Link>
            <span className={effectiveLight ? "text-neutral-300" : "text-white/25"}>|</span>
            <Link href="https://x.com/dukegomadango" target="_blank" rel="noopener noreferrer" className={`underline-offset-2 transition-colors ${effectiveLight ? "text-neutral-500 hover:text-neutral-800" : "text-white/45 hover:text-white/80"}`}>運営者情報</Link>
          </div>
          <p className={`mt-3 text-[11px] sm:text-xs ${effectiveLight ? "text-neutral-400" : "text-white/35"}`}>© 2026 だんごツール</p>
        </footer>
      </main>
      <DataLinkModal isOpen={lp.dataLinkOpen} onClose={() => lp.setDataLinkOpen(false)} isLightMode={effectiveLight} />
    </div>
  );
}
