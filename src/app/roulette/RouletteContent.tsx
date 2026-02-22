"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import RouletteSetup from "@/components/roulette/RouletteSetup";
import RouletteSettingsPanel from "@/components/roulette/RouletteSettingsPanel";
import RouletteWheel from "@/components/roulette/RouletteWheel";
import RoulettePredictorsPanel from "@/components/roulette/RoulettePredictorsPanel";
import RouletteStatsPanel from "@/components/roulette/RouletteStatsPanel";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";
import {
    createDefaultSlots,
    createDefaultRouletteSettings,
    createDefaultPredictors,
    createRouletteTemplate,
    pickRandomIndex,
    trimRouletteHistory,
    type RouletteSettings,
    type RoulettePredictor,
    type RouletteTemplate,
} from "@/lib/roulette";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function RouletteContent({
    isSplitMode = false,
    isRightPane = false,
}: {
    isSplitMode?: boolean;
    isRightPane?: boolean;
} = {}) {
    const [slots, setSlots] = useLocalStorage<string[]>("roulette-slots", createDefaultSlots(13));
    const [settings, setSettings] = useLocalStorage<RouletteSettings>("roulette-settings", createDefaultRouletteSettings());
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("roulette-light-mode", false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinTargetIndex, setSpinTargetIndex] = useState<number | null>(null);
    const [spinKey, setSpinKey] = useState(0);
    const [resultIndex, setResultIndex] = useState<number | null>(null);
    const [predictors, setPredictors] = useLocalStorage<RoulettePredictor[]>("roulette-predictors", createDefaultPredictors());
    const [showHitEffect, setShowHitEffect] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(!isSplitMode);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<"slots" | "templates" | "predictors" | "stats">("slots");
    const [templates, setTemplates] = useLocalStorage<RouletteTemplate[]>("roulette-templates", []);
    const [history, setHistory] = useLocalStorage<number[]>("roulette-history", []);

    const { glassBorder } = useGlassStyle(isLightMode);
    const headerBg = isLightMode ? "rgba(255,255,255,0.7)" : "rgba(20,10,40,0.6)";
    const displayLight = isLightMode;
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const showHamburger = isSplitMode || !isDesktop;
    const showSidebar = (!isSplitMode && isDesktop) || sidebarOpen;

    useEffect(() => {
        if (isSplitMode) return;
        if (isLightMode) document.body.classList.add("light-mode");
        else document.body.classList.remove("light-mode");
        return () => document.body.classList.remove("light-mode");
    }, [isLightMode, isSplitMode]);

    const handleSpinEnd = (index: number) => {
        setResultIndex(index);
        setIsSpinning(false);
        setSpinTargetIndex(null);
        setHistory((prev) => trimRouletteHistory([index, ...prev]));
        const resultLabel = slots[index] ?? "";
        const anyHit = predictors.some((p) => p.prediction.trim() === resultLabel);
        if (anyHit) setShowHitEffect(true);
    };

    const handleSpin = () => {
        if (slots.length === 0 || isSpinning) return;
        const target = pickRandomIndex(slots.length);
        setResultIndex(null);
        setSpinKey((k) => k + 1);
        setSpinTargetIndex(target);
        setIsSpinning(true);
    };

    const accentColor = settings.accentColor ?? "#a855f7";
    const orbIntensity = settings.orbIntensity ?? 50;

    const handleSaveTemplate = (name: string) => {
        const t = createRouletteTemplate(name, slots, settings);
        setTemplates((prev) => [...prev.filter((x) => x.id !== t.id), t].slice(-30));
    };

    const handleLoadTemplate = (templateId: string) => {
        const t = templates.find((x) => x.id === templateId);
        if (t) {
            setSlots(t.slots.length > 0 ? [...t.slots] : createDefaultSlots(13));
            if (t.settings && Object.keys(t.settings).length > 0) {
                setSettings((prev) => ({ ...prev, ...t.settings }));
            }
        }
    };

    return (
        <div className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}>
            {/* 開発中オーバーレイ */}
            <div
                className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
                aria-hidden="false"
            >
                <p className="text-xl font-bold text-white/95 tracking-wider">開発中です</p>
            </div>
            {/* 背景オーブ */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}>
                <motion.div
                    animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, opacity: (orbIntensity / 100) * (isLightMode ? 1.5 : 1) }}
                />
                <motion.div
                    animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`, opacity: (orbIntensity / 100) * 0.8 * (isLightMode ? 1.5 : 1) }}
                />
                <motion.div
                    animate={{ x: [0, 50, -100, 0], y: [0, 50, -100, 0], scale: [1, 1.1, 0.9, 1] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[40%] left-[30%] w-[40rem] h-[40rem] rounded-full blur-[100px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`, opacity: (orbIntensity / 100) * 0.6 * (isLightMode ? 1.5 : 1) }}
                />
            </div>

            {/* ヘッダー */}
            <div
                className={`${isSplitMode ? "absolute" : "fixed"} top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2`}
                style={{
                    background: headerBg,
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${glassBorder}`,
                }}
            >
                <div className="flex items-center gap-2">
                    {showHamburger && (
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                            title="メニュー"
                            aria-label="メニュー"
                        >
                            <Menu size={18} />
                        </button>
                    )}
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettingsPanel(true)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        title="ルーレット設定"
                        aria-label="設定"
                    >
                        <Settings size={16} />
                    </button>
                    {(!isSplitMode || isRightPane) && (
                        <button
                            onClick={() => setIsLightMode(!isLightMode)}
                            className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        >
                            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    )}
                </div>
            </div>

            <RouletteHitEffect
                show={showHitEffect}
                onComplete={() => setShowHitEffect(false)}
                accentColor={accentColor}
            />

            <AnimatePresence>
                {showSettingsPanel && (
                    <RouletteSettingsPanel
                        settings={settings}
                        onSettingsChange={setSettings}
                        isLightMode={isLightMode}
                        onClose={() => setShowSettingsPanel(false)}
                    />
                )}
            </AnimatePresence>

            {/* メイン: 上部余白 + コンテンツ */}
            <main className={`flex-1 min-h-0 flex flex-col md:flex-row gap-4 p-4 ${!isSplitMode ? "pt-14" : ""} overflow-auto`}>
                {/* 左: 1本サイドバー（タブ: スロット / テンプレート / 設定 / 予想 / 統計） */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className={`shrink-0 w-full md:w-72 flex flex-col min-h-0 overflow-hidden ${isSplitMode ? "fixed inset-0 z-40" : "max-md:fixed max-md:inset-0 max-md:z-40 md:relative"}`}
                        >
                            <div className="flex border-b overflow-x-auto shrink-0" style={{ borderColor: glassBorder }}>
                                {(["slots", "templates", "predictors", "stats"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setSidebarTab(tab)}
                                        className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${sidebarTab === tab ? (isLightMode ? "bg-white/90 text-gray-800 border-b-2 border-purple-500" : "bg-white/10 text-white border-b-2 border-purple-400") : (isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/5")}`}
                                        style={sidebarTab === tab ? undefined : { borderBottomColor: "transparent" }}
                                    >
                                        {tab === "slots" && "スロット"}
                                        {tab === "templates" && "テンプレート"}
                                        {tab === "predictors" && "予想"}
                                        {tab === "stats" && "統計"}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-2">
                                {sidebarTab === "slots" && (
                                    <RouletteSetup
                                        slots={slots}
                                        onSlotsChange={setSlots}
                                        isLightMode={isLightMode}
                                        section="slots"
                                    />
                                )}
                                {sidebarTab === "templates" && (
                                    <RouletteSetup
                                        slots={slots}
                                        onSlotsChange={setSlots}
                                        isLightMode={isLightMode}
                                        templates={templates}
                                        currentSettings={settings}
                                        onSaveTemplate={handleSaveTemplate}
                                        onLoadTemplate={handleLoadTemplate}
                                        section="templates"
                                    />
                                )}
                                {sidebarTab === "predictors" && (
                                    <RoulettePredictorsPanel
                                        predictors={predictors}
                                        onChange={setPredictors}
                                        slots={slots}
                                        resultLabel={resultIndex !== null ? (slots[resultIndex] ?? null) : null}
                                        isLightMode={isLightMode}
                                    />
                                )}
                                {sidebarTab === "stats" && (
                                    <RouletteStatsPanel
                                        history={history}
                                        slots={slots}
                                        onClear={() => setHistory([])}
                                        isLightMode={isLightMode}
                                        accentColor={accentColor}
                                        showBarChart={settings.statsShowBarChart !== false}
                                        showPieChart={settings.statsShowPieChart === true}
                                    />
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* 中央: ルーレット + 結果 */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-4">
                    <RouletteWheel
                        slots={slots}
                        style={settings.style}
                        isSpinning={isSpinning}
                        targetIndex={spinTargetIndex}
                        spinKey={spinKey}
                        onSpin={handleSpin}
                        onSpinEnd={handleSpinEnd}
                        accentColor={accentColor}
                        isLightMode={isLightMode}
                    />
                    {resultIndex !== null && slots[resultIndex] !== undefined && (
                        <p className={`text-lg font-bold ${isLightMode ? "text-gray-800" : "text-white"}`}>
                            結果: {slots[resultIndex]}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
