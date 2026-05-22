"use client";

import { useState, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings, X, Zap, RotateCw, Play, Plus, Minus, Share2 } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import RouletteSetup from "@/components/roulette/RouletteSetup";
import RouletteSettingsPanel from "@/components/roulette/RouletteSettingsPanel";
import { useTheme } from "@/context/ThemeContext";

import RouletteWheel from "@/components/roulette/RouletteWheel";
import RoulettePredictorsPanel from "@/components/roulette/RoulettePredictorsPanel";
import RouletteStatsPanel from "@/components/roulette/RouletteStatsPanel";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";
import RoulettePredictorHistoryCard from "@/components/roulette/RoulettePredictorHistoryCard";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/components/Toast";

import {
    createDefaultSlots,
    createRouletteTemplate,
    getSampleRouletteTemplates,
    getHighLowZone,
    type RouletteSettings,
} from "@/lib/roulette";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Image Share
import { toPng } from "html-to-image";
import ShareModal from "@/components/ShareModal";
import { shareImageWithText, getTimestampForFilename } from "@/lib/share";

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
    const isDesktop = useMediaQuery("(min-width: 768px)");
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
    const { confirm } = useConfirm();
    const { showToast } = useToast();
    const [wheelScale, setWheelScale] = useState(1);

    // オートスピン＆画像共有用ステートとレフ
    const [customAutoCount, setCustomAutoCount] = useState(10);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
    const [shareText, setShareText] = useState("");
    const autoSpinModalRef = useRef<HTMLDivElement>(null);
    const wheelCaptureRef = useRef<HTMLDivElement>(null);

    // 単発結果の画像共有ハンドラ
    const handleShareSingleResult = useCallback(async () => {
        if (!wheelCaptureRef.current || engine.resultIndex === null) return;
        try {
            const dataUrl = await toPng(wheelCaptureRef.current, {
                backgroundColor: isLightMode ? "#ffffff" : "#111827",
                pixelRatio: 2,
                skipFonts: true,
            });
            const resultLabel = slots[engine.resultIndex] ?? "";
            const text = `🎡 ルーレットを回しました！\n結果: 【${resultLabel}】\n#だんごツール`;
            const filename = `roulette-result-${getTimestampForFilename()}.png`;
            const isMobile = !isDesktop || isSplitMode;

            if (isMobile) {
                const shared = await shareImageWithText(dataUrl, text, filename);
                if (shared) return;
            }

            setCapturedDataUrl(dataUrl);
            setShareText(text);
            setIsShareModalOpen(true);
        } catch (err) {
            console.error("Failed to export roulette result image:", err);
        }
    }, [engine.resultIndex, slots, isLightMode, isDesktop, isSplitMode]);

    // オートスピン集計結果の画像共有ハンドラ
    const handleShareAutoSpinResult = useCallback(async () => {
        if (!autoSpinModalRef.current || !engine.autoSpinStats) return;
        try {
            const dataUrl = await toPng(autoSpinModalRef.current, {
                backgroundColor: isLightMode ? "#ffffff" : "#111827",
                pixelRatio: 2,
                skipFonts: true,
            });
            const text = `🎡 ルーレットオートプレイ結果（${engine.autoSpinStats.spins}回転）\n#だんごツール`;
            const filename = `roulette-autospin-${getTimestampForFilename()}.png`;
            const isMobile = !isDesktop || isSplitMode;

            if (isMobile) {
                const shared = await shareImageWithText(dataUrl, text, filename);
                if (shared) return;
            }

            setCapturedDataUrl(dataUrl);
            setShareText(text);
            setIsShareModalOpen(true);
        } catch (err) {
            console.error("Failed to export roulette autospin result image:", err);
        }
    }, [engine.autoSpinStats, isLightMode, isDesktop, isSplitMode]);

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
        showToast(`テンプレート「${name.trim()}」を新規保存しました 💾`, "success");
    };

    const handleLoadTemplate = (templateId: string) => {
        const sample = getSampleRouletteTemplates().find((x) => x.id === templateId);
        const t = sample ?? templates.find((x) => x.id === templateId);
        if (t) {
            setSlots(t.slots.length > 0 ? [...t.slots] : createDefaultSlots(13));
            if (t.settings && Object.keys(t.settings).length > 0) {
                setSettings((prev) => ({ ...prev, ...t.settings }));
            }
            showToast(`テンプレート「${t.name}」を適用しました 💾`, "success");
        }
    };

    const handleOverwriteTemplate = async (templateId: string, templateName: string) => {
        if (await confirm({ title: "テンプレート上書き", message: `現在の設定でテンプレート「${templateName}」を上書きしますか？`, danger: true })) {
            setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, slots: [...slots], settings: { ...settings }, savedAt: Date.now() } : t));
            showToast(`テンプレート「${templateName}」を上書き保存しました 💾`, "success");
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        const name = templates.find(t => t.id === templateId)?.name;
        if (await confirm({ title: "テンプレート削除", message: `テンプレート「${name}」を削除しますか？`, danger: true })) {
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            showToast(`テンプレート「${name}」を削除しました 🗑️`, "success");
        }
    };

    const { glassBorder } = useGlassStyle(isLightMode);
    const accentColor = settings.accentColor ?? "#a855f7";
    const orbIntensity = settings.orbIntensity ?? 50;
    const headerBgSolid = isLightMode ? "rgb(255,255,255)" : "rgb(20,10,40)";
    const displayLight = isLightMode;
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
                    onViewPredictorHistory={sidebar.setPredictorHistoryId} onRequestClearHitHistory={async () => {
                        if (await confirm({ title: "確認", message: "記録をリセットしますか？予想のあたり履歴のみクリアされます。", danger: true })) {
                            setHitHistory([]);
                        }
                    }}
                />
            )}
            {sidebar.sidebarTab === "stats" && (
                <RouletteStatsPanel
                    history={history} slots={slots} onClear={async () => {
                        if (await confirm({ title: "確認", message: "記録をリセットしますか？", danger: true })) {
                            handleClearHistory();
                        }
                    }}
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
                                    height: (WHEEL_OUTER_PX + 40) * wheelScale * ((settings.wheelSizePercent ?? 100) / 100), flexShrink: 0,
                                }}
                            >
                                <div ref={wheelCaptureRef} style={{ position: "absolute", left: "50%", top: 0, transform: `translateX(-50%) scale(${wheelScale * ((settings.wheelSizePercent ?? 100) / 100)})`, transformOrigin: "center top", width: WHEEL_OUTER_PX }} className="p-4 rounded-3xl bg-transparent flex flex-col items-center">
                                    <RouletteWheel
                                        slots={slots} style={effectiveSettings.style} isSpinning={engine.isSpinning} targetIndex={engine.spinTargetIndex} resultIndex={engine.resultIndex}
                                        spinKey={engine.spinKey} onSpin={engine.handleSpin} onSpinEnd={engine.handleSpinEnd} onSpinStart={engine.playSpinLoop} skipRequested={engine.skipRequested}
                                        onSkipRequest={() => engine.setSkipRequested(true)} accentColor={accentColor} isLightMode={isLightMode} maxVisibleLabels={settings.maxVisibleLabels}
                                        wheelOffsetIndex={settings.wheelOffsetIndex} effectLevel={effectiveSettings.effectLevel ?? "low"}
                                        segmentColors={effectiveSettings.style === "custom" ? (effectiveSettings.segmentColors?.length ? effectiveSettings.segmentColors : ["#b91c1c", "#1f2937"]) : undefined}
                                        slotColorOverrides={settings.slotColorOverrides}
                                        isTurboMode={engine.isTurboMode}
                                        hideControls={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Result Slot Display */}
                        {engine.resultIndex !== null && slots[engine.resultIndex] !== undefined && !engine.isSpinning && engine.autoSpinRemaining <= 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-center mb-2 z-30 shrink-0"
                            >
                                <span className={`px-4 py-2 rounded-full text-base font-black shadow-md border ${
                                    isLightMode ? "bg-white/95 border-purple-100 text-gray-800" : "bg-white/10 border-white/10 text-white"
                                }`}>
                                    結果: {slots[engine.resultIndex]}
                                </span>
                            </motion.div>
                        )}

                        {/* Control Bar (Unified design with slots for UI consistency) */}
                        <div className="flex items-center justify-center gap-3 mt-4 max-md:mt-2 z-30 shrink-0">
                            {/* Share button */}
                            {engine.resultIndex !== null && !engine.isSpinning && engine.autoSpinRemaining <= 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleShareSingleResult}
                                    className={`p-4 rounded-full transition-all ${
                                        isLightMode ? "bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200" : "bg-white/10 hover:bg-white/20 text-purple-300 border border-white/10"
                                    }`}
                                    title="結果を画像で共有"
                                >
                                    <Share2 size={22} />
                                </motion.button>
                            )}

                            {/* Main SPIN / STOP Button */}
                            <div className="mx-1">
                                {engine.autoSpinRemaining > 0 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={engine.stopAutoSpin}
                                        className="px-8 py-4 rounded-full font-black text-lg tracking-wider shadow-lg bg-red-500 text-white hover:bg-red-600 min-w-[140px]"
                                        style={{ "--btn-glow-color": "#ef4444" } as React.CSSProperties}
                                    >
                                        STOP ({engine.autoSpinRemaining === Infinity ? "∞" : engine.autoSpinRemaining})
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={engine.handleSpin}
                                        disabled={engine.isSpinning || slots.length === 0}
                                        className={`px-8 py-4 rounded-full font-black text-lg tracking-wider shadow-lg min-w-[140px] ${
                                            engine.isSpinning ? "opacity-50 grayscale scale-[0.98]" : ""
                                        }`}
                                        style={{
                                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                                            color: "white",
                                            "--btn-glow-color": accentColor,
                                        } as React.CSSProperties}
                                    >
                                        {engine.isSpinning ? "回転中…" : "回す"}
                                    </motion.button>
                                )}
                            </div>

                            {/* Power Play Config Hub */}
                            <div className="relative group flex items-center">
                                <motion.button
                                    disabled={engine.autoSpinRemaining > 0 || engine.isSpinning}
                                    className={`p-4 rounded-full transition-all ${
                                        engine.autoSpinRemaining > 0
                                            ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                            : isLightMode ? "text-gray-400 hover:bg-amber-50 hover:text-amber-500" : "text-white/40 hover:bg-white/10 hover:text-amber-400"
                                    } ${engine.isSpinning && engine.autoSpinRemaining <= 0 ? "opacity-30 cursor-not-allowed grayscale" : ""}`}
                                    title="パワープレイ設定（速度＆自動回転）"
                                >
                                    <Zap size={22} className={engine.autoSpinRemaining > 0 || engine.isTurboMode ? "fill-current" : ""} />
                                </motion.button>

                                {/* Popover */}
                                {!engine.isSpinning && engine.autoSpinRemaining <= 0 && (
                                    <div className="absolute bottom-full right-0 pb-2 hidden group-hover:flex group-focus-within:flex flex-col animate-fadeIn" style={{ zIndex: 50 }}>
                                        <div className={`flex flex-col p-3 rounded-2xl backdrop-blur-2xl shadow-2xl border ${isLightMode ? "bg-white/95 border-gray-200" : "bg-gray-900/95 border-white/10"}`} style={{ minWidth: "220px" }}>
                                            {/* Speed Selection */}
                                            <div className="mb-3">
                                                <div className={`text-[10px] font-black tracking-widest mb-1.5 px-1 ${isLightMode ? "text-gray-400" : "text-gray-500"}`}>SPEED (速度)</div>
                                                <div className={`flex rounded-lg p-1 ${isLightMode ? "bg-gray-100" : "bg-black/40"}`}>
                                                    <button
                                                        onClick={() => engine.setIsTurboMode(false)}
                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!engine.isTurboMode ? (isLightMode ? "bg-white text-gray-800 shadow-sm" : "bg-white/20 text-white shadow-sm") : (isLightMode ? "text-gray-400 hover:text-gray-600" : "text-white/40 hover:text-white/70")}`}
                                                    >
                                                        通常
                                                    </button>
                                                    <button
                                                        onClick={() => engine.setIsTurboMode(true)}
                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${engine.isTurboMode ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : (isLightMode ? "text-gray-400 hover:text-gray-600" : "text-white/40 hover:text-white/70")}`}
                                                    >
                                                        <Zap size={12} className={engine.isTurboMode ? "fill-current" : ""} />
                                                        高速
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Auto Spin Count */}
                                            <div className="mb-3">
                                                <div className={`text-[10px] font-black tracking-widest mb-1.5 px-1 ${isLightMode ? "text-gray-400" : "text-gray-500"}`}>AUTO SPIN (自動回転)</div>
                                                <div className="flex flex-col gap-1">
                                                    {[10, 50, 100, Infinity].map((count) => (
                                                        <button
                                                            key={count}
                                                            onClick={() => engine.startAutoSpin(count)}
                                                            className={`px-3 py-2.5 rounded-xl text-sm font-bold transition flex justify-between items-center ${isLightMode ? "hover:bg-amber-100 text-amber-700" : "hover:bg-amber-500/20 text-amber-300"}`}
                                                        >
                                                            <span>{count === Infinity ? "無限 (INFINITE)" : `${count} 回`}</span>
                                                            <RotateCw size={14} className="opacity-50" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Custom Count */}
                                            <div>
                                                <div className={`text-[10px] font-black tracking-widest mb-1.5 px-1 ${isLightMode ? "text-gray-400" : "text-gray-500"}`}>CUSTOM (カスタム指定)</div>
                                                <div className={`flex items-center rounded-xl p-1 ${isLightMode ? "bg-gray-100" : "bg-black/40"}`}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomAutoCount((prev) => Math.max(1, prev - 10));
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-white text-gray-500 hover:shadow-sm" : "hover:bg-white/10 text-gray-400"}`}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="9999"
                                                        value={customAutoCount}
                                                        onChange={(e) => setCustomAutoCount(Math.max(1, Math.min(9999, parseInt(e.target.value) || 1)))}
                                                        className={`flex-1 w-12 text-center font-black text-sm bg-transparent outline-none border-none [&::-webkit-inner-spin-button]:appearance-none ${isLightMode ? "text-gray-800" : "text-white"}`}
                                                        style={{ MozAppearance: "textfield" }}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomAutoCount((prev) => Math.min(9999, prev + 10));
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-white text-gray-500 hover:shadow-sm" : "hover:bg-white/10 text-gray-400"}`}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                    <div className={`w-px h-6 mx-1 ${isLightMode ? "bg-gray-300" : "bg-white/10"}`}></div>
                                                    <button
                                                        onClick={() => engine.startAutoSpin(customAutoCount)}
                                                        className="p-2 ml-1 rounded-lg bg-amber-500 text-white shadow-md shadow-amber-500/30 hover:bg-amber-400 transition-all flex items-center justify-center"
                                                    >
                                                        <Play size={14} className="fill-current ml-0.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
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

            {/* オートスピン集計結果モーダル */}
            <AnimatePresence>
                {engine.autoSpinStats && engine.autoSpinRemaining <= 0 && !engine.isSpinning && engine.autoSpinStats.spins > 0 && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 relative flex flex-col gap-4 overflow-hidden ${
                                isLightMode
                                    ? "bg-white/95 border-gray-200 text-gray-800"
                                    : "bg-gray-900/95 border-white/10 text-white"
                            }`}
                        >
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

                            <div ref={autoSpinModalRef} className={`flex flex-col gap-4 p-4 rounded-2xl w-full ${isLightMode ? "bg-white" : "bg-gray-950 border border-white/5 text-white"}`}>
                                <div className="flex flex-col items-center gap-1 text-center">
                                    <span className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-1">
                                        <RotateCw size={24} className="animate-spin-slow" />
                                    </span>
                                    <h3 className="text-lg font-black tracking-wide">オートプレイ集計結果</h3>
                                    <p className={`text-xs ${isLightMode ? "text-gray-400" : "text-white/40"}`}>🎡 ルーレット自動回転の集計データ</p>
                                </div>

                                <div className={`grid grid-cols-2 gap-3 p-3 rounded-2xl border ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-black/20 border-white/5"}`}>
                                    <div className="flex flex-col items-center justify-center p-1">
                                        <span className={`text-[10px] font-bold ${isLightMode ? "text-gray-400" : "text-white/40"}`}>総回転数</span>
                                        <span className="text-xl font-black mt-0.5 text-purple-500">{engine.autoSpinStats.spins} 回</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-1">
                                        <span className={`text-[10px] font-bold ${isLightMode ? "text-gray-400" : "text-white/40"}`}>参加予想者数</span>
                                        <span className="text-xl font-black mt-0.5 text-amber-500">
                                            {predictors.filter(p => p.participating !== false).length} 名
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 overflow-y-auto max-h-[220px] pr-1">
                                    <div>
                                        <h4 className="text-xs font-black tracking-wider mb-2 text-purple-500">🎰 出目の当選回数</h4>
                                        <div className="flex flex-col gap-2">
                                            {slots.map((label, idx) => {
                                                const count = engine.autoSpinStats?.hitSlots[idx] ?? 0;
                                                const pct = engine.autoSpinStats ? (count / engine.autoSpinStats.spins) * 100 : 0;
                                                return (
                                                    <div key={idx} className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center text-[11px] font-bold">
                                                            <span className="truncate max-w-[150px]">{label}</span>
                                                            <span className={isLightMode ? "text-gray-500" : "text-white/60"}>
                                                                {count}回 ({pct.toFixed(0)}%)
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accentColor }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <hr className={isLightMode ? "border-gray-150" : "border-white/5"} />

                                    <div>
                                        <h4 className="text-xs font-black tracking-wider mb-2 text-amber-500">🎯 予想者的中数ランキング</h4>
                                        <div className="flex flex-col gap-2">
                                            {predictors
                                                .filter(p => p.participating !== false)
                                                .map(p => ({
                                                    ...p,
                                                    count: engine.autoSpinStats?.hitPredictors[p.id] ?? 0,
                                                }))
                                                .sort((a, b) => b.count - a.count)
                                                .map((p, idx) => {
                                                    const pct = engine.autoSpinStats ? (p.count / engine.autoSpinStats.spins) * 100 : 0;
                                                    return (
                                                        <div key={p.id} className="flex flex-col gap-1">
                                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                                                <span className="truncate max-w-[150px] flex items-center gap-1">
                                                                    <span className="text-[9px] opacity-40">#{idx + 1}</span>
                                                                    {p.name || "名前なし"}
                                                                    <span className={`text-[9px] px-1 py-0.5 rounded-full ${isLightMode ? "bg-gray-100 text-gray-500" : "bg-white/5 text-white/40 border border-white/5"}`}>
                                                                        {p.prediction || "未入力"}
                                                                    </span>
                                                                </span>
                                                                <span className="text-amber-500">
                                                                    {p.count}回的中 ({pct.toFixed(0)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full transition-all bg-amber-500" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleShareAutoSpinResult}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 size={16} />
                                    画像で共有
                                </button>
                                <button
                                    onClick={() => {
                                        engine.setAutoSpinStats(null);
                                    }}
                                    className={`py-3 px-6 rounded-xl font-bold transition-all border ${
                                        isLightMode
                                            ? "bg-gray-150 border-gray-200 hover:bg-gray-200 text-gray-700"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                    }`}
                                >
                                    閉じる
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 共通の画像共有モーダル */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                dataUrl={capturedDataUrl}
                initialText={shareText}
                toolId="roulette"
                isLightMode={isLightMode}
            />

        </div>
    );
}
