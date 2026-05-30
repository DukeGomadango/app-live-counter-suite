"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    Lock,
    Unlock,
    LayoutGrid,
    Coins,
    } from "lucide-react";
import type { GachaPool, GachaItem, RarityTier, IntegrationConfig } from "@/lib/gacha";
import { generateId, getRarityProbabilities, getGlobalProbabilities, distributePercentagesProportionally } from "@/lib/gacha";
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
import { useConfirm } from "@/context/ConfirmContext";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import GachaBulkSetupModal from "@/components/gacha/GachaBulkSetupModal";
import { useToast } from "@/components/Toast";
import { saveExternalGachaConfig } from "@/lib/gachaDistribution";

interface GachaSetupProps {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    isLightMode: boolean;
    /** ダークモードで背景が明るいとき true。文字を暗くして視認性を確保 */
    textContrastLight?: boolean;
    integrationConfig?: IntegrationConfig;
    /** 親が同期完了後に一括設定モーダルを開く */
    openBulkModal?: boolean;
    onBulkModalOpened?: () => void;
    /** 配布タブへ遷移（品目 ID をフォーカス可能） */
    onNavigateToDistribution?: (itemId: string) => void;
    /** キャンペーン選択済みかつ連携トークンあり */
    distributionIntegrationActive?: boolean;
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
    icon: React.ComponentType<{ size?: number; className?: string }>;
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

export default function GachaSetup({ pool, onPoolChange, isLightMode, textContrastLight = false, integrationConfig, openBulkModal = false, onBulkModalOpened, onNavigateToDistribution, distributionIntegrationActive = false }: GachaSetupProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>("items");
    const [newItemName, setNewItemName] = useState("");
    const [newItemRarityId, setNewItemRarityId] = useState(pool.rarities[0]?.id || "");
    const [newItemProb, setNewItemProb] = useState("1");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const { confirm } = useConfirm();
    const { showToast } = useToast();

    const syncGachaConfigToExternal = useCallback(async (updatedItems: GachaItem[], updatedRarities: RarityTier[]) => {
        if (!pool.linkedCampaignId || !integrationConfig?.integrationToken) return;

        try {
            const payload = {
                gachaConfig: {
                    rarities: updatedRarities.map(r => ({
                        id: r.id,
                        name: r.name,
                        probability: r.defaultWeight ?? 0,
                        color: r.color
                    }))
                },
                assetRarityMappings: updatedItems
                    .filter(it => !!it.linkedAssetId)
                    .map(it => ({
                        assetId: it.linkedAssetId!,
                        gachaRarityId: it.rarityId || null
                    }))
            };

            const res = await saveExternalGachaConfig(pool.linkedCampaignId, payload, integrationConfig);
            if (res.ok) {
                showToast("確率設定をだんごシェアリンクに保存・同期しました", "success");
            }
        } catch (e) {
            const err = e as Error;
            console.error("Failed to sync gacha config to Share Link:", err);
            showToast(err.message || "だんごシェアリンクとの同期に失敗しました", "error");
        }
    }, [pool.linkedCampaignId, integrationConfig, showToast]);
    const [pullCountInput, setPullCountInput] = useState<string | null>(null);
    const [pityThresholdInput, setPityThresholdInput] = useState<string | null>(null);
    const [rarityProbInputs, setRarityProbInputs] = useState<Record<string, string>>({});
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [bulkProbInput, setBulkProbInput] = useState("");
    type ItemSortMode = "custom" | "rarity-asc" | "rarity-desc" | "weight-asc" | "weight-desc" | "name-asc" | "name-desc";
    const [itemSortMode, setItemSortMode] = useState<ItemSortMode>("custom");
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [draggingSelectionIds, setDraggingSelectionIds] = useState<Set<string> | null>(null);
    const [mounted, setMounted] = useState(false);
    /** レア度ロック状態（設定作業用の一時UI状態。永続化しない） */
    const [lockedRarityIds, setLockedRarityIds] = useState<Set<string>>(new Set());
    /** アイテムロック状態（設定作業用の一時UI状態。永続化しない） */
    const [lockedItemIds, setLockedItemIds] = useState<Set<string>>(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    /** 収益シミュレーションモード（原価・利益表示のオンオフ状態） */
    const [showCostSimulator, setShowCostSimulator] = useState(false);

    const toggleRarityLock = useCallback((id: string) => {
        setLockedRarityIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleItemLock = useCallback((id: string) => {
        setLockedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleToggleCostSimulator = useCallback(() => {
        setShowCostSimulator(prev => {
            const next = !prev;
            if (typeof window !== "undefined") {
                localStorage.setItem("gacha_show_cost_simulator", String(next));
            }
            return next;
        });
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            setMounted(true);
            if (typeof window !== "undefined") {
                const val = localStorage.getItem("gacha_show_cost_simulator");
                if (val === "true") {
                    setShowCostSimulator(true);
                }
            }
        }, 0);
        return () => clearTimeout(id);
    }, []);

    // だんごシェアリンク deep link: 同期完了後に親から openBulkModal が立つ
    useEffect(() => {
        if (!openBulkModal) return;
        const id = setTimeout(() => {
            setShowBulkModal(true);
            onBulkModalOpened?.();
        }, 0);
        return () => clearTimeout(id);
    }, [openBulkModal, onBulkModalOpened]);


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

    const handleItemDragEnd = (event: DragEndEvent) => {
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

    const handleRarityDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const sortedRarities = [...pool.rarities].sort((a, b) => a.sortOrder - b.sortOrder);
        const oldIndex = sortedRarities.findIndex(r => r.id === activeId);
        const newIndex = sortedRarities.findIndex(r => r.id === overId);

        if (oldIndex >= 0 && newIndex >= 0) {
            const moved = arrayMove(sortedRarities, oldIndex, newIndex);
            // sortOrder を振り直す
            const updated = moved.map((r, i) => ({ ...r, sortOrder: i + 1 }));
            onPoolChange({ ...pool, rarities: updated });
        }
    };

    // -- レア度操作 --
    /**
     * レア度確率を正規化する（比例配分方式）。
     * lockedRarityIds を考慮し、ロック済みのレア度を保護しながら合計が100%になるよう調整する。
     */
    const normalizeRarityTiers = (rarities: RarityTier[], targetId?: string, targetP?: number): RarityTier[] => {
        if (rarities.length === 0) return rarities;

        // distributePercentagesProportionally が扱う RatioItem 形式に変換
        const ratioItems = rarities.map(r => ({ id: r.id, value: r.defaultWeight ?? 0 }));
        const distributed = distributePercentagesProportionally(ratioItems, lockedRarityIds, targetId, targetP);
        const valueMap = new Map(distributed.map(it => [it.id, it.value]));

        return rarities.map(r => ({ ...r, defaultWeight: valueMap.get(r.id) ?? (r.defaultWeight ?? 0) }));
    };

    const updateRarity = (id: string, updates: Partial<RarityTier>) => {
        if (updates.defaultWeight !== undefined) {
            const temp = pool.rarities.map(r => r.id === id ? { ...r, ...updates } : r);
            const nextRarities = normalizeRarityTiers(temp, id, updates.defaultWeight);
            
            const updatedRarity = nextRarities.find(r => r.id === id);
            if (updatedRarity && updatedRarity.defaultWeight !== undefined) {
                const diff = updates.defaultWeight - updatedRarity.defaultWeight;
                if (Math.abs(diff) > 1e-7) {
                    showToast(
                        `他のレア度がロックされているため、${updatedRarity.name}の確率は上限の${formatProb(updatedRarity.defaultWeight)}%に制限されました`,
                        "info"
                    );
                }
            }
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

    /**
     * 特定レア度内のアイテム重みを正規化する（比例配分方式）。
     * lockedItemIds を考慮し、ロック済みのアイテムを保護しながら合計が100%になるよう調整する。
     */
    const normalizeRarityWeights = (items: GachaItem[], rarityId: string, targetId?: string, targetP?: number): GachaItem[] => {
        const rarityItems = items.filter(it => it.rarityId === rarityId);
        if (rarityItems.length === 0) return items;

        // distributePercentagesProportionally が扱う RatioItem 形式に変換
        const ratioItems = rarityItems.map(it => ({ id: it.id, value: it.weight }));
        // このレア度内のロック済みアイテムのみに絞り込む
        const rarityLockedIds = new Set([...lockedItemIds].filter(id => rarityItems.some(it => it.id === id)));
        const distributed = distributePercentagesProportionally(ratioItems, rarityLockedIds, targetId, targetP);
        const valueMap = new Map(distributed.map(it => [it.id, it.value]));

        return items.map(it => {
            if (it.rarityId !== rarityId) return it;
            return { ...it, weight: valueMap.get(it.id) ?? it.weight };
        });
    };

    const applyProbabilityEdit = (itemIndex: number, newWeight: number) => {
        if (itemIndex < 0 || itemIndex >= pool.items.length) return;
        const targetItem = pool.items[itemIndex];
        if (!targetItem) return;
        const nextItems = normalizeRarityWeights(pool.items, targetItem.rarityId, targetItem.id, newWeight);
        
        const updatedItem = nextItems.find(it => it.id === targetItem.id);
        if (updatedItem) {
            const diff = newWeight - updatedItem.weight;
            if (Math.abs(diff) > 1e-7) {
                showToast(
                    `他の品目がロックされているため、${targetItem.name || "（名称未設定）"}の確率は上限の${formatProb(updatedItem.weight)}%に制限されました`,
                    "info"
                );
            }
        }
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
        
        const updatedItem = nextItems.find(it => it.id === newItem.id);
        if (updatedItem) {
            const diff = w - updatedItem.weight;
            if (Math.abs(diff) > 1e-7) {
                showToast(
                    `他の品目がロックされているため、${newItem.name}の確率は上限の${formatProb(updatedItem.weight)}%に制限されました`,
                    "info"
                );
            }
        }
        
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
        const targetItem = pool.items.find(i => i.id === id);
        let nextItems = pool.items.map(item => item.id === id ? { ...item, ...updates } : item);
        
        // レア度が変更された場合、移動元と移動先の両方のレア度をノーマライズする
        if (updates.rarityId && targetItem && updates.rarityId !== targetItem.rarityId) {
            nextItems = normalizeRarityWeights(nextItems, targetItem.rarityId); // 元のレア度
            nextItems = normalizeRarityWeights(nextItems, updates.rarityId);    // 新しいレア度
        }

        onPoolChange({
            ...pool,
            items: nextItems,
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

            {/* ガチャ1回の販売単価 */}
            {showCostSimulator && (
                <div className="rounded-2xl p-4" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Coins size={14} className={textLight ? "text-amber-600 animate-pulse" : "text-amber-400 animate-pulse"} />
                        <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider block`}>
                            ガチャ1回の販売単価
                        </label>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={pool.pullPrice ?? 300}
                            onChange={e => {
                                const n = parseInt(e.target.value, 10);
                                onPoolChange({ ...pool, pullPrice: Number.isNaN(n) || n < 0 ? 0 : n });
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm ${textPrimary} ${placeholderCls} outline-none transition-all focus:ring-2 focus:ring-purple-500/30 pr-8`}
                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: textMuted }}>円</span>
                    </div>
                </div>
            )}

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
                                {/* カラムヘッダー（レア度） */}
                                {mounted && pool.rarities.length > 0 && (
                                    <div className={`flex items-center gap-2 px-2 pb-1 text-[10px] font-medium ${textSecondary} select-none`}>
                                        <div className="w-6 text-center shrink-0">色</div>
                                        <div className="flex-1 px-1">レア度名</div>
                                        <div className="w-8 text-center shrink-0" title="優先順（小さい数字ほど高く表示されます）">優先順</div>
                                        <div className="w-6 text-center shrink-0" title="ロック中は他のレア度の確率を変更しても自動調整されません">🔒</div>
                                        <div className="w-16 text-center shrink-0" title="出現確率（全体での割合）">出現確率</div>
                                        {pool.rarities.length > 1 && <div className="w-6 text-center shrink-0">削除</div>}
                                    </div>
                                )}
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleRarityDragEnd}
                                >
                                    <SortableContext
                                        items={(mounted ? pool.rarities : []).sort((a, b) => a.sortOrder - b.sortOrder).map(r => r.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="flex flex-col gap-2">
                                            {(mounted ? pool.rarities : [])
                                                .slice()
                                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                                .map(rarity => (
                                                    <SortableRarityItem
                                                        key={rarity.id}
                                                        rarity={rarity}
                                                        isLightMode={isLightMode}
                                                        textPrimary={textPrimary}
                                                        textMuted={textMuted}
                                                        inputBg={inputBg}
                                                        inputBorder={inputBorder}
                                                        placeholderCls={placeholderCls}
                                                        rarityProbInputs={rarityProbInputs}
                                                        updateRarity={updateRarity}
                                                        setRarityProbInputs={setRarityProbInputs}
                                                        onRequestDeleteRarity={async (id) => {
                                                            if (await confirm({ title: "レア度削除", message: "このレア度を削除しますか？紐付いているアイテムも削除されます。", danger: true })) {
                                                                removeRarity(id);
                                                            }
                                                        }}
                                                        isRemovable={pool.rarities.length > 1}
                                                        formatProb={formatProb}
                                                        isLocked={lockedRarityIds.has(rarity.id)}
                                                        onToggleLock={toggleRarityLock}
                                                    />
                                                ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <button
                                    onClick={addRarity}
                                    className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all border ${textLight ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200" : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/30"}`}
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
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <SectionHeader id="items" icon={Sparkles} title="排出品目" badge={mounted ? `${pool.items.length}` : "0"} expandedSection={expandedSection} onToggle={toggleSection} textLight={textLight} textPrimary={textPrimary} />
                    </div>
                    {/* 一括グリッド設定ボタン */}
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setShowBulkModal(true); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 mr-3 rounded-lg text-xs font-semibold transition-all ${
                            textLight
                                ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                                : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30"
                        }`}
                        title="一括グリッド設定モーダルを開く"
                    >
                        <LayoutGrid size={12} />
                        一括設定
                    </button>
                </div>
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

                                {/* 並べ替え & シミュレーション切り替え */}
                                {mounted && pool.items.length > 0 && (
                                    <div className="flex items-center justify-between gap-2 mb-2 w-full">
                                        <div className="flex items-center gap-2">
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
                                        <button
                                            type="button"
                                            onClick={handleToggleCostSimulator}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                                showCostSimulator
                                                    ? textLight
                                                        ? "bg-amber-100 text-amber-800 border-amber-300 shadow-sm shadow-amber-200/50"
                                                        : "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                                                    : textLight
                                                        ? "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
                                                        : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
                                            }`}
                                            title="原価と期待値ベースの収益シミュレーションモードを切り替えます"
                                        >
                                            <Coins size={11} className={showCostSimulator ? "animate-pulse text-amber-500" : ""} />
                                            収益シミュレーション
                                            {showCostSimulator && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 品目リスト（編集可能）。ハイドレーション一致のため mounted まで空で描画 */}
                                <div className="flex flex-col gap-1.5 mb-3 max-h-64 overflow-y-auto scroll-touch pr-1">
                                    {/* カラムヘッダー（アイテム） */}
                                    {mounted && pool.items.length > 0 && (
                                        <div className={`flex items-center gap-1.5 px-2 pb-1 text-[10px] font-medium ${textSecondary} select-none`}>
                                            <div className="w-5 text-center shrink-0" title="ドラッグ＆ドロップで並び替え">⇅</div>
                                            <div className="w-2.5 text-center shrink-0" title="一括操作用のチェックボックス">✓</div>
                                            <div className="w-16 text-center shrink-0 opacity-80">レア度</div>
                                            <div className="flex-1 px-1.5 opacity-80">アイテム名</div>
                                            <div className="w-6 text-center shrink-0 opacity-80" title="🔒ロック中はこの項目の確率が自動調整から除外されます">🔒</div>
                                            <div className="w-[124px] text-center shrink-0 opacity-80">レア度内(%) / 全体(%)</div>
                                            <div className="w-[36px] text-center shrink-0 hidden sm:block opacity-80">操作</div>
                                        </div>
                                    )}
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleItemDragEnd}
                                        onDragCancel={handleDragCancel}
                                    >
                                        <SortableContext items={(mounted ? pool.items : []).map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            {(mounted ? pool.items : []).map((item, index) => {
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
                                                        onRequestRemoveItem={async (id) => {
                                                            if (await confirm({ title: "アイテム削除", message: "このアイテムを削除しますか？", danger: true })) {
                                                                removeItem(id);
                                                            }
                                                        }}
                                                        globalProb={gPt}
                                                        isSelected={selectedItemIds.has(item.id)}
                                                        onToggleSelect={toggleItemSelected}
                                                        draggingSelectionIds={draggingSelectionIds}
                                                        activeDragId={activeDragId}
                                                        isLocked={lockedItemIds.has(item.id)}
                                                        onToggleLock={toggleItemLock}
                                                        showCostSimulator={showCostSimulator}
                                                        showDistributionStatus={distributionIntegrationActive}
                                                        onOpenDistribution={
                                                            onNavigateToDistribution
                                                                ? () => onNavigateToDistribution(item.id)
                                                                : undefined
                                                        }
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
                        <div className="flex items-center gap-1"><EmojiGlyph emoji="📦" size={12} /> 品目: {pool.items.length}種類</div>
                        <div className="flex items-center gap-1"><EmojiGlyph emoji="🎲" size={12} /> 1回: {pool.pullCount}連</div>
                        {pool.pityEnabled && (
                            <div className="flex items-center gap-1"><EmojiGlyph emoji="🛡️" size={12} /> 天井: {pool.pityThreshold}回で {pool.rarities.find(r => r.id === pool.pityGuaranteedRarityId)?.name || "?"} 確定</div>
                        )}
                    </div>
                </div>
            )}

            {/* 一括グリッド設定モーダル */}
            <GachaBulkSetupModal
                open={showBulkModal}
                pool={pool}
                isLightMode={isLightMode}
                showCostSimulator={showCostSimulator}
                onToggleCostSimulator={handleToggleCostSimulator}
                onClose={() => setShowBulkModal(false)}
                onApply={(updatedItems, updatedRarities, updatedPullPrice) => {
                    onPoolChange({ ...pool, items: updatedItems, rarities: updatedRarities, pullPrice: updatedPullPrice });
                    // アイテムが変わったのでロック状態をリセット
                    setLockedItemIds(new Set());
                    // Sync to external campaign
                    void syncGachaConfigToExternal(updatedItems, updatedRarities);
                }}
            />
        </div>
    );
}

/** 確率の表示用フォーマット */
function formatProb(prob: number): string {
    if (prob === 0) return "0";
    let s: string;
    if (prob >= 0.01) s = prob.toFixed(2);
    else if (prob >= 0.0001) s = prob.toFixed(4);
    else if (prob >= 1e-8) s = prob.toFixed(8);
    else s = prob.toExponential(2);
    
    return s.replace(/\.?0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

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
    onProbabilityBlur: (index: number, newWeight: number) => void;
    onRequestRemoveItem: (id: string) => void;
    globalProb: number;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    draggingSelectionIds: Set<string> | null;
    activeDragId: string | null;
    /** このアイテムの確率がロックされているか */
    isLocked: boolean;
    /** ロック状態をトグルするコールバック */
    onToggleLock: (id: string) => void;
    showCostSimulator?: boolean;
    showDistributionStatus?: boolean;
    onOpenDistribution?: () => void;
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
    globalProb,
    isSelected,
    onToggleSelect,
    draggingSelectionIds,
    activeDragId,
    isLocked,
    onToggleLock,
    showCostSimulator,
    showDistributionStatus,
    onOpenDistribution,
}: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const isEditing = editingItemId === item.id;
    const rarity = pool.rarities.find(r => r.id === item.rarityId);
    const [probInput, setProbInput] = useState<string | null>(null);
    const probDisplay = probInput !== null ? probInput : formatProb(item.weight);

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

            {/* 原価設定 */}
            {showCostSimulator && (
                <div className="flex items-center gap-1 shrink-0 px-1 py-0.5 rounded bg-black/5" style={{ border: `1px solid ${inputBorder}` }}>
                    <span className={`text-[9px] ${textMuted}`}>原価:</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={item.costPrice ?? 0}
                        onChange={e => {
                            const n = parseInt(e.target.value, 10);
                            updateItem(item.id, { costPrice: Number.isNaN(n) || n < 0 ? 0 : n });
                        }}
                        className={`w-12 px-1 py-0.5 rounded text-right text-[10px] tabular-nums font-semibold outline-none focus:ring-1 focus:ring-purple-400 ${textPrimary}`}
                        style={{ background: inputBg, border: "none" }}
                    />
                    <span className={`text-[9px] ${textMuted}`}>円</span>
                </div>
            )}

            {showDistributionStatus && onOpenDistribution && (
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onOpenDistribution();
                    }}
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                        item.linkedAssetId
                            ? isLightMode
                                ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                : "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                            : isLightMode
                              ? "border-amber-300 text-amber-700 bg-amber-50"
                              : "border-amber-500/40 text-amber-200 bg-amber-500/10"
                    }`}
                    title={item.linkedAssetId ? "配布ファイル済み — 配布タブで確認" : "配布ファイル未設定 — 配布タブで紐づけ"}
                >
                    {item.linkedAssetId ? "配布済" : "未配布"}
                </button>
            )}

            {/* 🔒ロックボタン */}
            <button
                type="button"
                onClick={e => { e.stopPropagation(); onToggleLock(item.id); }}
                className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-all ${
                    isLocked
                        ? isLightMode
                            ? "text-amber-600 bg-amber-100 hover:bg-amber-200"
                            : "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30"
                        : isLightMode
                            ? "text-gray-400 hover:text-amber-600 hover:bg-amber-100"
                            : "text-white/30 hover:text-amber-400 hover:bg-amber-500/20"
                }`}
                title={isLocked ? "ロック中（クリックして解除）：確率の自動調整から除外されています" : "クリックしてロック：他の確率変更時に自動調整から除外します"}
                aria-label={isLocked ? "確率ロックを解除" : "確率をロック"}
                aria-pressed={isLocked}
            >
                {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
            </button>

            {/* パーセント入力 + レア度内確率・全体確率表示 */}
            <span
                className={`flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[10px] transition-all ${
                    isLocked
                        ? isLightMode
                            ? "bg-amber-50 ring-1 ring-amber-300"
                            : "bg-amber-500/10 ring-1 ring-amber-500/40"
                        : "bg-black/5"
                }`}
            >
                <span className="flex items-center" title={isLocked ? "🔒 ロック中：他の確率変更時に自動調整されません" : "【レア度内の確率】変更すると他のアイテムが自動で調整されます"}>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={probDisplay}
                        onFocus={() => setProbInput(formatProb(item.weight))}
                        onChange={e => setProbInput(e.target.value)}
                        onBlur={() => {
                            const s = probInput !== null ? probInput.trim() : String(item.weight);
                            const n = parseFloat(s);
                            if (!Number.isNaN(n) && n >= 0) onProbabilityBlur(itemIndex, n);
                            setProbInput(null);
                        }}
                        className={`w-14 px-1 py-0.5 rounded text-right tabular-nums outline-none cursor-text font-semibold focus:ring-1 focus:ring-purple-400 ${
                            isLocked
                                ? isLightMode ? "text-amber-700" : "text-amber-300"
                                : textPrimary
                        }`}
                        style={{ background: inputBg, border: `1px solid ${isLocked ? (isLightMode ? "rgba(217,119,6,0.4)" : "rgba(251,191,36,0.3)") : inputBorder}` }}
                    />
                    <span className={`ml-0.5 ${textMuted}`}>%</span>
                </span>
                <span className={`w-16 text-right tabular-nums ${textMuted} border-l pl-2`} title="全体の確率（読み取り専用）" style={{ borderColor: inputBorder}}>
                    {formatProb(globalProb)}%
                </span>
            </span>


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

interface SortableRarityItemProps {
    rarity: RarityTier;
    isLightMode: boolean;
    textPrimary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    placeholderCls: string;
    rarityProbInputs: Record<string, string>;
    updateRarity: (id: string, updates: Partial<RarityTier>) => void;
    setRarityProbInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onRequestDeleteRarity: (id: string) => void;
    isRemovable: boolean;
    formatProb: (prob: number) => string;
    /** このレア度の確率がロックされているか */
    isLocked: boolean;
    /** ロック状態をトグルするコールバック */
    onToggleLock: (id: string) => void;
}

function SortableRarityItem({
    rarity,
    isLightMode,
    textPrimary,
    textMuted,
    inputBg,
    inputBorder,
    placeholderCls,
    rarityProbInputs,
    updateRarity,
    setRarityProbInputs,
    onRequestDeleteRarity,
    isRemovable,
    formatProb,
    isLocked,
    onToggleLock,
}: SortableRarityItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rarity.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center gap-2 p-2 rounded-lg min-h-11 flex-shrink-0 transition-shadow ${isDragging ? "shadow-2xl scale-[1.02] bg-purple-500/10 ring-2 ring-purple-500/50" : ""}`}
            style={{ ...style, background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:text-purple-400 text-gray-500/50 touch-none w-5 h-5 flex items-center justify-center shrink-0">
                <GripVertical size={14} />
            </div>
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
                className={`flex-1 px-2 py-1 rounded text-xs font-bold ${textPrimary} outline-none min-w-0`}
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
            />
            <span className={`text-[10px] w-8 text-center shrink-0 ${textMuted}`}>#{rarity.sortOrder}</span>
            {/* 🔒ロックボタン（レア度確率） */}
            <button
                type="button"
                onClick={e => { e.stopPropagation(); onToggleLock(rarity.id); }}
                className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-all ${
                    isLocked
                        ? isLightMode
                            ? "text-amber-600 bg-amber-100 hover:bg-amber-200"
                            : "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30"
                        : isLightMode
                            ? "text-gray-400 hover:text-amber-600 hover:bg-amber-100"
                            : "text-white/30 hover:text-amber-400 hover:bg-amber-500/20"
                }`}
                title={isLocked ? "ロック中（クリックして解除）：この確率は自動調整から除外されています" : "クリックしてロック：他のレア度の確率変更時に自動調整から除外します"}
                aria-label={isLocked ? "レア度確率ロックを解除" : "レア度確率をロック"}
                aria-pressed={isLocked}
            >
                {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
            </button>
            <span
                className={`flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded transition-all ${
                    isLocked
                        ? isLightMode
                            ? "bg-amber-50 ring-1 ring-amber-300"
                            : "bg-amber-500/10 ring-1 ring-amber-500/40"
                        : "bg-black/5"
                }`}
            >
                <input
                    type="text"
                    inputMode="decimal"
                    value={rarityProbInputs[rarity.id] !== undefined ? rarityProbInputs[rarity.id] : (rarity.defaultWeight != null ? formatProb(rarity.defaultWeight) : "")}
                    onFocus={() => {
                        setRarityProbInputs(prev => ({ ...prev, [rarity.id]: String(rarity.defaultWeight ?? 0) }));
                    }}
                    onChange={e => {
                        setRarityProbInputs(prev => ({ ...prev, [rarity.id]: e.target.value }));
                    }}
                    onBlur={() => {
                        const val = rarityProbInputs[rarity.id];
                        if (val !== undefined) {
                            const n = parseFloat(val);
                            if (val === "") {
                                updateRarity(rarity.id, { defaultWeight: 0 });
                            } else if (!Number.isNaN(n) && n >= 0) {
                                updateRarity(rarity.id, { defaultWeight: n });
                            }
                            setRarityProbInputs(prev => {
                                const next = { ...prev };
                                delete next[rarity.id];
                                return next;
                            });
                        }
                    }}
                    placeholder="0"
                    className={`w-12 text-[10px] px-1 py-0.5 rounded text-right tabular-nums ${placeholderCls} outline-none cursor-text focus:ring-1 focus:ring-purple-400 ${
                        isLocked
                            ? isLightMode ? "text-amber-700" : "text-amber-300"
                            : textPrimary
                    }`}
                    style={{ background: inputBg, border: `1px solid ${isLocked ? (isLightMode ? "rgba(217,119,6,0.4)" : "rgba(251,191,36,0.3)") : inputBorder}` }}
                    title={isLocked ? "🔒 ロック中：他の確率変更時に自動調整されません" : "レア度の出現確率。変更すると他のレア度が自動調整されます"}
                />
                <span className={`text-[10px] ${textMuted}`} title="出現確率(%)">%</span>
            </span>
            {isRemovable && (
                <button
                    onClick={() => onRequestDeleteRarity(rarity.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
                    aria-label="このレア度を削除"
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
}
