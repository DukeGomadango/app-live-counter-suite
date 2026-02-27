"use client";

import { useState, useMemo } from "react";
import { X, ChevronRight, Link } from "lucide-react";
import type { Player, GachaPool, RunSummary } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import PlayerLinkCollectionModal from "./PlayerLinkCollectionModal";
import GachaHistorySummary from "./GachaHistorySummary";
import GachaRunSummaryDisplay from "./GachaRunSummaryDisplay";

interface PlayerHistoryCardProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
    shareHashtags: string;
    onClose: () => void;
}

export default function PlayerHistoryCard({ player, pool, isLightMode, shareHashtags, onClose }: PlayerHistoryCardProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "runs">("summary");
    const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);
    const [showLinkCollection, setShowLinkCollection] = useState(false);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    const runsForPool = useMemo(
        () => (player.runHistory ?? []).filter((r) => r.poolId === pool.id),
        [player.runHistory, pool.id],
    );

    const latestRun: RunSummary | null = runsForPool.length > 0 ? runsForPool[runsForPool.length - 1]! : null;

    const effectiveSelectedRunIndex = useMemo(() => {
        if (selectedRunIndex != null && runsForPool.some(r => r.runIndex === selectedRunIndex)) {
            return selectedRunIndex;
        }
        return latestRun?.runIndex ?? null;
    }, [selectedRunIndex, runsForPool, latestRun]);

    let selectedRun: RunSummary | null = null;
    if (effectiveSelectedRunIndex != null) {
        const found = runsForPool.find(r => r.runIndex === effectiveSelectedRunIndex);
        selectedRun = found ?? latestRun ?? null;
    } else {
        selectedRun = latestRun ?? null;
    }

    return (
        <div className="h-full flex flex-col rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <h2 className={`text-sm font-bold ${textPrimary}`}>{player.name} の履歴</h2>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowLinkCollection(true)}
                        className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-purple-50 text-purple-600" : "hover:bg-purple-500/10 text-purple-400"}`}
                        title="リンク集"
                    >
                        <Link size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                        title="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {showLinkCollection && (
                <PlayerLinkCollectionModal
                    player={player}
                    pool={pool}
                    isLightMode={isLightMode}
                    onClose={() => setShowLinkCollection(false)}
                />
            )}

            {/* 天井ゲージ */}
            {pool.pityEnabled && (
                <div className="px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
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
                    {(player.pityReachCount ?? 0) > 0 && (
                        <p className={`text-[10px] mt-1 ${textMuted}`}>天井到達: {(player.pityReachCount ?? 0)}回</p>
                    )}
                </div>
            )}

            {/* タブ＋2カラムエリア */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* タブヘッダー */}
                <div className="px-4 pt-3 flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab("summary")}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeTab === "summary"
                            ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-200")
                            : (isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg-white/10")
                            }`}
                    >
                        累計
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("runs")}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeTab === "runs"
                            ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-200")
                            : (isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg白/10")
                            }`}
                    >
                        各回
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-h-0 overflow-hidden p-4 pt-3">
                    {activeTab === "summary" ? (
                        <GachaHistorySummary player={player} pool={pool} isLightMode={isLightMode} />
                    ) : (
                        <div className="h-full flex gap-3">
                            {/* 左: 回一覧 */}
                            <div
                                className="w-40 shrink-0 rounded-2xl overflow-hidden flex flex-col"
                                style={{ background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)", border: `1px solid ${glassBorder}` }}
                            >
                                <div
                                    className={`px-3 py-2 border-b text-[11px] font-semibold uppercase tracking-wider ${textSecondary}`}
                                    style={{ borderColor: glassBorder }}
                                >
                                    各回の結果
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    {runsForPool.length === 0 ? (
                                        <div className="px-3 py-3 text-[11px] text-center text-gray-500">
                                            まだ結果がありません
                                        </div>
                                    ) : (
                                        [...runsForPool].reverse().map((run: RunSummary) => {
                                            const isActive = effectiveSelectedRunIndex === run.runIndex;
                                            return (
                                                <button
                                                    key={`${run.runIndex}-${run.timestamp}`}
                                                    type="button"
                                                    onClick={() => setSelectedRunIndex(run.runIndex)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] transition-all ${isActive
                                                        ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-100")
                                                        : (isLightMode ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-white/80")
                                                        }`}
                                                >
                                                    <span className="flex-1 truncate">
                                                        ガチャ結果 {run.runIndex}回目
                                                    </span>
                                                    <span className="ml-1 tabular-nums">
                                                        {run.pullCount.toLocaleString()}連
                                                    </span>
                                                    <ChevronRight size={12} className="ml-1 opacity-70" />
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* 右: 選択中の回の詳細 */}
                            {selectedRun && runsForPool.length > 0 ? (
                                <GachaRunSummaryDisplay
                                    run={selectedRun}
                                    pool={pool}
                                    isLightMode={isLightMode}
                                    playerName={player.name}
                                    shareHashtags={shareHashtags}
                                />
                            ) : (
                                <div
                                    className="flex-1 flex items-center justify-center rounded-2xl"
                                    style={{ background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)", border: `1px solid ${glassBorder}` }}
                                >
                                    <p className={`text-sm ${textMuted}`}>まだ結果がありません</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
