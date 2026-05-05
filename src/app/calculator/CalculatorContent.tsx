"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Settings } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import CalculatorSettingsPanel from "@/components/calculator/CalculatorSettingsPanel";

// Hooks
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
    const calc = useCalculatorState(isSplitMode);

    const _headerBg = calc.isLightMode ? "rgba(255,255,255,0.7)" : "rgba(20,10,40,0.6)";
    const accentColor = calc.settings.accentColor ?? "#06b6d4";
    const orbIntensity = calc.settings.orbIntensity ?? 50;

    const headerBgStrong = calc.isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.92)";
    const iconColor = calc.isLightMode ? "text-gray-800" : "text-white";
    const iconHover = calc.isLightMode ? "hover:bg-gray-200" : "hover:bg-white/20";

    const splitPaneBg = isSplitMode ? (calc.isLightMode ? undefined : "#0a051e") : undefined;
    const splitLightBg = "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";
    const splitTopBg = isSplitMode && calc.isLightMode ? "#f8f9fa" : (splitPaneBg ?? headerBgStrong);

    return (
        <div
            className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}
            style={splitPaneBg ? { background: splitPaneBg } : undefined}
        >
            {isSplitMode && calc.isLightMode && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />
            )}
            
            <CalculatorOrbsBackground isLightMode={calc.isLightMode} accentColor={accentColor} orbIntensity={orbIntensity} />

            <div
                className={`shrink-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 ${isSplitMode ? "relative min-h-[56px]" : "fixed top-0"}`}
                style={{
                    background: isSplitMode ? splitTopBg : headerBgStrong,
                    backdropFilter: isSplitMode ? "none" : "blur(12px)",
                    borderBottom: isSplitMode ? "none" : `1px solid ${calc.isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
                }}
            >
                <div className="flex items-center gap-2">
                    {!isSplitMode && <ModeSelector isLightMode={calc.isLightMode} />}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => calc.setShowSettingsPanel(true)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
                        title="電卓設定"
                        aria-label="設定"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => calc.setIsLightMode(!calc.isLightMode)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
                        title={calc.isLightMode ? "ダークモード" : "ライトモード"}
                        aria-label={calc.isLightMode ? "ダークモード" : "ライトモード"}
                    >
                        {calc.isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {calc.showSettingsPanel && (
                    <CalculatorSettingsPanel
                        settings={calc.settings}
                        onSettingsChange={calc.setSettings}
                        isLightMode={calc.isLightMode}
                        onClose={() => calc.setShowSettingsPanel(false)}
                        isSplitMode={isSplitMode}
                    />
                )}
            </AnimatePresence>

            <main
                className={`flex-1 min-h-0 flex flex-col overflow-auto scroll-touch ${!isSplitMode ? "pt-14 p-4" : "p-5"}`}
            >
                <div
                    className="flex gap-1 p-1 rounded-xl mb-4 shrink-0 border overflow-x-auto"
                    style={{
                        background: calc.isLightMode ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.12)",
                        borderColor: calc.isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
                    }}
                >
                    {(["four", "fraction", "probability"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => calc.setTab(t)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                calc.tab === t
                                    ? calc.isLightMode
                                        ? "bg-white text-gray-900 shadow"
                                        : "bg-white/20 text-white"
                                    : calc.isLightMode
                                        ? "text-gray-800 hover:bg-black/8"
                                        : "text-white/90 hover:bg-white/10"
                            }`}
                            style={calc.tab === t ? { border: `1px solid ${calc.isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)"}` } : undefined}
                        >
                            {t === "four" && "四則"}
                            {t === "fraction" && "分数"}
                            {t === "probability" && "確率"}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {calc.tab === "four" && (
                        <FourOpsPanel key="four" isLightMode={calc.isLightMode} accentColor={accentColor} />
                    )}
                    {calc.tab === "fraction" && (
                        <FractionPanel key="fraction" isLightMode={calc.isLightMode} accentColor={accentColor} />
                    )}
                    {calc.tab === "probability" && (
                        <ProbabilityPanel key="probability" isLightMode={calc.isLightMode} accentColor={accentColor} />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
