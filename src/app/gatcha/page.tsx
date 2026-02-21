"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, Sparkles, BarChart3, Sun, Moon, Menu, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import GachaSetup from "@/components/gacha/GachaSetup";
import GachaRollAnimation from "@/components/gacha/GachaRollAnimation";
import GachaResultDisplay from "@/components/gacha/GachaResultDisplay";
import GachaPlayerManager from "@/components/gacha/GachaPlayerManager";
import type { GachaPool, Player, GachaResult } from "@/lib/gacha";
import { createDefaultPool, createDefaultPlayer, performGachaPull } from "@/lib/gacha";

type MobileTab = "setup" | "gacha" | "results" | "players";

export default function GatchaPage() {
    // 永続化される状態
    const [pool, setPool] = useLocalStorage<GachaPool>("gacha-pool", createDefaultPool());
    const [players, setPlayers] = useLocalStorage<Player[]>("gacha-players", []);
    const [activePlayerId, setActivePlayerId] = useLocalStorage<string | null>("gacha-active-player", null);
    const [latestResults, setLatestResults] = useLocalStorage<GachaResult[] | null>("gacha-latest-results", null);
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("gacha-light-mode", false);

    const [isRolling, setIsRolling] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [mobileTab, setMobileTab] = useState<MobileTab>("gacha");
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarTab, setSidebarTab] = useState<"setup" | "players">("setup");

    // テーマ適用
    useEffect(() => {
        if (isLightMode) {
            document.body.classList.add("light-mode");
        } else {
            document.body.classList.remove("light-mode");
        }
        return () => { document.body.classList.remove("light-mode"); };
    }, [isLightMode]);

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
        setPlayers(prev => [...prev, newPlayer]);
        setActivePlayerId(newPlayer.id);
    }, [setPlayers, setActivePlayerId]);

    const removePlayer = useCallback((id: string) => {
        setPlayers(prev => prev.filter(p => p.id !== id));
        if (activePlayerId === id) {
            setActivePlayerId(null);
        }
    }, [setPlayers, activePlayerId, setActivePlayerId]);

    const resetPlayer = useCallback((id: string) => {
        setPlayers(prev =>
            prev.map(p => p.id === id ? { ...p, results: [], totalPulls: 0, pityCounter: 0 } : p)
        );
    }, [setPlayers]);

    // ガチャ実行
    const handleRoll = useCallback(() => {
        if (pool.items.length === 0) return;

        const currentPlayer = players.find(p => p.id === activePlayerId);
        if (!currentPlayer && players.length > 0) return; // プレイヤーがいるのに選択してない

        const targetPlayer = currentPlayer || createDefaultPlayer("ゲスト");

        const { results, updatedPlayer } = performGachaPull(pool, pool.pullCount, targetPlayer);

        setLatestResults(results);
        setIsRolling(true);
        setShowResults(false);

        // プレイヤー更新
        if (currentPlayer) {
            setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
        } else if (players.length === 0) {
            // ゲストモード（プレイヤー未登録時）
            setPlayers([updatedPlayer]);
            setActivePlayerId(updatedPlayer.id);
        }
    }, [pool, players, activePlayerId, setLatestResults, setPlayers, setActivePlayerId]);

    const handleAnimationComplete = useCallback(() => {
        setIsRolling(false);
        setShowResults(true);
        if (isMobile) setMobileTab("results");
    }, [isMobile]);

    const activePlayer = players.find(p => p.id === activePlayerId);

    const glassBg = isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const headerBg = isLightMode ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.5)";

    // ===== モバイルレイアウト =====
    if (isMobile) {
        return (
            <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
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
                    <button
                        onClick={() => setIsLightMode(!isLightMode)}
                        className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                    >
                        {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>

                {/* メインコンテンツ */}
                <div className="flex-1 overflow-hidden pt-12 pb-14">
                    <AnimatePresence mode="wait">
                        {mobileTab === "setup" && (
                            <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full px-3 pt-2">
                                <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />
                            </motion.div>
                        )}
                        {mobileTab === "gacha" && (
                            <motion.div key="gacha" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                                {isRolling || (!showResults) ? (
                                    <GachaRollAnimation
                                        pool={pool}
                                        results={latestResults}
                                        isRolling={isRolling}
                                        onRollStart={handleRoll}
                                        onAnimationComplete={handleAnimationComplete}
                                        isLightMode={isLightMode}
                                        disabled={pool.items.length === 0 || (players.length > 0 && !activePlayerId)}
                                        pityCounter={activePlayer?.pityCounter}
                                        pityThreshold={pool.pityThreshold}
                                        pityEnabled={pool.pityEnabled}
                                    />
                                ) : (
                                    <GachaRollAnimation
                                        pool={pool}
                                        results={null}
                                        isRolling={false}
                                        onRollStart={handleRoll}
                                        onAnimationComplete={handleAnimationComplete}
                                        isLightMode={isLightMode}
                                        disabled={pool.items.length === 0 || (players.length > 0 && !activePlayerId)}
                                        pityCounter={activePlayer?.pityCounter}
                                        pityThreshold={pool.pityThreshold}
                                        pityEnabled={pool.pityEnabled}
                                    />
                                )}
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
                    </AnimatePresence>
                </div>

                {/* モバイルタブバー */}
                <div
                    className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-1.5"
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
                    ]).map(tab => {
                        const Icon = tab.icon;
                        const isActive = mobileTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setMobileTab(tab.id)}
                                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${isActive
                                    ? (isLightMode ? "text-purple-600" : "text-purple-400")
                                    : (isLightMode ? "text-gray-400" : "text-white/30")
                                    }`}
                            >
                                <Icon size={18} />
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
                <button
                    onClick={() => setIsLightMode(!isLightMode)}
                    className={`p-1.5 rounded-lg transition-all ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                >
                    {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                </button>
            </div>

            {/* メインエリア */}
            <div className="flex-1 flex overflow-hidden pt-12">
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
                            <div className="flex px-3 pt-3 gap-1 shrink-0">
                                <button
                                    onClick={() => setSidebarTab("setup")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === "setup"
                                        ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                                        : (isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/40 hover:bg-white/5")
                                        }`}
                                >
                                    <Settings size={14} /> 設定
                                </button>
                                <button
                                    onClick={() => setSidebarTab("players")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sidebarTab === "players"
                                        ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                                        : (isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/40 hover:bg-white/5")
                                        }`}
                                >
                                    <Users size={14} /> プレイヤー
                                    {players.length > 0 && (
                                        <span className={`text-[10px] px-1 rounded-full ${isLightMode ? "bg-gray-200" : "bg-white/10"}`}>
                                            {players.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* サイドバーコンテンツ */}
                            <div className="flex-1 overflow-hidden p-3">
                                {sidebarTab === "setup" ? (
                                    <GachaSetup pool={pool} onPoolChange={setPool} isLightMode={isLightMode} />
                                ) : (
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
                                    pool={pool}
                                    results={latestResults}
                                    isRolling={isRolling}
                                    onRollStart={handleRoll}
                                    onAnimationComplete={handleAnimationComplete}
                                    isLightMode={isLightMode}
                                    disabled={pool.items.length === 0 || (players.length > 0 && !activePlayerId)}
                                    pityCounter={activePlayer?.pityCounter}
                                    pityThreshold={pool.pityThreshold}
                                    pityEnabled={pool.pityEnabled}
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
                                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isLightMode
                                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                            : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                                            }`}
                                        style={{ border: `1px solid ${isLightMode ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.3)"}` }}
                                    >
                                        🎰 もう一度引く
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <GachaRollAnimation
                                    pool={pool}
                                    results={null}
                                    isRolling={false}
                                    onRollStart={handleRoll}
                                    onAnimationComplete={handleAnimationComplete}
                                    isLightMode={isLightMode}
                                    disabled={pool.items.length === 0 || (players.length > 0 && !activePlayerId)}
                                    pityCounter={activePlayer?.pityCounter}
                                    pityThreshold={pool.pityThreshold}
                                    pityEnabled={pool.pityEnabled}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
