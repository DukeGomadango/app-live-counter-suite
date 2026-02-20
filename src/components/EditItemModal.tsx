"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { EMOJI_OPTIONS, COLOR_OPTIONS } from "@/lib/constants";

interface EditItemModalProps {
    id: string;
    label: string;
    emoji: string;
    color: string;
    target: number;
    isLightMode: boolean;
    onSave: (id: string, label: string, emoji: string, target: number, color: string) => void;
    onClose: () => void;
}

export default function EditItemModal({
    id,
    label: initialLabel,
    emoji: initialEmoji,
    color: initialColor,
    target: initialTarget,
    isLightMode,
    onSave,
    onClose,
}: EditItemModalProps) {
    const [label, setLabel] = useState(initialLabel);
    const [emoji, setEmoji] = useState(initialEmoji);
    const [color, setColor] = useState(initialColor);
    const [target, setTarget] = useState(initialTarget);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleSave = useCallback(() => {
        if (label.trim()) {
            onSave(id, label.trim(), emoji, Math.max(0, target), color);
            onClose();
        }
    }, [id, label, emoji, target, color, onSave, onClose]);

    // Theme-aware styles
    const bgOverlay = "rgba(0,0,0,0.5)";
    const bgPanel = isLightMode ? "rgba(255,255,255,0.97)" : "rgba(20,12,45,0.97)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";
    const inputBg = isLightMode ? "bg-black/5" : "bg-white/5";
    const inputBorder = isLightMode ? "border-black/10" : "border-white/10";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";
    const bgSubtleHover = isLightMode ? "hover:bg-black/10" : "hover:bg-white/10";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ background: bgOverlay, backdropFilter: "blur(8px)" }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-full max-w-sm rounded-2xl overflow-hidden"
                    style={{
                        background: bgPanel,
                        border: `1px solid ${borderColor}`,
                        boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: `1px solid ${borderColor}` }}
                    >
                        <h2 className={`text-base font-bold ${textPrimary}`}>項目を編集</h2>
                        <button
                            onClick={onClose}
                            className={`w-8 h-8 rounded-xl ${bgSubtle} ${bgSubtleHover} flex items-center justify-center transition-colors`}
                        >
                            <X size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-5">
                        {/* Preview */}
                        <div className="flex items-center justify-center">
                            <div
                                className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1"
                                style={{
                                    background: isLightMode
                                        ? "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.15) 100%)"
                                        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                                    border: `2px solid ${color}40`,
                                    boxShadow: `0 0 20px ${color}20`,
                                }}
                            >
                                <span className="text-2xl">{emoji}</span>
                                <span className={`text-[10px] font-medium ${textSecondary} truncate max-w-[70px]`}>
                                    {label || "..."}
                                </span>
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>
                                名前
                            </label>
                            <input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                placeholder="項目名を入力..."
                                className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3 py-2.5 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors`}
                                autoFocus
                            />
                        </div>

                        {/* Emoji */}
                        <div>
                            <label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>
                                絵文字
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3 py-2.5 text-left text-lg flex items-center gap-2 ${bgSubtleHover} transition-colors`}
                                >
                                    <span>{emoji}</span>
                                    <span className={`text-xs ${textMuted}`}>クリックして変更</span>
                                </button>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute bottom-full left-0 mb-1 p-2 rounded-xl border grid grid-cols-8 gap-1 z-50 w-full max-h-48 overflow-y-auto"
                                        style={{
                                            background: isLightMode ? "rgba(255,255,255,0.98)" : "rgba(20,12,45,0.98)",
                                            borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                                            boxShadow: "0 -10px 30px rgba(0,0,0,0.2)",
                                        }}
                                    >
                                        {EMOJI_OPTIONS.map((e) => (
                                            <button
                                                key={e}
                                                onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                                                className={`w-full aspect-square rounded ${bgSubtleHover} flex items-center justify-center text-sm ${emoji === e ? "ring-2 ring-purple-500 bg-purple-500/20" : ""}`}
                                            >
                                                {e}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Target */}
                        <div>
                            <label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>
                                目標数 <span className={`font-normal ${textMuted}`}>（0 = 設定なし）</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={target || ""}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setTarget(isNaN(val) ? 0 : val);
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                placeholder="0"
                                className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3 py-2.5 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors tabular-nums`}
                            />
                        </div>

                        {/* Color */}
                        <div>
                            <label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>
                                カードの色
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setColor(c.value)}
                                        className="relative w-full aspect-square rounded-xl transition-all duration-200 hover:scale-110"
                                        style={{
                                            background: c.value,
                                            boxShadow: color === c.value
                                                ? `0 0 0 2px ${isLightMode ? "white" : "#140c2d"}, 0 0 0 4px ${c.value}`
                                                : "none",
                                        }}
                                        title={c.label}
                                    >
                                        {color === c.value && (
                                            <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow-md" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="flex items-center gap-2 px-5 py-4"
                        style={{ borderTop: `1px solid ${borderColor}` }}
                    >
                        <button
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${bgSubtle} ${textSecondary} ${bgSubtleHover} transition-colors border ${isLightMode ? "border-black/10" : "border-white/10"}`}
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!label.trim()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                            <Check size={14} />
                            保存
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
