"use client";

import type { CounterItem } from "@/lib/templates";

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
        <div
            className="rounded-2xl p-5 shadow-xl min-w-[280px] max-w-[360px]"
            style={{
                background: bg,
                border: `1px solid ${borderColor}`,
            }}
        >
            {showProjectName && projectName && (
                <div
                    className="text-lg font-bold mb-4 pb-2 border-b"
                    style={{
                        color: accentColor,
                        borderColor,
                    }}
                >
                    {projectName}
                </div>
            )}
            <div className="space-y-2 mb-4">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg"
                        style={{ background: cardBg }}
                    >
                        <span className="text-lg">{item.emoji}</span>
                        <span className={`flex-1 text-sm truncate ${textPrimary}`}>
                            {item.label}
                        </span>
                        <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>
                            {item.target > 0 ? `${item.count} / ${item.target}` : item.count}
                        </span>
                    </div>
                ))}
            </div>
            <div
                className={`flex items-center justify-between pt-3 border-t ${textSecondary}`}
                style={{ borderColor }}
            >
                <span className="text-sm font-medium">合計</span>
                <span className={`text-lg font-bold tabular-nums ${textPrimary}`}>
                    {totalTarget > 0 ? `${totalCount} / ${totalTarget}` : totalCount}
                </span>
            </div>
        </div>
    );
}
