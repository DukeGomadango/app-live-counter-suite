"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, Sparkles, BarChart3, Sun, Moon, Menu, X, Package, ChevronDown, Save } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import GachaSetup from "@/components/gacha/GachaSetup";
import GachaPresetsPanel from "@/components/gacha/GachaPresetsPanel";
import GachaRollAnimation from "@/components/gacha/GachaRollAnimation";
import GachaResultDisplay from "@/components/gacha/GachaResultDisplay";
import GachaPlayerManager from "@/components/gacha/GachaPlayerManager";
import PlayerHistoryCard from "@/components/gacha/PlayerHistoryCard";
import GachaSwitchDropdown from "@/components/gacha/GachaSwitchDropdown";
import GachaDistributionPanel from "@/components/gacha/GachaDistributionPanel";
import { FiGift } from "react-icons/fi";

import { 
  type GachaPoolPreset, 
  clonePoolKeepingIds, 
  getSampleTemplates, 
  migratePoolItemsForLink 
} from "@/lib/gacha";
import { DEFAULT_EXTRA_HASHTAG } from "@/lib/site";
import { useGlassStyle } from "@/hooks/useGlassStyle";

// Hooks
import { useGachaState } from "./hooks/useGachaState";
import { useGachaEngine } from "./hooks/useGachaEngine";
import { useGachaSidebar } from "./hooks/useGachaSidebar";

// Components
import { GachaSettingsPanel } from "./components/GachaSettingsPanel";
import { ItemHistoryPanel } from "./components/ItemHistoryPanel";

type MobileTab = "setup" | "gacha" | "results" | "players" | "items" | "distribute";
type SidebarTab = "setup" | "players" | "items" | "presets" | "distribute";

