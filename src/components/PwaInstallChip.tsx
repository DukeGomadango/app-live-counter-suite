"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

const LP_ACCENT = "#a855f7";

interface PwaInstallChipProps {
  effectiveLight: boolean;
}

/** beforeinstallprompt の型（標準型定義にないため） */
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallChip({ effectiveLight }: PwaInstallChipProps) {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [mounted]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const handleShowHelp = () => {
    window.dispatchEvent(new CustomEvent("dango-open-help"));
  };

  if (!mounted || isStandalone) return null;

  const chipBg = effectiveLight ? "bg-black/6" : "bg-white/5";
  const chipInnerBg = effectiveLight ? "bg-white/80 text-neutral-800" : "bg-white/15 text-white";
  const chipSecondary = effectiveLight ? "text-neutral-500" : "text-white/50";

  return (
    <div
      className={`mt-4 md:mt-3 flex items-center justify-center gap-2 flex-wrap rounded-xl p-2 ${chipBg}`}
      role="region"
      aria-label="ホームに追加"
    >
      <span
        className={`flex items-center gap-1.5 text-xs ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}
      >
        <Smartphone size={14} style={{ color: LP_ACCENT }} aria-hidden />
        ホームに追加するとアプリのように開けます
      </span>
      {deferredPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${chipInnerBg} hover:opacity-90`}
          style={{ border: `1px solid ${LP_ACCENT}40` }}
          aria-label="アプリを追加"
        >
          追加
        </button>
      ) : (
        <button
          type="button"
          onClick={handleShowHelp}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${chipSecondary} hover:opacity-80 ${effectiveLight ? "hover:bg-black/8" : "hover:bg-white/10"}`}
          aria-label="追加方法を見る"
        >
          方法を見る
        </button>
      )}
    </div>
  );
}
