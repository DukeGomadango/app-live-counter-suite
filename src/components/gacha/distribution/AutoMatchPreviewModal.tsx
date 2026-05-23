"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import type { AutoMappingSuggestion } from "@/lib/gachaDistribution";
import type { DistributionTheme } from "./theme";

function AutoMatchPreviewModalBody({
    suggestions,
    onClose,
    onApply,
    theme,
}: {
    suggestions: AutoMappingSuggestion[];
    onClose: () => void;
    onApply: (selected: AutoMappingSuggestion[]) => void;
    theme: DistributionTheme;
}) {
    const [checked, setChecked] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        suggestions.forEach((s) => {
            initial[s.itemId] = true;
        });
        return initial;
    });

    const selected = suggestions.filter((s) => checked[s.itemId]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div
                className={`max-w-lg w-full rounded-2xl border shadow-xl p-5 ${theme.bgCard} ${theme.borderCard}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold ${theme.textPrimary}`}>名前で自動マッチ</h3>
                    <button type="button" onClick={onClose} className={theme.textSecondary}>
                        <FiX />
                    </button>
                </div>
                {suggestions.length === 0 ? (
                    <p className={`text-sm ${theme.textSecondary}`}>一致候補がありません。アセットを再取得するか、手動で選んでください。</p>
                ) : (
                    <ul className="max-h-64 overflow-y-auto space-y-2 mb-4">
                        {suggestions.map((s) => (
                            <li key={s.itemId} className="flex items-start gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={!!checked[s.itemId]}
                                    onChange={(e) =>
                                        setChecked((prev) => ({ ...prev, [s.itemId]: e.target.checked }))
                                    }
                                    className="mt-1"
                                />
                                <span className={theme.textPrimary}>
                                    <span className="font-medium">{s.itemName}</span>
                                    <span className={theme.textSecondary}> → </span>
                                    <span>{s.assetName}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 rounded-xl text-sm font-bold ${theme.borderCard} border`}
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        disabled={selected.length === 0}
                        onClick={() => {
                            onApply(selected);
                            onClose();
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-purple-500 text-white disabled:opacity-40"
                    >
                        {selected.length}件を適用
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AutoMatchPreviewModal({
    open,
    suggestions,
    onClose,
    onApply,
    theme,
}: {
    open: boolean;
    suggestions: AutoMappingSuggestion[];
    onClose: () => void;
    onApply: (selected: AutoMappingSuggestion[]) => void;
    theme: DistributionTheme;
}) {
    if (!open) return null;

    const resetKey = suggestions.map((s) => s.itemId).join(",");

    return (
        <AutoMatchPreviewModalBody
            key={resetKey}
            suggestions={suggestions}
            onClose={onClose}
            onApply={onApply}
            theme={theme}
        />
    );
}
