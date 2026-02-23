"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import RouletteSetup from "@/components/roulette/RouletteSetup";
import RouletteSettingsPanel from "@/components/roulette/RouletteSettingsPanel";
import RouletteWheel from "@/components/roulette/RouletteWheel";
import RoulettePredictorsPanel from "@/components/roulette/RoulettePredictorsPanel";
import RouletteStatsPanel from "@/components/roulette/RouletteStatsPanel";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";
import RoulettePredictorHistoryCard from "@/components/roulette/RoulettePredictorHistoryCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
    createDefaultSlots,
    createDefaultRouletteSettings,
    createDefaultPredictors,
    createRouletteTemplate,
    getSampleRouletteTemplates,
    getHighLowZone,
    pickRandomIndex,
    trimRouletteHistory,
    trimRouletteHitHistory,
    type RouletteSettings,
    type RoulettePredictor,
    type RouletteTemplate,
    type RouletteHitHistoryEntry,
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
    const [skipRequested, setSkipRequested] = useState(false);
    const [spinTargetIndex, setSpinTargetIndex] = useState<number | null>(null);
    const [spinKey, setSpinKey] = useState(0);
    const [resultIndex, setResultIndex] = useState<number | null>(null);
    const [predictors, setPredictors] = useLocalStorage<RoulettePredictor[]>("roulette-predictors", createDefaultPredictors());
    const [showHitEffect, setShowHitEffect] = useState(false);
    const [hitNames, setHitNames] = useState<string[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<"slots" | "templates" | "predictors" | "stats">("slots");
    const [templates, setTemplates] = useLocalStorage<RouletteTemplate[]>("roulette-templates", []);
    const [history, setHistory] = useLocalStorage<number[]>("roulette-history", []);
    const [hitHistory, setHitHistory] = useLocalStorage<RouletteHitHistoryEntry[]>("roulette-hit-history", []);
    const [predictorHistoryId, setPredictorHistoryId] = useState<string | null>(null);
    const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
    const [showClearHitHistoryConfirm, setShowClearHitHistoryConfirm] = useState(false);
    const [sidebarWidthPx, setSidebarWidthPx] = useLocalStorage<number>("roulette-sidebar-width", 288);

    const sidebarResizeRafRef = useRef<number | null>(null);
    const sidebarResizePendingRef = useRef<number | null>(null);
    const wheelAreaRef = useRef<HTMLDivElement>(null);
    const [wheelScale, setWheelScale] = useState(1);
    const WHEEL_OUTER_PX = 380 + 48;
    useLayoutEffect(() => {
        const el = wheelAreaRef.current;
        if (!el) return;
        const update = () => {
            const w = el.clientWidth;
            setWheelScale(w <= 0 ? 1 : Math.min(1, (w - 16) / WHEEL_OUTER_PX));
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const applyResize = useCallback((clientX: number, startX: number, startW: number) => {
        const newW = Math.min(720, Math.max(200, startW + (clientX - startX)));
        sidebarResizePendingRef.current = newW;
        if (sidebarResizeRafRef.current !== null) return;
        sidebarResizeRafRef.current = requestAnimationFrame(() => {
            sidebarResizeRafRef.current = null;
            const w = sidebarResizePendingRef.current;
            if (w !== null) setSidebarWidthPx(w);
        });
    }, [setSidebarWidthPx]);
    const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const startX = e.clientX;
        const startW = sidebarWidthPx;
        const onMove = (moveEvent: MouseEvent) => applyResize(moveEvent.clientX, startX, startW);
        const onUp = () => {
            if (sidebarResizeRafRef.current !== null) {
                cancelAnimationFrame(sidebarResizeRafRef.current);
                sidebarResizeRafRef.current = null;
            }
            const pending = sidebarResizePendingRef.current;
            if (pending !== null) setSidebarWidthPx(pending);
            sidebarResizePendingRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [sidebarWidthPx, setSidebarWidthPx, applyResize]);
    const handleSidebarResizeTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.changedTouches.length === 0) return;
        const startX = e.changedTouches[0]!.clientX;
        const startW = sidebarWidthPx;
        const onMove = (moveEvent: TouchEvent) => {
            if (moveEvent.changedTouches.length === 0) return;
            moveEvent.preventDefault();
            applyResize(moveEvent.changedTouches[0]!.clientX, startX, startW);
        };
        const onEnd = () => {
            const pending = sidebarResizePendingRef.current;
            if (pending !== null) setSidebarWidthPx(pending);
            sidebarResizePendingRef.current = null;
            document.removeEventListener("touchmove", onMove, { capture: true });
            document.removeEventListener("touchend", onEnd);
            document.removeEventListener("touchcancel", onEnd);
        };
        document.addEventListener("touchmove", onMove, { passive: false, capture: true });
        document.addEventListener("touchend", onEnd);
        document.addEventListener("touchcancel", onEnd);
    }, [sidebarWidthPx, setSidebarWidthPx, applyResize]);

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
        setSkipRequested(false);
        setSpinTargetIndex(null);
        setHistory((prev) => trimRouletteHistory([index, ...prev]));
        const resultLabel = slots[index] ?? "";
        const isHighLow = settings.predictorMode === "highLow";
        const resultZone = getHighLowZone(index, slots.length);
        const hitPredictors = isHighLow && resultZone != null
            ? predictors.filter((p) => p.participating !== false && p.prediction === resultZone)
            : predictors.filter((p) => p.participating !== false && p.prediction.trim() === resultLabel);
        const whoHit = hitPredictors.map((p) => p.name.trim() || "名前なし");
        const hitPredictorIds = hitPredictors.map((p) => p.id);
        setHitHistory((prev) => trimRouletteHitHistory([{ resultLabel, hitPredictorIds }, ...prev]));
        if (whoHit.length > 0) {
            setHitNames(whoHit);
            setShowHitEffect(true);
        }
    };

    const handleClearHistory = () => {
        setHistory([]);
        setHitHistory([]);
    };

    const handleSpin = () => {
        if (slots.length === 0 || isSpinning) return;
        const target = pickRandomIndex(slots.length);
        setResultIndex(null);
        setSkipRequested(false);
        setSpinKey((k) => k + 1);
        setSpinTargetIndex(target);
        setIsSpinning(true);
    };

    const accentColor = settings.accentColor ?? "#a855f7";
    const orbIntensity = settings.orbIntensity ?? 50;
    /** 旧 "needle" を "minimal" に正規化（表示用）。保存時は useEffect で移行 */
    const effectiveSettings = useMemo<RouletteSettings>(() => ({
        ...settings,
        style: (settings.style as string) === "needle" ? "minimal" : settings.style,
    }), [settings]);
    useEffect(() => {
        if ((settings.style as string) === "needle") setSettings((prev) => ({ ...prev, style: "minimal" }));
    }, [settings.style, setSettings]);

    const handleSaveTemplate = (name: string) => {
        const t = createRouletteTemplate(name, slots, settings);
        setTemplates((prev) => [...prev.filter((x) => x.id !== t.id), t].slice(-30));
    };

    const handleLoadTemplate = (templateId: string) => {
        const sample = getSampleRouletteTemplates().find((x) => x.id === templateId);
        const t = sample ?? templates.find((x) => x.id === templateId);
        if (t) {
            setSlots(t.slots.length > 0 ? [...t.slots] : createDefaultSlots(13));
            if (t.settings && Object.keys(t.settings).length > 0) {
                setSettings((prev) => ({ ...prev, ...t.settings }));
            }
        }
    };

    return (
        <div className={`flex flex-col overflow-hidden relative z-10 min-w-0 ${isSplitMode ? "h-full w-full" : "h-screen w-screen"}`}>
            {/* 背景色レイヤー（設定で有効時のみ・オーブの背後） */}
            {settings.backgroundEnabled && (
                <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        background: settings.backgroundColor ?? "#1a1a2e",
                        opacity: (settings.backgroundOpacity ?? 100) / 100,
                    }}
                />
            )}
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

            {/* ヘッダー（高さを固定してメイン・ドロワーとの被りを防ぐ・スマホはh-14で盤面との隙間を確保） */}
            <div
                className={`${isSplitMode ? "absolute" : "fixed"} top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 min-h-[56px] max-md:h-14 max-md:min-h-0 shrink-0`}
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
                hitNames={hitNames}
                effectLevel={effectiveSettings.effectLevel ?? "low"}
            />

            <AnimatePresence>
                {showSettingsPanel && (
                    <RouletteSettingsPanel
                        settings={effectiveSettings}
                        onSettingsChange={setSettings}
                        isLightMode={isLightMode}
                        onClose={() => setShowSettingsPanel(false)}
                    />
                )}
            </AnimatePresence>

            {/* メイン: 上部余白（スマホSplit含め盤面がヘッダーに被らないよう確保） */}
            <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-0 p-4 pt-20 max-md:pt-24 overflow-auto">
                {/* 左: サイドバー（デスクトップ時はリサイズ可能 / モバイル・Split時はオーバーレイ） */}
                {!isSplitMode && isDesktop ? (
                    <>
                        <aside
                            className="h-full flex flex-col overflow-hidden shrink-0 pr-3 min-w-0"
                            style={{
                                width: sidebarWidthPx,
                                minWidth: 200,
                                maxWidth: 720,
                                borderRight: `1px solid ${glassBorder}`,
                            }}
                        >
                            <div className="flex border-b shrink-0 flex-wrap gap-2 px-3 pt-3 pb-2" style={{ borderColor: glassBorder }}>
                                {(["slots", "templates", "predictors", "stats"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setSidebarTab(tab)}
                                        className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-lg ${sidebarTab === tab ? (isLightMode ? "bg-white/90 text-gray-800 border border-purple-500" : "bg-white/10 text-white border border-purple-400") : (isLightMode ? "text-gray-600 hover:bg-gray-100 border border-transparent" : "text-white/60 hover:bg-white/5 border border-transparent")}`}
                                    >
                                        {tab === "slots" && "スロット"}
                                        {tab === "templates" && "テンプレート"}
                                        {tab === "predictors" && "予想"}
                                        {tab === "stats" && "統計"}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col mt-3 px-3">
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
                                        sampleTemplates={getSampleRouletteTemplates()}
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
                                        resultZone={settings.predictorMode === "highLow" && resultIndex !== null ? getHighLowZone(resultIndex, slots.length) : null}
                                        predictorMode={settings.predictorMode}
                                        isLightMode={isLightMode}
                                        hitHistory={hitHistory}
                                        onViewPredictorHistory={setPredictorHistoryId}
                                        onRequestClearHitHistory={() => setShowClearHitHistoryConfirm(true)}
                                    />
                                )}
                                {sidebarTab === "stats" && (
                                    <RouletteStatsPanel
                                        history={history}
                                        slots={slots}
                                        onClear={() => setShowClearHistoryConfirm(true)}
                                        isLightMode={isLightMode}
                                        accentColor={accentColor}
                                        showBarChart={settings.statsShowBarChart !== false}
                                        showPieChart={settings.statsShowPieChart === true}
                                    />
                                )}
                            </div>
                        </aside>
                        <div
                            role="separator"
                            aria-label="サイドバー幅を調節"
                            onMouseDown={handleSidebarResizeStart}
                            onTouchStart={handleSidebarResizeTouchStart}
                            className="shrink-0 w-4 h-full cursor-col-resize select-none flex items-center justify-center group touch-manipulation"
                            style={{ minWidth: 16 }}
                        >
                            <span
                                className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                style={{ background: glassBorder }}
                            />
                        </div>
                    </>
                ) : (
                    <AnimatePresence>
                        {showSidebar && !isDesktop && (
                            <motion.div
                                key="roulette-sidebar-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[38] bg-black/50"
                                onClick={() => setSidebarOpen(false)}
                                aria-hidden
                            />
                        )}
                        {showSidebar && (
                            <motion.aside
                                key="roulette-sidebar"
                                initial={isDesktop ? { width: 0, opacity: 0 } : { x: "-100%" }}
                                animate={isDesktop ? { width: "auto", opacity: 1 } : { x: 0 }}
                                exit={isDesktop ? { width: 0, opacity: 0 } : { x: "-100%" }}
                                transition={isDesktop ? undefined : { type: "spring", damping: 25, stiffness: 300 }}
                                className={`shrink-0 flex flex-col min-h-0 overflow-hidden ${
                                    isSplitMode ? "absolute top-20 left-0 right-0 bottom-0 max-md:top-24 z-40" : "max-md:fixed max-md:left-0 max-md:top-24 max-md:bottom-0 max-md:z-40 max-md:shadow-2xl md:relative md:w-72"
                                }`}
                                style={
                                    !isDesktop && !isSplitMode
                                        ? { width: "min(320px, 90vw)", maxWidth: "min(320px, 90vw)", background: headerBg, backdropFilter: "blur(12px)" }
                                        : undefined
                                }
                            >
                                <div
                                    className={`flex items-center border-b shrink-0 gap-2 px-3 pb-2 ${!isDesktop && !isSplitMode ? "pt-3 mt-1" : "pt-3"}`}
                                    style={{ borderColor: glassBorder, background: !isDesktop && !isSplitMode ? headerBg : undefined }}
                                >
                                    <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                                        {(["slots", "templates", "predictors", "stats"] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                type="button"
                                                onClick={() => setSidebarTab(tab)}
                                                className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-lg touch-manipulation ${sidebarTab === tab ? (isLightMode ? "bg-white/90 text-gray-800 border border-purple-500" : "bg-white/10 text-white border border-purple-400") : (isLightMode ? "text-gray-600 hover:bg-gray-100 border border-transparent" : "text-white/60 hover:bg-white/5 border border-transparent")}`}
                                            >
                                                {tab === "slots" && "スロット"}
                                                {tab === "templates" && "テンプレート"}
                                                {tab === "predictors" && "予想"}
                                                {tab === "stats" && "統計"}
                                            </button>
                                        ))}
                                    </div>
                                    {showHamburger && (
                                        <button
                                            type="button"
                                            onClick={() => setSidebarOpen(false)}
                                            className={`shrink-0 p-2 rounded-lg touch-manipulation ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                                            aria-label="メニューを閉じる"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-3 px-3 pb-4">
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
                                            sampleTemplates={getSampleRouletteTemplates()}
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
                                            resultZone={settings.predictorMode === "highLow" && resultIndex !== null ? getHighLowZone(resultIndex, slots.length) : null}
                                            predictorMode={settings.predictorMode}
                                            isLightMode={isLightMode}
                                            hitHistory={hitHistory}
                                            onViewPredictorHistory={setPredictorHistoryId}
                                            onRequestClearHitHistory={() => setShowClearHitHistoryConfirm(true)}
                                        />
                                    )}
                                    {sidebarTab === "stats" && (
                                        <RouletteStatsPanel
                                            history={history}
                                            slots={slots}
                                            onClear={() => setShowClearHistoryConfirm(true)}
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
                )}

                {/* 右: ルーレット盤（スマホ・Splitで少し下にずらして見やすく） */}
                <div ref={wheelAreaRef} className="flex-1 min-w-0 flex flex-col items-center justify-center gap-4 md:pl-4 overflow-hidden max-md:pt-10">
                    {!isSplitMode && settings.showProjectName && (settings.projectName ?? "").trim() && (
                        <p
                            className="text-center text-lg sm:text-xl font-bold tracking-wide"
                            style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}
                        >
                            {(settings.projectName ?? "").trim()}
                        </p>
                    )}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: WHEEL_OUTER_PX * wheelScale,
                            margin: "0 auto",
                            height: (WHEEL_OUTER_PX + 200) * wheelScale,
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: 0,
                                transform: `translateX(-50%) scale(${wheelScale})`,
                                transformOrigin: "center top",
                                width: WHEEL_OUTER_PX,
                            }}
                        >
                            <RouletteWheel
                        slots={slots}
                        style={effectiveSettings.style}
                        isSpinning={isSpinning}
                        targetIndex={spinTargetIndex}
                        resultIndex={resultIndex}
                        spinKey={spinKey}
                        onSpin={handleSpin}
                        onSpinEnd={handleSpinEnd}
                        skipRequested={skipRequested}
                        onSkipRequest={() => setSkipRequested(true)}
                        accentColor={accentColor}
                        isLightMode={isLightMode}
                        maxVisibleLabels={settings.maxVisibleLabels}
                        wheelOffsetIndex={settings.wheelOffsetIndex}
                        effectLevel={effectiveSettings.effectLevel ?? "low"}
                    />
                        </div>
                    </div>
                    {resultIndex !== null && slots[resultIndex] !== undefined && (
                        <p className={`text-lg font-bold ${isLightMode ? "text-gray-800" : "text-white"}`}>
                            結果: {slots[resultIndex]}
                        </p>
                    )}
                </div>
            </main>

            {/* 予想者あたり履歴モーダル */}
            {predictorHistoryId != null && (() => {
                const predictor = predictors.find((p) => p.id === predictorHistoryId);
                return predictor ? (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                        onClick={() => setPredictorHistoryId(null)}
                    >
                        <div onClick={(e) => e.stopPropagation()}>
                            <RoulettePredictorHistoryCard
                                predictor={predictor}
                                hitHistory={hitHistory}
                                isLightMode={isLightMode}
                                onClose={() => setPredictorHistoryId(null)}
                            />
                        </div>
                    </div>
                ) : null;
            })()}

            {/* 記録リセット確認（抽選・あたり履歴まとめて） */}
            <ConfirmDialog
                open={showClearHistoryConfirm}
                title="確認"
                message="記録をリセットしますか？"
                confirmLabel="リセットする"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    handleClearHistory();
                    setShowClearHistoryConfirm(false);
                }}
                onCancel={() => setShowClearHistoryConfirm(false)}
                danger={false}
            />
            {/* あたり履歴のみリセット確認 */}
            <ConfirmDialog
                open={showClearHitHistoryConfirm}
                title="確認"
                message="記録をリセットしますか？予想のあたり履歴のみクリアされます。"
                confirmLabel="リセットする"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    setHitHistory([]);
                    setShowClearHitHistoryConfirm(false);
                }}
                onCancel={() => setShowClearHitHistoryConfirm(false)}
                danger={false}
            />
        </div>
    );
}