export default function GachaContent({ isSplitMode = false, isRightPane: _isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
    // -- Hooks --
    const state = useGachaState();
    const sidebar = useGachaSidebar();
    
    const isIntegrationEnabled = process.env.NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION === 'true';

    const engine = useGachaEngine({
        pool: state.pool,
        players: state.players,
        setPlayers: state.setPlayers,
        activePlayerId: state.activePlayerId,
        setActivePlayerId: state.setActivePlayerId,
        integrationConfig: state.integrationConfig,
        setLatestResults: state.setLatestResults,
        gachaSettings: state.gachaSettings,
        isMobile: false, // Will be updated below
        setMobileTab: sidebar.setMobileTab
    });

    const [isMobile, setIsMobile] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const presets = useLocalStorage<GachaPoolPreset[]>("gacha-presets", [])[0] || [];

    // Update engine isMobile
    useEffect(() => {
        const check = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const activePlayer = useMemo(() => 
        state.players.find(p => p.id === state.activePlayerId)
    , [state.players, state.activePlayerId]);

    const sampleTemplates = useMemo(() => getSampleTemplates(), []);

    const handleGachaSwitch = useCallback((value: string) => {
        if (!value) return;
        if (value.startsWith("sample:")) {
            const id = value.slice(7);
            const t = sampleTemplates.find(s => s.id === id);
            if (t) state.setPool(migratePoolItemsForLink(clonePoolKeepingIds(t.pool)));
        } else if (value.startsWith("preset:")) {
            const id = value.slice(7);
            const pre = presets.find(p => p.id === id);
            if (pre) state.setPool(migratePoolItemsForLink(clonePoolKeepingIds(pre.pool)));
        }
    }, [presets, sampleTemplates, state.setPool]);

    const { glassBorder } = useGlassStyle(state.isLightMode);
    const displayLight = state.isLightMode;
    const headerBg = displayLight ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";
    const orbColorForLayer = state.gachaSettings.orbColor ?? state.gachaSettings.accentColor ?? "#a855f7";
    const orbIntensity = state.gachaSettings.orbIntensity ?? 50;

    const orbsLayer = (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${displayLight ? "mix-blend-multiply opacity-20" : "opacity-80"}`}>
            <motion.div
                animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
                style={{ background: `radial-gradient(circle, ${orbColorForLayer} 0%, transparent 70%)`, opacity: (orbIntensity / 100) * (displayLight ? 1.5 : 1) }}
            />
            <motion.div
                animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
                style={{ background: `radial-gradient(circle, ${orbColorForLayer} 0%, transparent 60%)`, opacity: (orbIntensity / 100) * 0.8 * (displayLight ? 1.5 : 1) }}
            />
            <motion.div
                animate={{ x: [0, 50, -100, 0], y: [0, 50, -100, 0], scale: [1, 1.1, 0.9, 1] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute top-[40%] left-[30%] w-[40rem] h-[40rem] rounded-full blur-[100px]"
                style={{ background: `radial-gradient(circle, ${orbColorForLayer} 0%, transparent 60%)`, opacity: (orbIntensity / 100) * 0.6 * (displayLight ? 1.5 : 1) }}
            />
        </div>
    );

    const rollAnimationProps = {
        pool: state.pool,
        isLightMode: state.isLightMode,
        textContrastLight: false,
        disabled: state.pool.items.length === 0 || (state.players.length > 0 && !state.activePlayerId),
        pityCounter: activePlayer?.pityCounter,
        pityThreshold: state.pool.pityThreshold,
        pityEnabled: state.pool.pityEnabled,
        accentColor: state.gachaSettings.accentColor ?? "#a855f7",
        showTitle: state.gachaSettings.showTitle,
        enableAnimation: state.gachaSettings.enableAnimation,
        activePlayerName: activePlayer?.name ?? "ゲスト",
    };

    // OAuth callback handling inside useGachaState but need to show settings panel if token was present
    useEffect(() => {
        if (!isIntegrationEnabled) return;
        if (typeof window === 'undefined') return;
        const u = new URL(window.location.href);
        if (u.searchParams.get("integration_token")) {
            setShowSettingsPanel(true);
        }
    }, [isIntegrationEnabled]);

    if (isMobile) {
        const mobileHeaderPosition = isSplitMode ? "sticky top-0" : "fixed top-0 left-0 right-0";
        return (
            <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
                {orbsLayer}
                <div
                    className={`${mobileHeaderPosition} left-0 right-0 z-50 flex items-center justify-between px-3 py-2 shrink-0`}
                    style={{ background: headerBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${glassBorder}` }}
                >
                    <div className="flex items-center gap-2">
                        {!isSplitMode && <ModeSelector isLightMode={state.isLightMode} />}
                        {activePlayer && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${displayLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                                <Users size={12} />
                                <span>{activePlayer.name}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <GachaSwitchDropdown sampleTemplates={sampleTemplates} presets={presets} onSelect={handleGachaSwitch} isLightMode={state.isLightMode} textContrastLight={false} size="sm" />
                        <button onClick={() => setShowSettingsPanel(!showSettingsPanel)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                            <Settings size={16} />
                        </button>
                        <button onClick={() => state.setIsLightMode(!state.isLightMode)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                            {state.isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showSettingsPanel && (
                        <GachaSettingsPanel
                            settings={state.gachaSettings} onSettingsChange={state.setGachaSettings}
                            integrationConfig={state.integrationConfig} onIntegrationConfigChange={state.setIntegrationConfig}
                            pool={state.pool} onPoolChange={state.setPool}
                            isLightMode={state.isLightMode} onClose={() => setShowSettingsPanel(false)}
                        />
                    )}
                </AnimatePresence>

                {sidebar.playerHistoryViewId && (() => {
                    const player = state.players.find(p => p.id === sidebar.playerHistoryViewId);
                    if (!player) return null;
                    return (
                        <div className={`fixed inset-0 z-[60] flex flex-col overflow-hidden ${displayLight ? "bg-[#f8f9fa]/98" : "bg-[#0a051e]/95"}`}>
                            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch p-4 pt-14">
                                <PlayerHistoryCard player={player} pool={state.pool} isLightMode={state.isLightMode} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} onClose={() => sidebar.setPlayerHistoryViewId(null)} />
                            </div>
                        </div>
                    );
                })()}

                <div
                    ref={sidebar.mobileTab === "setup" ? sidebar.setupScrollRef : undefined}
                    className={`flex-1 min-h-0 ${!isSplitMode ? "pt-12" : ""} relative z-10 ${sidebar.mobileTab === "setup" ? "overflow-y-auto overflow-x-hidden scroll-smooth scroll-touch rounded-t-2xl mx-2 border border-t border-l border-r" : "overflow-hidden"}`}
                    style={{
                        ...(sidebar.mobileTab === "setup" ? { borderColor: glassBorder } : {}),
                        paddingBottom: "max(6rem, calc(4rem + env(safe-area-inset-bottom, 0px)))",
                    }}
                    onScroll={sidebar.mobileTab === "setup" ? (e) => { if ((e.target as HTMLDivElement).scrollTop > 40) sidebar.setShowScrollHint(false); } : undefined}
                >
                    {sidebar.mobileTab === "setup" && sidebar.showScrollHint && (
                        <div className="fixed left-0 right-0 z-40 flex items-center justify-center gap-1.5 py-2 pointer-events-none" style={{ bottom: "3.25rem", background: state.isLightMode ? "linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)" : "linear-gradient(to top, rgba(10,5,30,0.92) 0%, transparent 100%)" }}>
                            <ChevronDown size={14} className={`animate-bounce ${displayLight ? "text-gray-600" : "text-white/70"}`} />
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {sidebar.mobileTab === "setup" && (
                            <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-3 pt-2 min-h-full pb-10">
                                <GachaSetup pool={state.pool} onPoolChange={state.setPool} isLightMode={state.isLightMode} textContrastLight={false} integrationConfig={state.integrationConfig} />
                            </motion.div>
                        )}
                        {sidebar.mobileTab === "gacha" && (
                            <motion.div key="gacha" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                <GachaRollAnimation {...rollAnimationProps} results={engine.isRolling ? state.latestResults : null} isRolling={engine.isRolling} onRollStart={engine.handleRoll} onAnimationComplete={engine.handleAnimationComplete} />
                            </motion.div>
                        )}
                        {sidebar.mobileTab === "results" && (
                            <motion.div key="results" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                <GachaResultDisplay results={state.latestResults || []} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} isMobile={true} playerName={activePlayer?.name ?? "ゲスト"} />
                            </motion.div>
                        )}
                        {sidebar.mobileTab === "players" && (
                            <motion.div key="players" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    <div className="pb-10">
                                        <GachaPlayerManager players={state.players} activePlayerId={state.activePlayerId} onSelectPlayer={state.setActivePlayerId} onAddPlayer={engine.addPlayer} onRemovePlayer={engine.removePlayer} onResetPlayer={engine.resetPlayer} onRenamePlayer={engine.renamePlayer} onResetAllPlayers={engine.resetAllPlayers} onViewPlayerHistory={sidebar.setPlayerHistoryViewId} pool={state.pool} isLightMode={state.isLightMode} integrationConfig={state.integrationConfig} onUpdatePlayers={state.setPlayers} textContrastLight={false} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {sidebar.mobileTab === "items" && (
                            <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    <div className="pb-10">
                                        <ItemHistoryPanel players={state.players} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {sidebar.mobileTab === "distribute" && (
                            <motion.div key="distribute" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    <div className="pb-10">
                                        <GachaDistributionPanel pool={state.pool} onPoolChange={state.setPool} integrationConfig={state.integrationConfig} onIntegrationConfigChange={state.setIntegrationConfig} players={state.players} isLightMode={state.isLightMode} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="fixed left-0 right-0 z-50 flex items-center justify-around px-1 py-1.5" style={{ bottom: 0, paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))", background: headerBg, backdropFilter: "blur(12px)", borderTop: `1px solid ${glassBorder}` }}>
                    {([
                        { id: "setup" as MobileTab, icon: Settings, label: "設定" },
                        { id: "gacha" as MobileTab, icon: Sparkles, label: "ガチャ" },
                        { id: "results" as MobileTab, icon: BarChart3, label: "結果" },
                        { id: "players" as MobileTab, icon: Users, label: "履歴" },
                        ...(isIntegrationEnabled ? [{ id: "distribute" as MobileTab, icon: FiGift, label: "配布" }] : []),
                    ]).map(tab => {
                        const Icon = tab.icon;
                        const isActive = sidebar.mobileTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => sidebar.setMobileTab(tab.id)} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive ? (displayLight ? "text-purple-600" : "text-purple-400") : (displayLight ? "text-purple-500" : "text-white/60")}`}>
                                <Icon size={16} />
                                <span className={`text-[9px] font-medium ${displayLight ? "text-gray-700" : "text-white/80"}`}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // -- Desktop Layout --
    return (
        <div className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}>
            {orbsLayer}
            <div className={`${isSplitMode ? "absolute" : "fixed"} top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 ${isSplitMode ? "min-h-[56px]" : ""}`} style={{ background: headerBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${glassBorder}` }}>
                <div className="flex items-center gap-2">
                    {isSplitMode && (
                        <button onClick={() => sidebar.setSidebarOpen(!sidebar.sidebarOpen)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                            <Menu size={18} />
                        </button>
                    )}
                    {!isSplitMode && <ModeSelector isLightMode={state.isLightMode} />}
                    {activePlayer && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${displayLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                            <Users size={12} />
                            <span className="text-xs font-medium">{activePlayer.name}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <GachaSwitchDropdown sampleTemplates={sampleTemplates} presets={presets} onSelect={handleGachaSwitch} isLightMode={state.isLightMode} textContrastLight={false} size="md" />
                    <button onClick={() => setShowSettingsPanel(!showSettingsPanel)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                        <Settings size={16} />
                    </button>
                    <button onClick={() => state.setIsLightMode(!state.isLightMode)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                        {state.isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showSettingsPanel && (
                    <GachaSettingsPanel
                        settings={state.gachaSettings} onSettingsChange={state.setGachaSettings}
                        integrationConfig={state.integrationConfig} onIntegrationConfigChange={state.setIntegrationConfig}
                        pool={state.pool} onPoolChange={state.setPool}
                        isLightMode={state.isLightMode} onClose={() => setShowSettingsPanel(false)}
                    />
                )}
            </AnimatePresence>

            <div className="flex-1 flex overflow-hidden pt-12 relative z-10">
                {isSplitMode ? (
                    <AnimatePresence>
                        {sidebar.sidebarOpen && (
                            <>
                                <motion.div key="sidebar-backdrop" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40" style={{ top: 48, background: state.isLightMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)" }} onClick={() => sidebar.setSidebarOpen(false)} />
                                <motion.aside key="sidebar-panel" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.2 }} className="absolute left-0 top-12 bottom-0 z-50 w-80 flex flex-col overflow-hidden shadow-xl" style={{ background: headerBg, borderRight: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                                    <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
                                        <span className={`text-xs font-bold ${displayLight ? "text-gray-700" : "text-white/80"}`}>メニュー</span>
                                        <button onClick={() => sidebar.setSidebarOpen(false)} className={`p-1.5 rounded-lg ${displayLight ? "hover:bg-gray-200 text-gray-600" : "hover:bg-white/10 text-white/70"}`}><X size={18} /></button>
                                    </div>
                                    <div className="flex px-3 gap-1 shrink-0 flex-wrap items-center">
                                        {([
                                            { id: "setup" as SidebarTab, icon: Settings, label: "設定" },
                                            { id: "players" as SidebarTab, icon: Users, label: "プレイヤー" },
                                            { id: "items" as SidebarTab, icon: Package, label: "品目別" },
                                            ...(isIntegrationEnabled ? [{ id: "distribute" as SidebarTab, icon: FiGift, label: "配布" }] : []),
                                            { id: "presets" as SidebarTab, icon: Save, label: "保存・読み込み" },
                                        ]).map(tab => {
                                            const Icon = tab.icon;
                                            return (
                                                <button key={tab.id} onClick={() => sidebar.setSidebarTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebar.sidebarTab === tab.id ? (displayLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") : (displayLight ? "text-purple-600 hover:bg-purple-50" : "text-white/60 hover:bg-white/5")}`}>
                                                    <Icon size={14} /> {tab.label}
                                                    {tab.id === "players" && state.players.length > 0 && <span className={`text-[10px] px-1 rounded-full ${displayLight ? "bg-purple-100 text-purple-700" : "bg-white/10 text-white/85"}`}>{state.players.length}</span>}
                                                </button>
                                            );
                                        })}
                                        <button type="button" onClick={() => { sidebar.setSidebarOpen(false); engine.setShowResults(false); sidebar.setPlayerHistoryViewId(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${displayLight ? "text-purple-700 hover:bg-purple-50 border border-purple-200" : "text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"}`}>
                                            <Sparkles size={14} /> ガチャ
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0 relative flex flex-col">
                                        {sidebar.showSidebarScrollHint && <div className="absolute left-0 right-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-2 pointer-events-none" style={{ background: state.isLightMode ? "linear-gradient(to top, rgba(255,255,255,0.96) 0%, transparent 100%)" : "linear-gradient(to top, rgba(10,5,30,0.95) 0%, transparent 100%)" }}><ChevronDown size={12} className={`animate-bounce ${displayLight ? "text-gray-700" : "text-white/75"}`} /></div>}
                                        <div ref={sidebar.sidebarScrollRef} onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop > 40) sidebar.setShowSidebarScrollHint(false); }} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 pr-2 pb-6 scroll-smooth scroll-touch">
                                            {sidebar.sidebarTab === "setup" ? <GachaSetup pool={state.pool} onPoolChange={state.setPool} isLightMode={state.isLightMode} textContrastLight={false} /> : sidebar.sidebarTab === "players" ? <GachaPlayerManager players={state.players} activePlayerId={state.activePlayerId} onSelectPlayer={state.setActivePlayerId} onAddPlayer={engine.addPlayer} onRemovePlayer={engine.removePlayer} onResetPlayer={engine.resetPlayer} onRenamePlayer={engine.renamePlayer} onResetAllPlayers={engine.resetAllPlayers} onViewPlayerHistory={sidebar.setPlayerHistoryViewId} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} integrationConfig={state.integrationConfig} onUpdatePlayers={state.setPlayers} /> : sidebar.sidebarTab === "items" ? <ItemHistoryPanel players={state.players} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} /> : sidebar.sidebarTab === "distribute" ? <GachaDistributionPanel pool={state.pool} onPoolChange={state.setPool} integrationConfig={state.integrationConfig} onIntegrationConfigChange={state.setIntegrationConfig} players={state.players} isLightMode={state.isLightMode} /> : <GachaPresetsPanel pool={state.pool} onPoolChange={state.setPool} isLightMode={state.isLightMode} />}
                                        </div>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>
                ) : (
                    <>
                        <aside className="h-full flex flex-col overflow-hidden shrink-0" style={{ width: sidebar.sidebarWidthPx, minWidth: 200, maxWidth: 720, borderRight: `1px solid ${glassBorder}` }}>
                            <div className="flex px-3 pt-3 gap-1 shrink-0 flex-wrap items-center">
                                {([
                                    { id: "setup" as SidebarTab, icon: Settings, label: "設定" },
                                    { id: "players" as SidebarTab, icon: Users, label: "プレイヤー" },
                                    { id: "items" as SidebarTab, icon: Package, label: "品目別" },
                                    ...(isIntegrationEnabled ? [{ id: "distribute" as SidebarTab, icon: FiGift, label: "配布" }] : []),
                                    { id: "presets" as SidebarTab, icon: Save, label: "保存・読み込み" },
                                ]).map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button key={tab.id} onClick={() => sidebar.setSidebarTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebar.sidebarTab === tab.id ? (displayLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") : (displayLight ? "text-purple-600 hover:bg-purple-50" : "text-white/60 hover:bg-white/5")}`}>
                                            <Icon size={14} /> {tab.label}
                                            {tab.id === "players" && state.players.length > 0 && <span className={`text-[10px] px-1 rounded-full ${displayLight ? "bg-purple-100 text-purple-700" : "bg-white/10"}`}>{state.players.length}</span>}
                                        </button>
                                    );
                                })}
                                <button type="button" onClick={() => { engine.setShowResults(false); sidebar.setPlayerHistoryViewId(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${displayLight ? "text-purple-700 hover:bg-purple-50 border border-purple-200" : "text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"}`}>
                                    <Sparkles size={14} /> ガチャ
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 relative flex flex-col">
                                {sidebar.showSidebarScrollHint && <div className="absolute left-0 right-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-2 pointer-events-none" style={{ background: state.isLightMode ? "linear-gradient(to top, rgba(255,255,255,0.96) 0%, transparent 100%)" : "linear-gradient(to top, rgba(10,5,30,0.95) 0%, transparent 100%)" }}><ChevronDown size={12} className={`animate-bounce ${displayLight ? "text-gray-700" : "text-white/75"}`} /></div>}
                                <div ref={sidebar.sidebarScrollRef} onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop > 40) sidebar.setShowSidebarScrollHint(false); }} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 pr-2 pb-6 scroll-smooth scroll-touch">
                                    {sidebar.sidebarTab === "setup" ? <GachaSetup pool={state.pool} onPoolChange={state.setPool} isLightMode={state.isLightMode} textContrastLight={false} /> : sidebar.sidebarTab === "players" ? <GachaPlayerManager players={state.players} activePlayerId={state.activePlayerId} onSelectPlayer={state.setActivePlayerId} onAddPlayer={engine.addPlayer} onRemovePlayer={engine.removePlayer} onResetPlayer={engine.resetPlayer} onRenamePlayer={engine.renamePlayer} onResetAllPlayers={engine.resetAllPlayers} onViewPlayerHistory={sidebar.setPlayerHistoryViewId} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} integrationConfig={state.integrationConfig} onUpdatePlayers={state.setPlayers} /> : sidebar.sidebarTab === "items" ? <ItemHistoryPanel players={state.players} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} /> : sidebar.sidebarTab === "distribute" ? <GachaDistributionPanel pool={state.pool} onPoolChange={state.setPool} integrationConfig={state.integrationConfig} onIntegrationConfigChange={state.setIntegrationConfig} players={state.players} isLightMode={state.isLightMode} /> : <GachaPresetsPanel pool={state.pool} onPoolChange={state.setPool} isLightMode={state.isLightMode} />}
                                </div>
                            </div>
                        </aside>
                        <div role="separator" aria-label="サイドバー幅を調節" onMouseDown={sidebar.handleSidebarResizeStart} onTouchStart={sidebar.handleSidebarResizeTouchStart} className="shrink-0 w-4 h-full cursor-col-resize select-none flex items-center justify-center group touch-manipulation" style={{ minWidth: 16 }}>
                            <span className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: glassBorder }} />
                        </div>
                    </>
                )}

                <main className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {sidebar.playerHistoryViewId ? (() => {
                            const player = state.players.find(p => p.id === sidebar.playerHistoryViewId);
                            if (!player) return null;
                            return (
                                <motion.div key="player-history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
                                    <PlayerHistoryCard player={player} pool={state.pool} isLightMode={state.isLightMode} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} onClose={() => sidebar.setPlayerHistoryViewId(null)} />
                                </motion.div>
                            );
                        })() : engine.isRolling ? (
                            <motion.div key="rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <GachaRollAnimation {...rollAnimationProps} results={state.latestResults} isRolling={engine.isRolling} onRollStart={engine.handleRoll} onAnimationComplete={engine.handleAnimationComplete} />
                            </motion.div>
                        ) : engine.showResults && state.latestResults ? (
                            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                                <GachaResultDisplay results={state.latestResults} pool={state.pool} isLightMode={state.isLightMode} textContrastLight={false} shareHashtags={state.gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} isMobile={false} onBackToGacha={() => { engine.setShowResults(false); state.setLatestResults(null); }} accentColor={state.gachaSettings.accentColor ?? "#a855f7"} playerName={activePlayer?.name ?? "ゲスト"} />
                            </motion.div>
                        ) : (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <GachaRollAnimation {...rollAnimationProps} results={null} isRolling={false} onRollStart={engine.handleRoll} onAnimationComplete={engine.handleAnimationComplete} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
