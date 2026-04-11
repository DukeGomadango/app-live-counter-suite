"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Settings,
    Sparkles,
    Shield,
    Palette,
    Pencil,
    Check,
    Upload,
    } from "lucide-react";
import type { GachaPool, GachaItem, RarityTier } from "@/lib/gacha";
import { generateId, calculateProbabilities, getRarityProbabilities, getGlobalProbabilities } from "@/lib/gacha";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";

import ConfirmDialog from "@/components/ConfirmDialog";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import GachaFileRegisterModal from "@/components/gacha/GachaFileRegisterModal";

interface GachaSetupProps {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    isLightMode: boolean;
    /** ダークモードで背景が明るいとき true。文字を暗くして視認性を確保 */
    textContrastLight?: boolean;
}

function SectionHeader({
    id,
    icon: Icon,
    title,
    badge,
    expandedSection,
    onToggle,
    textLight,
    textPrimary,
}: {
    id: string;
    icon: React.ElementType;
    title: string;
    badge?: string;
    expandedSection: string | null;
    onToggle: (id: string) => void;
    textLight: boolean;
    textPrimary: string;
}) {
    return (
        <button
            onClick={() => onToggle(id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${textPrimary}`}
            style={{
                background: expandedSection === id ? (textLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)") : "transparent",
            }}
        >
            <div className="flex items-center gap-2">
                <Icon size={16} className={textLight ? "text-purple-600" : "text-purple-400"} />
                <span className="text-sm font-semibold">{title}</span>
                {badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${textLight ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-300"}`}>
                        {badge}
                    </span>
                )}
            </div>
            {expandedSection === id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
    );
}

