"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, Sparkles, BarChart3, Sun, Moon, Menu, X, Package, ChevronDown, Save } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import { useTheme } from "@/context/ThemeContext";
import { Z_INDEX } from "@/lib/layoutConstants";
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
  migratePoolItemsForLink,
  type RarityTier,
  type GachaItem,
  type IntegrationConfig,
  playersForLinkedPool,
} from "@/lib/gacha";
import { fetchExternalGachaConfig, resolveExternalGachaItemDisplayName } from "@/lib/gachaDistribution";
import { DEFAULT_EXTRA_HASHTAG } from "@/lib/site";
import { useGlassStyle } from "@/hooks/useGlassStyle";

// Hooks
import { useGachaState } from "./hooks/useGachaState";
import { useGachaEngine } from "./hooks/useGachaEngine";
import { useGachaSidebar } from "./hooks/useGachaSidebar";
import { usePlayerLinkStatuses } from "./hooks/usePlayerLinkStatuses";

// Components
import { GachaSettingsPanel } from "./components/GachaSettingsPanel";
import { ItemHistoryPanel } from "./components/ItemHistoryPanel";

type MobileTab = "setup" | "gacha" | "results" | "players" | "items" | "distribute";
type SidebarTab = "setup" | "players" | "items" | "presets" | "distribute";

