"use client";

import { Z_INDEX } from "@/lib/layoutConstants";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { HamburgerTabId, MenuThemeTokens } from "./types";

type TabDef = { id: HamburgerTabId; label: string; icon: ReactNode };

type Props = {
    isOpen: boolean;
    onToggle: () => void;
    tokens: MenuThemeTokens;
    topPx: number;
    activeTab: HamburgerTabId;
    setActiveTab: (id: HamburgerTabId) => void;
    tabs: TabDef[];
    children: ReactNode;
    accentColor?: string;
};

export function HamburgerMenuSidebar({
    isOpen,
    onToggle,
    tokens,
    topPx,
    activeTab,
    setActiveTab,
    tabs,
    children,
    accentColor,
}: Props) {
    const { panelBg, borderColor, textPrimary, textSecondary, bgSubtle, bgSubtleHover } = tokens;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onToggle}
                        className={`absolute inset-0 bg-black/30 backdrop-blur-sm`}
                        style={{ top: `${topPx}px`, zIndex: Z_INDEX.SIDEBAR_BACKDROP }}
                    />

                    <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "-100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`absolute left-0 bottom-0 w-[320px] overflow-y-auto scroll-touch`}
                        style={{
                            top: `${topPx}px`,
                            background: panelBg,
                            backdropFilter: "blur(20px)",
                            borderRight: `1px solid ${borderColor}`,
                            boxShadow: "10px 0 40px rgba(0,0,0,0.3)",
                            zIndex: Z_INDEX.SIDEBAR,
                        }}
                    >
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={16} className="text-purple-400" />
                                <h2 className={`text-base font-bold ${textPrimary}`}>メニュー</h2>
                            </div>

                            <div className={`flex gap-0.5 mb-4 p-1 rounded-xl ${bgSubtle}`}>
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium dango-btn-tier3 transition-all duration-200 ${
                                            activeTab === tab.id
                                                ? "shadow-sm"
                                                : `${textSecondary} hover:bg-black/5 dark:hover:bg-white/5`
                                        }`}
                                        style={{ 
                                            background: activeTab === tab.id ? `${accentColor}33` : undefined,
                                            color: activeTab === tab.id ? accentColor : undefined,
                                            "--btn-glow-color": `${accentColor}4D`,
                                        } as any}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence mode="wait">{children}</AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
