"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ErrorBoundary";
import DangoOrb2D from "../landing/components/DangoOrb2D";

// Dynamic import for 3D Orb to disable SSR (essential for react-three-fiber Canvas)
const DangoOrb3D = dynamic(() => import("../landing/components/DangoOrb3D"), {
  ssr: false,
});

export default function OgTemplatePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsMounted(true);
      // WebGLの利用可否をクライアントサイドで検出
      try {
        const canvas = document.createElement("canvas");
        const support = !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
        setHasWebGL(support);
      } catch {
        setHasWebGL(false);
      }
    });

    // Force dark mode styles on body/document for exact look
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.body.classList.remove("light-mode");

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div className="w-full min-h-screen bg-[#03010a] flex items-center justify-center font-[family-name:var(--font-outfit)] overflow-hidden select-none">
      {/* 共通レイアウトに配置されているデバッグツールやヘルプボタンなどのグローバルfixed要素をこのページでのみ完全に消し去る */}
      <style dangerouslySetInnerHTML={{ __html: `
        header, dango-header, footer, [title="使い方を見る"], #vercel-web-analytics, [id^="vercel-"], .vercel-toolbar, next-route-announcer, nextjs-portal, vercel-live-feedback, body > [class*="vercel"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* アプローチB: ほのかなサイバーテック感のための背景グリッド */
        .ogp::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(168, 85, 247, 0.09) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.09) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(circle at 75% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%);
          -webkit-mask-image: radial-gradient(circle at 75% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%);
          pointer-events: none;
          z-index: 1;
        }
      `}} />

      {/* Target element captured by Puppeteer */}
      <div
        ref={containerRef}
        className="ogp w-[1200px] h-[630px] bg-[#060214] relative overflow-hidden flex items-center justify-between px-16 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
        style={{
          background: "radial-gradient(circle at 75% 50%, #17093b 0%, #060214 70%)",
        }}
      >
        {/* Background neon ambient orb glows */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[450px] h-[450px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
        
        {/* Floating Cyber Watermark Tool Icons (視認性を上げつつ、品を保つ不透明度約10%に調整) */}
        {/* 1. ガチャを象徴するテクニカル・スター */}
        <svg 
          className="absolute top-[8%] left-[45%] w-24 h-24 text-purple-400/11 rotate-[15deg] pointer-events-none select-none z-0" 
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          <circle cx="12" cy="12" r="3" strokeDasharray="1 1" />
        </svg>

        {/* 2. ルーレットを象徴する計測用テクニカル・レーダー */}
        <svg 
          className="absolute bottom-[10%] left-[34%] w-32 h-32 text-blue-400/10 rotate-[-12deg] pointer-events-none select-none z-0"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v20M2 12h20" strokeDasharray="1 1" />
        </svg>

        {/* 3. カウンターを象徴するICチップ風回路フレーム */}
        <svg 
          className="absolute top-[26%] left-[36%] w-16 h-16 text-pink-400/8 rotate-[25deg] pointer-events-none select-none z-0"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
        >
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M9 12h6M12 9v6M9 9h6v6H9z" strokeDasharray="1 1" />
          <path d="M4 8h2M4 16h2M20 8h-2M20 16 h-2" />
        </svg>

        {/* Left Side: Content & Branding */}
        <div className="w-[58%] flex flex-col justify-center z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 w-fit mb-6">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-black tracking-[0.15em] text-purple-300 uppercase">
              100% Free &amp; No Setup Required
            </span>
          </div>

          {/* Catchphrase */}
          <h1 className="text-5xl font-black leading-[1.15] tracking-tight font-[family-name:var(--font-plus-jakarta)] text-white mb-6">
            <span className="block text-white" style={{ textShadow: "0 4px 20px rgba(168, 85, 247, 0.2)" }}>
              配信をもっと身近に、
            </span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent" style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              リスナーともっと近くに。
            </span>
          </h1>

          {/* Description */}
          <p className="text-[#a1a1aa] text-base leading-relaxed font-medium max-w-[520px] mb-8">
            人数カウントからガチャ演出まで、ブラウザひとつで今日の配信枠に「楽しい」をプラスする。完全無料・登録不要のクリエイターツールキット。
          </p>

          {/* Brand Footer Inside OGP */}
          <div className="flex items-center gap-3">
            {/* Elegant glassmorphic branding label */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-white opacity-95 shadow-[0_0_8px_#a855f7]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white opacity-95 shadow-[0_0_8px_#ec4899]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white opacity-95 shadow-[0_0_8px_#3b82f6]" />
              </div>
              <span className="text-sm font-black text-white tracking-wider">だんごツール</span>
            </div>
            <span className="text-xs font-bold text-zinc-500">|</span>
            <span className="text-xs font-bold text-purple-400 tracking-[0.1em] uppercase">DANGO STREAMVERSE</span>
          </div>
        </div>

        {/* Right Side: Beautiful 3D WebGL Sphere Canvas with pure CSS fallback */}
        <div className="w-[42%] h-full flex items-center justify-center relative z-10">
          <div className="w-[480px] h-[480px] relative flex items-center justify-center">
            <ErrorBoundary fallback={<DangoOrb2D pulseTrigger={0} />}>
              {hasWebGL ? (
                <DangoOrb3D
                  pulseTrigger={0}
                  isMobile={false}
                  className="absolute inset-0 pointer-events-none"
                  eventSource={containerRef}
                />
              ) : (
                /* WebGLが完全に無効化されているサンドボックス/ヘッドレス環境での極上CSSフォールバック */
                <DangoOrb2D pulseTrigger={0} />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