export default function GachaContent({ isSplitMode = false, isRightPane: _isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
    // -- Hooks --
    const {
        pool, setPool,
        players, setPlayers,
        activePlayerId, setActivePlayerId,
        integrationConfig, setIntegrationConfig,
        latestResults, setLatestResults,
        gachaSettings, setGachaSettings,
    } = useGachaState();
    const { isLightMode, toggleTheme } = useTheme();
    const [isAuthChecking, setIsAuthChecking] = useState(false);
    /** リンクシェア deep link: 同期完了後に一括設定モーダルを開く（effect 再実行で同期しないよう ref） */
    const pendingBulkModalRef = useRef(false);
    const [openBulkModal, setOpenBulkModal] = useState(false);

    const {
        mobileTab, setMobileTab,
        sidebarOpen, setSidebarOpen,
        sidebarTab, setSidebarTab,
        playerHistoryViewId, setPlayerHistoryViewId,
        sidebarWidthPx,
        showScrollHint, setShowScrollHint,
        showSidebarScrollHint, setShowSidebarScrollHint,
        sidebarScrollRef,
        setupScrollRef,
        handleSidebarResizeStart,
        handleSidebarResizeTouchStart
    } = useGachaSidebar();
    
    const isIntegrationEnabled = process.env.NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION === 'true';

    const engine = useGachaEngine({
        pool,
        players,
        setPlayers,
        activePlayerId,
        setActivePlayerId,
        integrationConfig,
        setLatestResults,
        gachaSettings,
        isMobile: false, // Will be updated below
        setMobileTab: setMobileTab
    });

    const [isMobile, setIsMobile] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const handleSetShowSettingsPanel = useCallback((val: boolean) => setShowSettingsPanel(val), []);
    
    const [presetsRaw] = useLocalStorage<GachaPoolPreset[]>("gacha-presets", []);
    const presets = useMemo(() => presetsRaw || [], [presetsRaw]);

    const visiblePlayers = useMemo(
        () => playersForLinkedPool(players, pool),
        [players, pool]
    );

    useEffect(() => {
        if (activePlayerId && !visiblePlayers.some((p) => p.id === activePlayerId)) {
            setActivePlayerId(visiblePlayers[0]?.id ?? null);
        }
    }, [visiblePlayers, activePlayerId, setActivePlayerId]);

    const playerLinkStatuses = usePlayerLinkStatuses(
        visiblePlayers,
        pool,
        integrationConfig
    );

    const handleLinkedRecipientChange = useCallback(
        (playerId: string, recipientId: string | null) => {
            setPlayers((prev) => {
                const next = prev.map((p) =>
                    p.id === playerId
                        ? { ...p, linkedRecipientId: recipientId || undefined }
                        : p
                );
                const updated = next.find((p) => p.id === playerId);
                if (updated) {
                    queueMicrotask(() => {
                        void engine.syncPlayerWithRemote(updated);
                    });
                }
                return next;
            });
        },
        [setPlayers, engine]
    );

    const handleResyncPlayer = useCallback(
        (playerId: string) => {
            const player = players.find((p) => p.id === playerId);
            if (player) void engine.syncPlayerWithRemote(player);
        },
        [players, engine]
    );

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

    // open_bulk_modal を URL から一度だけ拾う（同期完了後にモーダルを開く）
    useEffect(() => {
        if (typeof window === "undefined") return;
        const u = new URL(window.location.href);
        if (u.searchParams.get("open_bulk_modal") !== "true") return;
        pendingBulkModalRef.current = true;
        u.searchParams.delete("open_bulk_modal");
        window.history.replaceState({}, "", u.pathname + u.search);
    }, []);

    // Detect campaign_id in URL, handle auto-authorization, and auto-sync campaign ID & assets
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const u = new URL(window.location.href);
        const campaignId = u.searchParams.get("campaign_id");
        const hasIncomingToken = u.searchParams.has("integration_token");

        const defaultApiBase =
            window.location.hostname === "localhost"
                ? "http://localhost:3000"
                : "https://share.dango.tools";
        let apiBaseUrl = integrationConfig.apiBaseUrl || defaultApiBase;
        let token = integrationConfig.integrationToken || "";

        try {
            const stored = window.localStorage.getItem("gacha-integration-config");
            if (stored) {
                const parsed = JSON.parse(stored) as IntegrationConfig;
                if (parsed.apiBaseUrl) apiBaseUrl = parsed.apiBaseUrl;
                if (parsed.integrationToken) token = parsed.integrationToken;
            }
        } catch { /* ignore */ }

        const paramApiUrl = u.searchParams.get("api_base_url");
        if (paramApiUrl) apiBaseUrl = paramApiUrl;
        if (integrationConfig.integrationToken) token = integrationConfig.integrationToken;
        if (integrationConfig.apiBaseUrl && !paramApiUrl) apiBaseUrl = integrationConfig.apiBaseUrl;

        const hasToken = !!token;

        if (campaignId && !hasIncomingToken) {
            // If OAuth integration is enabled but not authorized yet, redirect to authorize automatically
            if (isIntegrationEnabled && !hasToken) {
                const authUrl = new URL(`${apiBaseUrl}/settings/integrations/authorize`);
                authUrl.searchParams.set("client_id", "dango-tools-gacha");
                authUrl.searchParams.set("redirect_uri", window.location.origin + window.location.pathname);
                authUrl.searchParams.set("state", window.location.search);
                window.location.href = authUrl.toString();
                return;
            }

            // Sync campaign ID to pool if they differ
            if (pool.linkedCampaignId !== campaignId) {
                setPool(prev => ({ ...prev, linkedCampaignId: campaignId }));
            }

            setSidebarTab("setup");
            setMobileTab("setup");
            if (isSplitMode) {
                setSidebarOpen(true);
            }

            // If we are authorized, automatically pull/sync the external gacha config
            if (isIntegrationEnabled && hasToken) {
                setIsAuthChecking(true);
                const syncConfig = async () => {
                    try {
                        const config = await fetchExternalGachaConfig(campaignId, {
                            apiBaseUrl,
                            integrationToken: token
                        });

                        if (config.gachaConfig) {
                            const newRarities: RarityTier[] = config.gachaConfig.rarities.map((r, i) => ({
                                id: r.id,
                                name: r.name,
                                color: r.color,
                                glowColor: r.color + "66",
                                bgColor: r.color + "1a",
                                sortOrder: i + 1,
                                defaultWeight: r.probability
                            }));

                            const newItems: GachaItem[] = config.items.map(item => ({
                                id: item.id,
                                name: resolveExternalGachaItemDisplayName(item),
                                rarityId: item.rarityId || newRarities[newRarities.length - 1]!.id,
                                weight: 100,
                                linkedAssetId: item.id
                            }));

                            setPool(prev => ({
                                ...prev,
                                linkedCampaignId: campaignId,
                                rarities: newRarities,
                                items: newItems
                            }));
                        }
                    } catch (err) {
                        console.error("Failed to auto-sync external campaign gacha config:", err);
                    } finally {
                        setIsAuthChecking(false);
                        if (pendingBulkModalRef.current) {
                            setOpenBulkModal(true);
                            pendingBulkModalRef.current = false;
                        }
                    }
                };
                syncConfig();
                return;
            }
        }

        setIsAuthChecking(false);
        if (pendingBulkModalRef.current && !campaignId) {
            setOpenBulkModal(true);
            pendingBulkModalRef.current = false;
        }
    }, [setSidebarTab, setMobileTab, isSplitMode, setSidebarOpen, isIntegrationEnabled, integrationConfig.integrationToken, integrationConfig.apiBaseUrl, pool.linkedCampaignId, setPool]);

    const activePlayer = useMemo(() => 
        visiblePlayers.find(p => p.id === activePlayerId)
    , [visiblePlayers, activePlayerId]);

    const sampleTemplates = useMemo(() => getSampleTemplates(), []);

    const handleGachaSwitch = useCallback((value: string) => {
        if (!value) return;
        if (value.startsWith("sample:")) {
            const id = value.slice(7);
            const t = sampleTemplates.find(s => s.id === id);
            if (t) setPool(migratePoolItemsForLink(clonePoolKeepingIds(t.pool)));
        } else if (value.startsWith("preset:")) {
            const id = value.slice(7);
            const pre = presets.find(p => p.id === id);
            if (pre) setPool(migratePoolItemsForLink(clonePoolKeepingIds(pre.pool)));
        }
    }, [presets, sampleTemplates, setPool]);

    const handleDeleteHistoryForPool = useCallback((poolId: string) => {
        if (!playerHistoryViewId) return;
        setPlayers(prev => prev.map(p => {
            if (p.id !== playerHistoryViewId) return p;
            return {
                ...p,
                runHistory: (p.runHistory || []).filter(r => r.poolId !== poolId),
                poolStates: {
                    ...(p.poolStates || {}),
                    [poolId]: { totalPulls: 0, pityCounter: 0, pityReachCount: 0, inventory: {} }
                }
            };
        }));
    }, [playerHistoryViewId, setPlayers]);

    const { glassBorder } = useGlassStyle(isLightMode);
    const displayLight = isLightMode;
    const headerBg = displayLight ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";
    const orbColorForLayer = gachaSettings.orbColor ?? gachaSettings.accentColor ?? "#a855f7";
    const orbIntensity = gachaSettings.orbIntensity ?? 50;

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
        pool: pool,
        isLightMode: isLightMode,
        textContrastLight: false,
        disabled: pool.items.length === 0 || (visiblePlayers.length > 0 && !activePlayerId),
        pityCounter: activePlayer?.pityCounter,
        pityThreshold: pool.pityThreshold,
        pityEnabled: pool.pityEnabled,
        accentColor: gachaSettings.accentColor ?? "#a855f7",
        showTitle: gachaSettings.showTitle,
        enableAnimation: gachaSettings.enableAnimation,
        activePlayerName: activePlayer?.name ?? "ゲスト",
    };

    // OAuth callback handling inside useGachaState but need to show settings panel if token was present
    useEffect(() => {
        if (!isIntegrationEnabled) return;
        if (typeof window === 'undefined') return;
        const u = new URL(window.location.href);
        if (u.searchParams.get("integration_token")) {
            queueMicrotask(() => handleSetShowSettingsPanel(true));
        }
    }, [isIntegrationEnabled, handleSetShowSettingsPanel]);

    if (isAuthChecking) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-white/60">
                読み込み中…
            </div>
        );
    }

    if (isMobile) {
        const mobileHeaderPosition = "relative";
        return (
            <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
                {orbsLayer}
                <div
                    className={`${mobileHeaderPosition} left-0 right-0 flex items-center justify-between px-3 py-2 shrink-0`}
                    style={{ background: headerBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${glassBorder}`, zIndex: Z_INDEX.HEADER }}
                >
                    <div className="flex items-center gap-2">
                        {!isSplitMode && <ModeSelector isLightMode={isLightMode} accentColor={gachaSettings.accentColor ?? "#a855f7"} />}
                        {activePlayer && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${displayLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                                <Users size={12} />
                                <span>{activePlayer.name}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <GachaSwitchDropdown sampleTemplates={sampleTemplates} presets={presets} onSelect={handleGachaSwitch} isLightMode={isLightMode} textContrastLight={false} size="sm" />
                        <button onClick={() => setShowSettingsPanel(!showSettingsPanel)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                            <Settings size={16} />
                        </button>
                        <button onClick={toggleTheme} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showSettingsPanel && (
                        <GachaSettingsPanel
                            settings={gachaSettings} onSettingsChange={setGachaSettings}
                            integrationConfig={integrationConfig} onIntegrationConfigChange={setIntegrationConfig}
                            pool={pool} onPoolChange={setPool}
                            isLightMode={isLightMode} onClose={() => setShowSettingsPanel(false)}
                        />
                    )}
                </AnimatePresence>

                {playerHistoryViewId && (() => {
                    const player = players.find(p => p.id === playerHistoryViewId);
                    if (!player) return null;
                    return (
                        <div 
                            className={`fixed inset-0 flex flex-col overflow-hidden ${displayLight ? "bg-[#f8f9fa]/98" : "bg-[#0a051e]/95"}`}
                            style={{ zIndex: Z_INDEX.MODAL }}
                        >
                            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch p-4 pt-14 custom-scrollbar">
                                <PlayerHistoryCard 
                                    player={player} 
                                    pool={pool} 
                                    isLightMode={isLightMode} 
                                    shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} 
                                    onClose={() => setPlayerHistoryViewId(null)} 
                                    onDeleteHistoryForPool={handleDeleteHistoryForPool}
                                />
                            </div>
                        </div>
                    );
                })()}

                <div
                    ref={mobileTab === "setup" ? setupScrollRef : undefined}
                    className={`flex-1 min-h-0 relative z-10 custom-scrollbar ${mobileTab === "setup" ? "overflow-y-auto overflow-x-hidden scroll-smooth scroll-touch rounded-t-2xl mx-2 border border-t border-l border-r" : "overflow-hidden"}`}
                    style={{
                        ...(mobileTab === "setup" ? { borderColor: glassBorder } : {}),
                        paddingBottom: "max(6rem, calc(4rem + env(safe-area-inset-bottom, 0px)))",
                    }}
                    onScroll={mobileTab === "setup" ? (e) => { if ((e.target as HTMLDivElement).scrollTop > 40) setShowScrollHint(false); } : undefined}
                >
                    {mobileTab === "setup" && showScrollHint && (
                        <div className="fixed left-0 right-0 flex items-center justify-center gap-1.5 py-2 pointer-events-none" style={{ bottom: "3.25rem", background: isLightMode ? "linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)" : "linear-gradient(to top, rgba(10,5,30,0.92) 0%, transparent 100%)", zIndex: Z_INDEX.CONTENT }}>
                            <ChevronDown size={14} className={`animate-bounce ${displayLight ? "text-gray-600" : "text-white/70"}`} />
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {mobileTab === "setup" && (
                            <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-3 pt-2 min-h-full pb-10">
                                <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} integrationConfig={integrationConfig} openBulkModal={openBulkModal} onBulkModalOpened={() => setOpenBulkModal(false)} />
                            </motion.div>
                        )}
                        {mobileTab === "gacha" && (
                            <motion.div key="gacha" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                <GachaRollAnimation {...rollAnimationProps} results={engine.isRolling ? latestResults : null} isRolling={engine.isRolling} onRollStart={engine.handleRoll} onAnimationComplete={engine.handleAnimationComplete} />
                            </motion.div>
                        )}
                        {mobileTab === "results" && (
                            <motion.div key="results" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                <GachaResultDisplay results={latestResults || []} pool={pool} isLightMode={isLightMode} textContrastLight={false} shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} isMobile={true} playerName={activePlayer?.name ?? "ゲスト"} />
                            </motion.div>
                        )}
                        {mobileTab === "players" && (
                            <motion.div key="players" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch custom-scrollbar">
                                    <div className="pb-10">
                                        <GachaPlayerManager players={visiblePlayers} activePlayerId={activePlayerId} onSelectPlayer={setActivePlayerId} onAddPlayer={engine.addPlayer} onRemovePlayer={engine.removePlayer} onResetPlayer={engine.resetPlayer} onRenamePlayer={engine.renamePlayer} onResetAllPlayers={engine.resetAllPlayers} onViewPlayerHistory={setPlayerHistoryViewId} pool={pool} isLightMode={isLightMode} integrationConfig={integrationConfig} onUpdatePlayers={setPlayers} linkStatuses={playerLinkStatuses} onLinkedRecipientChange={handleLinkedRecipientChange} onResyncPlayer={handleResyncPlayer} textContrastLight={false} shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {mobileTab === "items" && (
                            <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch custom-scrollbar">
                                    <div className="pb-10">
                                        <ItemHistoryPanel players={visiblePlayers} pool={pool} isLightMode={isLightMode} textContrastLight={false} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {mobileTab === "distribute" && (
                            <motion.div key="distribute" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch custom-scrollbar">
                                    <div className="pb-10">
                                        <GachaDistributionPanel pool={pool} onPoolChange={setPool} integrationConfig={integrationConfig} onIntegrationConfigChange={setIntegrationConfig} players={visiblePlayers} isLightMode={isLightMode} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="fixed left-0 right-0 flex items-center justify-around px-1 py-1.5" style={{ bottom: 0, paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))", background: headerBg, backdropFilter: "blur(12px)", borderTop: `1px solid ${glassBorder}`, zIndex: Z_INDEX.HEADER }}>
                    {([
                        { id: "setup" as MobileTab, icon: Settings, label: "設定" },
                        { id: "gacha" as MobileTab, icon: Sparkles, label: "ガチャ" },
                        { id: "results" as MobileTab, icon: BarChart3, label: "結果" },
                        { id: "players" as MobileTab, icon: Users, label: "履歴" },
                        ...(isIntegrationEnabled ? [{ id: "distribute" as MobileTab, icon: FiGift, label: "配布" }] : []),
                    ]).map(tab => {
                        const Icon = tab.icon;
                        const isActive = mobileTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setMobileTab(tab.id)} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive ? (displayLight ? "text-purple-600" : "text-purple-400") : (displayLight ? "text-purple-500" : "text-white/60")}`}>
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
        <div className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`} style={{ "--accent-color": gachaSettings.accentColor ?? "#a855f7" } as React.CSSProperties}>
            {orbsLayer}
            <div className={`relative shrink-0 flex items-center justify-between px-3 py-2 min-h-[52px]`} style={{ background: headerBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${glassBorder}`, zIndex: Z_INDEX.HEADER }}>
                <div className="flex items-center gap-2">
                    {isSplitMode && (
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                            <Menu size={18} />
                        </button>
                    )}
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} accentColor={gachaSettings.accentColor ?? "#a855f7"} />}
                    {activePlayer && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${displayLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                            <Users size={12} />
                            <span className="text-xs font-medium">{activePlayer.name}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <GachaSwitchDropdown sampleTemplates={sampleTemplates} presets={presets} onSelect={handleGachaSwitch} isLightMode={isLightMode} textContrastLight={false} size="md" />
                    <button onClick={() => setShowSettingsPanel(!showSettingsPanel)} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                        <Settings size={16} />
                    </button>
                    <button onClick={toggleTheme} className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}>
                        {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showSettingsPanel && (
                    <GachaSettingsPanel
                        settings={gachaSettings} onSettingsChange={setGachaSettings}
                        integrationConfig={integrationConfig} onIntegrationConfigChange={setIntegrationConfig}
                        pool={pool} onPoolChange={setPool}
                        isLightMode={isLightMode} onClose={() => setShowSettingsPanel(false)}
                    />
                )}
            </AnimatePresence>

            <div className="flex-1 flex overflow-hidden relative z-10">
                {isSplitMode ? (
                    <AnimatePresence>
                        {sidebarOpen && (
                            <>
                                <motion.div key="sidebar-backdrop" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ top: 48, background: isLightMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)", zIndex: Z_INDEX.SIDEBAR_BACKDROP }} onClick={() => setSidebarOpen(false)} />
                                <motion.aside key="sidebar-panel" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.2 }} className="absolute left-0 top-12 bottom-0 w-80 flex flex-col overflow-hidden shadow-xl" style={{ background: headerBg, borderRight: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)", zIndex: Z_INDEX.SIDEBAR }}>
                                    <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
                                        <span className={`text-xs font-bold ${displayLight ? "text-gray-700" : "text-white/80"}`}>メニュー</span>
                                        <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-lg ${displayLight ? "hover:bg-gray-200 text-gray-600" : "hover:bg-white/10 text-white/70"}`}><X size={18} /></button>
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
                                                <button key={tab.id} onClick={() => setSidebarTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === tab.id ? (displayLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") : (displayLight ? "text-purple-600 hover:bg-purple-50" : "text-white/60 hover:bg-white/5")}`}>
                                                    <Icon size={14} /> {tab.label}
                                                    {tab.id === "players" && visiblePlayers.length > 0 && <span className={`text-[10px] px-1 rounded-full ${displayLight ? "bg-purple-100 text-purple-700" : "bg-white/10 text-white/85"}`}>{visiblePlayers.length}</span>}
                                                </button>
                                            );
                                        })}
                                        <button type="button" onClick={() => { setSidebarOpen(false); engine.setShowResults(false); setPlayerHistoryViewId(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${displayLight ? "text-purple-700 hover:bg-purple-50 border border-purple-200" : "text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"}`}>
                                            <Sparkles size={14} /> ガチャ
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0 relative flex flex-col">
                                        {showSidebarScrollHint && <div className="absolute left-0 right-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-2 pointer-events-none" style={{ background: isLightMode ? "linear-gradient(to top, rgba(255,255,255,0.96) 0%, transparent 100%)" : "linear-gradient(to top, rgba(10,5,30,0.95) 0%, transparent 100%)" }}><ChevronDown size={12} className={`animate-bounce ${displayLight ? "text-gray-700" : "text-white/75"}`} /></div>}
                                        <div ref={sidebarScrollRef} onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop > 40) setShowSidebarScrollHint(false); }} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 pr-2 pb-6 scroll-smooth scroll-touch custom-scrollbar">
                                            {sidebarTab === "setup" ? <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} integrationConfig={integrationConfig} openBulkModal={openBulkModal} onBulkModalOpened={() => setOpenBulkModal(false)} /> : sidebarTab === "players" ? <GachaPlayerManager players={visiblePlayers} activePlayerId={activePlayerId} onSelectPlayer={setActivePlayerId} onAddPlayer={engine.addPlayer} onRemovePlayer={engine.removePlayer} onResetPlayer={engine.resetPlayer} onRenamePlayer={engine.renamePlayer} onResetAllPlayers={engine.resetAllPlayers} onViewPlayerHistory={setPlayerHistoryViewId} pool={pool} isLightMode={isLightMode} textContrastLight={false} shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} integrationConfig={integrationConfig} onUpdatePlayers={setPlayers} linkStatuses={playerLinkStatuses} onLinkedRecipientChange={handleLinkedRecipientChange} onResyncPlayer={handleResyncPlayer} /> : sidebarTab === "items" ? <ItemHistoryPanel players={visiblePlayers} pool={pool} isLightMode={isLightMode} textContrastLight={false} /> : sidebarTab === "distribute" ? <GachaDistributionPanel pool={pool} onPoolChange={setPool} integrationConfig={integrationConfig} onIntegrationConfigChange={setIntegrationConfig} players={visiblePlayers} isLightMode={isLightMode} /> : <GachaPresetsPanel pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />}
                                        </div>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>
                ) : (
                    <>
                        <aside className="h-full flex flex-col overflow-hidden shrink-0" style={{ width: sidebarWidthPx, minWidth: 200, maxWidth: 720, borderRight: `1px solid ${glassBorder}` }}>
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
                                        <button key={tab.id} onClick={() => setSidebarTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === tab.id ? (displayLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") : (displayLight ? "text-purple-600 hover:bg-purple-50" : "text-white/60 hover:bg-white/5")}`}>
                                            <Icon size={14} /> {tab.label}
                                            {tab.id === "players" && visiblePlayers.length > 0 && <span className={`text-[10px] px-1 rounded-full ${displayLight ? "bg-purple-100 text-purple-700" : "bg-white/10"}`}>{visiblePlayers.length}</span>}
                                        </button>
                                    );
                                })}
                                <button type="button" onClick={() => { engine.setShowResults(false); setPlayerHistoryViewId(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${displayLight ? "text-purple-700 hover:bg-purple-50 border border-purple-200" : "text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"}`}>
                                    <Sparkles size={14} /> ガチャ
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 relative flex flex-col">
                                {showSidebarScrollHint && <div className="absolute left-0 right-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-2 pointer-events-none" style={{ background: isLightMode ? "linear-gradient(to top, rgba(255,255,255,0.96) 0%, transparent 100%)" : "linear-gradient(to top, rgba(10,5,30,0.95) 0%, transparent 100%)" }}><ChevronDown size={12} className={`animate-bounce ${displayLight ? "text-gray-700" : "text-white/75"}`} /></div>}
                                <div ref={sidebarScrollRef} onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop > 40) setShowSidebarScrollHint(false); }} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 pr-2 pb-6 scroll-smooth scroll-touch custom-scrollbar">
                                    {sidebarTab === "setup" ? <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} textContrastLight={false} integrationConfig={integrationConfig} openBulkModal={openBulkModal} onBulkModalOpened={() => setOpenBulkModal(false)} /> : sidebarTab === "players" ? <GachaPlayerManager players={visiblePlayers} activePlayerId={activePlayerId} onSelectPlayer={setActivePlayerId} onAddPlayer={engine.addPlayer} onRemovePlayer={engine.removePlayer} onResetPlayer={engine.resetPlayer} onRenamePlayer={engine.renamePlayer} onResetAllPlayers={engine.resetAllPlayers} onViewPlayerHistory={setPlayerHistoryViewId} pool={pool} isLightMode={isLightMode} textContrastLight={false} shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} integrationConfig={integrationConfig} onUpdatePlayers={setPlayers} linkStatuses={playerLinkStatuses} onLinkedRecipientChange={handleLinkedRecipientChange} onResyncPlayer={handleResyncPlayer} /> : sidebarTab === "items" ? <ItemHistoryPanel players={visiblePlayers} pool={pool} isLightMode={isLightMode} textContrastLight={false} /> : sidebarTab === "distribute" ? <GachaDistributionPanel pool={pool} onPoolChange={setPool} integrationConfig={integrationConfig} onIntegrationConfigChange={setIntegrationConfig} players={visiblePlayers} isLightMode={isLightMode} /> : <GachaPresetsPanel pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />}
                                </div>
                            </div>
                        </aside>
                        <div role="separator" aria-label="サイドバー幅を調節" onMouseDown={handleSidebarResizeStart} onTouchStart={handleSidebarResizeTouchStart} className="shrink-0 w-4 h-full cursor-col-resize select-none flex items-center justify-center group touch-manipulation" style={{ minWidth: 16 }}>
                            <span className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: glassBorder }} />
                        </div>
                    </>
                )}

                <main className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {playerHistoryViewId ? (() => {
                            const player = players.find(p => p.id === playerHistoryViewId);
                            if (!player) return null;
                            return (
                                <motion.div key="player-history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
                                    <PlayerHistoryCard 
                                        player={player} 
                                        pool={pool} 
                                        isLightMode={isLightMode} 
                                        shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} 
                                        onClose={() => setPlayerHistoryViewId(null)} 
                                        onDeleteHistoryForPool={handleDeleteHistoryForPool}
                                    />
                                </motion.div>
                            );
                        })() : engine.isRolling ? (
                            <motion.div key="rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <GachaRollAnimation {...rollAnimationProps} results={latestResults} isRolling={engine.isRolling} onRollStart={engine.handleRoll} onAnimationComplete={engine.handleAnimationComplete} />
                            </motion.div>
                        ) : engine.showResults && latestResults ? (
                            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                                <GachaResultDisplay results={latestResults} pool={pool} isLightMode={isLightMode} textContrastLight={false} shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG} isMobile={false} onBackToGacha={() => { engine.setShowResults(false); setLatestResults(null); }} accentColor={gachaSettings.accentColor ?? "#a855f7"} playerName={activePlayer?.name ?? "ゲスト"} />
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
