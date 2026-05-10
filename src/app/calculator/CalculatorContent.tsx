"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Settings } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import CalculatorSettingsPanel from "@/components/calculator/CalculatorSettingsPanel";

// Hooks
import { useTheme } from "@/context/ThemeContext";
import { useCalculatorState } from "./hooks/useCalculatorState";

// Components
import { CalculatorOrbsBackground } from "./components/CalculatorOrbsBackground";
import { FourOpsPanel } from "./components/FourOpsPanel";
import { FractionPanel } from "./components/FractionPanel";
import { ProbabilityPanel } from "./components/ProbabilityPanel";

export default function CalculatorContent({
    isSplitMode = false,
    isRightPane: _isRightPane = false,
}: {
    isSplitMode?: boolean;
    isRightPane?: boolean;
} = {}) {
    const {
        settings, setSettings,
        tab, setTab,
        showSettingsPanel, setShowSettingsPanel
    } = useCalculatorState(isSplitMode);
    const { isLightMode, toggleTheme } = useTheme();

    const _headerBg = isLightMode ? "rgba(255,255,255,0.7)" : "rgba(20,10,40,0.6)";
    const accentColor = settings.accentColor ?? "#06b6d4";
    const orbIntensity = settings.orbIntensity ?? 50;

    const headerBgStrong = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.92)";
    const iconColor = isLightMode ? "text-gray-800" : "text-white";
    const iconHover = isLightMode ? "hover:bg-gray-200" : "hover:bg-white/20";

    const splitPaneBg = isSplitMode ? (isLightMode ? undefined : "#0a051e") : undefined;
    const splitLightBg = "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";
    const splitTopBg = isSplitMode && isLightMode ? "#f8f9fa" : (splitPaneBg ?? headerBgStrong);

    return (
        <div
            className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}
            style={splitPaneBg ? { background: splitPaneBg } : undefined}
        >
            {isSplitMode && isLightMode && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />
            )}
            
            <CalculatorOrbsBackground isLightMode={isLightMode} accentColor={accentColor} orbIntensity={orbIntensity} />

            <div
                className={`relative shrink-0 z-50 flex items-center justify-between px-3 py-2 min-h-[52px]`}
                style={{
                    background: isSplitMode ? splitTopBg : headerBgStrong,
                    backdropFilter: isSplitMode ? "none" : "blur(12px)",
                    borderBottom: `1px solid ${isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
                }}
            >
                <div className="flex items-center gap-2">
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettingsPanel(true)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
                        title="電卓設定"
                        aria-label="設定"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={toggleTheme}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
                        title={isLightMode ? "ダークモード" : "ライトモード"}
                        aria-label={isLightMode ? "ダークモード" : "ライトモード"}
                    >
                        {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showSettingsPanel && (
                    <CalculatorSettingsPanel
                        settings={settings}
                        onSettingsChange={setSettings}
                        isLightMode={isLightMode}
                        onClose={() => setShowSettingsPanel(false)}
                        isSplitMode={isSplitMode}
                    />
                )}
            </AnimatePresence>

            <main
                className={`flex-1 min-h-0 flex flex-col overflow-auto scroll-touch p-4 sm:p-5`}
            >
                <div
                    className="flex gap-1 p-1 rounded-xl mb-4 shrink-0 border overflow-x-auto"
                    style={{
                        background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.12)",
                        borderColor: isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
                    }}
                >
                    {(["four", "fraction", "probability"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                tab === t
                                    ? isLightMode
                                        ? "bg-white text-gray-900 shadow"
                                        : "bg-white/20 text-white"
                                    : isLightMode
                                        ? "text-gray-800 hover:bg-black/8"
                                        : "text-white/90 hover:bg-white/10"
                            }`}
                            style={tab === t ? { border: `1px solid ${isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)"}` } : undefined}
                        >
                            {t === "four" && "四則"}
                            {t === "fraction" && "分数"}
                            {t === "probability" && "確率"}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {tab === "four" && (
                        <FourOpsPanel key="four" isLightMode={isLightMode} accentColor={accentColor} />
                    )}
                    {tab === "fraction" && (
                        <FractionPanel key="fraction" isLightMode={isLightMode} accentColor={accentColor} />
                    )}
                    {tab === "probability" && (
                        <ProbabilityPanel key="probability" isLightMode={isLightMode} accentColor={accentColor} />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
