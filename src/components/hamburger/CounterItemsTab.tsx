"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import type { CounterItem } from "@/lib/templates";
import { COLOR_OPTIONS, DEFAULT_ITEM_EMOJI, EMOJI_OPTIONS, coerceStoredEmojiToDisplay } from "@/lib/constants";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import type { MenuThemeTokens } from "./types";

type Props = {
    tokens: MenuThemeTokens;
    isLightMode: boolean;
    items: CounterItem[];
    onAddItem?: (label: string, emoji: string) => void;
    onEditItem?: (id: string, label: string, emoji: string, target: number, color: string) => void;
    onDeleteItem?: (id: string) => void;
};

export function CounterItemsTab({ tokens, isLightMode, items, onAddItem, onEditItem, onDeleteItem }: Props) {
    const {
        textSecondary,
        textMuted,
        bgSubtle,
        borderSubtle,
        bgSubtleHover,
        inputBg,
        inputBorder,
        popoverBg,
        popoverBorder,
    } = tokens;

    const [newLabel, setNewLabel] = useState("");
    const [newEmoji, setNewEmoji] = useState(DEFAULT_ITEM_EMOJI);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editEmoji, setEditEmoji] = useState("");
    const [editTarget, setEditTarget] = useState(0);
    const [editColor, setEditColor] = useState("");
    const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);

    const handleAddItem = useCallback(() => {
        if (newLabel.trim() && onAddItem) {
            onAddItem(newLabel.trim(), newEmoji);
            setNewLabel("");
            setNewEmoji(DEFAULT_ITEM_EMOJI);
        }
    }, [newLabel, newEmoji, onAddItem]);

    const handleStartEdit = (item: CounterItem) => {
        setEditingId(item.id);
        setEditLabel(item.label);
        setEditEmoji(coerceStoredEmojiToDisplay(item.emoji));
        setEditTarget(item.target);
        setEditColor(item.color);
    };

    const handleSaveEdit = () => {
        if (editingId && editLabel.trim() && onEditItem) {
            onEditItem(editingId, editLabel.trim(), editEmoji, Math.max(0, editTarget), editColor);
            setEditingId(null);
            setShowEditEmojiPicker(false);
        }
    };

    return (
        <motion.div
            key="items"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
        >
            <div className="mb-4">
                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>項目を追加</h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`w-9 h-9 rounded-xl ${bgSubtle} border ${borderSubtle} flex items-center justify-center text-lg dango-btn-tier3 transition-colors`}
                            style={{ "--btn-glow-color": "rgba(168,85,247,0.3)" } as React.CSSProperties}
                        >
                            <EmojiGlyph emoji={newEmoji} size={20} />
                        </button>
                        {showEmojiPicker && (
                            <div
                                className="absolute top-full left-0 mt-1 p-2 rounded-xl border grid grid-cols-8 gap-1 z-50 w-64 max-h-56 overflow-y-auto"
                                style={{
                                    background: popoverBg,
                                    borderColor: popoverBorder,
                                }}
                            >
                                {EMOJI_OPTIONS.map((e) => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => {
                                            setNewEmoji(e);
                                            setShowEmojiPicker(false);
                                        }}
                                        className={`w-7 h-7 rounded ${bgSubtleHover} flex items-center justify-center text-sm`}
                                    >
                                        <EmojiGlyph emoji={e} size={14} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                        placeholder="項目名を入力..."
                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${tokens.textPrimary} outline-none focus:border-purple-500/40 transition-colors`}
                    />
                    <button
                        onClick={handleAddItem}
                        disabled={!newLabel.trim()}
                        className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center dango-btn-tier3 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ "--btn-glow-color": "rgba(168,85,247,0.5)" } as React.CSSProperties}
                    >
                        <Plus size={16} className="text-purple-400" />
                    </button>
                </div>
            </div>

            <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                項目一覧 ({items.length})
            </h3>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto scroll-touch pr-1">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                    >
                        {editingId === item.id ? (
                            <div className="w-full space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                                            className={`w-8 h-8 rounded-lg ${bgSubtle} flex items-center justify-center text-base dango-btn-tier3 transition-colors`}
                                            style={{ "--btn-glow-color": editColor || "rgba(168,85,247,0.3)" } as React.CSSProperties}
                                        >
                                            <EmojiGlyph emoji={editEmoji} size={16} />
                                        </button>
                                        {showEditEmojiPicker && (
                                            <div
                                                className="absolute top-full left-0 mt-1 p-2 rounded-xl border grid grid-cols-8 gap-1 z-50 w-64 max-h-56 overflow-y-auto"
                                                style={{
                                                    background: popoverBg,
                                                    borderColor: popoverBorder,
                                                }}
                                            >
                                                {EMOJI_OPTIONS.map((e) => (
                                                    <button
                                                        key={e}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditEmoji(e);
                                                            setShowEditEmojiPicker(false);
                                                        }}
                                                        className={`w-7 h-7 rounded ${bgSubtleHover} flex items-center justify-center text-sm`}
                                                    >
                                                        <EmojiGlyph emoji={e} size={14} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        value={editLabel}
                                        onChange={(e) => setEditLabel(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-lg px-2 py-1 text-sm ${tokens.textPrimary} outline-none focus:border-purple-500/50`}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs ${textMuted} shrink-0`}>目標:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editTarget || ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            setEditTarget(isNaN(val) ? 0 : val);
                                        }}
                                        placeholder="0"
                                        className={`w-14 ${inputBg} border ${inputBorder} rounded-lg px-1.5 py-0.5 text-xs text-center ${tokens.textPrimary} outline-none focus:border-purple-500/50 tabular-nums`}
                                    />
                                    <span className={`text-xs ${textMuted} shrink-0`}>色:</span>
                                    <div className="flex gap-1 flex-wrap flex-1">
                                        {COLOR_OPTIONS.map((c) => (
                                            <button
                                                key={c.value}
                                                onClick={() => setEditColor(c.value)}
                                                className="w-4 h-4 rounded-full transition-all"
                                                style={{
                                                    background: c.value,
                                                    boxShadow:
                                                        editColor === c.value
                                                            ? `0 0 0 1.5px ${isLightMode ? "white" : "#140c2d"}, 0 0 0 3px ${c.value}`
                                                            : "none",
                                                }}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingId(null);
                                            setShowEditEmojiPicker(false);
                                        }}
                                        className={`px-2 py-1 rounded-lg text-xs ${bgSubtle} border ${borderSubtle} ${textSecondary} dango-btn-tier3 transition-colors`}
                                        style={{ "--btn-glow-color": "rgba(0,0,0,0.1)" } as React.CSSProperties}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-2 py-1 rounded-lg text-xs bg-green-500/20 border border-green-500/30 text-green-400 dango-btn-tier3 flex items-center gap-1"
                                        style={{ "--btn-glow-color": "rgba(34,197,94,0.5)" } as React.CSSProperties}
                                    >
                                        <Check size={10} />
                                        保存
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="text-base w-7 text-center shrink-0" style={{ color: item.color }}>
                                    <EmojiGlyph emoji={coerceStoredEmojiToDisplay(item.emoji)} size={16} />
                                </span>
                                <span className={`flex-1 text-sm ${isLightMode ? "text-gray-700" : "text-white/80"}`}>
                                    {item.label}
                                </span>
                                <span
                                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                                    style={{ color: item.color, background: `${item.color}15` }}
                                >
                                    {item.count}
                                </span>
                                <button
                                    onClick={() => handleStartEdit(item)}
                                    className={`w-6 h-6 rounded-lg ${bgSubtle} border ${borderSubtle} flex items-center justify-center dango-btn-tier3 transition-colors`}
                                    style={{ "--btn-glow-color": item.color || "currentColor" } as React.CSSProperties}
                                >
                                    <Pencil size={10} className={textMuted} />
                                </button>
                                <button
                                    onClick={() => onDeleteItem?.(item.id)}
                                    className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center dango-btn-tier3"
                                    style={{ "--btn-glow-color": "rgba(239,68,68,0.4)" } as React.CSSProperties}
                                >
                                    <Trash2 size={10} className="text-red-400/60" />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
