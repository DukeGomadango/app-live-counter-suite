"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Sun, Moon, ArrowRight, Heart } from "lucide-react";
import { motion } from "framer-motion";
import Lenis from "lenis";

// Components
import ErrorBoundary from "@/components/ErrorBoundary";
import DangoOrb2D from "./landing/components/DangoOrb2D";
import ModeSelector from "@/components/ModeSelector";
import DataLinkModal from "@/components/DataLinkModal";
import PwaInstallChip from "@/components/PwaInstallChip";
import { LpFaq } from "./landing/components/LpFaq";
import { LpChangelog } from "./landing/components/LpChangelog";

// Phase 2 & 3 Components
import WelcomeLoader from "./landing/components/WelcomeLoader";
import StreamConsole from "./landing/components/StreamConsole";
import BentoGrid from "./landing/components/BentoGrid";
import ToolRotator from "./landing/components/ToolRotator";
import BenefitCards from "./landing/components/BenefitCards";
import LpCustomCursor from "./landing/components/LpCustomCursor";

// Hooks
import { useLpState } from "./landing/hooks/useLpState";
import { useTheme } from "@/context/ThemeContext";

// Dynamic import for 3D Orb to disable SSR (essential for react-three-fiber Canvas)
const DangoOrb3D = dynamic(() => import("./landing/components/DangoOrb3D"), {
  ssr: false,
});

/* ───── Animated hero text: character-by-character stagger ───── */

function AnimatedHeroLine({ text, className, delay = 0, gradient = false }: { text: string; className?: string; delay?: number; gradient?: boolean }) {
  const chars = useMemo(() => text.split(""), [text]);
  const scale = 2; // Gradient width is 200% of the entire word
  const S = Math.max(scale * chars.length, 2); // Multiplier for background-size
  const deltaP = (100 * chars.length) / (S - 1); // Percentage shift to move background by exactly 1 word width
  
  return (
    <span className={className}>
      {chars.map((char, i) => {
        const bgPosX = (100 * i) / (S - 1); // Offset for this specific character
        
        // Use Tailwind for colors, but handle size and animation in JS
        const gradientClass = gradient ? "bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent" : "";
        const gradientStyle = gradient ? {
          backgroundSize: `${S * 100}% 200%`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent"
        } : {};

        return (
          <motion.span
            key={`${i}-${char}`}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={gradient ? { 
              opacity: 1, 
              y: 0, 
              filter: "blur(0px)",
              backgroundPosition: [`${bgPosX}% 50%`, `${bgPosX + deltaP}% 50%`, `${bgPosX}% 50%`]
            } : {
              opacity: 1, 
              y: 0, 
              filter: "blur(0px)"
            }}
            transition={{
              opacity: { duration: 0.5, delay: delay + i * 0.03, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 0.5, delay: delay + i * 0.03, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 0.5, delay: delay + i * 0.03, ease: [0.16, 1, 0.3, 1] },
              backgroundPosition: { duration: 6, ease: "easeInOut", repeat: Infinity }
            }}
            className={`inline-block ${gradientClass}`}
            style={{ 
              willChange: "opacity, transform",
              ...gradientStyle
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        );
      })}
    </span>
  );
}

/* ───── Scroll Progress Bar ───── */

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const wrapper = document.querySelector(".overflow-y-auto") as HTMLElement | null;
    if (!wrapper) return;

    const handleScroll = () => {
      const scrollTop = wrapper.scrollTop;
      const scrollHeight = wrapper.scrollHeight - wrapper.clientHeight;
      if (scrollHeight > 0) {
        setProgress(Math.min(scrollTop / scrollHeight, 1));
      }
    };

    wrapper.addEventListener("scroll", handleScroll, { passive: true });
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="lp-scroll-progress"
      style={{ width: `${progress * 100}%` }}
      aria-hidden="true"
    />
  );
}

