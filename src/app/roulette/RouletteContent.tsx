"use client";

import { useState, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings, X } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import RouletteSetup from "@/components/roulette/RouletteSetup";
import RouletteSettingsPanel from "@/components/roulette/RouletteSettingsPanel";
import { useTheme } from "@/context/ThemeContext";

import RouletteWheel from "@/components/roulette/RouletteWheel";
import RoulettePredictorsPanel from "@/components/roulette/RoulettePredictorsPanel";
import RouletteStatsPanel from "@/components/roulette/RouletteStatsPanel";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";
import RoulettePredictorHistoryCard from "@/components/roulette/RoulettePredictorHistoryCard";
import ConfirmDialog from "@/components/ConfirmDialog";

import {
    createDefaultSlots,
    createRouletteTemplate,
    getSampleRouletteTemplates,
    getHighLowZone,
    type RouletteSettings,
} from "@/lib/roulette";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Hooks
import { useRouletteState } from "./hooks/useRouletteState";
import { useRouletteEngine } from "./hooks/useRouletteEngine";
import { useRouletteSidebar } from "./hooks/useRouletteSidebar";
import { useRouletteDrag } from "./hooks/useRouletteDrag";

// Components
import { RouletteOrbsBackground } from "./components/RouletteOrbsBackground";

const WHEEL_OUTER_PX = 380 + 48;

