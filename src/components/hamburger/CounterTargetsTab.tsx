"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Check } from "lucide-react";
import type { CounterItem } from "@/lib/templates";
import { coerceStoredEmojiToDisplay } from "@/lib/constants";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import type { MenuThemeTokens } from "./types";

type Props = {
    tokens: MenuThemeTokens;
    isLightMode: boolean;
    items: CounterItem[];
    onSetAllTargets?: (target: number) => void;
    onSetTarget?: (id: string, target: number) => void;
    onRequestAchieveTarget?: (id: string) => void;
    onRequestAchieveAllTargets?: () => void;
};

export function CounterTargetsTab({
    tokens,
    isLightMode,
    items,
    onSetAllTargets,
    onSetTarget,
    onRequestAchieveTarget,
    onRequestAchieveAllTargets,
}: Props) {
    const { textSecondary, textMuted, bgSubtle, borderSubtle, bgSubtleHover, inputBg, inputBorder, textPrimary } =
        tokens;
    const [bulkTarget, setBulkTarget] = useState("");

    const handleBulkTarget = () => {
        const val = parseInt(bulkTarget, 10);
        if (!isNaN(val) && val >= 0) {
            onSetAllTargets?.(val);
            setBulkTarget("");
        }
    };

    return (
        <motion.div
            key="targets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
        >
            <div className="mb-5">
                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                    一括目標設定
                </h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="0"
                        value={bulkTarget}
                        onChange={(e) => setBulkTarget(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleBulkTarget()}
                        placeholder="目標数..."
                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors tabular-nums`}
                    />
                    <button
                        onClick={handleBulkTarget}
                        disabled={!bulkTarget.trim()}
                        className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5 dango-btn-tier3 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-purple-400 font-medium"
                        style={{ "--btn-glow-color": "rgba(168,85,247,0.4)" } as React.CSSProperties}
                    >
                        <Target size={13} />
                        設定
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>項目別の目標</h3>
                <button
                    type="button"
                    onClick={onRequestAchieveAllTargets}
                    className={`px-2 py-1 rounded-lg text-[11px] border flex items-center gap-1 dango-btn-tier3 ${
                        items.length > 0 && items.every((it) => it.target > 0 && it.count >= it.target)
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : `${bgSubtle} ${borderSubtle} ${textSecondary}`
                    }`}
                    style={{ "--btn-glow-color": "rgba(16,185,129,0.4)" } as React.CSSProperties}
                >
                    <Check size={11} />
                    <span>全目標達成</span>
                </button>
            </div>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto scroll-touch pr-1">
                {items.map((item) => {
                    const reached = item.target > 0 && item.count >= item.target;
                    const canAchieve = item.target > 0 && item.count < item.target && !!onRequestAchieveTarget;
                    return (
                        <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                        >
                            <span className="text-sm w-6 text-center shrink-0" style={{ color: item.color }}>
                                <EmojiGlyph emoji={coerceStoredEmojiToDisplay(item.emoji)} size={14} />
                            </span>
                            <span
                                className={`flex-1 text-sm ${isLightMode ? "text-gray-700" : "text-white/80"} truncate`}
                            >
                                {item.label}
                            </span>
                            <div className="flex items-center gap-1">
                                {canAchieve && (
                                    <button
                                        type="button"
                                        onClick={() => onRequestAchieveTarget?.(item.id)}
                                        className="px-2 py-0.5 rounded text-[10px] border border-black/15 dark:border-white/20 text-xs text-gray-600 dark:text-white/70 bg-black/5 dark:bg-white/10 dango-btn-tier3"
                                        style={{ "--btn-glow-color": item.color || "rgba(16,185,129,0.3)" } as React.CSSProperties}
                                    >
                                        達成
                                    </button>
                                )}
                                {reached && (
                                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                                        <Check size={10} />
                                        達成
                                    </span>
                                )}
                                <div className="flex items-center gap-1 ml-auto pl-1.5">
                                    <span className="text-xs font-mono tabular-nums" style={{ color: item.color }}>
                                        {item.count}
                                    </span>
                                    <span className={`text-xs ${textMuted}`}>/</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.target || ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            onSetTarget?.(item.id, isNaN(val) ? 0 : val);
                                        }}
                                        placeholder="0"
                                        className={`w-12 ${inputBg} border ${inputBorder} rounded-lg px-1.5 py-0.5 text-xs text-center ${textPrimary} outline-none focus:border-purple-500/40 tabular-nums`}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
