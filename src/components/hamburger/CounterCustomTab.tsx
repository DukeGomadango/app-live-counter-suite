"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Trash2 } from "lucide-react";
import type { Template } from "@/lib/templates";
import { coerceStoredEmojiToDisplay } from "@/lib/constants";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import type { MenuThemeTokens } from "./types";

type Props = {
    tokens: MenuThemeTokens;
    itemsCount: number;
    customTemplates: Template[];
    onSaveCustomTemplate?: (name: string) => void;
    onSelectTemplate?: (template: Template) => void;
    onToggle: () => void;
    onDeleteCustomTemplate?: (id: string) => void;
};

export function CounterCustomTab({
    tokens,
    itemsCount,
    customTemplates,
    onSaveCustomTemplate,
    onSelectTemplate,
    onToggle,
    onDeleteCustomTemplate,
}: Props) {
    const { textPrimary, textSecondary, textMuted, bgSubtle, borderSubtle, inputBg, inputBorder } = tokens;
    const [newTemplateName, setNewTemplateName] = useState("");

    const handleSaveTemplate = () => {
        if (newTemplateName.trim()) {
            onSaveCustomTemplate?.(newTemplateName.trim());
            setNewTemplateName("");
        }
    };

    return (
        <motion.div
            key="custom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
        >
            <div className="mb-4">
                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                    現在の設定を保存
                </h3>
                <p className={`text-xs ${textMuted} mb-2`}>現在の{itemsCount}個の項目をテンプレートとして保存</p>
                <div className="flex gap-2">
                    <input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                        placeholder="テンプレート名..."
                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors`}
                    />
                    <button
                        onClick={handleSaveTemplate}
                        disabled={!newTemplateName.trim()}
                        className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5 hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs text-purple-400 font-medium"
                    >
                        <Save size={13} />
                        保存
                    </button>
                </div>
            </div>

            <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                保存済みテンプレート
            </h3>
            {customTemplates.length === 0 ? (
                <div className={`text-center py-8 text-xs ${textMuted}`}>まだ保存されたテンプレートはありません</div>
            ) : (
                <div className="space-y-2">
                    {customTemplates.map((t) => (
                        <div
                            key={t.id}
                            className={`flex items-center justify-between p-3 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                        >
                            <button
                                onClick={() => {
                                    onSelectTemplate?.(t);
                                    onToggle();
                                }}
                                className="flex-1 text-left"
                            >
                                <div className={`text-sm font-medium ${textPrimary}`}>{t.name}</div>
                                <div className={`text-xs ${textMuted} mt-0.5 inline-flex items-center gap-1`}>
                                    <span>{t.items.length}項目 ·</span>
                                    <span className="inline-flex items-center gap-0.5">
                                        {t.items.slice(0, 6).map((i) => (
                                            <EmojiGlyph key={i.id} emoji={coerceStoredEmojiToDisplay(i.emoji)} size={12} />
                                        ))}
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => onDeleteCustomTemplate?.(t.id)}
                                className="ml-2 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 size={12} className="text-red-400/60" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
