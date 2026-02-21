"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Share2,
    Copy,
    Check,
    ArrowUpDown,
    Filter,
    BarChart3,
} from "lucide-react";
import type { GachaResult, GachaPool, RarityTier, SortMode, FilterMode, OrganizedResult } from "@/lib/gacha";
import { organizeResults, formatResultsForShare, generateShareUrl } from "@/lib/gacha";

interface GachaResultDisplayProps {
    results: GachaResult[];
    pool: GachaPool;
    isLightMode: boolean;
    title?: string;
}

export default function GachaResultDisplay({
    results,
    pool,
    isLightMode,
    title,
}: GachaResultDisplayProps) {
    const [sortMode, setSortMode] = useState<SortMode>("rarity-asc");
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<"summary" | "list">("summary");

    const glassBg = isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/90";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";

    if (results.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className={`text-sm ${textSecondary}`}>まだ結果がありません</p>
            </div>
        );
    }

    const organized = organizeResults(results, pool.rarities, sortMode, filterMode);
    const totalCount = organized.reduce((sum, item) => sum + item.count, 0);

    const getRarity = (rarityId: string): RarityTier | undefined =>
        pool.rarities.find(r => r.id === rarityId);

    // レア度別集計
    const rarityStats = pool.rarities
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(r => {
            const count = results.filter(res => res.rarityId === r.id).length;
            return { rarity: r, count, percentage: results.length > 0 ? (count / results.length) * 100 : 0 };
        })
        .filter(s => s.count > 0);

    const handleShare = () => {
        const text = formatResultsForShare(results, pool);
        const url = generateShareUrl(text);
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleCopy = async () => {
        const text = formatResultsForShare(results, pool);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
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

    const sortOptions: { value: SortMode; label: string }[] = [
        { value: "rarity-asc", label: "レア度↑" },
        { value: "rarity-desc", label: "レア度↓" },
        { value: "name", label: "名前順" },
        { value: "count", label: "個数順" },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
                <h3 className={`text-sm font-bold ${textPrimary}`}>
                    {title || `${results.length.toLocaleString()}連の結果`}
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded-lg text-xs transition-all ${copied
                            ? "bg-green-500/20 text-green-400"
                            : isLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/10 text-white/60 hover:bg-white/20"
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
            <div className="px-4 mb-2 shrink-0">
                <div className="h-3 rounded-full overflow-hidden flex" style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
                    {rarityStats.map(stat => (
                        <motion.div
                            key={stat.rarity.id}
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.percentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full"
                            style={{ background: stat.rarity.color }}
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

            {/* コントロールバー */}
            <div className="flex items-center gap-2 px-4 mb-2 shrink-0 flex-wrap">
                {/* ビューモード */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${glassBorder}` }}>
                    <button
                        onClick={() => setViewMode("summary")}
                        className={`px-2 py-1 text-[10px] transition-all ${viewMode === "summary"
                            ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                            : (isLightMode ? "text-gray-500" : "text-white/40")
                            }`}
                    >
                        <BarChart3 size={10} className="inline mr-0.5" /> 集計
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`px-2 py-1 text-[10px] transition-all ${viewMode === "list"
                            ? (isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400")
                            : (isLightMode ? "text-gray-500" : "text-white/40")
                            }`}
                    >
                        一覧
                    </button>
                </div>

                {/* ソート */}
                <div className="flex items-center gap-1">
                    <ArrowUpDown size={10} className={textMuted} />
                    <select
                        value={sortMode}
                        onChange={e => setSortMode(e.target.value as SortMode)}
                        className={`text-[10px] px-1.5 py-1 rounded-lg outline-none cursor-pointer ${textSecondary}`}
                        style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)", border: `1px solid ${glassBorder}` }}
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* フィルタ */}
                <div className="flex items-center gap-1">
                    <Filter size={10} className={textMuted} />
                    <select
                        value={filterMode}
                        onChange={e => setFilterMode(e.target.value as FilterMode)}
                        className={`text-[10px] px-1.5 py-1 rounded-lg outline-none cursor-pointer ${textSecondary}`}
                        style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)", border: `1px solid ${glassBorder}` }}
                    >
                        <option value="all">全て</option>
                        {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <span className={`text-[10px] ml-auto ${textMuted}`}>
                    {totalCount.toLocaleString()}件
                </span>
            </div>

            {/* 結果リスト */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {viewMode === "summary" ? (
                    <div className="flex flex-col gap-1">
                        {organized.map((item, idx) => {
                            const rarity = getRarity(item.rarityId);
                            return (
                                <motion.div
                                    key={item.itemId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: Math.min(idx * 0.02, 1) }}
                                    className="flex items-center gap-2 p-2 rounded-lg"
                                    style={{
                                        background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                                        borderLeft: `3px solid ${rarity?.color || "#666"}`,
                                    }}
                                >
                                    <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                        style={{ color: rarity?.color, background: rarity?.bgColor }}
                                    >
                                        {rarity?.name || "?"}
                                    </span>
                                    <span className={`text-xs flex-1 ${textPrimary}`}>{item.itemName}</span>
                                    <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>
                                        ×{item.count.toLocaleString()}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {organized.flatMap(item => {
                            const rarity = getRarity(item.rarityId);
                            return Array.from({ length: item.count }, (_, i) => (
                                <span
                                    key={`${item.itemId}-${i}`}
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{
                                        color: rarity?.color,
                                        background: rarity?.bgColor,
                                        border: `1px solid ${rarity?.glowColor}`,
                                    }}
                                >
                                    【{rarity?.name}】{item.itemName}
                                </span>
                            ));
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
