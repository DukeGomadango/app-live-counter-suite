"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import {
    Share2,
    Copy,
    Check,
    ArrowUpDown,
    Filter,
    ImageDown,
} from "lucide-react";
import type { GachaResult, GachaPool, RarityTier, SortMode, FilterMode } from "@/lib/gacha";
import { organizeResults, formatResultsForShare, formatResultsHeaderForShare } from "@/lib/gacha";
import { generateShareUrl, getTimestampForFilename, shareImageWithText } from "@/lib/share";
import { DEFAULT_EXTRA_HASHTAG } from "@/lib/site";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import GachaShareSummary from "@/components/gacha/GachaShareSummary";

interface GachaResultDisplayProps {
    results: GachaResult[];
    pool: GachaPool;
    isLightMode: boolean;
    /** ダークモードで背景が明るいとき true。文字を暗くして視認性を確保 */
    textContrastLight?: boolean;
    title?: string;
    /** 共有ツイートに付与する追加ハッシュタグ。#だんごツールは常に付与される */
    shareHashtags?: string;
    /** モバイル表示時は下端余白を多めに（タブバー回避） */
    isMobile?: boolean;
    /** デスクトップでヘッダーに「もう一度引く」を表示するときに渡す */
    onBackToGacha?: () => void;
    /** onBackToGacha ボタンのアクセント色（未指定時は紫） */
    accentColor?: string;
    /** ツイート文に含めるプレイヤー名（省略時は名前なし） */
    playerName?: string;
}

export default function GachaResultDisplay({
    results,
    pool,
    isLightMode,
    textContrastLight = false,
    title,
    shareHashtags = DEFAULT_EXTRA_HASHTAG,
    isMobile = false,
    onBackToGacha,
    accentColor = DEFAULT_ACCENT_COLOR,
    playerName,
}: GachaResultDisplayProps) {
    const resultAreaRef = useRef<HTMLDivElement>(null);
    const shareAreaRef = useRef<HTMLDivElement | null>(null);
    const tweetUrlAfterDownloadRef = useRef<string | null>(null);
    const [sortMode, setSortMode] = useState<SortMode>("rarity-asc");
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [copied, setCopied] = useState(false);
    const [isCapturingShareImage, setIsCapturingShareImage] = useState(false);

    const { glassBg: _glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textLight = isLightMode || textContrastLight;
    const textPrimary = textLight ? "text-gray-800" : "text-white/95";
    const textSecondary = textLight ? "text-gray-700" : "text-white/75";
    const textMuted = textLight ? "text-gray-600" : "text-white/65";
    const selectOptionStyle = textLight
        ? { background: "#fff", color: "#1f2937" }
        : { background: "#1e1b4b", color: "#e2e8f0" };

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
        const text = formatResultsForShare(results, pool, shareHashtags, playerName);
        const url = generateShareUrl(text, { toolId: "gacha" });
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleShareAsImage = () => {
        const headerText = formatResultsHeaderForShare(pool, shareHashtags, playerName);
        tweetUrlAfterDownloadRef.current = generateShareUrl(headerText, { toolId: "gacha" });
        setIsCapturingShareImage(true);
    };

    useEffect(() => {
        if (!isCapturingShareImage) return;
        const id = setTimeout(async () => {
            const el = shareAreaRef.current;
            if (!el) {
                setIsCapturingShareImage(false);
                return;
            }
            try {
                const dataUrl = await toPng(el, {
                    backgroundColor: isLightMode ? "#f5f3ff" : "#0f0a1e",
                    pixelRatio: 2,
                });
                const headerText = formatResultsHeaderForShare(pool, shareHashtags, playerName);
                const filename = `gacha-result-${getTimestampForFilename()}.png`;
                const shared = await shareImageWithText(dataUrl, headerText, filename);
                if (shared) {
                    tweetUrlAfterDownloadRef.current = null;
                    return;
                }
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = filename;
                a.click();
                const urlToOpen = tweetUrlAfterDownloadRef.current;
                if (urlToOpen) {
                    tweetUrlAfterDownloadRef.current = null;
                    window.open(urlToOpen, "_blank", "noopener,noreferrer");
                }
            } catch (err) {
                console.warn("Image export failed:", err);
            } finally {
                setIsCapturingShareImage(false);
            }
        }, 50);
        return () => clearTimeout(id);
    }, [isCapturingShareImage, isLightMode, pool, shareHashtags, playerName]);

    const handleCopy = async () => {
        const text = formatResultsForShare(results, pool, shareHashtags, playerName);
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

    if (results.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className={`text-sm ${textSecondary}`}>まだ結果がありません</p>
            </div>
        );
    }

    const sortOptions: { value: SortMode; label: string }[] = [
        { value: "rarity-asc", label: "レア度↑" },
        { value: "rarity-desc", label: "レア度↓" },
        { value: "name", label: "名前順" },
        { value: "count", label: "個数順" },
    ];

    const shareOverlay =
        typeof document !== "undefined" && isCapturingShareImage
            ? createPortal(
                <div
                    ref={shareAreaRef}
                    style={{
                        position: "fixed",
                        left: "50%",
                        top: 0,
                        transform: "translateX(-50%)",
                        width: "min(100%, 608px)",
                        maxWidth: 608,
                        zIndex: -1,
                        pointerEvents: "none",
                    }}
                    aria-hidden
                >
                    <GachaShareSummary
                        results={results}
                        pool={pool}
                        isLightMode={isLightMode}
                        playerName={playerName}
                    />
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            {shareOverlay}
            <div className="flex flex-col h-full overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0 gap-2 flex-wrap">
                <div>
                    <h3 className={`text-sm font-bold ${textPrimary}`}>
                        {title || `${results.length.toLocaleString()}連の結果`}
                    </h3>
                    {title && (
                        <p className={`text-[10px] mt-0.5 ${textMuted}`}>
                            直近の結果（{results.length.toLocaleString()}連）
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {onBackToGacha && (
                        <button
                            type="button"
                            onClick={onBackToGacha}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 shrink-0"
                            style={{
                                background: `${accentColor}22`,
                                color: accentColor,
                                border: `1px solid ${accentColor}55`,
                            }}
                        >
                            🎰 もう一度引く
                        </button>
                    )}
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
                    <button
                        onClick={handleShareAsImage}
                        className={`p-1.5 rounded-lg text-xs transition-all ${isLightMode ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            }`}
                        title="結果を画像で共有"
                    >
                        <ImageDown size={14} />
                    </button>
                </div>
            </div>

            {/* 結果表示用の領域（スクロール前提。画像共有は別の GachaShareSummary で全件キャプチャ） */}
            <div ref={resultAreaRef} className="flex-1 min-h-0 flex flex-col px-4 pb-2">
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
                            <option key={opt.value} value={opt.value} style={selectOptionStyle}>{opt.label}</option>
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
                        <option value="all" style={selectOptionStyle}>全て</option>
                        {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                            <option key={r.id} value={r.id} style={selectOptionStyle}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <span className={`text-[10px] ml-auto ${textMuted}`}>
                    {totalCount.toLocaleString()}件
                </span>
            </div>

            {/* 結果リスト（集計表示のみ） */}
            <div className={`flex-1 min-h-0 overflow-y-auto scroll-touch pb-4 ${isMobile ? "pb-24" : ""}`}>
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
            </div>
            </div>
        </div>
        </>
    );
}
