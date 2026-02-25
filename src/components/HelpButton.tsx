"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSplitModule } from "@/context/SplitModuleContext";

const HelpModal = dynamic(() => import("./HelpModal"), { ssr: false });

export default function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const { activeModule } = useSplitModule();
    const [isLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
    const [isGachaLightMode] = useLocalStorage<boolean>("gacha-light-mode", false);
    const [isClockLightMode] = useLocalStorage<boolean>("clock-light-mode", false);
    const isGacha = pathname?.includes("gacha");
    const isRoulette = pathname?.includes("roulette");
    const isSplit = pathname?.includes("split");
    const isClock = pathname?.includes("clock");
    const effectiveLightMode = isGacha ? isGachaLightMode : isClock || (isSplit && activeModule === "clock") ? isClockLightMode : isLightMode;

    useEffect(() => {
        const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Split時は表示中モジュール（Context）、それ以外はpathnameで位置を決定
    const effectiveRoulette = isSplit ? activeModule === "roulette" : isRoulette;
    const effectiveGacha = isSplit ? activeModule === "gacha" : isGacha;
    const isSplitPcRoulette = isSplit && !isMobile && effectiveRoulette;
    const helpBottom = isSplitPcRoulette ? "auto" : (effectiveRoulette ? "16px" : effectiveGacha ? (isMobile ? "72px" : "48px") : "auto");
    const helpTop = helpBottom !== "auto" ? "auto" : "70px";

    return (
        <>
            {/* ルーレット=右下、ガチャ=右下(フッター避け)、それ以外=ヘッダー右下。z-[100]で他要素より前面に */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed z-[100] w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 group`}
                style={{
                    top: helpTop,
                    bottom: helpBottom,
                    right: "16px",
                    background: effectiveLightMode ? "rgba(255, 255, 255, 0.4)" : "rgba(20, 10, 40, 0.4)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${effectiveLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
                }}
                title="使い方を見る"
            >
                <HelpCircle
                    size={20}
                    className={`transition-colors duration-200 ${effectiveLightMode
                        ? "text-gray-500 group-hover:text-purple-600"
                        : "text-white/40 group-hover:text-purple-400"
                    }`}
                />
            </button>

            <HelpModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                currentPath={pathname || "/"}
                isLightMode={effectiveLightMode}
                activeModule={activeModule}
            />
        </>
    );
}
