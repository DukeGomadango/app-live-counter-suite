"use client";

import type { GachaResult, GachaPool, RarityTier, OrganizedResult } from "@/lib/gacha";
import { organizeResults } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import GenericShareCard from "@/components/GenericShareCard";

interface GachaShareSummaryProps {
    results: GachaResult[];
    pool: GachaPool;
    isLightMode: boolean;
    /** プレイヤー名（省略時は名前なし） */
    playerName?: string;
}

export default function GachaShareSummary({
    results,
    pool,
    isLightMode,
    playerName,
}: GachaShareSummaryProps) {
    const { glassBg: _glassBg, glassBorder: _glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-500" : "text-white/65";

    const organized: OrganizedResult[] = organizeResults(results, pool.rarities, "rarity-asc");
    const totalPulls = results.length;

    const getRarity = (rarityId: string): RarityTier | undefined =>
        pool.rarities.find(r => r.id === rarityId);

    const trimmedPlayerName = playerName?.trim();

    return (
        <GenericShareCard isLightMode={isLightMode} maxWidth="max-w-xl">
            {/* ヘッダー */}
            <div className="flex flex-col gap-1">
                {pool.conceptName && (
                    <div className={`text-xs font-semibold ${textSecondary}`}>
                        {pool.conceptName}
                    </div>
                )}
                <div className={`text-lg font-bold ${textPrimary} inline-flex items-center gap-1`}>
                    <EmojiGlyph emoji="🎰" size={18} />
                    <span>{trimmedPlayerName ? `${trimmedPlayerName} のガチャ結果` : "ガチャ結果"}</span>
                </div>
                <div className={`text-xs ${textMuted}`}>
                    （{totalPulls.toLocaleString()}連）
                </div>
            </div>

            {/* 結果リスト（スクロールなしで全件表示） */}
            <div className="flex flex-col gap-1 pt-1">
                {organized.map(item => {
                    const rarity = getRarity(item.rarityId);
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
        </GenericShareCard>
    );
}

