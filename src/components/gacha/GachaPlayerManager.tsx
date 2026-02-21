"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserPlus,
    Trash2,
    RotateCcw,
    ChevronRight,
    User,
} from "lucide-react";
import type { Player, GachaPool } from "@/lib/gacha";
import GachaResultDisplay from "./GachaResultDisplay";

interface GachaPlayerManagerProps {
    players: Player[];
    activePlayerId: string | null;
    onSelectPlayer: (id: string) => void;
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onResetPlayer: (id: string) => void;
    pool: GachaPool;
    isLightMode: boolean;
}

export default function GachaPlayerManager({
    players,
    activePlayerId,
    onSelectPlayer,
    onAddPlayer,
    onRemovePlayer,
    onResetPlayer,
    pool,
    isLightMode,
}: GachaPlayerManagerProps) {
    const [newPlayerName, setNewPlayerName] = useState("");
    const [showPlayerResults, setShowPlayerResults] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState<string | null>(null);

    const glassBg = isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/90";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";
    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    const handleAddPlayer = () => {
        if (!newPlayerName.trim()) return;
        onAddPlayer(newPlayerName.trim());
        setNewPlayerName("");
    };

    const handleDelete = (id: string) => {
        if (confirmDelete === id) {
            onRemovePlayer(id);
            setConfirmDelete(null);
            if (showPlayerResults === id) setShowPlayerResults(null);
        } else {
            setConfirmDelete(id);
            setTimeout(() => setConfirmDelete(null), 3000);
        }
    };

    const handleReset = (id: string) => {
        if (confirmReset === id) {
            onResetPlayer(id);
            setConfirmReset(null);
        } else {
            setConfirmReset(id);
            setTimeout(() => setConfirmReset(null), 3000);
        }
    };

    // プレイヤー詳細ビュー
    if (showPlayerResults) {
        const player = players.find(p => p.id === showPlayerResults);
        if (!player) {
            setShowPlayerResults(null);
            return null;
        }

        return (
            <div className="flex flex-col h-full">
                {/* 戻るヘッダー */}
                <button
                    onClick={() => setShowPlayerResults(null)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all ${isLightMode ? "text-purple-600 hover:bg-purple-50" : "text-purple-400 hover:bg-white/5"}`}
                >
                    <ChevronRight size={14} className="rotate-180" />
                    {player.name} の履歴
                </button>

                {/* 天井ゲージ */}
                {pool.pityEnabled && (
                    <div className="px-4 mb-2">
                        <div className="flex justify-between mb-1">
                            <span className={`text-[10px] ${textMuted}`}>天井カウント</span>
                            <span className={`text-[10px] font-bold ${textSecondary}`}>
                                {player.pityCounter} / {pool.pityThreshold}
                            </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isLightMode ? "bg-gray-200" : "bg-white/10"}`}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${Math.min((player.pityCounter / pool.pityThreshold) * 100, 100)}%`,
                                    background: "linear-gradient(90deg, #a855f7, #ef4444)",
                                }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    <GachaResultDisplay
                        results={player.results}
                        pool={pool}
                        isLightMode={isLightMode}
                        title={`${player.name}: ${player.totalPulls.toLocaleString()}連`}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 pb-4">
            {/* プレイヤー追加 */}
            <div
                className="rounded-2xl p-4"
                style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
            >
                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2 block`}>
                    プレイヤー追加
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        placeholder="名前を入力..."
                        className={`flex-1 px-3 py-2 rounded-lg text-sm ${textPrimary} outline-none transition-all focus:ring-2 focus:ring-purple-500/30`}
                        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                        onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
                    />
                    <button
                        onClick={handleAddPlayer}
                        disabled={!newPlayerName.trim()}
                        className={`p-2 rounded-lg transition-all disabled:opacity-30 ${isLightMode ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                            }`}
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
            </div>

            {/* プレイヤーリスト */}
            <div
                className="rounded-2xl overflow-hidden flex-1"
                style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
            >
                <div className={`px-4 py-2.5 border-b ${textSecondary}`} style={{ borderColor: glassBorder }}>
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        プレイヤー ({players.length})
                    </span>
                </div>

                {players.length === 0 ? (
                    <div className="p-4 text-center">
                        <User size={24} className={`mx-auto mb-2 ${textMuted}`} />
                        <p className={`text-xs ${textMuted}`}>プレイヤーを追加してください</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {players.map(player => {
                            const isActive = player.id === activePlayerId;
                            return (
                                <motion.div
                                    key={player.id}
                                    layout
                                    className={`flex items-center gap-2 px-4 py-3 border-b transition-all cursor-pointer ${isActive
                                        ? (isLightMode ? "bg-purple-50" : "bg-purple-500/10")
                                        : (isLightMode ? "hover:bg-gray-50" : "hover:bg-white/5")
                                        }`}
                                    style={{ borderColor: glassBorder }}
                                    onClick={() => onSelectPlayer(player.id)}
                                >
                                    {/* アクティブインジケーター */}
                                    <div
                                        className={`w-2 h-2 rounded-full shrink-0 transition-all ${isActive ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : (isLightMode ? "bg-gray-300" : "bg-white/20")
                                            }`}
                                    />

                                    {/* プレイヤー情報 */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${textPrimary}`}>{player.name}</p>
                                        <p className={`text-[10px] ${textMuted}`}>
                                            {player.totalPulls.toLocaleString()}連
                                            {pool.pityEnabled && ` • 天井: ${player.pityCounter}/${pool.pityThreshold}`}
                                        </p>
                                    </div>

                                    {/* 操作ボタン */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); setShowPlayerResults(player.id); }}
                                            className={`p-1 rounded text-[10px] transition-all ${isLightMode ? "text-blue-600 hover:bg-blue-50" : "text-blue-400 hover:bg-blue-500/10"
                                                }`}
                                            title="履歴を見る"
                                        >
                                            <ChevronRight size={12} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleReset(player.id); }}
                                            className={`p-1 rounded text-[10px] transition-all ${confirmReset === player.id
                                                ? "text-orange-400 bg-orange-500/10"
                                                : (isLightMode ? "text-gray-400 hover:bg-gray-100" : "text-white/30 hover:bg-white/5")
                                                }`}
                                            title={confirmReset === player.id ? "もう一度押して確認" : "リセット"}
                                        >
                                            <RotateCcw size={11} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(player.id); }}
                                            className={`p-1 rounded text-[10px] transition-all ${confirmDelete === player.id
                                                ? "text-red-400 bg-red-500/10"
                                                : (isLightMode ? "text-gray-400 hover:bg-gray-100" : "text-white/30 hover:bg-white/5")
                                                }`}
                                            title={confirmDelete === player.id ? "もう一度押して削除" : "削除"}
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
