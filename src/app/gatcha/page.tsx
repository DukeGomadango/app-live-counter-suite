"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, Sparkles, BarChart3, Sun, Moon, Menu, X, Package } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import GachaSetup from "@/components/gacha/GachaSetup";
import GachaRollAnimation from "@/components/gacha/GachaRollAnimation";
import GachaResultDisplay from "@/components/gacha/GachaResultDisplay";
import GachaPlayerManager from "@/components/gacha/GachaPlayerManager";
import type { GachaPool, Player, GachaResult, GachaSettings } from "@/lib/gacha";
import { createDefaultPool, createDefaultPlayer, performGachaPull, createDefaultSettings, GACHA_BG_COLORS, GACHA_ACCENT_COLORS, migratePlayerData, ensureResultIds } from "@/lib/gacha";

type MobileTab = "setup" | "gacha" | "results" | "players" | "items";
type SidebarTab = "setup" | "players" | "items";

// ===== 歯車メニューコンポーネント =====
function GachaSettingsPanel({
    settings,
    onSettingsChange,
    isLightMode,
    onClose,
}: {
    settings: GachaSettings;
    onSettingsChange: (s: GachaSettings) => void;
    isLightMode: boolean;
    onClose: () => void;
}) {
    const glassBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/90";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";

    return (
        <>
            {/* バックドロップ */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* パネル */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="fixed top-14 right-4 z-[100] w-72 rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(20px)" }}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: glassBorder }}>
                    <span className={`text-sm font-bold ${textPrimary}`}>⚙️ ガチャ設定</span>
                    <button onClick={onClose} className={`p-1 rounded-lg ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
                        <X size={16} className={textSecondary} />
                    </button>
                </div>

                <div className="px-4 py-3 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                    {/* 背景配色 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            背景配色
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {GACHA_BG_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => onSettingsChange({ ...settings, bgColor: c.value })}
                                    className={`h-8 rounded-lg transition-all ${settings.bgColor === c.value ? "ring-2 ring-purple-500 ring-offset-1" : ""}`}
                                    style={{ background: c.bg }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ガチャ配色 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            ガチャ配色
                        </label>
                        <div className="grid grid-cols-6 gap-1.5">
                            {GACHA_ACCENT_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => onSettingsChange({ ...settings, accentColor: c.value })}
                                    className={`w-full aspect-square rounded-full transition-all ${settings.accentColor === c.value ? "ring-2 ring-white/80 ring-offset-1 scale-110" : "hover:scale-105"}`}
                                    style={{ background: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* タイトル表示 */}
                    <div className="flex items-center justify-between">
                        <span className={`text-xs ${textPrimary}`}>タイトル表示</span>
                        <div
                            onClick={() => onSettingsChange({ ...settings, showTitle: !settings.showTitle })}
                            className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${settings.showTitle ? "bg-purple-500" : isLightMode ? "bg-gray-300" : "bg-white/20"}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${settings.showTitle ? "left-5" : "left-0.5"}`} />
                        </div>
                    </div>

                    {/* 演出ON/OFF */}
                    <div className="flex items-center justify-between">
                        <span className={`text-xs ${textPrimary}`}>ガチャ演出</span>
                        <div
                            onClick={() => onSettingsChange({ ...settings, enableAnimation: !settings.enableAnimation })}
                            className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${settings.enableAnimation ? "bg-purple-500" : isLightMode ? "bg-gray-300" : "bg-white/20"}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${settings.enableAnimation ? "left-5" : "left-0.5"}`} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}

// ===== 品目別プレイヤー履歴コンポーネント =====
function ItemHistoryPanel({
    players,
    pool,
    isLightMode,
}: {
    players: Player[];
    pool: GachaPool;
    isLightMode: boolean;
}) {
    const glassBg = isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/90";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";

    // 品目→プレイヤー別排出数を計算
    const itemPlayerMap = useMemo(() => {
        const map = new Map<string, { itemName: string; rarityId: string; players: Map<string, number> }>();

        for (const player of (players || [])) {
            if (player.inventory) {
                for (const [itemId, item] of Object.entries(player.inventory)) {
                    if (!map.has(itemId)) {
                        map.set(itemId, { itemName: item.name, rarityId: item.rarityId, players: new Map() });
                    }
                    const entry = map.get(itemId)!;
                    entry.players.set(player.id, (entry.players.get(player.id) || 0) + item.count);
                }
            } else {
                for (const result of (player.results || [])) {
                    if (!map.has(result.itemId)) {
                        map.set(result.itemId, { itemName: result.itemName, rarityId: result.rarityId, players: new Map() });
                    }
                    const entry = map.get(result.itemId)!;
                    entry.players.set(player.id, (entry.players.get(player.id) || 0) + 1);
                }
            }
        }

        // ソート: レア度順 → 名前順
        const sortOrderMap = new Map(pool.rarities.map(r => [r.id, r.sortOrder]));
        return Array.from(map.entries())
            .sort(([, a], [, b]) =>
                (sortOrderMap.get(b.rarityId) || 0) - (sortOrderMap.get(a.rarityId) || 0)
                || a.itemName.localeCompare(b.itemName)
            );
    }, [players, pool.rarities]);

    if ((players || []).length === 0 || itemPlayerMap.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <Package size={24} className={textMuted} />
                <p className={`text-xs mt-2 ${textMuted}`}>まだ排出履歴がありません</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1 pb-4">
            <div className={`px-2 py-1.5 ${textSecondary}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    排出品目別 — {itemPlayerMap.length}種類
                </span>
            </div>
            {itemPlayerMap.map(([itemId, data]) => {
                const rarity = pool.rarities.find(r => r.id === data.rarityId);
                const totalCount = Array.from(data.players.values()).reduce((s, c) => s + c, 0);
                return (
                    <div
                        key={itemId}
                        className="rounded-xl p-3"
                        style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
                    >
                        {/* 品目ヘッダー */}
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                style={{ color: rarity?.color, background: rarity?.bgColor }}
                            >
                                {rarity?.name || "?"}
                            </span>
                            <span className={`text-xs font-medium flex-1 truncate ${textPrimary}`}>{data.itemName}</span>
                            <span className={`text-[10px] ${textMuted}`}>計{totalCount}</span>
                        </div>
                        {/* プレイヤー別 */}
                        <div className="flex flex-col gap-1">
                            {Array.from(data.players.entries())
                                .sort(([, a], [, b]) => b - a)
                                .map(([playerId, count]) => {
                                    const player = players.find(p => p.id === playerId);
                                    return (
                                        <div key={playerId} className="flex items-center justify-between">
                                            <span className={`text-[11px] ${textSecondary}`}>
                                                {player?.name || "不明"}
                                            </span>
                                            <span className={`text-[11px] font-bold tabular-nums ${textPrimary}`}>
                                                ×{count}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ===== メインページ =====
export default function GatchaPage() {
    // 永続化される状態
    const [pool, setPool] = useLocalStorage<GachaPool>("gacha-pool", createDefaultPool());
    const [players, setPlayers] = useLocalStorage<Player[]>("gacha-players", []);
    const [activePlayerId, setActivePlayerId] = useLocalStorage<string | null>("gacha-active-player", null);
    const [latestResults, setLatestResults] = useState<GachaResult[] | null>(null);
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("gacha-light-mode", false);
    const [gachaSettings, setGachaSettings] = useLocalStorage<GachaSettings>("gacha-settings", createDefaultSettings());
    const [hasMigrated, setHasMigrated] = useState(false);

    const [isRolling, setIsRolling] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [mobileTab, setMobileTab] = useState<MobileTab>("gacha");
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>("setup");
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);

    // レガシーデータマイグレーション - localStorageから直接読み取り
    useEffect(() => {
        if (hasMigrated) return;
        try {
            const rawPlayers = window.localStorage.getItem('gacha-players');
            if (rawPlayers) {
                const parsed: Player[] = JSON.parse(rawPlayers);
                if (parsed && parsed.length > 0) {
                    const migrated = migratePlayerData(parsed);
                    const uniqueIds = new Set<string>();
                    const deduped = migrated.filter(p => {
                        if (uniqueIds.has(p.id)) return false;
                        uniqueIds.add(p.id);
                        return true;
                    });
                    if (JSON.stringify(parsed) !== JSON.stringify(deduped)) {
                        setPlayers(deduped);
                    }
                }
            }
            const rawResults = window.localStorage.getItem('gacha-latest-results');
            if (rawResults) {
                try {
                    const parsed: GachaResult[] = JSON.parse(rawResults);
                    if (parsed && parsed.length > 0 && parsed.some(r => !r.resultId)) {
                        setLatestResults(ensureResultIds(parsed));
                    } else if (parsed && parsed.length > 0) {
                        setLatestResults(parsed);
                    }
                } catch { /* ignore parse errors */ }
                // Remove from localStorage since we moved to useState to prevent quota errors
                window.localStorage.removeItem('gacha-latest-results');
            }
        } catch { /* ignore parse errors */ }
        setHasMigrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMigrated]);

    // テーマ + 背景色適用（body.style.backgroundで直接上書き）
    useEffect(() => {
        if (isLightMode) {
            document.body.classList.add("light-mode");
        } else {
            document.body.classList.remove("light-mode");
        }
        // 背景色をbodyに直接適用（globals.cssの既存backgroundを上書き）
        if (!isLightMode) {
            const found = GACHA_BG_COLORS.find(c => c.value === gachaSettings.bgColor);
            document.body.style.background = found?.bg || GACHA_BG_COLORS[0].bg;
        } else {
            document.body.style.background = '';
        }
        return () => {
            document.body.classList.remove("light-mode");
            document.body.style.background = '';
        };
    }, [isLightMode, gachaSettings.bgColor]);

    // レスポンシブ
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // プレイヤー操作
    const addPlayer = useCallback((name: string) => {
        const newPlayer = createDefaultPlayer(name);
        setPlayers(prev => {
            const current = prev || [];
            if (current.some(p => p.name === name || p.id === newPlayer.id)) return current;
            return [...current, newPlayer];
        });
        setActivePlayerId(newPlayer.id);
    }, [setPlayers, setActivePlayerId]);

    const removePlayer = useCallback((id: string) => {
        setPlayers(prev => (prev || []).filter(p => p.id !== id));
        if (activePlayerId === id) {
            setActivePlayerId(null);
        }
    }, [setPlayers, activePlayerId, setActivePlayerId]);

    const resetPlayer = useCallback((id: string) => {
        setPlayers(prev =>
            (prev || []).map(p => p.id === id ? { ...p, results: [], inventory: {}, totalPulls: 0, pityCounter: 0 } : p)
        );
    }, [setPlayers]);

    // ガチャ実行
    const handleRoll = useCallback(() => {
        if (pool.items.length === 0) return;

        const currentPlayer = players.find(p => p.id === activePlayerId);

        // プレイヤーがいるのに選択してない場合は実行しない
        if (!currentPlayer && players.length > 0) return;

        // プレイヤー未登録時はゲストを自動作成（1回だけ）
        let targetPlayer: Player;
        if (currentPlayer) {
            targetPlayer = currentPlayer;
        } else {
            // ゲスト自動作成
            const guest = createDefaultPlayer("ゲスト");
            targetPlayer = guest;
        }

        const { results, updatedPlayer } = performGachaPull(pool, pool.pullCount, targetPlayer);

        setLatestResults(results);
        setIsRolling(true);
        setShowResults(false);

        // プレイヤー更新
        if (currentPlayer) {
            setPlayers(prev => (prev || []).map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
        } else {
            // ゲスト登録
            setPlayers(prev => {
                const current = prev || [];
                if (current.some(p => p.id === updatedPlayer.id)) return current;
                return [...current, updatedPlayer];
            });
            setActivePlayerId(updatedPlayer.id);
        }
    }, [pool, players, activePlayerId, setLatestResults, setPlayers, setActivePlayerId]);

    const handleAnimationComplete = useCallback(() => {
        setIsRolling(false);
        setShowResults(true);
        if (isMobile) setMobileTab("results");
    }, [isMobile]);

    const activePlayer = players.find(p => p.id === activePlayerId);

    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const headerBg = isLightMode ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";

    // ===== 共通props =====
    const rollAnimationProps = {
        pool,
        isLightMode,
        disabled: pool.items.length === 0 || (players.length > 0 && !activePlayerId),
        pityCounter: activePlayer?.pityCounter,
        pityThreshold: pool.pityThreshold,
        pityEnabled: pool.pityEnabled,
        accentColor: gachaSettings.accentColor,
        showTitle: gachaSettings.showTitle,
        enableAnimation: gachaSettings.enableAnimation,
    };

    // ===== モバイルレイアウト =====
    if (isMobile) {
        return (
            <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
                {/* カスタム背景 */}
                {/* 背景はbody.style.backgroundで直接適用済み */}

                {/* ヘッダー */}
                <div
                    className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2"
                    style={{
                        background: headerBg,
                        backdropFilter: "blur(12px)",
                        borderBottom: `1px solid ${glassBorder}`,
                    }}
                >
                    <div className="flex items-center gap-2">
                        <ModeSelector isLightMode={isLightMode} />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                            className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={() => setIsLightMode(!isLightMode)}
                            className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        >
                            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                </div>

                {/* 設定パネル */}
                <AnimatePresence>
                    {showSettingsPanel && (
                        <GachaSettingsPanel
                            settings={gachaSettings}
                            onSettingsChange={setGachaSettings}
                            isLightMode={isLightMode}
                            onClose={() => setShowSettingsPanel(false)}
                        />
                    )}
                </AnimatePresence>

                {/* メインコンテンツ */}
                <div className="flex-1 overflow-hidden pt-12 pb-14 relative z-10">
                    <AnimatePresence mode="wait">
                        {mobileTab === "setup" && (
                            <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full px-3 pt-2">
                                <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />
                            </motion.div>
                        )}
                        {mobileTab === "gacha" && (
                            <motion.div key="gacha" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                <GachaRollAnimation
                                    {...rollAnimationProps}
                                    results={isRolling ? latestResults : (showResults ? latestResults : null)}
                                    isRolling={isRolling}
                                    onRollStart={handleRoll}
                                    onAnimationComplete={handleAnimationComplete}
                                />
                            </motion.div>
                        )}
                        {mobileTab === "results" && (
                            <motion.div key="results" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                <GachaResultDisplay
                                    results={latestResults || []}
                                    pool={pool}
                                    isLightMode={isLightMode}
                                />
                            </motion.div>
                        )}
                        {mobileTab === "players" && (
                            <motion.div key="players" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full px-3 pt-2">
                                <GachaPlayerManager
                                    players={players}
                                    activePlayerId={activePlayerId}
                                    onSelectPlayer={setActivePlayerId}
                                    onAddPlayer={addPlayer}
                                    onRemovePlayer={removePlayer}
                                    onResetPlayer={resetPlayer}
                                    pool={pool}
                                    isLightMode={isLightMode}
                                />
                            </motion.div>
                        )}
                        {mobileTab === "items" && (
                            <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full px-3 pt-2">
                                <ItemHistoryPanel players={players} pool={pool} isLightMode={isLightMode} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* モバイルタブバー */}
                <div
                    className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 py-1.5"
                    style={{
                        background: headerBg,
                        backdropFilter: "blur(12px)",
                        borderTop: `1px solid ${glassBorder}`,
                    }}
                >
                    {([
                        { id: "setup" as MobileTab, icon: Settings, label: "設定" },
                        { id: "gacha" as MobileTab, icon: Sparkles, label: "ガチャ" },
                        { id: "results" as MobileTab, icon: BarChart3, label: "結果" },
                        { id: "players" as MobileTab, icon: Users, label: "履歴" },
                        { id: "items" as MobileTab, icon: Package, label: "品目" },
                    ]).map(tab => {
                        const Icon = tab.icon;
                        const isActive = mobileTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setMobileTab(tab.id)}
                                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive
                                    ? (isLightMode ? "text-purple-600" : "text-purple-400")
                                    : (isLightMode ? "text-gray-400" : "text-white/30")
                                    }`}
                            >
                                <Icon size={16} />
                                <span className="text-[9px] font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ===== デスクトップレイアウト =====
    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
            {/* カスタム背景 */}
            {/* 背景はbody.style.backgroundで直接適用済み */}

            {/* ヘッダー */}
            <div
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2"
                style={{
                    background: headerBg,
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${glassBorder}`,
                }}
            >
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <ModeSelector isLightMode={isLightMode} />
                    {activePlayer && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isLightMode ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                            <Users size={12} />
                            <span className="text-xs font-medium">{activePlayer.name}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                        className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        title="ガチャ設定"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => setIsLightMode(!isLightMode)}
                        className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                    >
                        {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </div>

            {/* 設定パネル */}
            <AnimatePresence>
                {showSettingsPanel && (
                    <GachaSettingsPanel
                        settings={gachaSettings}
                        onSettingsChange={setGachaSettings}
                        isLightMode={isLightMode}
                        onClose={() => setShowSettingsPanel(false)}
                    />
                )}
            </AnimatePresence>

            {/* メインエリア */}
            <div className="flex-1 flex overflow-hidden pt-12 relative z-10">
                {/* サイドバー */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-full flex flex-col overflow-hidden shrink-0"
                            style={{
                                borderRight: `1px solid ${glassBorder}`,
                            }}
                        >
                            {/* サイドバータブ */}
                            <div className="flex px-3 pt-3 gap-1 shrink-0 flex-wrap">
                                {([
                                    { id: "setup" as SidebarTab, icon: Settings, label: "設定" },
                                    { id: "players" as SidebarTab, icon: Users, label: "プレイヤー" },
                                    { id: "items" as SidebarTab, icon: Package, label: "品目別" },
                                ]).map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setSidebarTab(tab.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === tab.id
                                                ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                                                : (isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/40 hover:bg-white/5")
                                                }`}
                                        >
                                            <Icon size={14} /> {tab.label}
                                            {tab.id === "players" && (players || []).length > 0 && (
                                                <span className={`text-[10px] px-1 rounded-full ${isLightMode ? "bg-gray-200" : "bg-white/10"}`}>
                                                    {(players || []).length}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* サイドバーコンテンツ */}
                            <div className="flex-1 overflow-hidden p-3">
                                {sidebarTab === "setup" ? (
                                    <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />
                                ) : sidebarTab === "players" ? (
                                    <GachaPlayerManager
                                        players={players}
                                        activePlayerId={activePlayerId}
                                        onSelectPlayer={setActivePlayerId}
                                        onAddPlayer={addPlayer}
                                        onRemovePlayer={removePlayer}
                                        onResetPlayer={resetPlayer}
                                        pool={pool}
                                        isLightMode={isLightMode}
                                    />
                                ) : (
                                    <ItemHistoryPanel players={players} pool={pool} isLightMode={isLightMode} />
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* メインステージ */}
                <main className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {isRolling ? (
                            <motion.div key="rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <GachaRollAnimation
                                    {...rollAnimationProps}
                                    results={latestResults}
                                    isRolling={isRolling}
                                    onRollStart={handleRoll}
                                    onAnimationComplete={handleAnimationComplete}
                                />
                            </motion.div>
                        ) : showResults && latestResults ? (
                            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                                <GachaResultDisplay
                                    results={latestResults}
                                    pool={pool}
                                    isLightMode={isLightMode}
                                />
                                {/* もう一回ボタン */}
                                <div className="shrink-0 p-4 flex justify-center" style={{ borderTop: `1px solid ${glassBorder}` }}>
                                    <button
                                        onClick={() => { setShowResults(false); setLatestResults(null); }}
                                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105`}
                                        style={{
                                            background: `${gachaSettings.accentColor}22`,
                                            color: gachaSettings.accentColor,
                                            border: `1px solid ${gachaSettings.accentColor}55`,
                                        }}
                                    >
                                        🎰 もう一度引く
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <GachaRollAnimation
                                    {...rollAnimationProps}
                                    results={null}
                                    isRolling={false}
                                    onRollStart={handleRoll}
                                    onAnimationComplete={handleAnimationComplete}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
