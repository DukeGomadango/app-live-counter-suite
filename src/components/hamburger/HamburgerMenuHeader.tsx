"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, RotateCcw, Settings } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import type { MenuThemeTokens } from "./types";

type Props = {
    tokens: MenuThemeTokens;
    isLightMode: boolean;
    isOpen: boolean;
    onToggle: () => void;
    hideModeSelector: boolean;
    viewMode: "counter" | "chart";
    totalCount: number;
    totalTarget: number;
    onOpenSettings: () => void;
    confirmReset: boolean;
    onResetClick: () => void;
    hideThemeToggle: boolean;
    onToggleTheme: () => void;
};

export function HamburgerMenuHeader({
    tokens,
    isLightMode,
    isOpen,
    onToggle,
    hideModeSelector,
    viewMode,
    totalCount,
    totalTarget,
    onOpenSettings,
    confirmReset,
    onResetClick,
    hideThemeToggle,
    onToggleTheme,
}: Props) {
    const {
        headerBarBg,
        borderColor,
        bgSubtle,
        borderSubtle,
        bgSubtleHover,
        textMuted,
    } = tokens;

    return (
        <div
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-1.5 sm:px-3 py-2"
            style={{
                background: headerBarBg,
                backdropFilter: "blur(12px)",
                borderBottom: `1px solid ${borderColor}`,
            }}
        >
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                    onClick={onToggle}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                >
                    {isOpen ? (
                        <X size={18} className={isLightMode ? "text-gray-700" : "text-white/80"} />
                    ) : (
                        <Menu size={18} className={isLightMode ? "text-gray-700" : "text-white/80"} />
                    )}
                </button>
                {!hideModeSelector && <ModeSelector isLightMode={isLightMode} />}
            </div>

            {viewMode === "counter" && (
                <div
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 rounded-full ${bgSubtle} border ${borderSubtle} mx-1 shrink min-w-0`}
                >
                    <span className={`text-[10px] sm:text-sm ${textMuted}`}>合計</span>
                    <div className="flex items-baseline gap-0.5 truncate">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={totalCount}
                                initial={{ opacity: 0, y: -6, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="text-sm sm:text-base font-bold tabular-nums"
                                style={{
                                    color:
                                        totalCount > 0
                                            ? "#a855f7"
                                            : isLightMode
                                              ? "rgba(0,0,0,0.3)"
                                              : "rgba(255,255,255,0.4)",
                                    textShadow: totalCount > 0 ? "0 0 10px rgba(168,85,247,0.4)" : "none",
                                }}
                            >
                                {totalCount}
                            </motion.span>
                        </AnimatePresence>
                        {totalTarget > 0 && (
                            <span className={`text-[10px] sm:text-xs ${textMuted} tabular-nums break-keep`}>
                                /{totalTarget}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                    onClick={onOpenSettings}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                    title="設定"
                >
                    <Settings size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                </button>
                <button
                    onClick={onResetClick}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 border ${
                        confirmReset
                            ? "bg-red-500/20 border-red-500/30"
                            : `${bgSubtle} ${borderSubtle} ${bgSubtleHover}`
                    }`}
                    title={confirmReset ? "もう一度クリックで確定" : "カウントリセット"}
                >
                    <RotateCcw
                        size={16}
                        className={
                            confirmReset ? "text-red-400" : isLightMode ? "text-gray-500" : "text-white/50"
                        }
                    />
                </button>
                {!hideThemeToggle && (
                    <button
                        onClick={onToggleTheme}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                        title={isLightMode ? "ダークモードに切替" : "ライトモードに切替"}
                    >
                        {isLightMode ? (
                            <Moon size={16} className="text-gray-600" />
                        ) : (
                            <Sun size={16} className="text-yellow-400" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
