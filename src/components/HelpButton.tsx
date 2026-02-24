"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const HelpModal = dynamic(() => import("./HelpModal"), { ssr: false });

export default function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const [isLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
    const [isGachaLightMode] = useLocalStorage<boolean>("gacha-light-mode", false);
    const isGacha = pathname?.includes("gacha");
    const isSplit = pathname?.includes("split");
    const effectiveLightMode = isGacha ? isGachaLightMode : isLightMode;

    useEffect(() => {
        const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // ガチャまたはSplit時は下側に配置（PC版Splitでは左下にしてガチャの右下モード切替と被らないように）
    const useBottom = isGacha || isSplit;
    const gachaBottom = isGacha && isMobile ? "72px" : "16px";
    const bottomPos = useBottom ? (isGacha && isMobile ? gachaBottom : "16px") : "auto";
    const onLeft = isSplit && !isMobile; // PC版Split時は左下

    return (
        <>
            {/* The Help Button: top-right normally, bottom on Gacha/Split (Split+PCは左下でガチャUIと重ならないように) */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed z-40 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 group`}
                style={{
                    top: useBottom ? "auto" : "70px",
                    bottom: bottomPos,
                    ...(onLeft ? { left: "16px" } : { right: "16px" }),
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
            />
        </>
    );
}
