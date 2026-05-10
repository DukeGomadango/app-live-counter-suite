"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X, Save, Download, FileStack, Copy } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { useConfirm } from "@/context/ConfirmContext";
import { MAX_SLOTS, ROULETTE_PALETTE_COLORS, type RouletteTemplate, type RouletteSettings } from "@/lib/roulette";
import { Palette } from "lucide-react";

export type RouletteSetupSection = "slots" | "templates" | "all";

interface RouletteSetupProps {
    slots: string[];
    onSlotsChange: (slots: string[]) => void;
    isLightMode: boolean;
    templates?: RouletteTemplate[];
    /** サンプルテンプレート（読み込み専用） */
    sampleTemplates?: RouletteTemplate[];
    currentSettings?: RouletteSettings;
    onSaveTemplate?: (name: string) => void;
    onLoadTemplate?: (templateId: string) => void;
    onOverwriteTemplate?: (templateId: string, templateName: string) => void;
    onDeleteTemplate?: (templateId: string) => void;
    /** 表示するブロック: slots=スロット一覧のみ, templates=テンプレートのみ, all=両方（従来どおり） */
    section?: RouletteSetupSection;
    /** スロット番号（0-based）ごとの色上書き。未指定はデフォルト表示 */
    slotColorOverrides?: Record<number, string>;
    /** スロットの色を設定／解除したときに呼ぶ */
    onSlotColorChange?: (index: number, color: string | null) => void;
}