export default function GachaSetup({ pool, onPoolChange, isLightMode, textContrastLight = false }: GachaSetupProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>("items");
    const [newItemName, setNewItemName] = useState("");
    const [newItemRarityId, setNewItemRarityId] = useState(pool.rarities[0]?.id || "");
    const [newItemProb, setNewItemProb] = useState("1");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [pendingDelete, setPendingDelete] = useState<{ type: "rarity"; id: string } | { type: "item"; id: string } | null>(null);
    const [pullCountInput, setPullCountInput] = useState<string | null>(null);
    const [pityThresholdInput, setPityThresholdInput] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [bulkProbInput, setBulkProbInput] = useState("");
    type ItemSortMode = "custom" | "rarity-asc" | "rarity-desc" | "weight-asc" | "weight-desc" | "name-asc" | "name-desc";
    const [itemSortMode, setItemSortMode] = useState<ItemSortMode>("custom");
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [draggingSelectionIds, setDraggingSelectionIds] = useState<Set<string> | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(id);
    }, []);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textLight = isLightMode || textContrastLight;
    const textPrimary = textLight ? "text-neutral-900" : "text-white/95";
    const textSecondary = textLight ? "text-neutral-700" : "text-white/80";
    const textMuted = textLight ? "text-neutral-600" : "text-white/70";
    const inputBg = textLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = textLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const placeholderCls = textLight ? "placeholder:text-neutral-500" : "placeholder:text-white/55";
    const selectOptionStyle = textLight
        ? { background: "#fff", color: "#1f2937" }
        : { background: "rgba(30,27,75,0.95)", color: "#e2e8f0" };

    const probabilities = calculateProbabilities(pool.items);
    const rarityProbs = getRarityProbabilities(pool.items, pool.rarities);
    const globalProbs = getGlobalProbabilities(pool.items, pool.rarities);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: { active: { id: unknown } }) => {
        const activeId = String(event.active.id);
        if (selectedItemIds.has(activeId) && selectedItemIds.size >= 2) {
            setActiveDragId(activeId);
            setDraggingSelectionIds(new Set(selectedItemIds));
        }
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
        setDraggingSelectionIds(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        setDraggingSelectionIds(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const activeId = String(active.id);
        const overId = String(over.id);
        const selectedSet = selectedItemIds;
        const isBulkMove = selectedSet.has(activeId) && selectedSet.size >= 2;

        if (isBulkMove) {
            const selectedOrdered = pool.items.filter(it => selectedSet.has(it.id));
            const rest = pool.items.filter(it => !selectedSet.has(it.id));
            const dropTargetIndex = pool.items.findIndex(i => i.id === overId);
            if (dropTargetIndex < 0) return;
            const insertIndexInRest = pool.items.slice(0, dropTargetIndex).filter(i => !selectedSet.has(i.id)).length;
            const newItems = [...rest.slice(0, insertIndexInRest), ...selectedOrdered, ...rest.slice(insertIndexInRest)];
            onPoolChange({ ...pool, items: newItems });
            setSelectedItemIds(new Set());
        } else {
            const oldIndex = pool.items.findIndex(i => i.id === activeId);
            const newIndex = pool.items.findIndex(i => i.id === overId);
            if (oldIndex >= 0 && newIndex >= 0) {
                onPoolChange({ ...pool, items: arrayMove(pool.items, oldIndex, newIndex) });
            }
        }
    };

    // -- レア度操作 --
    const normalizeRarityTiers = (rarities: RarityTier[], targetId?: string, targetP?: number): RarityTier[] => {
        if (rarities.length === 0) return rarities;
        let workingRarities = rarities.map(r => ({ ...r, defaultWeight: r.defaultWeight ?? 0 }));

        if (targetId && targetP !== undefined) {
            const p = Math.max(0, Math.min(100, targetP));
            const others = workingRarities.filter(it => it.id !== targetId);
            if (others.length === 0) {
                return workingRarities.map(it => it.id === targetId ? { ...it, defaultWeight: 100 } : it);
            }
            const rest = 100 - p;
            const otherSum = others.reduce((s, it) => s + (it.defaultWeight ?? 0), 0);
            return workingRarities.map(it => {
                if (it.id === targetId) return { ...it, defaultWeight: p };
                if (otherSum === 0) return { ...it, defaultWeight: rest / others.length };
                return { ...it, defaultWeight: ((it.defaultWeight ?? 0) / otherSum) * rest };
            });
        } else {
            const sum = workingRarities.reduce((s, it) => s + (it.defaultWeight ?? 0), 0);
            if (sum === 0) {
                return workingRarities.map(it => ({ ...it, defaultWeight: 100 / workingRarities.length }));
            }
            return workingRarities.map(it => ({ ...it, defaultWeight: ((it.defaultWeight ?? 0) / sum) * 100 }));
        }
    };

    const updateRarity = (id: string, updates: Partial<RarityTier>) => {
        if (updates.defaultWeight !== undefined) {
            const temp = pool.rarities.map(r => r.id === id ? { ...r, ...updates } : r);
            const nextRarities = normalizeRarityTiers(temp, id, updates.defaultWeight);
            onPoolChange({ ...pool, rarities: nextRarities });
        } else {
            onPoolChange({
                ...pool,
                rarities: pool.rarities.map(r => r.id === id ? { ...r, ...updates } : r),
            });
        }
    };

    const addRarity = () => {
        const maxOrder = pool.rarities.reduce((max, r) => Math.max(max, r.sortOrder), 0);
        const newRarity: RarityTier = {
            id: generateId(),
            name: `Tier${pool.rarities.length + 1}`,
            color: "#8b5cf6",
            glowColor: "rgba(139,92,246,0.4)",
            bgColor: "rgba(139,92,246,0.1)",
            sortOrder: maxOrder + 1,
            defaultWeight: 0,
        };
        const nextRarities = normalizeRarityTiers([...pool.rarities, newRarity]);
        onPoolChange({ ...pool, rarities: nextRarities });
    };

    const removeRarity = (id: string) => {
        if (pool.rarities.length <= 1) return;
        const nextRarities = normalizeRarityTiers(pool.rarities.filter(r => r.id !== id));
        onPoolChange({
            ...pool,
            rarities: nextRarities,
            items: pool.items.filter(item => item.rarityId !== id),
        });
    };

    const normalizeRarityWeights = (items: GachaItem[], rarityId: string, targetId?: string, targetP?: number): GachaItem[] => {
        const rarityItems = items.filter(it => it.rarityId === rarityId);
        if (rarityItems.length === 0) return items;

        if (targetId && targetP !== undefined) {
            const p = Math.max(0, Math.min(100, targetP));
            const others = rarityItems.filter(it => it.id !== targetId);
            if (others.length === 0) {
                return items.map(it => it.id === targetId ? { ...it, weight: 100 } : it);
            }
            const rest = 100 - p;
            const otherSum = others.reduce((s, it) => s + it.weight, 0);
            return items.map(it => {
                if (it.id === targetId) return { ...it, weight: p };
                if (it.rarityId === rarityId) {
                    if (otherSum === 0) return { ...it, weight: rest / others.length };
                    else return { ...it, weight: (it.weight / otherSum) * rest };
                }
                return it;
            });
        } else {
            const sum = rarityItems.reduce((s, it) => s + it.weight, 0);
            return items.map(it => {
                if (it.rarityId === rarityId) {
                    if (sum === 0) return { ...it, weight: 100 / rarityItems.length };
                    else return { ...it, weight: (it.weight / sum) * 100 };
                }
                return it;
            });
        }
    };

    const applyProbabilityEdit = (itemIndex: number, newWeight: number) => {
        if (itemIndex < 0 || itemIndex >= pool.items.length) return;
        const targetItem = pool.items[itemIndex];
        if (!targetItem) return;
        const nextItems = normalizeRarityWeights(pool.items, targetItem.rarityId, targetItem.id, newWeight);
        onPoolChange({ ...pool, items: nextItems });
    };

    // -- 品目操作 --
    const addItem = () => {
        if (!newItemName.trim() || !newItemRarityId) return;
        const prob = parseFloat(newItemProb);
        const w = Number.isNaN(prob) || prob < 0 ? 0 : Math.min(100, prob);
        const newItem: GachaItem = {
            id: generateId(),
            name: newItemName.trim(),
            rarityId: newItemRarityId,
            weight: w,
        };
        const nextItems = normalizeRarityWeights([...pool.items, newItem], newItemRarityId, newItem.id, w);
        onPoolChange({ ...pool, items: nextItems });
        setNewItemName("");
        setNewItemProb("100");
    };

    const applyBulkProbability = (weight: number) => {
        const w = weight >= 0 ? weight : 0;
        const selectedSet = new Set(selectedItemIds);
        let items = pool.items.map(it =>
            selectedSet.has(it.id) ? { ...it, weight: w } : { ...it }
        );
        const affectedRarities = new Set(pool.items.filter(it => selectedSet.has(it.id)).map(it => it.rarityId));
        affectedRarities.forEach(rid => {
            items = normalizeRarityWeights(items, rid);
        });
        onPoolChange({ ...pool, items });
        setSelectedItemIds(new Set());
    };

    const toggleItemSelected = (id: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const applyItemSort = (mode: ItemSortMode) => {
        if (mode === "custom") return;
        const maxRarityOrder = pool.rarities.length > 0 ? Math.max(...pool.rarities.map(r => r.sortOrder), 0) : 0;
        const getRarityOrder = (item: GachaItem) =>
            pool.rarities.find(r => r.id === item.rarityId)?.sortOrder ?? maxRarityOrder + 1;
        const sorted = [...pool.items].sort((a, b) => {
            switch (mode) {
                case "rarity-asc":
                    return getRarityOrder(a) - getRarityOrder(b);
                case "rarity-desc":
                    return getRarityOrder(b) - getRarityOrder(a);
                case "weight-asc":
                    return a.weight - b.weight;
                case "weight-desc":
                    return b.weight - a.weight;
                case "name-asc":
                    return (a.name || "").localeCompare(b.name || "", "ja");
                case "name-desc":
                    return (b.name || "").localeCompare(a.name || "", "ja");
                default:
                    return 0;
            }
        });
        onPoolChange({ ...pool, items: sorted });
        setSelectedItemIds(new Set());
    };


    const removeItem = (id: string) => {
        const itemToRemove = pool.items.find(it => it.id === id);
        let items = pool.items.filter(item => item.id !== id);
        if (itemToRemove) {
            items = normalizeRarityWeights(items, itemToRemove.rarityId);
        }
        onPoolChange({ ...pool, items });
    };

    const updateItem = (id: string, updates: Partial<GachaItem>) => {
        onPoolChange({
            ...pool,
            items: pool.items.map(item => item.id === id ? { ...item, ...updates } : item),
        });
    };

    const startEditing = (item: GachaItem) => {
        setEditingItemId(item.id);
        setEditName(item.name);
    };

    const finishEditing = () => {
        if (editingItemId && editName.trim()) {
            updateItem(editingItemId, { name: editName.trim() });
        }
        setEditingItemId(null);
        setEditName("");
    };

    const toggleSection = (section: string) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    return (
        <div className="flex flex-col gap-3 min-h-0 pr-1 pb-20">
            {/* コンセプト名 */}
            <div className="rounded-2xl p-4" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2 block`}>
                    コンセプト名
                </label>
                <input
                    type="text"
                    value={pool.conceptName}
                    onChange={e => onPoolChange({ ...pool, conceptName: e.target.value })}
                    placeholder="例: 推し決定ガチャ"
                    className={`w-full px-3 py-2 rounded-lg text-sm ${textPrimary} ${placeholderCls} outline-none transition-all focus:ring-2 focus:ring-purple-500/30`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                />
            </div>

            {/* 排出枚数 */}
            <div className="rounded-2xl p-4" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2 block`}>
                    1回の排出枚数
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={pullCountInput !== null ? pullCountInput : String(pool.pullCount)}
                    onFocus={() => setPullCountInput(String(pool.pullCount))}
                    onChange={e => setPullCountInput(e.target.value)}
                    onBlur={() => {
                        const s = pullCountInput !== null ? pullCountInput.trim() : String(pool.pullCount);
                        const n = parseInt(s, 10);
                        const valid = !Number.isNaN(n) ? Math.max(1, Math.min(100000, n)) : pool.pullCount;
                        onPoolChange({ ...pool, pullCount: valid });
                        setPullCountInput(null);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-sm ${textPrimary} ${placeholderCls} outline-none transition-all focus:ring-2 focus:ring-purple-500/30`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                />
                <p className={`text-[10px] mt-1 ${textMuted}`}>最大100,000枚</p>
            </div>

            {/* レア度設定 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <SectionHeader id="rarities" icon={Palette} title="レア度設定" badge={mounted ? `${pool.rarities.length}` : "0"} expandedSection={expandedSection} onToggle={toggleSection} textLight={textLight} textPrimary={textPrimary} />
                <AnimatePresence>
                    {expandedSection === "rarities" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 flex flex-col gap-2">
                                {(mounted ? pool.rarities : [])
                                    .slice()
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map(rarity => (
                                        <div
                                            key={rarity.id}
                                            className="flex items-center gap-2 p-2 rounded-lg min-h-11 flex-shrink-0"
                                            style={{ background: textLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
                                        >
                                            <input
                                                type="color"
                                                value={rarity.color}
                                                onChange={e => {
                                                    const hex = e.target.value;
                                                    const r = parseInt(hex.slice(1, 3), 16);
                                                    const g = parseInt(hex.slice(3, 5), 16);
                                                    const b = parseInt(hex.slice(5, 7), 16);
                                                    updateRarity(rarity.id, {
                                                        color: hex,
                                                        glowColor: `rgba(${r},${g},${b},0.4)`,
                                                        bgColor: `rgba(${r},${g},${b},0.1)`,
                                                    });
                                                }}
                                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                                style={{ background: "transparent" }}
                                            />
                                            <input
                                                type="text"
                                                value={rarity.name}
                                                onChange={e => updateRarity(rarity.id, { name: e.target.value })}
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                spellCheck={false}
                                                className={`flex-1 px-2 py-1 rounded text-xs font-bold ${textPrimary} outline-none`}
                                                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                            />
                                            <span className={`text-[10px] w-8 text-center ${textMuted}`}>#{rarity.sortOrder}</span>
                                            {/* デフォルト出現比率 */}
                                            <span className="flex items-center gap-0.5 shrink-0 bg-black/5 px-1 py-0.5 rounded">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={rarity.defaultWeight != null ? formatProb(rarity.defaultWeight) : ""}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === "") {
                                                            updateRarity(rarity.id, { defaultWeight: 0 });
                                                        } else {
                                                            const n = parseFloat(val);
                                                            if (!Number.isNaN(n) && n >= 0) {
                                                                updateRarity(rarity.id, { defaultWeight: n });
                                                            }
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className={`w-12 text-[10px] px-1 py-0.5 rounded text-right tabular-nums ${textPrimary} ${placeholderCls} outline-none cursor-text focus:ring-1 focus:ring-purple-400`}
                                                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                                    title="レア度の出現確率。変更すると他のレア度が自動調整されます"
                                                />
                                                <span className={`text-[10px] ${textMuted}`} title="出現確率(%)">%</span>
                                            </span>
                                            {(mounted ? pool.rarities : []).length > 1 && (
                                                <button
                                                    onClick={() => setPendingDelete({ type: "rarity", id: rarity.id })}
                                                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
                                                    aria-label="このレア度を削除"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                <button
                                    onClick={addRarity}
                                    className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${textLight ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"}`}
                                >
                                    <Plus size={12} /> レア度を追加
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 品目設定 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <SectionHeader id="items" icon={Sparkles} title="排出品目" badge={mounted ? `${pool.items.length}` : "0"} expandedSection={expandedSection} onToggle={toggleSection} textLight={textLight} textPrimary={textPrimary} />
                <AnimatePresence>
                    {expandedSection === "items" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 flex flex-col gap-2">
                                {/* レア度別確率サマリ */}
                                {mounted && pool.items.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {pool.rarities
                                            .sort((a, b) => a.sortOrder - b.sortOrder)
                                            .map(r => {
                                                const prob = rarityProbs.get(r.id) || 0;
                                                if (prob === 0) return null;
                                                return (
                                                    <span
                                                        key={r.id}
                                                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                        style={{ color: r.color, background: r.bgColor, border: `1px solid ${r.glowColor}` }}
                                                    >
                                                        {r.name}: {formatProb(prob)}%
                                                    </span>
                                                );
                                            })}
                                    </div>
                                )}



                                {/* 一括確率設定バー（1件以上選択時） */}
                                {mounted && selectedItemIds.size >= 1 && (
                                    <div className={`flex flex-wrap items-center gap-2 mb-2 px-3 py-2 rounded-lg text-xs ${textLight ? "bg-purple-50 border border-purple-200" : "bg-purple-500/15 border border-purple-500/30"}`}>
                                        <span className={textPrimary}>選択中 {selectedItemIds.size} 件</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={bulkProbInput}
                                            onChange={e => setBulkProbInput(e.target.value)}
                                            placeholder="レア度内確率"
                                            className={`w-24 px-2 py-1 rounded text-right tabular-nums ${textPrimary} ${placeholderCls} outline-none`}
                                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                        />
                                        <span className={`text-[10px] ${textMuted}`}>%</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const n = parseFloat(bulkProbInput.trim());
                                                if (!Number.isNaN(n) && n >= 0) applyBulkProbability(n);
                                            }}
                                            className={`px-2 py-1 rounded font-medium ${textLight ? "bg-purple-200 text-purple-900 hover:bg-purple-300" : "bg-purple-500/30 text-purple-100 hover:bg-purple-500/50"}`}
                                        >
                                            一括で設定
                                        </button>
                                    </div>
                                )}

                                {/* 並べ替え */}
                                {mounted && pool.items.length > 0 && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] ${textMuted}`}>並べ替え:</span>
                                        <select
                                            value={itemSortMode}
                                            onChange={e => {
                                                const mode = e.target.value as ItemSortMode;
                                                setItemSortMode(mode);
                                                if (mode !== "custom") applyItemSort(mode);
                                            }}
                                            className={`text-[10px] px-2 py-1 rounded-lg outline-none cursor-pointer ${textSecondary}`}
                                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                        >
                                            <option value="custom" style={selectOptionStyle}>カスタム</option>
                                            <option value="rarity-asc" style={selectOptionStyle}>レア度順（低→高）</option>
                                            <option value="rarity-desc" style={selectOptionStyle}>レア度順（高→低）</option>
                                            <option value="weight-asc" style={selectOptionStyle}>確率順（低→高）</option>
                                            <option value="weight-desc" style={selectOptionStyle}>確率順（高→低）</option>
                                            <option value="name-asc" style={selectOptionStyle}>名前順（あ→ん）</option>
                                            <option value="name-desc" style={selectOptionStyle}>名前順（ん→あ）</option>
                                        </select>
                                    </div>
                                )}

                                {/* 品目リスト（編集可能）。ハイドレーション一致のため mounted まで空で描画 */}
                                <div className="flex flex-col gap-1.5 mb-3 max-h-64 overflow-y-auto scroll-touch pr-1">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onDragCancel={handleDragCancel}
                                    >
                                        <SortableContext items={(mounted ? pool.items : []).map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            {(mounted ? pool.items : []).map((item, index) => {
                                                const pt = probabilities.get(item.id) || 0;
                                                const gPt = globalProbs.get(item.id) || 0;
                                                return (
                                                    <SortableItem
                                                        key={item.id}
                                                        item={item}
                                                        itemIndex={index}
                                                        isFirstItem={false}
                                                        pool={pool}
                                                        isLightMode={textLight}
                                                        editingItemId={editingItemId}
                                                        editName={editName}
                                                        setEditName={setEditName}
                                                        startEditing={startEditing}
                                                        finishEditing={finishEditing}
                                                        updateItem={updateItem}
                                                        onProbabilityBlur={applyProbabilityEdit}
                                                        onRequestRemoveItem={(id) => setPendingDelete({ type: "item", id })}
                                                        prob={pt}
                                                        globalProb={gPt}
                                                        isSelected={selectedItemIds.has(item.id)}
                                                        onToggleSelect={toggleItemSelected}
                                                        draggingSelectionIds={draggingSelectionIds}
                                                        activeDragId={activeDragId}
                                                    />
                                                );
                                            })}
                                        </SortableContext>
                                    </DndContext>
                                </div>

                                {/* 新規追加フォーム */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newItemName}
                                            onChange={e => setNewItemName(e.target.value)}
                                            placeholder="品目名"
                                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${textPrimary} ${placeholderCls} outline-none`}
                                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                            onKeyDown={e => e.key === "Enter" && addItem()}
                                        />
                                        <select
                                            value={mounted ? newItemRarityId : ""}
                                            onChange={e => {
                                                setNewItemRarityId(e.target.value);
                                            }}
                                            className={`px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none cursor-pointer`}
                                            style={{
                                                background: inputBg,
                                                border: `1px solid ${inputBorder}`,
                                                color: (mounted ? pool.rarities : []).find(r => r.id === newItemRarityId)?.color || (textLight ? "#1f2937" : "#e2e8f0"),
                                            }}
                                        >
                                            {(mounted ? pool.rarities : []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                                                <option key={r.id} value={r.id} style={selectOptionStyle}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={newItemProb}
                                                onChange={e => setNewItemProb(e.target.value)}
                                                placeholder="レア度内確率"
                                                className={`w-24 px-2 py-1.5 rounded-lg text-xs ${textPrimary} ${placeholderCls} outline-none`}
                                                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                                title="追加するアイテムのレア度内での確率"
                                            />
                                            <span className={textMuted}>%</span>
                                        </span>
                                        <button
                                            onClick={addItem}
                                            disabled={!newItemName.trim()}
                                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 ${textLight ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"}`}
                                        >
                                            <Plus size={12} /> 追加
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 天井設定 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <SectionHeader id="pity" icon={Shield} title="天井設定" badge={mounted ? (pool.pityEnabled ? "ON" : "OFF") : "OFF"} expandedSection={expandedSection} onToggle={toggleSection} textLight={textLight} textPrimary={textPrimary} />
                <AnimatePresence>
                    {expandedSection === "pity" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 flex flex-col gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div
                                        onClick={() => onPoolChange({ ...pool, pityEnabled: !pool.pityEnabled })}
                                        className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${pool.pityEnabled
                                            ? "bg-purple-500"
                                            : textLight ? "bg-gray-300" : "bg-white/20"
                                            }`}
                                    >
                                        <div
                                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${pool.pityEnabled ? "left-5" : "left-0.5"
                                                }`}
                                        />
                                    </div>
                                    <span className={`text-xs ${textPrimary}`}>天井を有効にする</span>
                                </label>

                                {pool.pityEnabled && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col gap-2"
                                    >
                                        <div>
                                            <label className={`text-[10px] ${textSecondary} mb-1 block`}>天井回数</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={pityThresholdInput !== null ? pityThresholdInput : String(pool.pityThreshold)}
                                                onFocus={() => setPityThresholdInput(String(pool.pityThreshold))}
                                                onChange={e => setPityThresholdInput(e.target.value)}
                                                onBlur={() => {
                                                    const s = pityThresholdInput !== null ? pityThresholdInput.trim() : String(pool.pityThreshold);
                                                    const n = parseInt(s, 10);
                                                    const valid = !Number.isNaN(n) ? Math.max(1, n) : pool.pityThreshold;
                                                    onPoolChange({ ...pool, pityThreshold: valid });
                                                    setPityThresholdInput(null);
                                                }}
                                                className={`w-full px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none`}
                                                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] ${textSecondary} mb-1 block`}>確定レア度</label>
                                            <select
                                                value={pool.pityGuaranteedRarityId}
                                                onChange={e => onPoolChange({ ...pool, pityGuaranteedRarityId: e.target.value })}
                                                className={`w-full px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none cursor-pointer`}
                                                style={{
                                                    background: inputBg,
                                                    border: `1px solid ${inputBorder}`,
                                                    color: pool.rarities.find(r => r.id === pool.pityGuaranteedRarityId)?.color || (textLight ? "#1f2937" : "#e2e8f0"),
                                                }}
                                            >
                                                {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                                                    <option key={r.id} value={r.id} style={selectOptionStyle}>
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 設定サマリ（ハイドレーション一致のため mounted まで非表示） */}
            {mounted && pool.items.length > 0 && (
                <div className={`rounded-2xl p-4 ${textSecondary}`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Settings size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">設定サマリ</span>
                    </div>
                    <div className="text-[11px] space-y-1">
                        <p className="inline-flex items-center gap-1"><EmojiGlyph emoji="📦" size={12} /> 品目: {pool.items.length}種類</p>
                        <p className="inline-flex items-center gap-1"><EmojiGlyph emoji="🎲" size={12} /> 1回: {pool.pullCount}連</p>
                        {pool.pityEnabled && (
                            <p className="inline-flex items-center gap-1"><EmojiGlyph emoji="🛡️" size={12} /> 天井: {pool.pityThreshold}回で {pool.rarities.find(r => r.id === pool.pityGuaranteedRarityId)?.name || "?"} 確定</p>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                message="本当に削除しますか？"
                confirmLabel="削除する"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (pendingDelete) {
                        if (pendingDelete.type === "rarity") removeRarity(pendingDelete.id);
                        else removeItem(pendingDelete.id);
                        setPendingDelete(null);
                    }
                }}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}

// 極小確率は指数表記、それ以外は桁数に応じて toFixed
function formatProb(prob: number): string {
    if (prob >= 0.01) return prob.toFixed(2);
    if (prob >= 0.0001) return prob.toFixed(4);
    if (prob >= 1e-6) return prob.toFixed(6);
    if (prob > 0) return prob.toExponential(2);
    return "0";
}

// DnD用の子コンポーネント
interface SortableItemProps {
    item: GachaItem;
    itemIndex: number;
    isFirstItem: boolean;
    pool: GachaPool;
    isLightMode: boolean;
    editingItemId: string | null;
    editName: string;
    setEditName: (name: string) => void;
    startEditing: (item: GachaItem) => void;
    finishEditing: () => void;
    updateItem: (id: string, updates: Partial<GachaItem>) => void;
    onProbabilityBlur: (itemIndex: number, percent: number) => void;
    onRequestRemoveItem: (id: string) => void;
    prob: number;
    globalProb: number;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    draggingSelectionIds: Set<string> | null;
    activeDragId: string | null;
}

function SortableItem({
    item,
    itemIndex,
    isFirstItem,
    pool,
    isLightMode,
    editingItemId,
    editName,
    setEditName,
    startEditing,
    finishEditing,
    updateItem,
    onProbabilityBlur,
    onRequestRemoveItem,
    prob,
    globalProb,
    isSelected,
    onToggleSelect,
    draggingSelectionIds,
    activeDragId,
}: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const isEditing = editingItemId === item.id;
    const rarity = pool.rarities.find(r => r.id === item.rarityId);
    const [probInput, setProbInput] = useState<string | null>(null);
    const probDisplay = probInput !== null ? probInput : String(item.weight);
    const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);

    const isPartOfDraggingSelection = draggingSelectionIds?.has(item.id) ?? false;
    const isTheDraggedItem = activeDragId === item.id;
    const hideRow = isPartOfDraggingSelection && !isTheDraggedItem;
    const showStack = isDragging && draggingSelectionIds != null && draggingSelectionIds.size > 1;

    const sortableStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: hideRow ? 0 : isDragging ? 1 : 1,
        pointerEvents: hideRow ? ("none" as const) : undefined,
        zIndex: isDragging ? 10 : 1,
    };

    const textPrimary = isLightMode ? "text-purple-900" : "text-white/95";
    const textMuted = isLightMode ? "text-purple-600" : "text-white/65";
    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const selectOptionStyle = isLightMode ? { background: "#fff", color: "#1f2937" } : { background: "#1e1b4b", color: "#e2e8f0" };

    const stackCount = draggingSelectionIds ? Math.min(draggingSelectionIds.size - 1, 3) : 0;
    const stackColor = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";

    return (
        <div
            ref={setNodeRef}
            className={`relative flex items-center gap-1.5 p-2 rounded-lg group transition-opacity duration-150 ${isDragging ? "shadow-lg scale-[1.02]" : ""}`}
            style={{ ...sortableStyle, background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
        >
            {showStack && stackCount > 0 && (
                <div className="absolute left-1 right-1 top-full mt-0.5 flex flex-col gap-0.5 pointer-events-none" aria-hidden>
                    {Array.from({ length: stackCount }).map((_, i) => (
                        <div
                            key={i}
                            className="h-1 rounded"
                            style={{
                                background: stackColor,
                                marginLeft: 4 + i * 3,
                                marginRight: 4 + i * 3,
                            }}
                        />
                    ))}
                </div>
            )}
            {/* ドラッグハンドル */}
            <div {...attributes} {...listeners} className="cursor-grab hover:text-purple-400 text-gray-500/50 touch-none w-5 h-5 flex items-center justify-center shrink-0">
                <GripVertical size={14} />
            </div>

            {/* 一括用チェックボックス（先頭行以外） */}
            {!isFirstItem && (
                <label className="shrink-0 flex items-center cursor-pointer p-2 -m-2 touch-manipulation" onClick={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded w-2.5 h-2.5"
                        aria-label="選択"
                    />
                </label>
            )}
            {isFirstItem && <div className="w-2.5 h-2.5 shrink-0" aria-hidden />}

            {/* レア度プルダウン（削除済みレア度は「レア度未設定」表示） */}
            <select
                value={item.rarityId}
                onChange={e => updateItem(item.id, { rarityId: e.target.value })}
                className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0 outline-none cursor-pointer"
                style={{
                    color: rarity?.color ?? "#6b7280",
                    background: rarity?.bgColor ?? (isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"),
                    border: `1px solid ${rarity?.glowColor || "rgba(107,114,128,0.3)"}`,
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    paddingRight: "14px",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(rarity?.color || "#6b7280")}' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 2px center",
                }}
            >
                {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                    <option key={r.id} value={r.id} style={selectOptionStyle}>
                        {r.name}
                    </option>
                ))}
                {!rarity && (
                    <option value={item.rarityId} style={{ ...selectOptionStyle, color: "#6b7280" }}>
                        レア度未設定
                    </option>
                )}
            </select>

            {/* 品目名（編集可能） */}
            {isEditing ? (
                <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={e => e.key === "Enter" && finishEditing()}
                    autoFocus
                    className={`text-xs flex-1 px-1.5 py-0.5 rounded ${textPrimary} outline-none`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                />
            ) : (
                <span
                    className={`text-xs flex-1 truncate cursor-pointer hover:underline ${textPrimary}`}
                    onClick={() => startEditing(item)}
                    title="クリックして編集"
                >
                    {item.name}
                </span>
            )}

            {/* 比率入力 + レア度内確率表示 */}
            {/* パーセント入力 + レア度内確率・全体確率表示 */}
            <span className="flex items-center gap-1 shrink-0 bg-black/5 px-2 py-0.5 rounded text-[10px]">
                <span className="flex items-center" title="【レア度内の確率】変更すると他のアイテムが自動で調整されます">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={probDisplay}
                        onFocus={() => setProbInput(String(item.weight))}
                        onChange={e => setProbInput(e.target.value)}
                        onBlur={() => {
                            const s = probInput !== null ? probInput.trim() : String(item.weight);
                            const n = parseFloat(s);
                            if (!Number.isNaN(n) && n >= 0) onProbabilityBlur(itemIndex, n);
                            setProbInput(null);
                        }}
                        className={`w-14 px-1 py-0.5 rounded text-right tabular-nums ${textPrimary} outline-none cursor-text font-semibold focus:ring-1 focus:ring-purple-400`}
                        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                    />
                    <span className={`ml-0.5 ${textMuted}`}>%</span>
                </span>
                <span className={`w-16 text-right tabular-nums ${textMuted} border-l pl-2`} title="全体の確率（読み取り専用）" style={{ borderColor: inputBorder}}>
                    {formatProb(globalProb)}%
                </span>
            </span>

            {/* 添付（画像・音声）：1ボタンでモーダルを開き、モーダル内でファイル or URL を登録 */}
            <button
                type="button"
                onClick={e => { e.stopPropagation(); setAttachmentModalOpen(true); }}
                className={`shrink-0 p-1 rounded transition-colors ${item.imageUrl || item.audioUrl ? "text-purple-400" : "text-gray-500/60 hover:text-purple-400"}`}
                title="画像・音声を登録"
                aria-label="画像・音声を登録"
            >
                <Upload size={12} />
            </button>

            {attachmentModalOpen && (
                <GachaFileRegisterModal
                    poolId={pool.id}
                    item={item}
                    isLightMode={isLightMode}
                    onClose={() => setAttachmentModalOpen(false)}
                    onUpdate={(updates) => {
                        updateItem(item.id, updates);
                    }}
                />
            )}

            {/* 操作ボタン（モバイルでは常表示、sm以上でホバー時表示） */}
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                {isEditing ? (
                    <button
                        onClick={finishEditing}
                        className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                    >
                        <Check size={10} />
                    </button>
                ) : (
                    <button
                        onClick={() => startEditing(item)}
                        className={`p-1 rounded transition-colors ${isLightMode ? "hover:bg-gray-200 text-purple-600" : "hover:bg-white/10 text-white/65"}`}
                    >
                        <Pencil size={10} />
                    </button>
                )}
                <button
                    onClick={() => onRequestRemoveItem(item.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                >
                    <Trash2 size={10} />
                </button>
            </div>
        </div>
    );
}
