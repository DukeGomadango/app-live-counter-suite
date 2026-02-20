"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { TEMPLATES, type Template, type CounterItem } from "@/lib/templates";

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: Template) => void;
    items: CounterItem[];
    onAddItem: (label: string, emoji: string) => void;
    onEditItem: (id: string, label: string, emoji: string) => void;
    onDeleteItem: (id: string) => void;
    currentTemplateId: string;
}

const EMOJI_OPTIONS = [
    "⭐", "🌟", "💫", "✨", "🎯", "🎨", "🎵", "🎮",
    "💎", "🔥", "❤️", "💜", "💙", "💚", "💛", "🧡",
    "🌸", "🌺", "🍀", "🌈", "⚡", "🎪", "🎭", "🎬",
];

const COLOR_OPTIONS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function SettingsPanel({
    isOpen,
    onClose,
    onSelectTemplate,
    items,
    onAddItem,
    onEditItem,
    onDeleteItem,
    currentTemplateId,
}: SettingsPanelProps) {
    const [newLabel, setNewLabel] = useState("");
    const [newEmoji, setNewEmoji] = useState("⭐");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editEmoji, setEditEmoji] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);

    const handleAddItem = () => {
        if (newLabel.trim()) {
            onAddItem(newLabel.trim(), newEmoji);
            setNewLabel("");
            setNewEmoji("⭐");
        }
    };

    const handleStartEdit = (item: CounterItem) => {
        setEditingId(item.id);
        setEditLabel(item.label);
        setEditEmoji(item.emoji);
    };

    const handleSaveEdit = () => {
        if (editingId && editLabel.trim()) {
            onEditItem(editingId, editLabel.trim(), editEmoji);
            setEditingId(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 overflow-y-auto"
                        style={{
                            background: "linear-gradient(180deg, rgba(20,10,40,0.95) 0%, rgba(10,5,30,0.98) 100%)",
                            backdropFilter: "blur(20px)",
                            borderLeft: "1px solid rgba(255,255,255,0.1)",
                            boxShadow: "-10px 0 40px rgba(0,0,0,0.5)",
                        }}
                    >
                        <div className="p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Sparkles size={18} className="text-purple-400" />
                                    設定
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <X size={16} className="text-white/70" />
                                </button>
                            </div>

                            {/* Template Selection */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                                    テンプレート
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {TEMPLATES.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => onSelectTemplate(template)}
                                            className={`text-left p-3 rounded-xl transition-all duration-200 border ${currentTemplateId === template.id
                                                    ? "bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-500/10"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            <div className="font-medium text-sm text-white">
                                                {template.name}
                                            </div>
                                            <div className="text-xs text-white/40 mt-0.5">
                                                {template.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Items */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                                    項目一覧
                                </h3>
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10"
                                        >
                                            {editingId === item.id ? (
                                                <>
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                                                            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg hover:bg-white/20 transition-colors"
                                                        >
                                                            {editEmoji}
                                                        </button>
                                                        {showEditEmojiPicker && (
                                                            <div className="absolute top-full left-0 mt-1 p-2 rounded-xl bg-gray-900/95 border border-white/10 grid grid-cols-8 gap-1 z-50 w-64">
                                                                {EMOJI_OPTIONS.map((e) => (
                                                                    <button
                                                                        key={e}
                                                                        onClick={() => {
                                                                            setEditEmoji(e);
                                                                            setShowEditEmojiPicker(false);
                                                                        }}
                                                                        className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm"
                                                                    >
                                                                        {e}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        value={editLabel}
                                                        onChange={(e) => setEditLabel(e.target.value)}
                                                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-purple-500/50"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                                                    >
                                                        <Check size={12} className="text-green-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                                                    >
                                                        <X size={12} className="text-white/50" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-lg w-8 text-center">{item.emoji}</span>
                                                    <span className="flex-1 text-sm text-white/80">{item.label}</span>
                                                    <span
                                                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                                                        style={{ color: item.color, background: `${item.color}15` }}
                                                    >
                                                        {item.count}
                                                    </span>
                                                    <button
                                                        onClick={() => handleStartEdit(item)}
                                                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                                                    >
                                                        <Pencil size={11} className="text-white/40" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteItem(item.id)}
                                                        className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <Trash2 size={11} className="text-red-400/60" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add New Item */}
                            <div>
                                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                                    項目を追加
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lg hover:bg-white/20 transition-colors"
                                        >
                                            {newEmoji}
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full left-0 mb-1 p-2 rounded-xl bg-gray-900/95 border border-white/10 grid grid-cols-8 gap-1 z-50 w-64">
                                                {EMOJI_OPTIONS.map((e) => (
                                                    <button
                                                        key={e}
                                                        onClick={() => {
                                                            setNewEmoji(e);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                        className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm"
                                                    >
                                                        {e}
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
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/40 transition-colors"
                                    />
                                    <button
                                        onClick={handleAddItem}
                                        disabled={!newLabel.trim()}
                                        className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={16} className="text-purple-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
