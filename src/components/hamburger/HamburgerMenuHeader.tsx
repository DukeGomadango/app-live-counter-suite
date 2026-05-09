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
    leftContent?: React.ReactNode;
    rightContent?: React.ReactNode;
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
    leftContent,
    rightContent,
}: Props) {
    const {
        headerBarBg,
        borderColor,
        bgSubtle,
        borderSubtle,
        bgSubtleHover,
        textMuted,
        textPrimary,
        textSecondary,
    } = tokens;

    return (
        <header
            className={`h-[52px] w-full absolute top-0 left-0 z-50 flex items-center px-1.5 sm:px-3 border-b transition-colors duration-300 ${headerBarBg} ${borderSubtle} backdrop-blur-md`}
        >
            {/* Left Area: Flex-1 to push center */}
            <div className="flex-1 flex items-center gap-1.5 sm:gap-2.5 min-w-0 z-10">
                <button
                    onClick={onToggle}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                >
                    {isOpen ? (
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    ) : (
                        <Menu className={`w-4 h-4 sm:w-5 sm:h-5 ${textPrimary}`} />
                    )}
                </button>
                {!hideModeSelector && <ModeSelector isLightMode={isLightMode} />}
                {leftContent && (
                    <>
                        <div className="hidden sm:block h-6 w-px bg-white/10 mx-1" />
                        {leftContent}
                    </>
                )}
            </div>

            {/* Center Area: Absolutely Centered */}
            {viewMode === "counter" && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                    <div className={`px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 transition-all duration-300 ${bgSubtle} border ${borderSubtle} shadow-sm backdrop-blur-xl`}>
                        <div className="flex flex-col items-center leading-tight">
                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>合計</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className={`text-sm sm:text-base font-bold tabular-nums ${textPrimary}`}>
                                    {totalCount.toLocaleString()}
                                </span>
                                {totalTarget > 0 && (
                                    <span className={`text-[10px] sm:text-xs ${textMuted} tabular-nums break-keep`}>
                                        /{totalTarget.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Right Area: Flex-1 and justify-end */}
            <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2 shrink-0 z-10">
                {rightContent}
                <button
                    onClick={onOpenSettings}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                    title="設定"
                >
                    <Settings className={`w-4 h-4 sm:w-5 sm:h-5 ${textSecondary}`} />
                </button>
                <button
                    onClick={onResetClick}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover} hover:text-red-400`}
                    title="リセット"
                >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {!hideThemeToggle && (
                    <button
                        onClick={onToggleTheme}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                        title="テーマ切替"
                    >
                        {isLightMode ? (
                            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        ) : (
                            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
                        )}
                    </button>
                )}
            </div>
        </header>
    );
}
