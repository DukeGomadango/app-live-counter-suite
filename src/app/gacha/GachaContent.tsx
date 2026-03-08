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
import type { GachaPool, Player, GachaResult, GachaSettings, GachaPoolPreset } from "@/lib/gacha";
import { createDefaultPool, createDefaultPlayer, performGachaPull, createDefaultSettings, GACHA_ACCENT_COLORS, migratePlayerData, ensureResultIds, clonePoolWithNewIds, getSampleTemplates, migratePoolItemsForLink } from "@/lib/gacha";
import { DEFAULT_EXTRA_HASHTAG } from "@/lib/site";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import ShareReplyToField from "@/components/ShareReplyToField";

type MobileTab = "setup" | "gacha" | "results" | "players" | "items";
type SidebarTab = "setup" | "players" | "items" | "presets";

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
    const { glassBorder } = useGlassStyle(isLightMode);
    const overlayBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";

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
                className="fixed top-14 right-4 z-[100] w-72 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                style={{ background: overlayBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(20px)" }}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: glassBorder }}>
                    <span className={`text-sm font-bold ${textPrimary}`}>⚙️ ガチャ設定</span>
                    <button onClick={onClose} className={`p-1 rounded-lg ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
                        <X size={16} className={textSecondary} />
                    </button>
                </div>

                <div className="px-4 py-3 flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto scroll-touch">
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

                    {/* オーブの色 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            オーブの色
                        </label>
                        <div className="grid grid-cols-6 gap-1.5">
                            {GACHA_ACCENT_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => onSettingsChange({ ...settings, orbColor: c.value })}
                                    className={`w-full aspect-square rounded-full transition-all ${(settings.orbColor ?? settings.accentColor) === c.value ? "ring-2 ring-white/80 ring-offset-1 scale-110" : "hover:scale-105"}`}
                                    style={{ background: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* オーブの濃さ */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            オーブの濃さ
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={settings.orbIntensity ?? 50}
                            onChange={(e) => onSettingsChange({ ...settings, orbIntensity: Number(e.target.value) })}
                            className="w-full h-2 rounded-full accent-purple-500"
                        />
                        <p className={`text-[10px] ${textSecondary} mt-0.5`}>{settings.orbIntensity ?? 50}%</p>
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

                    {/* 共有時のハッシュタグ */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-1 block`}>
                            共有時のハッシュタグ
                        </label>
                        <p className={`text-[10px] ${textSecondary} mb-1`}>固定: #だんごツール</p>
                        <input
                            type="text"
                            value={settings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                            onChange={e => onSettingsChange({ ...settings, shareHashtags: e.target.value })}
                            placeholder={DEFAULT_EXTRA_HASHTAG}
                            className={`w-full px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none`}
                            style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)", border: `1px solid ${glassBorder}` }}
                        />
                    </div>

                    {/* X共有時の返信先 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-1 block`}>
                            X共有の返信先
                        </label>
                        <p className={`text-[10px] ${textSecondary} mb-1.5`}>設定すると、共有時にそのツイートへの返信として開きます</p>
                        <ShareReplyToField toolId="gacha" isLightMode={isLightMode} compact />
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
    textContrastLight = false,
}: {
    players: Player[];
    pool: GachaPool;
    isLightMode: boolean;
    textContrastLight?: boolean;
}) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textLight = isLightMode || textContrastLight;
    const textPrimary = textLight ? "text-gray-900" : "text-white/95";
    const textSecondary = textLight ? "text-gray-800" : "text-white/75";
    const textMuted = textLight ? "text-gray-700" : "text-white/65";

    // 品目→プレイヤー別排出数（このガチャの履歴のみ）
    const itemPlayerMap = useMemo(() => {
        const map = new Map<string, { itemName: string; rarityId: string; players: Map<string, number> }>();

        for (const player of (players || [])) {
            const runs = (player.runHistory ?? []).filter((r) => r.poolId === pool.id);
            for (const run of runs) {
                for (const it of run.items) {
                    if (!map.has(it.itemId)) {
                        map.set(it.itemId, { itemName: it.itemName, rarityId: it.rarityId, players: new Map() });
                    }
                    const entry = map.get(it.itemId)!;
                    entry.players.set(player.id, (entry.players.get(player.id) || 0) + it.count);
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
    }, [players, pool.id, pool.rarities]);

    if ((players || []).length === 0 || itemPlayerMap.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <Package size={24} className={textMuted} />
                <p className={`text-xs mt-2 ${textMuted}`}>まだ排出履歴がありません</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 pr-1 pb-4">
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
const DEFAULT_POOL = createDefaultPool();
const DEFAULT_SETTINGS = createDefaultSettings();

export default function GachaContent({ isSplitMode = false, isRightPane: _isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
    // 永続化される状態（初期値はモジュール定数で参照を安定化）
    const [pool, setPool] = useLocalStorage<GachaPool>("gacha-pool", DEFAULT_POOL);
    const [players, setPlayers] = useLocalStorage<Player[]>("gacha-players", []);
    const [activePlayerId, setActivePlayerId] = useLocalStorage<string | null>("gacha-active-player", null);
    const [latestResults, setLatestResults] = useState<GachaResult[] | null>(null);
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("gacha-light-mode", false);
    const [gachaSettings, setGachaSettings] = useLocalStorage<GachaSettings>("gacha-settings", DEFAULT_SETTINGS);
    const [presets] = useLocalStorage<GachaPoolPreset[]>("gacha-presets", []);
    const [hasMigrated, setHasMigrated] = useState(false);

    const [isRolling, setIsRolling] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [mobileTab, setMobileTab] = useState<MobileTab>("gacha");
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>("setup");
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(true);
    const setupScrollRef = useRef<HTMLDivElement>(null);
    const [showSidebarScrollHint, setShowSidebarScrollHint] = useState(true);
    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const [playerHistoryViewId, setPlayerHistoryViewId] = useState<string | null>(null);
    const [sidebarWidthPx, setSidebarWidthPx] = useLocalStorage<number>("gacha-sidebar-width", 320);

    // 旧品目形式（link）を imageUrl に移すマイグレーション（初回のみ）
    useEffect(() => {
        setPool(prev => migratePoolItemsForLink(prev));
    }, [setPool]);

    // 設定に orbIntensity / orbColor がない古い保存データにデフォルトを付与
    useEffect(() => {
        const needsOrbIntensity = gachaSettings.orbIntensity === undefined;
        const needsOrbColor = gachaSettings.orbColor === undefined;
        if (needsOrbIntensity || needsOrbColor) {
            setGachaSettings(prev => ({
                ...prev,
                ...(needsOrbIntensity && { orbIntensity: 50 }),
                ...(needsOrbColor && { orbColor: prev.accentColor ?? createDefaultSettings().accentColor }),
            }));
        }
    }, [gachaSettings.orbIntensity, gachaSettings.orbColor, gachaSettings.accentColor, setGachaSettings]);

    useEffect(() => {
        if (mobileTab === "setup") setShowScrollHint(true);
    }, [mobileTab]);

    useEffect(() => {
        setShowSidebarScrollHint(true);
    }, [sidebarTab]);

    const sidebarResizeRafRef = useRef<number | null>(null);
    const sidebarResizePendingRef = useRef<number | null>(null);

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

    // タブレットなどタッチデバイスでサイドバー幅を調節できるようにする
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

    useEffect(() => {
        if (playerHistoryViewId && !(players || []).some(p => p.id === playerHistoryViewId)) setPlayerHistoryViewId(null);
    }, [playerHistoryViewId, players]);

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

    // テーマ適用（他ツールと統一し、body背景は触らない）
    useEffect(() => {
        if (isLightMode) {
            document.body.classList.add("light-mode");
        } else {
            document.body.classList.remove("light-mode");
        }
        return () => document.body.classList.remove("light-mode");
    }, [isLightMode]);

    // レスポンシブ（768px未満: モバイル / 1024px未満: タブレットもモバイルレイアウトでサイドバー幅調節の問題を避ける）
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
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
            (prev || []).map(p => p.id === id ? { ...p, results: [], runHistory: [], inventory: {}, totalPulls: 0, pityCounter: 0, pityReachCount: 0 } : p)
        );
    }, [setPlayers]);

    const resetAllPlayers = useCallback(() => {
        setPlayers(prev =>
            (prev || []).map(p => ({ ...p, results: [], runHistory: [], inventory: {}, totalPulls: 0, pityCounter: 0, pityReachCount: 0 }))
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
        // 状態更新をマイクロタスクで分離し、稀な固まりを軽減
        queueMicrotask(() => {
            setIsRolling(false);
            setShowResults(true);
            if (isMobile) setMobileTab("results");
        });
    }, [isMobile]);

    const activePlayer = players.find(p => p.id === activePlayerId);
    const sampleTemplates = useMemo(() => getSampleTemplates(), []);

    const handleGachaSwitch = useCallback((value: string) => {
        if (!value) return;
        if (value.startsWith("sample:")) {
            const id = value.slice(7);
            const t = sampleTemplates.find(s => s.id === id);
            if (t) setPool(migratePoolItemsForLink(clonePoolWithNewIds(t.pool)));
        } else if (value.startsWith("preset:")) {
            const id = value.slice(7);
            const pre = presets.find(p => p.id === id);
            if (pre) setPool(migratePoolItemsForLink(clonePoolWithNewIds(pre.pool)));
        }
    }, [presets, sampleTemplates, setPool]);

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

    // ===== 共通props（useLocalStorage が初回は initialValue を返すためサーバーとクライアントで一致） =====
    const rollAnimationProps = {
        pool,
        isLightMode,
        textContrastLight: false,
        disabled: pool.items.length === 0 || (players.length > 0 && !activePlayerId),
        pityCounter: activePlayer?.pityCounter,
        pityThreshold: pool.pityThreshold,
        pityEnabled: pool.pityEnabled,
        accentColor: gachaSettings.accentColor ?? "#a855f7",
        showTitle: gachaSettings.showTitle,
        enableAnimation: gachaSettings.enableAnimation,
        activePlayerName: activePlayer?.name ?? "ゲスト",
    };

    // ===== モバイルレイアウト =====
    if (isMobile) {
        const mobileHeaderPosition = isSplitMode ? "sticky top-0" : "fixed top-0 left-0 right-0";
        const _mobileOverlayPosition = isSplitMode ? "absolute" : "fixed";
        return (
            <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
                {orbsLayer}
                {/* ヘッダー（Split時はstickyでタブバーと被らない） */}
                <div
                    className={`${mobileHeaderPosition} left-0 right-0 z-50 flex items-center justify-between px-3 py-2 shrink-0`}
                    style={{
                        background: headerBg,
                        backdropFilter: "blur(12px)",
                        borderBottom: `1px solid ${glassBorder}`,
                    }}
                >
                    <div className="flex items-center gap-2">
                        {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
                        {activePlayer && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${displayLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                                <Users size={12} />
                                <span>{activePlayer.name}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <GachaSwitchDropdown
                            sampleTemplates={sampleTemplates}
                            presets={presets}
                            onSelect={handleGachaSwitch}
                            isLightMode={isLightMode}
                            textContrastLight={false}
                            size="sm"
                        />
                        <button
                            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                            className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={() => setIsLightMode(!isLightMode)}
                            className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                            title={isLightMode ? "ダークモード" : "ライトモード"}
                            aria-label={isLightMode ? "ダークモード" : "ライトモード"}
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

                {/* モバイル: プレイヤー履歴詳細（オーバーレイ） */}
                {playerHistoryViewId && (() => {
                    const player = (players || []).find(p => p.id === playerHistoryViewId);
                    if (!player) return null;
                    return (
                        <div className={`fixed inset-0 z-[60] flex flex-col overflow-hidden ${displayLight ? "bg-[#f8f9fa]/98" : "bg-[#0a051e]/95"}`}>
                            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch p-4 pt-14">
                                <PlayerHistoryCard
                                    player={player}
                                    pool={pool}
                                    isLightMode={isLightMode}
                                    shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                    onClose={() => setPlayerHistoryViewId(null)}
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* メインコンテンツ（固定ヘッダー時のみ pt-12。下余白はタブバー＋safe-area分を確保） */}
                <div
                    ref={mobileTab === "setup" ? setupScrollRef : undefined}
                    className={`flex-1 min-h-0 ${!isSplitMode ? "pt-12" : ""} relative z-10 ${mobileTab === "setup" ? "overflow-y-auto overflow-x-hidden scroll-smooth scroll-touch rounded-t-2xl mx-2 border border-t border-l border-r" : "overflow-hidden"}`}
                    style={{
                        ...(mobileTab === "setup" ? { borderColor: glassBorder } : {}),
                        paddingBottom: "max(6rem, calc(4rem + env(safe-area-inset-bottom, 0px)))",
                    }}
                    onScroll={mobileTab === "setup" ? (e) => { if ((e.target as HTMLDivElement).scrollTop > 40) setShowScrollHint(false); } : undefined}
                >
                    {mobileTab === "setup" && showScrollHint && (
                        <div
                            className="fixed left-0 right-0 z-40 flex items-center justify-center gap-1.5 py-2 pointer-events-none"
                            style={{
                                bottom: "3.25rem",
                                background: isLightMode
                                    ? "linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)"
                                    : "linear-gradient(to top, rgba(10,5,30,0.92) 0%, transparent 100%)",
                            }}
                        >
                            <ChevronDown size={14} className={`animate-bounce ${displayLight ? "text-gray-600" : "text-white/70"}`} />
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {mobileTab === "setup" && (
                            <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-3 pt-2 min-h-full pb-10">
                                <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} textContrastLight={false} />
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
                                    textContrastLight={false}
                                    shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                    isMobile={true}
                                    playerName={activePlayer?.name ?? "ゲスト"}
                                />
                            </motion.div>
                        )}
                        {mobileTab === "players" && (
                            <motion.div key="players" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    <div className="pb-10">
                                        <GachaPlayerManager
                                            players={players}
                                            activePlayerId={activePlayerId}
                                            onSelectPlayer={setActivePlayerId}
                                            onAddPlayer={addPlayer}
                                            onRemovePlayer={removePlayer}
                                            onResetPlayer={resetPlayer}
                                            onResetAllPlayers={resetAllPlayers}
                                            onViewPlayerHistory={setPlayerHistoryViewId}
                                            pool={pool}
                                            isLightMode={isLightMode}
                                            textContrastLight={false}
                                            shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {mobileTab === "items" && (
                            <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full min-h-0 flex flex-col overflow-hidden px-3 pt-2">
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    <div className="pb-10">
                                        <ItemHistoryPanel players={players} pool={pool} isLightMode={isLightMode} textContrastLight={false} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* モバイルタブバー（safe-area でホームインジケーター回避） */}
                <div
                    className="fixed left-0 right-0 z-50 flex items-center justify-around px-1 py-1.5"
                    style={{
                        bottom: 0,
                        paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))",
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
                                    ? (displayLight ? "text-purple-600" : "text-purple-400")
                                    : (displayLight ? "text-purple-500" : "text-white/60")
                                    }`}
                            >
                                <Icon size={16} />
                                <span className={`text-[9px] font-medium ${displayLight ? "text-gray-700" : "text-white/80"}`}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ===== デスクトップレイアウト =====
    return (
        <div className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}>
            {orbsLayer}
            {/* ヘッダー（Split時はabsoluteでペイン内に表示、他モジュールと高さを揃える） */}
            <div
                className={`${isSplitMode ? "absolute" : "fixed"} top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 ${isSplitMode ? "min-h-[56px]" : ""}`}
                style={{
                    background: headerBg,
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${glassBorder}`,
                }}
            >
                <div className="flex items-center gap-2">
                    {isSplitMode && (
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                            title="メニュー"
                            aria-label="メニュー"
                        >
                            <Menu size={18} />
                        </button>
                    )}
                    {/* PC版Split時はモード切替を右下に出すのでヘッダーからは非表示 */}
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
                    {activePlayer && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${displayLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-purple-400"}`}>
                            <Users size={12} />
                            <span className="text-xs font-medium">{activePlayer.name}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <GachaSwitchDropdown
                        sampleTemplates={sampleTemplates}
                        presets={presets}
                        onSelect={handleGachaSwitch}
                        isLightMode={isLightMode}
                        textContrastLight={false}
                        size="md"
                    />
                    <button
                        onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        title="ガチャ設定"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => setIsLightMode(!isLightMode)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                        title={isLightMode ? "ダークモード" : "ライトモード"}
                        aria-label={isLightMode ? "ダークモード" : "ライトモード"}
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
                {/* Split時: サイドバーはハンバーガーでオーバーレイ表示。通常時: 常時展開 */}
                {isSplitMode ? (
                    <>
                        <AnimatePresence>
                            {sidebarOpen && (
                                <>
                                    <motion.div
                                        key="sidebar-backdrop"
                                        aria-hidden
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={isSplitMode ? "absolute inset-0 z-40" : "fixed inset-0 z-40"}
                                        style={{
                                            top: 48,
                                            background: isLightMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)",
                                        }}
                                        onClick={() => setSidebarOpen(false)}
                                    />
                                    <motion.aside
                                        key="sidebar-panel"
                                        initial={{ x: "-100%" }}
                                        animate={{ x: 0 }}
                                        exit={{ x: "-100%" }}
                                        transition={{ type: "tween", duration: 0.2 }}
                                        className={`${isSplitMode ? "absolute" : "fixed"} left-0 top-12 bottom-0 z-50 w-80 flex flex-col overflow-hidden shadow-xl`}
                                        style={{
                                            background: headerBg,
                                            borderRight: `1px solid ${glassBorder}`,
                                            backdropFilter: "blur(12px)",
                                        }}
                                    >
                                        <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
                                            <span className={`text-xs font-bold ${displayLight ? "text-gray-700" : "text-white/80"}`}>メニュー</span>
                                            <button
                                                onClick={() => setSidebarOpen(false)}
                                                className={`p-1.5 rounded-lg ${displayLight ? "hover:bg-gray-200 text-gray-600" : "hover:bg-white/10 text-white/70"}`}
                                                aria-label="閉じる"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        <div className="flex px-3 gap-1 shrink-0 flex-wrap items-center">
                                            {([
                                                { id: "setup" as SidebarTab, icon: Settings, label: "設定" },
                                                { id: "players" as SidebarTab, icon: Users, label: "プレイヤー" },
                                                { id: "items" as SidebarTab, icon: Package, label: "品目別" },
                                                { id: "presets" as SidebarTab, icon: Save, label: "保存・読み込み" },
                                            ]).map(tab => {
                                                const Icon = tab.icon;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setSidebarTab(tab.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === tab.id
                                                            ? (displayLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                                                            : (displayLight ? "text-purple-600 hover:bg-purple-50" : "text-white/60 hover:bg-white/5")
                                                            }`}
                                                    >
                                                        <Icon size={14} /> {tab.label}
                                                        {tab.id === "players" && (players || []).length > 0 && (
                                                            <span className={`text-[10px] px-1 rounded-full ${displayLight ? "bg-purple-100 text-purple-700" : "bg-white/10 text-white/85"}`}>
                                                                {(players || []).length}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => { setSidebarOpen(false); setShowResults(false); setPlayerHistoryViewId(null); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${displayLight ? "text-purple-700 hover:bg-purple-50 border border-purple-200" : "text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"}`}
                                                title="ガチャを引く画面へ"
                                            >
                                                <Sparkles size={14} /> ガチャ
                                            </button>
                                        </div>
                                        <div className="flex-1 min-h-0 relative flex flex-col">
                                            {showSidebarScrollHint && (
                                                <div
                                                    className="absolute left-0 right-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-2 pointer-events-none"
                                                    style={{
                                                        background: isLightMode
                                                            ? "linear-gradient(to top, rgba(255,255,255,0.96) 0%, transparent 100%)"
                                                            : "linear-gradient(to top, rgba(10,5,30,0.95) 0%, transparent 100%)",
                                                    }}
                                                >
                                                    <ChevronDown size={12} className={`animate-bounce ${displayLight ? "text-gray-700" : "text-white/75"}`} />
                                                </div>
                                            )}
                                            <div
                                                ref={sidebarScrollRef}
                                                onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop > 40) setShowSidebarScrollHint(false); }}
                                                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 pr-2 pb-6 scroll-smooth scroll-touch"
                                            >
                                                {sidebarTab === "setup" ? (
                                                    <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} textContrastLight={false} />
                                                ) : sidebarTab === "players" ? (
                                                    <GachaPlayerManager
                                                        players={players}
                                                        activePlayerId={activePlayerId}
                                                        onSelectPlayer={setActivePlayerId}
                                                        onAddPlayer={addPlayer}
                                                        onRemovePlayer={removePlayer}
                                                        onResetPlayer={resetPlayer}
                                                        onResetAllPlayers={resetAllPlayers}
                                                        onViewPlayerHistory={setPlayerHistoryViewId}
                                                        pool={pool}
                                                        isLightMode={isLightMode}
                                                        textContrastLight={false}
                                                        shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                                    />
                                                ) : sidebarTab === "items" ? (
                                                    <ItemHistoryPanel players={players} pool={pool} isLightMode={isLightMode} textContrastLight={false} />
                                                ) : (
                                                    <GachaPresetsPanel pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />
                                                )}
                                            </div>
                                        </div>
                                    </motion.aside>
                                </>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <>
                    <aside
                        className="h-full flex flex-col overflow-hidden shrink-0"
                        style={{
                            width: sidebarWidthPx,
                            minWidth: 200,
                            maxWidth: 720,
                            borderRight: `1px solid ${glassBorder}`,
                        }}
                    >
                        <div className="flex px-3 pt-3 gap-1 shrink-0 flex-wrap items-center">
                            {([
                                { id: "setup" as SidebarTab, icon: Settings, label: "設定" },
                                { id: "players" as SidebarTab, icon: Users, label: "プレイヤー" },
                                { id: "items" as SidebarTab, icon: Package, label: "品目別" },
                                { id: "presets" as SidebarTab, icon: Save, label: "保存・読み込み" },
                            ]).map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSidebarTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === tab.id
                                            ? (displayLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                                            : (displayLight ? "text-purple-600 hover:bg-purple-50" : "text-white/60 hover:bg-white/5")
                                            }`}
                                    >
                                        <Icon size={14} /> {tab.label}
                                        {tab.id === "players" && (players || []).length > 0 && (
                                            <span className={`text-[10px] px-1 rounded-full ${displayLight ? "bg-purple-100 text-purple-700" : "bg-white/10"}`}>
                                                {(players || []).length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => { setShowResults(false); setPlayerHistoryViewId(null); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${displayLight ? "text-purple-700 hover:bg-purple-50 border border-purple-200" : "text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"}`}
                                title="ガチャを引く画面へ"
                            >
                                <Sparkles size={14} /> ガチャ
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 relative flex flex-col">
                            {showSidebarScrollHint && (
                                <div
                                    className="absolute left-0 right-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-2 pointer-events-none"
                                    style={{
                                        background: isLightMode
                                            ? "linear-gradient(to top, rgba(255,255,255,0.96) 0%, transparent 100%)"
                                            : "linear-gradient(to top, rgba(10,5,30,0.95) 0%, transparent 100%)",
                                    }}
                                >
                                    <ChevronDown size={12} className={`animate-bounce ${displayLight ? "text-gray-700" : "text-white/75"}`} />
                                </div>
                            )}
                            <div
                                ref={sidebarScrollRef}
                                onScroll={(e) => { if ((e.target as HTMLDivElement).scrollTop > 40) setShowSidebarScrollHint(false); }}
                                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 pr-2 pb-6 scroll-smooth scroll-touch"
                            >
                                {sidebarTab === "setup" ? (
                                    <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} textContrastLight={false} />
                                ) : sidebarTab === "players" ? (
                                    <GachaPlayerManager
                                        players={players}
                                        activePlayerId={activePlayerId}
                                        onSelectPlayer={setActivePlayerId}
                                        onAddPlayer={addPlayer}
                                        onRemovePlayer={removePlayer}
                                        onResetPlayer={resetPlayer}
                                        onResetAllPlayers={resetAllPlayers}
                                        onViewPlayerHistory={setPlayerHistoryViewId}
                                        pool={pool}
                                        isLightMode={isLightMode}
                                        textContrastLight={false}
                                        shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                    />
                                ) : sidebarTab === "items" ? (
                                    <ItemHistoryPanel players={players} pool={pool} isLightMode={isLightMode} textContrastLight={false} />
                                ) : (
                                    <GachaPresetsPanel pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />
                                )}
                            </div>
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
                )}

                {/* メインステージ */}
                <main className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {playerHistoryViewId ? (() => {
                            const player = (players || []).find(p => p.id === playerHistoryViewId);
                            if (!player) return null;
                            return (
                                <motion.div key="player-history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4">
                                    <PlayerHistoryCard
                                        player={player}
                                        pool={pool}
                                        isLightMode={isLightMode}
                                        shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                        onClose={() => setPlayerHistoryViewId(null)}
                                    />
                                </motion.div>
                            );
                        })() : isRolling ? (
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
                                    textContrastLight={false}
                                    shareHashtags={gachaSettings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
                                    isMobile={false}
                                    onBackToGacha={() => { setShowResults(false); setLatestResults(null); }}
                                    accentColor={gachaSettings.accentColor ?? "#a855f7"}
                                    playerName={activePlayer?.name ?? "ゲスト"}
                                />
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
