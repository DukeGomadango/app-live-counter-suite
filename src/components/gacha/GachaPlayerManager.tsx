"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { UserPlus, Trash2, RotateCcw, ChevronRight, User, Link, FileArchive, Pencil, Check } from "lucide-react";
import type { Player, GachaPool } from "@/lib/gacha";
import { getPlayerItemAttachments, buildPlayerAttachmentsZip } from "@/lib/gachaZip";
import { DEFAULT_EXTRA_HASHTAG } from "@/lib/site";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import ConfirmDialog from "@/components/ConfirmDialog";
import PlayerLinkCollectionModal from "@/components/gacha/PlayerLinkCollectionModal";

interface GachaPlayerManagerProps {
    players: Player[];
    activePlayerId: string | null;
    onSelectPlayer: (id: string) => void;
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onResetPlayer: (id: string) => void;
    onRenamePlayer?: (id: string, newName: string) => void;
    onResetAllPlayers?: () => void;
    onViewPlayerHistory?: (playerId: string) => void;
    pool: GachaPool;
    isLightMode: boolean;
    /** ダークモードで背景が明るいとき true。文字を暗くして視認性を確保 */
    textContrastLight?: boolean;
    shareHashtags?: string;
}

export default function GachaPlayerManager({
    players,
    activePlayerId,
    onSelectPlayer,
    onAddPlayer,
    onRemovePlayer,
    onResetPlayer,
    onRenamePlayer,
    onResetAllPlayers,
    onViewPlayerHistory,
    pool,
    isLightMode,
    textContrastLight = false,
    shareHashtags: _shareHashtags = DEFAULT_EXTRA_HASHTAG,
}: GachaPlayerManagerProps) {
    const [newPlayerName, setNewPlayerName] = useState("");
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
    const [bulkDeleteTargets, setBulkDeleteTargets] = useState<string[] | null>(null);
    const [playerToReset, setPlayerToReset] = useState<string | null>(null);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [linkCollectionPlayerId, setLinkCollectionPlayerId] = useState<string | null>(null);
    const [zipLoadingPlayerId, setZipLoadingPlayerId] = useState<string | null>(null);
    const [playerToZip, setPlayerToZip] = useState<Player | null>(null);
    const [showBulkResetConfirm, setShowBulkResetConfirm] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editPlayerName, setEditPlayerName] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadZip = useCallback(
        async (player: Player) => {
            const attachments = getPlayerItemAttachments(player, pool);
            if (attachments.length === 0) {
                alert("このプレイヤーの獲得品目に画像URL・音声URLが設定されているものはありません。");
                return;
            }
            setZipLoadingPlayerId(player.id);
            try {
                const blob = await buildPlayerAttachmentsZip(player, pool);
                const name = player.name.replace(/[/\\:*?"<>|]/g, "_").trim().slice(0, 100) || "player";
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${name}_景品.zip`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error(e);
                alert("ZIPの作成に失敗しました。");
            } finally {
                setZipLoadingPlayerId(null);
            }
        },
        [pool]
    );

    const allSelected = players.length > 0 && selectedPlayerIds.size === players.length;
    const someSelected = selectedPlayerIds.size > 0;
    const toggleSelectAll = () => {
        if (allSelected) setSelectedPlayerIds(new Set());
        else setSelectedPlayerIds(new Set(players.map(p => p.id)));
    };
    const toggleSelect = (id: string) => {
        setSelectedPlayerIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const el = selectAllRef.current;
        if (el) el.indeterminate = someSelected && !allSelected;
    }, [someSelected, allSelected]);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textLight = isLightMode || textContrastLight;
    const textPrimary = textLight ? "text-gray-900" : "text-white/95";
    const textSecondary = textLight ? "text-gray-700" : "text-white/75";
    const textMuted = textLight ? "text-gray-600" : "text-white/65";
    const inputBg = textLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = textLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    const handleAddPlayer = () => {
        if (!newPlayerName.trim()) return;
        onAddPlayer(newPlayerName.trim());
        setNewPlayerName("");
    };

    const handleRequestDelete = (id: string) => setPlayerToDelete(id);
    const handleRequestReset = (id: string) => setPlayerToReset(id);

    const startEditingPlayer = (player: Player) => {
        setEditingPlayerId(player.id);
        setEditPlayerName(player.name);
        // 次フレームでinputにフォーカス
        setTimeout(() => editInputRef.current?.focus(), 0);
    };

    const finishEditingPlayer = () => {
        if (editingPlayerId && editPlayerName.trim() && onRenamePlayer) {
            onRenamePlayer(editingPlayerId, editPlayerName.trim());
        }
        setEditingPlayerId(null);
        setEditPlayerName("");
    };

    return (
        <div className="flex flex-col gap-3 pr-1 pb-4">
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
                        className={`flex-1 px-3 py-2 rounded-lg text-sm ${textPrimary} ${textLight ? "placeholder:text-gray-500" : "placeholder:text-white/55"} outline-none transition-all focus:ring-2 focus:ring-purple-500/30`}
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
                className="rounded-2xl overflow-hidden"
                style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
            >
                <div className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b ${textSecondary}`} style={{ borderColor: glassBorder }}>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-400 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            プレイヤー ({players.length})
                        </span>
                    </label>
                    <div className="flex items-center gap-1">
                        {onResetAllPlayers && players.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowBulkResetConfirm(true)}
                                className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg-white/10"}`}
                            >
                                一括リセット
                            </button>
                        )}
                        {someSelected && (
                            <button
                                type="button"
                                onClick={() => setBulkDeleteTargets(Array.from(selectedPlayerIds))}
                                className="text-[10px] px-2 py-1 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                                選択を削除
                            </button>
                        )}
                    </div>
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
                                    <input
                                        type="checkbox"
                                        checked={selectedPlayerIds.has(player.id)}
                                        onChange={e => { e.stopPropagation(); toggleSelect(player.id); }}
                                        onClick={e => e.stopPropagation()}
                                        className="rounded border-gray-400 text-purple-500 focus:ring-purple-500 shrink-0"
                                    />
                                    {/* アクティブインジケーター */}
                                    <div
                                        className={`w-2 h-2 rounded-full shrink-0 transition-all ${isActive ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : (isLightMode ? "bg-gray-300" : "bg-white/20")
                                            }`}
                                    />

                                    {/* プレイヤー情報 */}
                                    <div className="flex-1 min-w-0">
                                        {editingPlayerId === player.id ? (
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editPlayerName}
                                                    onChange={e => setEditPlayerName(e.target.value)}
                                                    onBlur={finishEditingPlayer}
                                                    onKeyDown={e => { if (e.key === "Enter") finishEditingPlayer(); if (e.key === "Escape") { setEditingPlayerId(null); setEditPlayerName(""); } }}
                                                    className={`text-sm font-medium px-1.5 py-0.5 rounded flex-1 min-w-0 outline-none focus:ring-2 focus:ring-purple-500/30 ${textPrimary}`}
                                                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                                />
                                                <button
                                                    onClick={e => { e.stopPropagation(); finishEditingPlayer(); }}
                                                    className="p-0.5 rounded hover:bg-green-500/20 text-green-500 transition-colors shrink-0"
                                                    title="確定"
                                                >
                                                    <Check size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 group/name">
                                                <p className={`text-sm font-medium truncate ${textPrimary}`}>{player.name}</p>
                                                {onRenamePlayer && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); startEditingPlayer(player); }}
                                                        className={`p-0.5 rounded opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0 ${isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/40 hover:bg-white/10"}`}
                                                        title="名前を変更"
                                                    >
                                                        <Pencil size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <p className={`text-[10px] ${textMuted}`}>
                                            {player.totalPulls.toLocaleString()}連
                                            {pool.pityEnabled && ` • 天井: ${player.pityCounter}/${pool.pityThreshold}`}
                                            {pool.pityEnabled && (player.pityReachCount ?? 0) > 0 && ` • 到達${player.pityReachCount}回`}
                                        </p>
                                    </div>

                                    {/* 操作ボタン */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); setLinkCollectionPlayerId(player.id); }}
                                            className={`p-1 rounded text-[10px] transition-all ${isLightMode ? "text-purple-700 hover:bg-purple-50" : "text-purple-400 hover:bg-purple-500/10"}`}
                                            title="リンク集"
                                        >
                                            <Link size={12} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); setPlayerToZip(player); }}
                                            disabled={zipLoadingPlayerId === player.id}
                                            className={`p-1 rounded text-[10px] transition-all disabled:opacity-50 ${isLightMode ? "text-amber-700 hover:bg-amber-50" : "text-amber-400 hover:bg-amber-500/10"}`}
                                            title="景品をZIPでダウンロード"
                                        >
                                            <FileArchive size={12} />
                                        </button>
                                        {onViewPlayerHistory && (
                                            <button
                                                onClick={e => { e.stopPropagation(); onViewPlayerHistory(player.id); }}
                                                className={`p-1 rounded text-[10px] transition-all ${isLightMode ? "text-blue-700 hover:bg-blue-50" : "text-blue-400 hover:bg-blue-500/10"
                                                    }`}
                                                title="履歴を見る"
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                        )}
                                        <button
                                            onClick={e => { e.stopPropagation(); handleRequestReset(player.id); }}
                                            className={`p-1 rounded text-[10px] transition-all ${isLightMode ? "text-gray-700 hover:bg-gray-100" : "text-white/30 hover:bg-white/5"}`}
                                            title="リセット"
                                        >
                                            <RotateCcw size={11} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleRequestDelete(player.id); }}
                                            className={`p-1 rounded text-[10px] transition-all ${isLightMode ? "text-gray-700 hover:bg-gray-100" : "text-white/30 hover:bg-white/5"}`}
                                            title="削除"
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

            <ConfirmDialog
                open={playerToDelete !== null}
                message="本当に削除しますか？"
                confirmLabel="削除する"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (playerToDelete) {
                        onRemovePlayer(playerToDelete);
                        setPlayerToDelete(null);
                    }
                }}
                onCancel={() => setPlayerToDelete(null)}
            />
            <ConfirmDialog
                open={bulkDeleteTargets !== null}
                title="一括削除"
                message={bulkDeleteTargets?.length ? `選択した ${bulkDeleteTargets.length} 人を削除しますか？` : ""}
                confirmLabel="削除する"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (bulkDeleteTargets) {
                        bulkDeleteTargets.forEach(id => onRemovePlayer(id));
                        setSelectedPlayerIds(new Set());
                        setBulkDeleteTargets(null);
                    }
                }}
                onCancel={() => setBulkDeleteTargets(null)}
            />
            <ConfirmDialog
                open={playerToReset !== null}
                message="記録をリセットしますか？"
                confirmLabel="リセットする"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (playerToReset) {
                        onResetPlayer(playerToReset);
                        setPlayerToReset(null);
                    }
                }}
                onCancel={() => setPlayerToReset(null)}
                danger={false}
            />
            <ConfirmDialog
                open={showBulkResetConfirm}
                message="記録をリセットしますか？全プレイヤーの記録がクリアされます。"
                confirmLabel="リセットする"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    onResetAllPlayers?.();
                    setShowBulkResetConfirm(false);
                }}
                onCancel={() => setShowBulkResetConfirm(false)}
                danger={false}
            />
            <ConfirmDialog
                open={playerToZip !== null}
                title="Zip化"
                message="獲得景品の画像・音声をZip化してダウンロードしますか？"
                confirmLabel="Zip化する"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (playerToZip) {
                        handleDownloadZip(playerToZip);
                        setPlayerToZip(null);
                    }
                }}
                onCancel={() => setPlayerToZip(null)}
                danger={false}
            />

            {linkCollectionPlayerId && (() => {
                const player = players.find((p) => p.id === linkCollectionPlayerId);
                if (!player) return null;
                return (
                    <PlayerLinkCollectionModal
                        player={player}
                        pool={pool}
                        isLightMode={isLightMode}
                        onClose={() => setLinkCollectionPlayerId(null)}
                    />
                );
            })()}
        </div>
    );
}
