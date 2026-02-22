"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import type { Player, GachaPool, RunSummary } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import GachaResultDisplay from "./GachaResultDisplay";

interface PlayerHistoryCardProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
    shareHashtags: string;
    onClose: () => void;
}

export default function PlayerHistoryCard({ player, pool, isLightMode, shareHashtags, onClose }: PlayerHistoryCardProps) {
    const [expandedRunIndex, setExpandedRunIndex] = useState<number | null>(null);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    return (
        <div className="h-full flex flex-col rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <h2 className={`text-sm font-bold ${textPrimary}`}>{player.name} の履歴</h2>
                <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                    title="閉じる"
                >
                    <X size={18} />
                </button>
            </div>

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

            {/* スクロール可能エリア */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4">
                <GachaResultDisplay
                    results={player.results}
                    pool={pool}
                    isLightMode={isLightMode}
                    title={`${player.name}: ${player.totalPulls.toLocaleString()}連`}
                    shareHashtags={shareHashtags}
                />
                {((player.runHistory?.length ?? 0) > 0) && (
                    <div className="rounded-2xl overflow-hidden shrink-0" style={{ background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)", border: `1px solid ${glassBorder}` }}>
                        <div className={`px-4 py-3 border-b ${textSecondary}`} style={{ borderColor: glassBorder }}>
                            <span className="text-xs font-semibold uppercase tracking-wider">過去の結果（全件）</span>
                        </div>
                        <div className="flex flex-col max-h-80 overflow-y-auto">
                            {[...(player.runHistory ?? [])].reverse().map((run: RunSummary) => {
                                const isExpanded = expandedRunIndex === run.runIndex;
                                return (
                                    <div
                                        key={`${run.runIndex}-${run.timestamp}`}
                                        className="border-b last:border-b-0"
                                        style={{ borderColor: glassBorder }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setExpandedRunIndex(isExpanded ? null : run.runIndex)}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${isLightMode ? "hover:bg-gray-50" : "hover:bg-white/5"}`}
                                        >
                                            <span className={`text-sm font-medium ${textPrimary}`}>ガチャ結果 {run.runIndex}回目</span>
                                            <span className={`text-xs ${textMuted}`}>{run.pullCount}連</span>
                                            {isExpanded ? <ChevronUp size={16} className={textSecondary} /> : <ChevronDown size={16} className={textSecondary} />}
                                        </button>
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0 flex flex-col gap-2" style={{ background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)" }}>
                                                {run.items.map(item => {
                                                    const rarity = pool.rarities.find(r => r.id === item.rarityId);
                                                    return (
                                                        <div key={item.itemId} className="flex items-center justify-between text-sm">
                                                            <span className={`flex items-center gap-2 ${textPrimary}`}>
                                                                <span
                                                                    className="font-bold px-1.5 py-0.5 rounded text-xs shrink-0"
                                                                    style={rarity ? { color: rarity.color, background: rarity.bgColor } : (isLightMode ? { color: "#6b7280", background: "rgba(0,0,0,0.06)" } : { color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)" })}
                                                                >
                                                                    {rarity ? rarity.name : "?"}
                                                                </span>
                                                                <span>{item.itemName}</span>
                                                            </span>
                                                            <span className={`font-bold tabular-nums ${textSecondary}`}>×{item.count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