export default function RouletteContent({
    isSplitMode = false,
    isRightPane: _isRightPane = false,
}: {
    isSplitMode?: boolean;
    isRightPane?: boolean;
} = {}) {
    const {
        slots, setSlots,
        settings, setSettings,
        predictors, setPredictors,
        templates, setTemplates,
        history, setHistory,
        hitHistory, setHitHistory,
    } = useRouletteState();
    const { isLightMode, toggleTheme } = useTheme();
    const sidebar = useRouletteSidebar();
    const engine = useRouletteEngine({
        slots: slots,
        settings: settings,
        predictors: predictors,
        setHistory: setHistory,
        setHitHistory: setHitHistory,
    });

    const wheelAreaRef = useRef<HTMLDivElement>(null);
    const drag = useRouletteDrag(settings, setSettings, wheelAreaRef);

    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
    const [showClearHitHistoryConfirm, setShowClearHitHistoryConfirm] = useState(false);
    const [wheelScale, setWheelScale] = useState(1);

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

    const handleClearHistory = () => {
        setHistory([]);
        setHitHistory([]);
    };

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

    const handleOverwriteTemplate = (templateId: string, templateName: string) => {
        if (!window.confirm(`現在の設定でテンプレート「${templateName}」を上書きしますか？`)) return;
        setTemplates((prev) =>
            prev.map((t) =>
                t.id === templateId
                    ? { ...t, slots: [...slots], settings: { ...settings }, savedAt: Date.now() }
                    : t
            )
        );
    };

    const handleDeleteTemplate = (templateId: string) => {
        const t = templates.find((x) => x.id === templateId);
        if (!t) return;
        if (!window.confirm(`テンプレート「${t.name}」を削除しますか？`)) return;
        setTemplates((prev) => prev.filter((x) => x.id !== templateId));
    };

    const { glassBorder } = useGlassStyle(isLightMode);
    const accentColor = settings.accentColor ?? "#a855f7";
    const orbIntensity = settings.orbIntensity ?? 50;
    const headerBgSolid = isLightMode ? "rgb(255,255,255)" : "rgb(20,10,40)";
    const displayLight = isLightMode;
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const showHamburger = isSplitMode || !isDesktop;
    const showSidebar = (!isSplitMode && isDesktop) || sidebar.sidebarOpen;

    const effectiveSettings = useMemo<RouletteSettings>(() => ({
        ...settings,
        style: (settings.style as string) === "needle" ? "minimal" : settings.style,
    }), [settings]);

    const splitLightBg = "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";

    const sidebarContent = (
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col mt-3 px-3">
            {sidebar.sidebarTab === "slots" && (
                <RouletteSetup
                    slots={slots} onSlotsChange={setSlots} isLightMode={isLightMode} section="slots"
                    slotColorOverrides={settings.slotColorOverrides}
                    onSlotColorChange={(index, color) => {
                        setSettings((prev) => {
                            const next = { ...(prev.slotColorOverrides ?? {}) };
                            if (color === null) delete next[index];
                            else next[index] = color;
                            return { ...prev, slotColorOverrides: next };
                        });
                    }}
                />
            )}
            {sidebar.sidebarTab === "templates" && (
                <RouletteSetup
                    slots={slots} onSlotsChange={setSlots} isLightMode={isLightMode} templates={templates}
                    sampleTemplates={getSampleRouletteTemplates()} currentSettings={settings}
                    onSaveTemplate={handleSaveTemplate} onLoadTemplate={handleLoadTemplate}
                    onOverwriteTemplate={handleOverwriteTemplate} onDeleteTemplate={handleDeleteTemplate}
                    section="templates"
                />
            )}
            {sidebar.sidebarTab === "predictors" && (
                <RoulettePredictorsPanel
                    predictors={predictors} onChange={setPredictors} slots={slots}
                    resultLabel={engine.resultIndex !== null ? (slots[engine.resultIndex] ?? null) : null}
                    resultZone={settings.predictorMode === "highLow" && engine.resultIndex !== null ? getHighLowZone(engine.resultIndex, slots.length) : null}
                    predictorMode={settings.predictorMode} isLightMode={isLightMode} hitHistory={hitHistory}
                    onViewPredictorHistory={sidebar.setPredictorHistoryId} onRequestClearHitHistory={() => setShowClearHitHistoryConfirm(true)}
                />
            )}
            {sidebar.sidebarTab === "stats" && (
                <RouletteStatsPanel
                    history={history} slots={slots} onClear={() => setShowClearHistoryConfirm(true)}
                    isLightMode={isLightMode} accentColor={accentColor}
                    showBarChart={settings.statsShowBarChart !== false} showPieChart={settings.statsShowPieChart === true}
                />
            )}
        </div>
    );

    return (
        <div className={`flex flex-col overflow-hidden relative z-10 min-w-0 pt-14 ${isSplitMode ? "h-full w-full" : "h-screen w-screen"}`} style={{ "--accent-color": accentColor } as React.CSSProperties}>
            {isSplitMode && isLightMode && <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />}
            {settings.backgroundEnabled && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: settings.backgroundColor ?? "#1a1a2e", opacity: (settings.backgroundOpacity ?? 100) / 100 }} />
            )}
            <RouletteOrbsBackground isLightMode={isLightMode} accentColor={accentColor} orbIntensity={orbIntensity} />

            <div className={`${isSplitMode ? "absolute" : "fixed"} top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 min-h-[56px] max-md:h-14 max-md:min-h-0 shrink-0`} style={{ background: headerBgSolid, borderBottom: `1px solid ${glassBorder}` }}>
                <div className="flex items-center gap-2">
                    {showHamburger && (
                        <button onClick={() => sidebar.setSidebarOpen(!sidebar.sidebarOpen)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`} title="メニュー" aria-label="メニュー"><Menu size={18} /></button>
                    )}
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} accentColor={accentColor} />}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className={`p-2 rounded-xl transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                        {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    <button onClick={() => setShowSettingsPanel(true)} className={`p-2 rounded-xl transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}><Settings size={18} /></button>
                </div>
            </div>

            <RouletteHitEffect show={engine.showHitEffect} onComplete={() => engine.setShowHitEffect(false)} accentColor={accentColor} hitNames={engine.hitNames} effectLevel={effectiveSettings.effectLevel ?? "low"} />

            <AnimatePresence>
                {showSettingsPanel && (
                    <RouletteSettingsPanel settings={effectiveSettings} onSettingsChange={setSettings} isLightMode={isLightMode} onClose={() => setShowSettingsPanel(false)} />
                )}
            </AnimatePresence>

            <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-0 p-4 overflow-auto scroll-touch relative z-10">
                {!isSplitMode && isDesktop ? (
                    <>
                        <aside className="h-full flex flex-col overflow-hidden shrink-0 pr-3 min-w-0" style={{ width: sidebar.sidebarWidthPx, minWidth: 200, maxWidth: 720, borderRight: `1px solid ${glassBorder}` }}>
                            <div className="flex border-b shrink-0 flex-wrap gap-2 px-3 pt-3 pb-2" style={{ borderColor: glassBorder }}>
                                {(["slots", "templates", "predictors", "stats"] as const).map((tab) => (
                                    <button key={tab} type="button" onClick={() => sidebar.setSidebarTab(tab)} className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-lg ${sidebar.sidebarTab === tab ? (isLightMode ? "bg-white/90 text-gray-800 border border-purple-500" : "bg-white/10 text-white border border-purple-400") : (isLightMode ? "text-gray-600 hover:bg-gray-100 border border-transparent" : "text-white/60 hover:bg-white/5 border border-transparent")}`}>{tab === "slots" ? "スロット" : tab === "templates" ? "テンプレート" : tab === "predictors" ? "予想" : "統計"}</button>
                                ))}
                            </div>
                            {sidebarContent}
                        </aside>
                        <div role="separator" aria-label="サイドバー幅を調節" onMouseDown={sidebar.handleSidebarResizeStart} onTouchStart={sidebar.handleSidebarResizeTouchStart} className="shrink-0 w-4 h-full cursor-col-resize select-none flex items-center justify-center group touch-manipulation" style={{ minWidth: 16 }}>
                            <span className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: glassBorder }} />
                        </div>
                    </>
                ) : (
                    <AnimatePresence>
                        {showSidebar && !isDesktop && (
                            <motion.div key="roulette-sidebar-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[38] bg-black/50" onClick={() => sidebar.setSidebarOpen(false)} aria-hidden />
                        )}
                        {showSidebar && (
                            <motion.aside
                                key="roulette-sidebar" initial={isDesktop ? { width: 0, opacity: 0 } : { x: "-100%" }} animate={isDesktop ? { width: "auto", opacity: 1 } : { x: 0 }} exit={isDesktop ? { width: 0, opacity: 0 } : { x: "-100%" }} transition={isDesktop ? undefined : { type: "spring", damping: 25, stiffness: 300 }}
                                className={`shrink-0 flex flex-col min-h-0 overflow-hidden ${isSplitMode ? "absolute top-14 left-0 right-0 bottom-0 max-md:top-14 z-40" : "max-md:fixed max-md:left-0 max-md:top-14 max-md:bottom-0 max-md:z-40 max-md:shadow-2xl md:relative md:w-72"}`}
                                style={!isDesktop && !isSplitMode ? { width: "min(320px, 90vw)", maxWidth: "min(320px, 90vw)", background: headerBgSolid } : undefined}
                            >
                                <div className={`flex items-center border-b shrink-0 gap-2 px-3 pb-2 ${!isDesktop && !isSplitMode ? "pt-3 mt-1" : "pt-3"}`} style={{ borderColor: glassBorder, background: !isDesktop && !isSplitMode ? headerBgSolid : undefined }}>
                                    <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                                        {(["slots", "templates", "predictors", "stats"] as const).map((tab) => (
                                            <button key={tab} type="button" onClick={() => sidebar.setSidebarTab(tab)} className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-lg touch-manipulation ${sidebar.sidebarTab === tab ? (isLightMode ? "bg-white/90 text-gray-800 border border-purple-500" : "bg-white/10 text-white border border-purple-400") : (isLightMode ? "text-gray-600 hover:bg-gray-100 border border-transparent" : "text-white/60 hover:bg-white/5 border border-transparent")}`}>{tab === "slots" ? "スロット" : tab === "templates" ? "テンプレート" : tab === "predictors" ? "予想" : "統計"}</button>
                                        ))}
                                    </div>
                                    {showHamburger && <button type="button" onClick={() => sidebar.setSidebarOpen(false)} className={`shrink-0 p-2 rounded-lg touch-manipulation ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`} aria-label="メニューを閉じる"><X size={20} /></button>}
                                </div>
                                {sidebarContent}
                            </motion.aside>
                        )}
                    </AnimatePresence>
                )}

                <div ref={wheelAreaRef} className="flex-1 min-w-0 flex flex-col overflow-auto scroll-touch pt-14 pb-10 max-md:pt-14 max-md:pb-8 md:pl-4 relative">
                    {!isSplitMode && settings.showProjectName && (settings.projectName ?? "").trim() && (
                        <p
                            role="presentation" className="absolute text-lg sm:text-xl font-bold tracking-wide select-none z-20 cursor-grab active:cursor-grabbing touch-none"
                            style={{ left: settings.projectNamePosition?.x, top: settings.projectNamePosition?.y, color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}
                            onPointerDown={drag.handleProjectNamePointerDown} onPointerMove={drag.handleProjectNamePointerMove} onPointerUp={drag.handleProjectNamePointerUp} onPointerCancel={drag.handleProjectNamePointerUp}
                        >
                            {(settings.projectName ?? "").trim()}
                        </p>
                    )}
                    <div className="min-h-full flex flex-col w-full">
                        <div className="flex-1 min-h-0 shrink-0" aria-hidden />
                        <div className={`flex flex-col items-center gap-3 shrink-0 ${isSplitMode ? "mt-[68px] max-md:mt-[72px]" : "mt-8"}`}>
                            <div
                                style={{
                                    position: "relative", width: "100%", maxWidth: WHEEL_OUTER_PX * wheelScale * ((settings.wheelSizePercent ?? 100) / 100), margin: "0 auto",
                                    height: (WHEEL_OUTER_PX + 200) * wheelScale * ((settings.wheelSizePercent ?? 100) / 100), flexShrink: 0,
                                }}
                            >
                                <div style={{ position: "absolute", left: "50%", top: 0, transform: `translateX(-50%) scale(${wheelScale * ((settings.wheelSizePercent ?? 100) / 100)})`, transformOrigin: "center top", width: WHEEL_OUTER_PX }}>
                                    <RouletteWheel
                                        slots={slots} style={effectiveSettings.style} isSpinning={engine.isSpinning} targetIndex={engine.spinTargetIndex} resultIndex={engine.resultIndex}
                                        spinKey={engine.spinKey} onSpin={engine.handleSpin} onSpinEnd={engine.handleSpinEnd} onSpinStart={engine.playSpinLoop} skipRequested={engine.skipRequested}
                                        onSkipRequest={() => engine.setSkipRequested(true)} accentColor={accentColor} isLightMode={isLightMode} maxVisibleLabels={settings.maxVisibleLabels}
                                        wheelOffsetIndex={settings.wheelOffsetIndex} effectLevel={effectiveSettings.effectLevel ?? "low"}
                                        resultSlot={engine.resultIndex !== null && slots[engine.resultIndex] !== undefined ? <p className={`text-lg font-bold ${isLightMode ? "text-gray-800" : "text-white"}`}>結果: {slots[engine.resultIndex]}</p> : undefined}
                                        segmentColors={effectiveSettings.style === "custom" ? (effectiveSettings.segmentColors?.length ? effectiveSettings.segmentColors : ["#b91c1c", "#1f2937"]) : undefined}
                                        slotColorOverrides={settings.slotColorOverrides}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 shrink-0" aria-hidden />
                    </div>
                </div>
            </main>

            {sidebar.predictorHistoryId != null && (() => {
                const predictor = predictors.find((p) => p.id === sidebar.predictorHistoryId);
                return predictor ? (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => sidebar.setPredictorHistoryId(null)}>
                        <div onClick={(e) => e.stopPropagation()}><RoulettePredictorHistoryCard predictor={predictor} hitHistory={hitHistory} isLightMode={isLightMode} onClose={() => sidebar.setPredictorHistoryId(null)} /></div>
                    </div>
                ) : null;
            })()}

            <ConfirmDialog open={showClearHistoryConfirm} title="確認" message="記録をリセットしますか？" confirmLabel="リセットする" cancelLabel="キャンセル" onConfirm={() => { handleClearHistory(); setShowClearHistoryConfirm(false); }} onCancel={() => setShowClearHistoryConfirm(false)} />
            <ConfirmDialog open={showClearHitHistoryConfirm} title="確認" message="記録をリセットしますか？予想のあたり履歴のみクリアされます。" confirmLabel="リセットする" cancelLabel="キャンセル" onConfirm={() => { setHitHistory([]); setShowClearHitHistoryConfirm(false); }} onCancel={() => setShowClearHitHistoryConfirm(false)} />
        </div>
    );
}