export default function LandingPage() {
  const lp = useLpState();
  const { isLightMode, toggleTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [isOrbCreated, setIsOrbCreated] = useState(false);
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  // Detect WebGL support immediately after mount on client
  useEffect(() => {
    let frameId: number;
    try {
      const canvas = document.createElement("canvas");
      const support = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
      frameId = requestAnimationFrame(() => {
        setHasWebGL(support);
      });
    } catch {
      frameId = requestAnimationFrame(() => {
        setHasWebGL(false);
      });
    }
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  // Safe loader bypass when WebGL is unsupported
  useEffect(() => {
    if (hasWebGL === false) {
      const frameId = requestAnimationFrame(() => {
        setIsOrbCreated(true);
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [hasWebGL]);

  // Resize handler to toggle desktop vs mobile layout dynamically
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize Lenis smooth scroll on Desktop only to safeguard mobile CPU
  useEffect(() => {
    if (isMobile) return;
    const wrapper = document.querySelector(".overflow-y-auto");
    if (!wrapper) return;
    
    const lenisInstance = new Lenis({
      wrapper: wrapper as HTMLElement,
      content: document.querySelector(".lp-root") as HTMLElement || undefined,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    
    function raf(time: number) {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    
    return () => {
      lenisInstance.destroy();
    };
  }, [isMobile]);

  // Intersection Observer for section accent line animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const line = entry.target.querySelector(".lp-accent-line");
          if (line) {
            if (entry.isIntersecting) {
              line.classList.add("is-visible");
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Sync count changes from interactive HUD console to pulse the 3D Orb
  const handleCountChange = () => {
    setPulseTrigger((prev) => prev + 1);
  };

  const panelBg = isLightMode
    ? "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.84) 100%)"
    : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
  const panelBorder = isLightMode ? "1px solid rgba(15,23,42,0.12)" : "1px solid rgba(255,255,255,0.1)";
  const panelShadow = isLightMode
    ? "0 8px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"
    : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";

  const headerBg = isLightMode ? "rgba(255,255,255,0.75)" : "rgba(10,5,30,0.55)";
  const glassBorder = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";

  return (
    <div ref={containerRef} className="lp-root min-h-screen flex flex-col relative overflow-x-hidden select-none bg-transparent font-[family-name:var(--font-outfit)]">
      
      {/* Global backdrop 3D Orb for scroll-synchronized interactive camerawork */}
      {hasWebGL !== false && (
        <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
          <ErrorBoundary fallback={null}>
            <DangoOrb3D
              pulseTrigger={pulseTrigger}
              isMobile={isMobile}
              onCreated={() => setIsOrbCreated(true)}
              eventSource={containerRef}
            />
          </ErrorBoundary>
        </div>
      )}
      
      {/* Scroll progress bar */}
      <ScrollProgressBar />

      {/* Custom cursor (PC only, LP only) */}
      {!isMobile && <LpCustomCursor />}

      {/* Welcome loading screen (session-aware loader) */}
      <WelcomeLoader 
        isLoadedTrigger={isOrbCreated} 
        onFadeOutComplete={() => {}}
      />

      {/* Modern navigation header */}
      <header 
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b backdrop-blur-xl shrink-0" 
        style={{ background: headerBg, borderBottomColor: glassBorder }}
      >
        <div className="flex items-center gap-4">
          <ModeSelector isLightMode={isLightMode} />
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/counter" 
            className={`rounded-2xl px-5 py-2 text-xs font-black transition-all duration-300 transform active:scale-95 shadow-[0_4px_20px_rgba(168,85,247,0.25)] ${
              lp.showHeaderCta ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 -translate-y-2 scale-90 pointer-events-none"
            } bg-purple-600 hover:bg-purple-500 text-white`}
          >
            今すぐ使う
          </Link>
          
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-2xl border flex items-center gap-2 cursor-pointer transition-all duration-300 bg-white/5 border-white/10 text-white hover:bg-white/10`}
            aria-label="テーマ切り替え"
          >
            {isLightMode ? (
              <Sun size={18} className="text-yellow-400 animate-spin-slow" />
            ) : (
              <Moon size={18} className="text-purple-400" />
            )}
          </button>
        </div>
      </header>

      {/* Decorative backdrop gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 md:opacity-55" aria-hidden>
        <div className="absolute top-[5%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-purple-500/10 blur-[130px]" />
        <div className="absolute top-[40%] right-[-15%] w-[40rem] h-[40rem] rounded-full bg-blue-500/10 blur-[150px]" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center">
        
        {/* ================= HERO SECTION ================= */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-8 md:pt-16 pb-16 md:pb-24 grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[85vh] relative">
          
          {/* Mobile Background 3D Orb layering */}
          {isMobile && hasWebGL === false && (
            <div className="absolute inset-0 w-full h-full z-0 opacity-55 pointer-events-none flex items-center justify-center">
              <DangoOrb2D pulseTrigger={pulseTrigger} />
            </div>
          )}

          {/* Copywrite and Interactive HUD details */}
          <div className="col-span-1 md:col-span-7 flex flex-col justify-center text-center md:text-left z-10">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs font-black tracking-[0.2em] text-purple-400 uppercase mb-3 block"
            >
              100% Free &amp; No Setup Required
            </motion.span>
            <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight font-[family-name:var(--font-plus-jakarta)] mb-6 transition-colors duration-300 ${isLightMode ? "text-slate-900" : "text-white"}`}>
              <AnimatedHeroLine text="配信をもっと身近に、" delay={0.3} />
              <br className="hidden sm:inline" />
              <AnimatedHeroLine text="リスナーともっと近くに。" delay={0.6} gradient={true} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className={`text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-medium mb-8 transition-colors duration-300 ${isLightMode ? "text-slate-600" : "text-zinc-400"}`}
            >
              人数カウントからガチャ演出まで、ブラウザひとつで今日の配信枠に「楽しい」をプラスする。完全無料・登録不要のクリエイターツールキット。
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="flex flex-wrap justify-center md:justify-start gap-4 mb-10"
            >
              <button
                onClick={() => {
                  const target = document.getElementById("main-tools");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 rounded-2xl bg-white text-black font-extrabold text-base sm:text-lg shadow-xl shadow-white/5 flex items-center gap-2 hover:bg-zinc-200 transition-all active:scale-98 cursor-pointer lp-cursor-cta"
              >
                無料で使ってみる <ArrowRight size={18} />
              </button>
              <button
                onClick={() => {
                  const target = document.getElementById("other-tools");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 rounded-2xl bg-zinc-900 border border-white/10 text-white font-extrabold text-base sm:text-lg hover:bg-zinc-800 transition-all active:scale-98 cursor-pointer"
              >
                その他の機能を見る
              </button>
            </motion.div>

            {/* Embedded interactive StreamConsole HUD */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.4 }}
              className="w-full"
            >
              <StreamConsole 
                onCountChange={handleCountChange} 
                isMobile={isMobile}
              />
            </motion.div>
          </div>

          {/* PC Desktop 3D Canvas rendering */}
          {!isMobile && (
            <div className="col-span-1 md:col-span-5 w-full h-[400px] md:h-[600px] z-10 flex items-center justify-center relative">
              {hasWebGL === false && (
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                  <DangoOrb2D pulseTrigger={pulseTrigger} />
                </div>
              )}
              
              {/* Overlay badge for interactive visual cues */}
              {hasWebGL !== false && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 2.0 }}
                  className="absolute bottom-6 right-6 p-4 rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-md pointer-events-none flex flex-col gap-1 items-end"
                >
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Interactive WebGL</span>
                  <span className="text-xs text-zinc-400 font-bold">Try clicking counter to pulse</span>
                </motion.div>
              )}
            </div>
          )}
        </section>

        {/* Divider accent */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent my-4" />

        {/* ================= SECTION 1: BENEFITS (Unique value props) ================= */}
        <section
          id="benefits"
          className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24"
          ref={(el) => { sectionRefs.current[0] = el; }}
        >
          <div className="mb-12 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Stream optimized</span>
            <h2 className={`text-2xl sm:text-4xl font-black mt-2 font-[family-name:var(--font-plus-jakarta)] transition-colors duration-300 ${isLightMode ? "text-slate-900" : "text-white"}`}>
              なぜ「だんごツール」が選ばれるのか？
            </h2>
            <div className="lp-accent-line h-[2px] w-16 mt-3 rounded-full" style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }} />
          </div>
          <BenefitCards isMobile={isMobile} />
        </section>

        {/* Divider accent */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent my-4" />

        {/* ================= SECTION 2: 3 MAJOR TOOLS BENTO GRID ================= */}
        <section
          id="main-tools"
          className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24"
          ref={(el) => { sectionRefs.current[1] = el; }}
        >
          <div className="mb-12 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Core Toolkit</span>
            <h2 className={`text-2xl sm:text-4xl font-black mt-2 font-[family-name:var(--font-plus-jakarta)] transition-colors duration-300 ${isLightMode ? "text-slate-900" : "text-white"}`}>
              もっとも使われる3大配信ツール
            </h2>
            <div className="lp-accent-line h-[2px] w-16 mt-3 rounded-full" style={{ background: "linear-gradient(90deg, #60a5fa, #06b6d4)" }} />
          </div>
          <BentoGrid isMobile={isMobile} />
        </section>

        {/* Divider accent */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent my-4" />

        {/* ================= SECTION 3: OTHER 6 TOOLS ================= */}
        <section
          id="other-tools"
          className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24"
          ref={(el) => { sectionRefs.current[2] = el; }}
        >
          <div className="mb-12 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Extra Utilities</span>
            <h2 className={`text-2xl sm:text-4xl font-black mt-2 font-[family-name:var(--font-plus-jakarta)] transition-colors duration-300 ${isLightMode ? "text-slate-900" : "text-white"}`}>
              配信を支える他6種のユーティリティ
            </h2>
            <div className="lp-accent-line h-[2px] w-16 mt-3 rounded-full" style={{ background: "linear-gradient(90deg, #34d399, #22c55e)" }} />
          </div>
          <ToolRotator isMobile={isMobile} />
        </section>

        {/* ================= SUPPORT SECTIONS ================= */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent my-10" />

        <section className="w-full max-w-4xl mx-auto px-6 py-8 flex flex-col items-center">
          <PwaInstallChip effectiveLight={isLightMode} />
        </section>

        {/* FAQ Area */}
        <section className="w-full max-w-4xl mx-auto px-6 py-8">
          <LpFaq 
            sectionOpen={lp.faqSectionOpen} 
            onSectionToggle={() => lp.setFaqSectionOpen(!lp.faqSectionOpen)} 
            categoryOpenIndex={lp.faqCategoryOpenIndex} 
            onCategoryToggle={lp.setFaqCategoryOpenIndex} 
            questionOpenKey={lp.faqQuestionOpenKey} 
            onQuestionToggle={lp.setFaqQuestionOpenKey} 
            effectiveLight={isLightMode} 
            panelBg={panelBg} 
            panelBorder={panelBorder} 
            panelShadow={panelShadow} 
            accentColor="#a855f7" 
          />
        </section>

        {/* Changelog Area */}
        <section className="w-full max-w-4xl mx-auto px-6 py-8 mb-16">
          <LpChangelog 
            open={lp.changelogOpen} 
            onToggle={() => lp.setChangelogOpen(!lp.changelogOpen)} 
            effectiveLight={isLightMode} 
            panelBg={panelBg} 
            panelBorder={panelBorder} 
            panelShadow={panelShadow} 
            accentColor="#a855f7" 
          />
        </section>

        {/* Global Footer */}
        <footer className={`w-full border-t py-12 shrink-0 transition-colors duration-300 ${isLightMode ? "border-slate-200 bg-white/60" : "border-white/5 bg-zinc-950/60"}`}>
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-zinc-500 font-bold">
              <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
              <span>|</span>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
              <span>|</span>
              <Link href="https://x.com/dukegomadango" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">運営者情報</Link>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
              <p className="text-xs text-zinc-500 font-bold flex items-center gap-1">
                Made with <Heart size={10} className="text-pink-500 fill-pink-500" /> by DukeGomadango
              </p>
              <p className="text-[11px] text-zinc-600 font-bold">
                © 2026 だんごツール. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </main>
      
      {/* Modals */}
      <DataLinkModal 
        isOpen={lp.dataLinkOpen} 
        onClose={() => lp.setDataLinkOpen(false)} 
        isLightMode={isLightMode} 
      />
    </div>
  );
}
