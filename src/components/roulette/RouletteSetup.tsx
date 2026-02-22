"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X, Save, FolderOpen } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { MAX_SLOTS, type RouletteTemplate, type RouletteSettings } from "@/lib/roulette";

export type RouletteSetupSection = "slots" | "templates" | "all";

interface RouletteSetupProps {
    slots: string[];
    onSlotsChange: (slots: string[]) => void;
    isLightMode: boolean;
    templates?: RouletteTemplate[];
    currentSettings?: RouletteSettings;
    onSaveTemplate?: (name: string) => void;
    onLoadTemplate?: (templateId: string) => void;
    /** 表示するブロック: slots=スロット一覧のみ, templates=テンプレートのみ, all=両方（従来どおり） */
    section?: RouletteSetupSection;
}

export default function RouletteSetup({ slots, onSlotsChange, isLightMode, templates = [], currentSettings, onSaveTemplate, onLoadTemplate, section = "all" }: RouletteSetupProps) {
    const [newLabel, setNewLabel] = useState("");
    const [bulkCount, setBulkCount] = useState("13");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [templateName, setTemplateName] = useState("");

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

    const canAdd = slots.length < MAX_SLOTS;

    const handleAddOne = () => {
        const trimmed = newLabel.trim();
        if (!trimmed || slots.length >= MAX_SLOTS) return;
        onSlotsChange([...slots, trimmed]);
        setNewLabel("");
    };

    const handleBulkAdd = () => {
        const n = Math.min(MAX_SLOTS - slots.length, Math.max(1, parseInt(bulkCount, 10) || 1));
        if (n <= 0) return;
        const start = slots.length;
        const added = Array.from({ length: n }, (_, i) => String(start + i + 1));
        onSlotsChange([...slots, ...added]);
    };

    const handleRemove = (index: number) => {
        onSlotsChange(slots.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
        else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
    };

    const startEdit = (index: number) => {
        setEditingIndex(index);
        setEditValue(slots[index] ?? "");
    };

    const saveEdit = () => {
        if (editingIndex === null) return;
        const val = editValue.trim();
        if (val) {
            const next = [...slots];
            next[editingIndex] = val;
            onSlotsChange(next);
        }
        setEditingIndex(null);
    };

    const showSlots = section === "slots" || section === "all";
    const showTemplates = section === "templates" || section === "all";

    if (section === "templates" && onSaveTemplate && onLoadTemplate && currentSettings) {
        return (
            <div
                className="rounded-2xl overflow-hidden border flex flex-col min-h-0 flex-1"
                style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(16px)" }}
            >
                <div className="px-3 py-2 border-b shrink-0 space-y-2" style={{ borderColor: glassBorder }}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>テンプレート</span>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="名前"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                        />
                        <button
                            type="button"
                            onClick={() => { if (templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(""); } }}
                            disabled={!templateName.trim()}
                            className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 shrink-0"
                            title="現在の構成を保存"
                        >
                            <Save size={16} />
                        </button>
                    </div>
                    {templates.length > 0 && (
                        <div className="flex items-center gap-1">
                            <FolderOpen size={14} className={textSecondary} />
                            <select
                                value=""
                                onChange={(e) => { const v = e.target.value; if (v) onLoadTemplate(v); e.target.value = ""; }}
                                className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                            >
                                <option value="">読み込み...</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl overflow-hidden border flex flex-col max-h-[320px] min-h-0"
            style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(16px)" }}
        >
            <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: glassBorder }}>
                <span className={`text-sm font-bold ${textPrimary}`}>スロット一覧</span>
                <span className={`text-xs ${textSecondary}`}>{slots.length} / {MAX_SLOTS}</span>
            </div>

            {/* 連番で N 件追加 */}
            <div className="px-4 py-2 flex flex-wrap items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <span className={`text-xs ${textSecondary}`}>連番で</span>
                <input
                    type="number"
                    min={1}
                    max={Math.min(MAX_SLOTS, MAX_SLOTS - slots.length)}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    className={`w-14 px-2 py-1 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                />
                <span className={`text-xs ${textSecondary}`}>件追加</span>
                <button
                    type="button"
                    onClick={handleBulkAdd}
                    disabled={!canAdd || slots.length >= MAX_SLOTS}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                    追加
                </button>
            </div>

            {/* 1件追加 */}
            <div className="px-4 py-2 flex gap-2 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <input
                    type="text"
                    placeholder="文字または数字"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddOne()}
                    className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400" : "bg-white/10 border-white/20 text-white placeholder:text-white/40"}`}
                />
                <button
                    type="button"
                    onClick={handleAddOne}
                    disabled={!newLabel.trim() || !canAdd}
                    className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:pointer-events-none"
                    title="追加"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* リスト */}
            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                <ul className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {slots.map((label, index) => (
                            <motion.li
                                key={`${index}-${label}`}
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-lg group hover:bg-white/5"
                            >
                                {editingIndex === index ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingIndex(null); }}
                                            className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                                            autoFocus
                                        />
                                        <button type="button" onClick={saveEdit} className="p-1 rounded text-green-400 hover:bg-green-500/20">
                                            <Check size={16} />
                                        </button>
                                        <button type="button" onClick={() => setEditingIndex(null)} className="p-1 rounded text-white/60 hover:bg-white/10">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className={`flex-1 min-w-0 text-sm truncate ${textPrimary}`}>{label}</span>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(index)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-white/50 hover:text-white/80 hover:bg-white/10 transition-opacity"
                                            title="編集"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(index)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-opacity"
                                            title="削除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
                {slots.length === 0 && (
                    <p className={`text-center py-6 text-sm ${textSecondary}`}>スロットがありません。「1〜Nを追加」または上の入力で追加してください。</p>
                )}
            </div>

            {/* テンプレート保存・読み込み */}
            {showTemplates && onSaveTemplate && onLoadTemplate && currentSettings && (
                <div className="px-3 py-2 border-t shrink-0 space-y-2" style={{ borderColor: glassBorder }}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>テンプレート</span>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="名前"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                        />
                        <button
                            type="button"
                            onClick={() => { if (templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(""); } }}
                            disabled={!templateName.trim()}
                            className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 shrink-0"
                            title="現在の構成を保存"
                        >
                            <Save size={16} />
                        </button>
                    </div>
                    {templates.length > 0 && (
                        <div className="flex items-center gap-1">
                            <FolderOpen size={14} className={textSecondary} />
                            <select
                                value=""
                                onChange={(e) => { const v = e.target.value; if (v) onLoadTemplate(v); e.target.value = ""; }}
                                className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                            >
                                <option value="">読み込み...</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
