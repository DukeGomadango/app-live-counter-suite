"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Share2, Copy, Check, ImageDown } from "lucide-react";
import type { GachaPool, RunSummary, GachaResult } from "@/lib/gacha";
import { formatRunSummaryForShare, formatResultsHeaderForShare } from "@/lib/gacha";
import { generateShareUrl, getTimestampForFilename, shareImageWithText } from "@/lib/share";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toPng } from "html-to-image";
import GachaShareSummary from "@/components/gacha/GachaShareSummary";

interface GachaRunSummaryDisplayProps {
    run: RunSummary;
    pool: GachaPool;
    isLightMode: boolean;
    playerName: string;
    shareHashtags: string;
    /** 履歴カード内で「表示する回」をカード内に表示するとき渡す */
    runsForPool?: RunSummary[];
    onSelectRunIndex?: (runIndex: number) => void;
}

export default function GachaRunSummaryDisplay({
    run,
    pool,
    isLightMode,
    playerName,
    shareHashtags,
    runsForPool,
    onSelectRunIndex,
}: GachaRunSummaryDisplayProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-500" : "text-white/65";
    const [copied, setCopied] = useState(false);
    const [isCapturingShareImage, setIsCapturingShareImage] = useState(false);
    const shareAreaRef = useRef<HTMLDivElement | null>(null);
    const tweetUrlAfterDownloadRef = useRef<string | null>(null);

    const expandedResults: GachaResult[] = useMemo(() => {
        const results: GachaResult[] = [];
        const baseTime = run.timestamp || Date.now();
        for (const item of run.items) {
            for (let i = 0; i < item.count; i++) {
                results.push({
                    resultId: `run-${run.runIndex}-${item.itemId}-${i}`,
                    itemId: item.itemId,
                    itemName: item.itemName,
                    rarityId: item.rarityId,
                    timestamp: baseTime + results.length,
                });
            }
        }
        return results;
    }, [run]);

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
        const url = generateShareUrl(text, { toolId: "gacha" });
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleShareAsImage = () => {
        if (expandedResults.length === 0) return;
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
                const filename = `gacha-run-${run.runIndex}-${getTimestampForFilename()}.png`;
                // PCでは共有シート（モーダル）を出さず、ダウンロード＋ツイートURLを開く
                if (!isDesktop) {
                    const shared = await shareImageWithText(dataUrl, headerText, filename);
                    if (shared) {
                        tweetUrlAfterDownloadRef.current = null;
                        return;
                    }
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
                console.warn("Run image export failed:", err);
            } finally {
                setIsCapturingShareImage(false);
            }
        }, 50);
        return () => clearTimeout(id);
    }, [isCapturingShareImage, isDesktop, isLightMode, run.runIndex, pool, shareHashtags, playerName]);

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

    // キャプチャ対象は position:fixed にしない（html-to-image が fixed で位置ずれするため）
    // オフスクリーンに固定幅の div を置き、その要素を toPng に渡す
    const shareOverlay =
        typeof document !== "undefined" && isCapturingShareImage
            ? createPortal(
                <div
                    style={{
                        position: "fixed",
                        left: -9999,
                        top: 0,
                        zIndex: -1,
                        pointerEvents: "none",
                    }}
                    aria-hidden
                >
                    <div
                        ref={shareAreaRef}
                        style={{ width: 608 }}
                    >
                        <GachaShareSummary
                            results={expandedResults}
                            pool={pool}
                            isLightMode={isLightMode}
                            playerName={playerName}
                        />
                    </div>
                </div>,
                document.body,
            )
            : null;

    const scrollEntireCard = runsForPool != null && runsForPool.length > 0 && onSelectRunIndex;

    return (
        <>
        {shareOverlay}
        <div
            className={`rounded-2xl p-4 flex flex-col gap-3 ${scrollEntireCard ? "" : "flex-1 min-h-0 overflow-hidden"}`}
            style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
        >
            {/* ヘッダー：名前と「表示する回」＋ボタンを1行で横並び（中央の空白を出さない） */}
            <div className="flex items-center gap-4 flex-wrap shrink-0">
                <div>
                    <div className={`text-sm font-bold ${textPrimary}`}>
                        {playerName}: {run.pullCount.toLocaleString()}連
                    </div>
                    <div className={`text-[11px] ${textMuted}`}>
                        ガチャ結果 {run.runIndex}回目
                    </div>
                </div>
                {runsForPool != null && runsForPool.length > 0 && onSelectRunIndex ? (
                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold ${textSecondary}`}>表示する回</span>
                        <select
                            value={run.runIndex}
                            onChange={(e) => onSelectRunIndex(Number(e.target.value))}
                            className={`text-[11px] px-2 py-1 rounded-lg outline-none shrink-0 ${textPrimary}`}
                            style={{
                                background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.9)",
                                border: `1px solid ${glassBorder}`,
                            }}
                        >
                            {[...runsForPool]
                                .slice()
                                .sort((a, b) => b.runIndex - a.runIndex)
                                .map((r) => (
                                    <option key={r.runIndex} value={r.runIndex}>
                                        {r.runIndex}回目（{r.pullCount.toLocaleString()}連）
                                    </option>
                                ))}
                        </select>
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
                            disabled={isCapturingShareImage}
                        >
                            <ImageDown size={14} />
                        </button>
                    </div>
                ) : (
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
                        <button
                            onClick={handleShareAsImage}
                            className={`p-1.5 rounded-lg text-xs transition-all ${isLightMode ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                }`}
                            title="結果を画像で共有"
                            disabled={isCapturingShareImage}
                        >
                            <ImageDown size={14} />
                        </button>
                    </div>
                )}
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

            {/* 結果一覧（履歴カード内では親がスクロールするので overflow なし） */}
            <div className={`mt-2 flex flex-col gap-1 ${scrollEntireCard ? "" : "flex-1 min-h-0 overflow-y-auto scroll-touch"}`}>
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
        </>
    );
}