export default function RouletteSetup({ slots, onSlotsChange, isLightMode, templates = [], sampleTemplates = [], currentSettings, onSaveTemplate, onLoadTemplate, onOverwriteTemplate, onDeleteTemplate, section = "all", slotColorOverrides, onSlotColorChange }: RouletteSetupProps) {
    const [newLabel, setNewLabel] = useState("");
    const [bulkCount, setBulkCount] = useState("13");
    const [bulkDeleteCount, setBulkDeleteCount] = useState("1");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [openColorIndex, setOpenColorIndex] = useState<number | null>(null);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const colorPopoverRef = useRef<HTMLDivElement>(null);
    const { confirm } = useConfirm();

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

    const handleBulkRemove = () => {
        const n = Math.min(slots.length, Math.max(1, parseInt(bulkDeleteCount, 10) || 1));
        if (n <= 0 || slots.length === 0) return;
        onSlotsChange(slots.slice(0, -n));
        if (editingIndex !== null && editingIndex >= slots.length - n) setEditingIndex(null);
    };

    const handleRemove = (index: number) => {
        onSlotsChange(slots.filter((_, i) => i !== index));
        setSelectedIndices((prev) => new Set([...prev].filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))));
        if (editingIndex === index) setEditingIndex(null);
        else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
    };

    const toggleSlotSelect = (index: number) => {
        setSelectedIndices((prev) => { const n = new Set(prev); if (n.has(index)) n.delete(index); else n.add(index); return n; });
    };
    const selectAllSlots = () => setSelectedIndices(new Set(slots.map((_, i) => i)));
    const clearSlotSelection = () => setSelectedIndices(new Set());
    const removeSelectedSlots = async () => {
        if (selectedIndices.size === 0) return;
        const count = selectedIndices.size;
        const isAll = count === slots.length;

        if (await confirm({
            title: isAll ? "全てのスロットを削除" : "選択したスロットを削除",
            message: isAll ? "全てのスロットを削除しますか？" : `${count} 件のスロットを削除しますか？`,
            danger: true
        })) {
            onSlotsChange(slots.filter((_, i) => !selectedIndices.has(i)));
            setEditingIndex(null);
            setSelectedIndices(new Set());
        }
    };

    const addSelectedSlotsToWheel = () => {
        if (selectedIndices.size === 0) return;
        const selectedLabels = slots
            .map((label, i) => (selectedIndices.has(i) ? label : null))
            .filter((x): x is string => x != null);
        const space = Math.max(0, MAX_SLOTS - slots.length);
        const toAdd = selectedLabels.slice(0, space);
        if (toAdd.length === 0) return;
        onSlotsChange([...slots, ...toAdd]);
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

    useEffect(() => {
        const el = selectAllCheckboxRef.current;
        if (!el) return;
        el.indeterminate = slots.length > 0 && selectedIndices.size > 0 && selectedIndices.size < slots.length;
    }, [slots.length, selectedIndices.size]);

    useEffect(() => {
        if (openColorIndex === null) return;
        const onDocClick = (e: MouseEvent) => {
            if (colorPopoverRef.current?.contains(e.target as Node)) return;
            setOpenColorIndex(null);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [openColorIndex]);

    const _showSlots = section === "slots" || section === "all";
    const showTemplates = section === "templates" || section === "all";

    if (section === "templates" && onSaveTemplate && onLoadTemplate && currentSettings) {
        return (
            <div
                className="w-full min-w-0 overflow-hidden flex flex-col min-h-0 flex-1 rounded-2xl border"
                style={{ borderColor: glassBorder, background: glassBg, backdropFilter: "blur(16px)" }}
            >
                <div className="px-3 py-2 border-b shrink-0 space-y-3 overflow-y-auto scroll-touch" style={{ borderColor: glassBorder }}>
                    {/* サンプルのテンプレート */}
                    {sampleTemplates.length > 0 && (
                        <div className="space-y-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${textSecondary}`}>
                                <FileStack size={12} /> サンプルのテンプレート
                            </span>
                            <div className="flex flex-col gap-1.5">
                                {sampleTemplates.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onLoadTemplate(t.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${isLightMode ? "hover:bg-purple-50 text-gray-800 border-gray-200" : "hover:bg-white/10 text-white/90 border-white/20"}`}
                                    >
                                        {t.name}
                                        <span className={`text-[10px] ml-1 ${textSecondary}`}>（{t.slots.length}件）</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>保存・読み込み</span>
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
                        <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} block mb-1.5`}>保存済みテンプレート</span>
                            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                                {templates.map((t) => (
                                    <div
                                        key={t.id}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${isLightMode ? "bg-black/5" : "bg-white/10"}`}
                                    >
                                        <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>{t.name}</span>
                                        <span className={`text-[10px] ${textSecondary} shrink-0`}>{t.slots.length}件</span>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onLoadTemplate(t.id)}
                                                className={`p-1.5 rounded ${isLightMode ? "text-teal-700 hover:bg-teal-100" : "text-teal-300 hover:bg-teal-500/20"}`}
                                                title="読み込み"
                                            >
                                                <Download size={16} />
                                            </button>
                                            {onOverwriteTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOverwriteTemplate(t.id, t.name)}
                                                    className={`p-1.5 rounded ${isLightMode ? "text-amber-700 hover:bg-amber-100" : "text-amber-300 hover:bg-amber-500/20"}`}
                                                    title="現在の設定で上書き保存"
                                                >
                                                    <Save size={16} />
                                                </button>
                                            )}
                                            {onDeleteTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteTemplate(t.id)}
                                                    className={`p-1.5 rounded text-red-500 ${isLightMode ? "hover:bg-red-100" : "hover:bg-red-500/20"}`}
                                                    title="削除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-full min-w-0 overflow-hidden flex flex-col min-h-0 flex-1 rounded-2xl border"
            style={{ borderColor: glassBorder, background: glassBg, backdropFilter: "blur(16px)" }}
        >
            <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: glassBorder }}>
                <span className={`text-sm font-bold ${textPrimary}`}>スロット一覧</span>
                <span className={`text-xs ${textSecondary}`}>{slots.length} / {MAX_SLOTS}</span>
            </div>

            {/* 連番追加・連番削除 */}
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
                <span className={`text-xs ${textSecondary}`}>|</span>
                <span className={`text-xs ${textSecondary}`}>末尾から</span>
                <input
                    type="number"
                    min={1}
                    max={slots.length}
                    value={bulkDeleteCount}
                    onChange={(e) => setBulkDeleteCount(e.target.value)}
                    className={`w-14 px-2 py-1 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                />
                <span className={`text-xs ${textSecondary}`}>件削除</span>
                <button
                    type="button"
                    onClick={handleBulkRemove}
                    disabled={slots.length === 0}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/80 text-white hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                    削除
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
                    className="p-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    title="追加"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* 一括選択（全選択チェックボックス・解除・選択削除） */}
            <div className="px-4 py-2 flex flex-wrap items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        checked={slots.length > 0 && selectedIndices.size === slots.length}
                        onChange={(e) => (e.target.checked ? selectAllSlots() : clearSlotSelection())}
                        className="rounded accent-purple-500"
                    />
                    <span className={`text-xs ${textSecondary}`}>全選択</span>
                </label>
                <button type="button" onClick={clearSlotSelection} className={`text-xs ${textSecondary} hover:underline`}>解除</button>
                {selectedIndices.size > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={addSelectedSlotsToWheel}
                            className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${isLightMode ? "text-gray-600 hover:bg-gray-200" : "text-white/70 hover:bg-white/10"}`}
                            title="選択したスロットを盤面に追加（コピーして増やす）"
                        >
                            <Copy size={12} />
                            コピーして追加
                        </button>
                        <button type="button" onClick={removeSelectedSlots} className="text-xs text-red-400 hover:bg-red-500/20 px-1.5 py-0.5 rounded">
                            選択削除
                        </button>
                    </>
                )}
            </div>

            {/* リスト */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch px-2 pb-2">
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
                                        <span className="w-4 shrink-0" aria-hidden />
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
                                        <input
                                            type="checkbox"
                                            checked={selectedIndices.has(index)}
                                            onChange={() => toggleSlotSelect(index)}
                                            className="rounded accent-purple-500 shrink-0"
                                            title="一括選択"
                                        />
                                        <span className={`flex-1 min-w-0 text-sm truncate ${textPrimary}`}>{label}</span>
                                        {onSlotColorChange != null && (
                                            <div className="relative shrink-0" ref={openColorIndex === index ? colorPopoverRef : undefined}>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenColorIndex((prev) => (prev === index ? null : index))}
                                                    className="p-1 rounded border opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-opacity touch-manipulation"
                                                    style={{
                                                        background: slotColorOverrides?.[index] ?? "transparent",
                                                        borderColor: isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)",
                                                    }}
                                                    title="盤面の色"
                                                    aria-label="盤面の色"
                                                >
                                                    {slotColorOverrides?.[index] ? (
                                                        <span className="block w-4 h-4 rounded-sm" style={{ background: slotColorOverrides[index] }} />
                                                    ) : (
                                                        <Palette size={16} className={textSecondary} />
                                                    )}
                                                </button>
                                                {openColorIndex === index && (
                                                    <div
                                                        className="absolute right-0 top-full z-50 mt-1 p-2 rounded-lg border shadow-lg min-w-[120px]"
                                                        style={{
                                                            background: isLightMode ? "rgba(255,255,255,0.98)" : "rgba(20,10,40,0.98)",
                                                            borderColor: isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
                                                        }}
                                                    >
                                                        <div className="grid grid-cols-4 gap-1 mb-1.5">
                                                            {ROULETTE_PALETTE_COLORS.map((c) => (
                                                                <button
                                                                    key={c.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        onSlotColorChange(index, c.value);
                                                                        setOpenColorIndex(null);
                                                                    }}
                                                                    className={`h-6 w-6 rounded border-2 transition-all ${slotColorOverrides?.[index] === c.value ? "ring-2 ring-purple-400 ring-offset-1 border-white" : "border-transparent"}`}
                                                                    style={{ background: c.value }}
                                                                    title={c.label}
                                                                />
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onSlotColorChange(index, null);
                                                                setOpenColorIndex(null);
                                                            }}
                                                            className={`w-full text-xs py-1 rounded ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg-white/10"}`}
                                                        >
                                                            解除
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => startEdit(index)}
                                            className="p-1.5 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 text-white/50 hover:text-white/80 hover:bg-white/10 transition-opacity touch-manipulation"
                                            title="編集"
                                            aria-label="編集"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(index)}
                                            className="p-1.5 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-opacity touch-manipulation"
                                            title="削除"
                                            aria-label="削除"
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
                <div className="px-3 py-2 border-t shrink-0 space-y-3" style={{ borderColor: glassBorder }}>
                    {sampleTemplates.length > 0 && (
                        <div className="space-y-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${textSecondary}`}>
                                <FileStack size={12} /> サンプルのテンプレート
                            </span>
                            <div className="flex flex-col gap-1.5">
                                {sampleTemplates.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onLoadTemplate(t.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${isLightMode ? "hover:bg-purple-50 text-gray-800 border-gray-200" : "hover:bg-white/10 text-white/90 border-white/20"}`}
                                    >
                                        {t.name}
                                        <span className={`text-[10px] ml-1 ${textSecondary}`}>（{t.slots.length}件）</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>保存・読み込み</span>
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
                        <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} block mb-1.5`}>保存済みテンプレート</span>
                            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                                {templates.map((t) => (
                                    <div
                                        key={t.id}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${isLightMode ? "bg-black/5" : "bg-white/10"}`}
                                    >
                                        <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>{t.name}</span>
                                        <span className={`text-[10px] ${textSecondary} shrink-0`}>{t.slots.length}件</span>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onLoadTemplate(t.id)}
                                                className={`p-1.5 rounded ${isLightMode ? "text-teal-700 hover:bg-teal-100" : "text-teal-300 hover:bg-teal-500/20"}`}
                                                title="読み込み"
                                            >
                                                <Download size={16} />
                                            </button>
                                            {onOverwriteTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOverwriteTemplate(t.id, t.name)}
                                                    className={`p-1.5 rounded ${isLightMode ? "text-amber-700 hover:bg-amber-100" : "text-amber-300 hover:bg-amber-500/20"}`}
                                                    title="現在の設定で上書き保存"
                                                >
                                                    <Save size={16} />
                                                </button>
                                            )}
                                            {onDeleteTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteTemplate(t.id)}
                                                    className={`p-1.5 rounded text-red-500 ${isLightMode ? "hover:bg-red-100" : "hover:bg-red-500/20"}`}
                                                    title="削除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
