"use client";

import { coerceStoredEmojiToDisplay } from "@/lib/constants";
import type { CounterItem } from "@/lib/templates";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import GenericShareCard from "@/components/GenericShareCard";

interface CounterShareSummaryProps {
    items: CounterItem[];
    totalCount: number;
    totalTarget: number;
    isLightMode: boolean;
    accentColor: string;
    showProjectName?: boolean;
    projectName?: string;
}

/**
 * 進捗を1枚のカードにまとめた表示。画像共有（toPng）用にのみ使用する。
 */
export default function CounterShareSummary({
    items,
    totalCount,
    totalTarget,
    isLightMode,
    accentColor,
    showProjectName = false,
    projectName = "",
}: CounterShareSummaryProps) {
    const bg = isLightMode ? "#f5f3ff" : "#0f0a1e";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
    const cardBg = isLightMode ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";

    return (
        <GenericShareCard
            isLightMode={isLightMode}
            maxWidth="max-w-[360px]"
            title={showProjectName && projectName ? projectName : undefined}
            footerLeft={<span>合計</span>}
            footerRight={<span>{totalTarget > 0 ? `${totalCount} / ${totalTarget}` : totalCount}</span>}
            hashtag="" // カウンターはハッシュタグを表示しない仕様なので空にする
        >
            <div className="space-y-2 mb-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg"
                        style={{ background: cardBg }}
                    >
                        <span className="text-lg shrink-0 w-8 text-center inline-flex items-center justify-center" style={{ color: item.color }}>
                            <EmojiGlyph emoji={coerceStoredEmojiToDisplay(item.emoji)} size={18} />
                        </span>
                        <span className={`flex-1 text-sm truncate ${textPrimary}`}>
                            {item.label}
                        </span>
                        <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>
                            {item.target > 0 ? `${item.count} / ${item.target}` : item.count}
                        </span>
                    </div>
                ))}
            </div>
        </GenericShareCard>
    );
}
