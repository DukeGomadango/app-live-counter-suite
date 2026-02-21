"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import HelpModal from "./HelpModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const [isLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
    const [isGachaLightMode] = useLocalStorage<boolean>("gacha-light-mode", false);
    const isGatcha = pathname?.includes("gatcha");
    const effectiveLightMode = isGatcha ? isGachaLightMode : isLightMode;

    return (
        <>
            {/* The Help Button positioned below the header controls */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed z-40 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 group`}
                style={{
                    top: isGatcha ? "auto" : "70px",
                    bottom: isGatcha ? "16px" : "auto",
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
            />
        </>
    );
}
