"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { X, Link, ChevronDown, Trash2 } from "lucide-react";
import type { Player, GachaPool, RunSummary } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import PlayerLinkCollectionModal from "./PlayerLinkCollectionModal";
import GachaHistorySummary from "./GachaHistorySummary";
import GachaRunSummaryDisplay from "./GachaRunSummaryDisplay";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getSampleTemplates, createDefaultPool, type GachaPoolPreset } from "@/lib/gacha";
import { useConfirm } from "@/context/ConfirmContext";

interface PlayerHistoryCardProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
    shareHashtags: string;
    onClose: () => void;
    onDeleteHistoryForPool?: (poolId: string) => void;
}

export default function PlayerHistoryCard({ player, pool, isLightMode, shareHashtags, onClose, onDeleteHistoryForPool }: PlayerHistoryCardProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "runs">("summary");
    const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);
    const [showLinkCollection, setShowLinkCollection] = useState(false);
    const [viewingPoolId, setViewingPoolId] = useState<string>(pool.id);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!dropdownOpen) return;
        const close = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [dropdownOpen]);

    const [presets] = useLocalStorage<GachaPoolPreset[]>("gacha-presets", []);
    const sampleTemplates = useMemo(() => getSampleTemplates(), []);
    const { confirm } = useConfirm();

    const poolMap = useMemo(() => {
        const map = new Map<string, GachaPool>();
        map.set(pool.id, pool);
        for (const p of presets) map.set(p.pool.id, p.pool);
        for (const s of sampleTemplates) map.set(s.pool.id, s.pool);
        return map;
    }, [pool, presets, sampleTemplates]);

    const availablePoolIds = useMemo(() => {
        const ids = new Set<string>();
        ids.add(pool.id);
        if (player.runHistory) {
            player.runHistory.forEach(r => {
                if (r.poolId) ids.add(r.poolId);
            });
        }
        if (player.poolStates) {
            Object.keys(player.poolStates).forEach(id => ids.add(id));
        }
        return Array.from(ids);
    }, [pool.id, player.runHistory, player.poolStates]);

    const resolvedPool = useMemo(() => {
        const p = poolMap.get(viewingPoolId);
        if (p) return p;

        // 履歴から名前を探す
        const historyEntry = player.runHistory?.find(r => r.poolId === viewingPoolId);
        const savedName = historyEntry?.poolName;

        const fallback = createDefaultPool();
        fallback.id = viewingPoolId;
        fallback.conceptName = savedName ? `(削除済) ${savedName}` : "削除されたガチャ";
        return fallback;
    }, [viewingPoolId, poolMap, player.runHistory]);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    const runsForPool = useMemo(
        () => (player.runHistory ?? []).filter((r) => r.poolId === resolvedPool.id),
        [player.runHistory, resolvedPool.id],
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
            <div className="px-4 py-3 shrink-0 flex flex-col gap-2" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h2 className={`text-sm font-bold ${textPrimary} truncate`}>{player.name} の履歴</h2>
                        
                        {/* 筋のいいガチャ切り替え（ラベルなし・バッジ風・グラスモーフィズム） */}
                        {availablePoolIds.length > 1 ? (
                            <div className="relative inline-flex mt-1" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className={`appearance-none bg-transparent text-[11px] font-semibold pl-2 pr-5 py-0.5 rounded-full outline-none cursor-pointer transition-colors flex items-center gap-1 border border-transparent ${
                                        isLightMode ? "text-purple-700 bg-purple-50 hover:bg-purple-100" : "text-purple-300 bg-purple-500/10 hover:bg-purple-500/20"
                                    }`}
                                >
                                    <span className="truncate max-w-[120px]">
                                        {resolvedPool.conceptName || "削除されたガチャ"}
                                    </span>
                                    <ChevronDown size={12} className={`absolute right-1.5 transition-transform ${dropdownOpen ? "rotate-180" : ""} ${isLightMode ? "text-purple-500" : "text-purple-400"}`} />
                                </button>

                                {/* 削除ボタン */}
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const p = poolMap.get(viewingPoolId);
                                        const name = p?.conceptName || player.runHistory?.find(r => r.poolId === viewingPoolId)?.poolName || "このガチャ";
                                        if (await confirm({ 
                                            title: "履歴の削除", 
                                            message: `${name} の履歴と統計をすべて削除しますか？`, 
                                            danger: true 
                                        })) {
                                            onDeleteHistoryForPool?.(viewingPoolId);
                                            if (viewingPoolId !== pool.id) {
                                                setViewingPoolId(pool.id);
                                            }
                                        }
                                    }}
                                    className={`ml-1.5 p-1 rounded transition-colors ${isLightMode ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-white/30 hover:text-red-400 hover:bg-red-500/10"}`}
                                    title="このガチャの履歴を削除"
                                >
                                    <Trash2 size={12} />
                                </button>

                                {dropdownOpen && (
                                    <div 
                                        className="absolute left-0 top-full mt-1 z-[100] rounded-xl overflow-hidden shadow-xl border backdrop-blur-xl max-h-48 overflow-y-auto scroll-touch w-max min-w-[140px]"
                                        style={{ background: glassBg, borderColor: glassBorder }}
                                    >
                                        <div className="py-1 flex flex-col">
                                            {availablePoolIds.map(id => {
                                                const p = poolMap.get(id);
                                                const historyEntry = player.runHistory?.find(r => r.poolId === id);
                                                const name = p?.conceptName || historyEntry?.poolName || "削除されたガチャ";
                                                const runsCount = (player.runHistory || []).filter(r => r.poolId === id).length;
                                                const isSelected = id === viewingPoolId;
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => {
                                                            setViewingPoolId(id);
                                                            setActiveTab("summary");
                                                            setSelectedRunIndex(null);
                                                            setDropdownOpen(false);
                                                        }}
                                                        className={`text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-3 ${
                                                            isSelected
                                                                ? (isLightMode ? "bg-purple-100/80 text-purple-700" : "bg-purple-500/30 text-purple-300")
                                                                : (isLightMode ? "hover:bg-black/5 text-gray-800" : "hover:bg-white/10 text-white/90")
                                                        }`}
                                                    >
                                                        <span className="font-medium truncate">{name}</span>
                                                        <span className={`text-[10px] shrink-0 ${isSelected ? (isLightMode ? "text-purple-600" : "text-purple-400") : (isLightMode ? "text-gray-500" : "text-white/50")}`}>
                                                            {id === pool.id ? "現在" : runsCount > 0 ? `${runsCount}回` : ""}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className={`text-[11px] mt-1 ${textMuted} truncate`}>
                                {resolvedPool.conceptName || "削除されたガチャ"}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => setShowLinkCollection(true)}
                            className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-purple-50 text-purple-600" : "hover:bg-purple-500/10 text-purple-400"}`}
                            title="リンク集"
                        >
                            <Link size={16} />
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                            title="閉じる"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {showLinkCollection && (
                <PlayerLinkCollectionModal
                    player={player}
                    pool={resolvedPool}
                    isLightMode={isLightMode}
                    onClose={() => setShowLinkCollection(false)}
                />
            )}

            {/* 天井ゲージ */}
            {(() => {
                const st = player.poolStates?.[resolvedPool.id] || { totalPulls: 0, pityCounter: 0, pityReachCount: 0 };
                return resolvedPool.pityEnabled && (
                    <div className="px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                        <div className="flex justify-between mb-1">
                            <span className={`text-[10px] ${textMuted}`}>天井カウント</span>
                            <span className={`text-[10px] font-bold ${textSecondary}`}>
                                {st.pityCounter} / {resolvedPool.pityThreshold}
                            </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isLightMode ? "bg-gray-200" : "bg-white/10"}`}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${Math.min((st.pityCounter / resolvedPool.pityThreshold) * 100, 100)}%`,
                                    background: "linear-gradient(90deg, #a855f7, #ef4444)",
                                }}
                            />
                        </div>
                        {(st.pityReachCount ?? 0) > 0 && (
                            <p className={`text-[10px] mt-1 ${textMuted}`}>天井到達: {(st.pityReachCount ?? 0)}回</p>
                        )}
                    </div>
                );
            })()}

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
                            : (isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg-white/10")
                            }`}
                    >
                        各回
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4 pt-3">
                    {activeTab === "summary" ? (
                        <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                            <GachaHistorySummary player={player} pool={resolvedPool} isLightMode={isLightMode} />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            {selectedRun && runsForPool.length > 0 ? (
                                <div className="flex-1 min-h-0 overflow-y-auto scroll-touch">
                                    <GachaRunSummaryDisplay
                                        run={selectedRun}
                                        pool={resolvedPool}
                                        isLightMode={isLightMode}
                                        playerName={player.name}
                                        shareHashtags={shareHashtags}
                                        runsForPool={runsForPool}
                                        onSelectRunIndex={setSelectedRunIndex}
                                    />
                                </div>
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
