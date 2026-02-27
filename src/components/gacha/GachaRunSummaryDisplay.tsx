"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import type { GachaPool, RunSummary } from "@/lib/gacha";
import { formatRunSummaryForShare } from "@/lib/gacha";
import { generateShareUrl } from "@/lib/share";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface GachaRunSummaryDisplayProps {
    run: RunSummary;
    pool: GachaPool;
    isLightMode: boolean;
    playerName: string;
    shareHashtags: string;
}

export default function GachaRunSummaryDisplay({
    run,
    pool,
    isLightMode,
    playerName,
    shareHashtags,
}: GachaRunSummaryDisplayProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-500" : "text-white/65";
    const [copied, setCopied] = useState(false);

    const formatText = () =>
        formatRunSummaryForShare(run, pool, shareHashtags, playerName);

    const handleCopy = async () => {
        const text = formatText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = () => {
        const text = formatText();
        const url = generateShareUrl(text);
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const rarityMap = new Map(pool.rarities.map(r => [r.id, r]));
    const sortOrderMap = new Map(pool.rarities.map(r => [r.id, r.sortOrder]));
    const items = [...run.items].sort((a, b) => {
        const sa = sortOrderMap.get(a.rarityId) ?? 0;
        const sb = sortOrderMap.get(b.rarityId) ?? 0;
        if (sa !== sb) return sa - sb;
        return a.itemName.localeCompare(b.itemName);
    });

    const rarityTotals = new Map<string, number>();
    for (const it of run.items) {
        rarityTotals.set(it.rarityId, (rarityTotals.get(it.rarityId) ?? 0) + it.count);
    }

    const rarityStats = pool.rarities
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(r => {
            const count = rarityTotals.get(r.id) ?? 0;
            return {
                rarity: r,
                count,
                percentage: run.pullCount > 0 ? (count / run.pullCount) * 100 : 0,
            };
        })
        .filter(s => s.count > 0);

    return (
        <div
            className="flex-1 rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
        >
            {/* ヘッダー */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <div className={`text-sm font-bold ${textPrimary}`}>
                        {playerName}: {run.pullCount.toLocaleString()}連
                    </div>
                    <div className={`text-[11px] ${textMuted}`}>
                        ガチャ結果 {run.runIndex}回目
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded-lg text-xs transition-all ${copied
                            ? "bg-green-500/20 text-green-400"
                            : isLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/10 text-white/80 hover:bg-white/20"
                            }`}
                        title="コピー"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                        onClick={handleShare}
                        className={`p-1.5 rounded-lg text-xs transition-all ${isLightMode ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                            }`}
                        title="Xで共有"
                    >
                        <Share2 size={14} />
                    </button>
                </div>
            </div>

            {/* レア度別集計バー */}
            {rarityStats.length > 0 && (
                <div className="mt-1">
                    <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)" }}>
                        {rarityStats.map(stat => (
                            <div
                                key={stat.rarity.id}
                                className="h-full"
                                style={{ width: `${stat.percentage}%`, background: stat.rarity.color }}
                                title={`${stat.rarity.name}: ${stat.count}個 (${stat.percentage.toFixed(1)}%)`}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {rarityStats.map(stat => (
                            <span key={stat.rarity.id} className="text-[10px] flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: stat.rarity.color }} />
                                <span style={{ color: stat.rarity.color }} className="font-bold">{stat.rarity.name}</span>
                                <span className={textMuted}>{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 結果一覧 */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch mt-2">
                <div className="flex flex-col gap-1">
                    {items.map(item => {
                        const rarity = rarityMap.get(item.rarityId);
                        return (
                            <div
                                key={item.itemId}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                                style={{
                                    background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)",
                                    borderLeft: `3px solid ${rarity?.color || "#666"}`,
                                }}
                            >
                                <span
                                    className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                    style={{ color: rarity?.color, background: rarity?.bgColor }}
                                >
                                    {rarity?.name || "?"}
                                </span>
                                <span className={`text-sm flex-1 ${textPrimary}`}>{item.itemName}</span>
                                <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>
                                    ×{item.count.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

