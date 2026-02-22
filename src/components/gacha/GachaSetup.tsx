"use client";

import { useState } from "react";
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
    } from "lucide-react";
import type { GachaPool, GachaItem, RarityTier } from "@/lib/gacha";
import { generateId, calculateProbabilities, getRarityProbabilities } from "@/lib/gacha";
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
import ConfirmDialog from "@/components/ConfirmDialog";

interface GachaSetupProps {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    isLightMode: boolean;
}

export default function GachaSetup({ pool, onPoolChange, isLightMode }: GachaSetupProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>("items");
    const [newItemName, setNewItemName] = useState("");
    const [newItemRarityId, setNewItemRarityId] = useState(pool.rarities[0]?.id || "");
    const [newItemWeight, setNewItemWeight] = useState("1");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [pendingDelete, setPendingDelete] = useState<{ type: "rarity"; id: string } | { type: "item"; id: string } | null>(null);

    const glassBg = isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-800" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-700" : "text-white/65";
    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const selectOptionStyle = isLightMode
        ? { background: "#fff", color: "#1f2937" }
        : { background: "#1e1b4b", color: "#e2e8f0" };

    const probabilities = calculateProbabilities(pool.items);
    const rarityProbs = getRarityProbabilities(pool.items, pool.rarities);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = pool.items.findIndex(i => i.id === active.id);
            const newIndex = pool.items.findIndex(i => i.id === over.id);
            onPoolChange({
                ...pool,
                items: arrayMove(pool.items, oldIndex, newIndex),
            });
        }
    };

    // -- レア度操作 --
    const updateRarity = (id: string, updates: Partial<RarityTier>) => {
        onPoolChange({
            ...pool,
            rarities: pool.rarities.map(r => r.id === id ? { ...r, ...updates } : r),
        });
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
        };
        onPoolChange({ ...pool, rarities: [...pool.rarities, newRarity] });
    };

    const removeRarity = (id: string) => {
        if (pool.rarities.length <= 1) return;
        onPoolChange({
            ...pool,
            rarities: pool.rarities.filter(r => r.id !== id),
            items: pool.items.filter(item => item.rarityId !== id),
        });
    };

    // -- 品目操作 --
    const addItem = () => {
        if (!newItemName.trim() || !newItemRarityId) return;
        const newItem: GachaItem = {
            id: generateId(),
            name: newItemName.trim(),
            rarityId: newItemRarityId,
            weight: Math.max(0.000001, parseFloat(newItemWeight) || 1),
        };
        onPoolChange({ ...pool, items: [...pool.items, newItem] });
        setNewItemName("");
        setNewItemWeight("1");
    };

    const removeItem = (id: string) => {
        onPoolChange({ ...pool, items: pool.items.filter(item => item.id !== id) });
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

    const SectionHeader = ({ id, icon: Icon, title, badge }: { id: string; icon: React.ElementType; title: string; badge?: string }) => (
        <button
            onClick={() => toggleSection(id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${textPrimary}`}
            style={{
                background: expandedSection === id ? (isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)") : "transparent",
            }}
        >
            <div className="flex items-center gap-2">
                <Icon size={16} className={isLightMode ? "text-purple-600" : "text-purple-400"} />
                <span className="text-sm font-semibold">{title}</span>
                {badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-300"}`}>
                        {badge}
                    </span>
                )}
            </div>
            {expandedSection === id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
    );

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
                    className={`w-full px-3 py-2 rounded-lg text-sm ${textPrimary} outline-none transition-all focus:ring-2 focus:ring-purple-500/30`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                />
            </div>

            {/* 排出枚数 */}
            <div className="rounded-2xl p-4" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2 block`}>
                    1回の排出枚数
                </label>
                <input
                    type="number"
                    min={1}
                    max={10000}
                    value={pool.pullCount}
                    onChange={e => onPoolChange({ ...pool, pullCount: Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)) })}
                    className={`w-full px-3 py-2 rounded-lg text-sm ${textPrimary} outline-none transition-all focus:ring-2 focus:ring-purple-500/30`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                />
                <p className={`text-[10px] mt-1 ${textMuted}`}>最大10,000枚</p>
            </div>

            {/* レア度設定 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <SectionHeader id="rarities" icon={Palette} title="レア度設定" badge={`${pool.rarities.length}`} />
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
                                {pool.rarities
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map(rarity => (
                                        <div
                                            key={rarity.id}
                                            className="flex items-center gap-2 p-2 rounded-lg min-h-11 flex-shrink-0"
                                            style={{ background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
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
                                            {pool.rarities.length > 1 && (
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
                                    className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${isLightMode ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"}`}
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
                <SectionHeader id="items" icon={Sparkles} title="排出品目" badge={`${pool.items.length}`} />
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
                                {pool.items.length > 0 && (
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
                                                        {r.name}: {prob < 0.01 ? prob.toFixed(4) : prob.toFixed(2)}%
                                                    </span>
                                                );
                                            })}
                                    </div>
                                )}

                                {/* 品目リスト（編集可能） */}
                                <div className="flex flex-col gap-1.5 mb-3 max-h-64 overflow-y-auto pr-1">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={pool.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            {pool.items.map(item => {
                                                const pt = probabilities.get(item.id) || 0;
                                                return (
                                                    <SortableItem
                                                        key={item.id}
                                                        item={item}
                                                        pool={pool}
                                                        isLightMode={isLightMode}
                                                        editingItemId={editingItemId}
                                                        editName={editName}
                                                        setEditName={setEditName}
                                                        startEditing={startEditing}
                                                        finishEditing={finishEditing}
                                                        updateItem={updateItem}
                                                        onRequestRemoveItem={(id) => setPendingDelete({ type: "item", id })}
                                                        prob={pt}
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
                                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none`}
                                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                            onKeyDown={e => e.key === "Enter" && addItem()}
                                        />
                                        <select
                                            value={newItemRarityId}
                                            onChange={e => setNewItemRarityId(e.target.value)}
                                            className={`px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none cursor-pointer`}
                                            style={{
                                                background: inputBg,
                                                border: `1px solid ${inputBorder}`,
                                                color: pool.rarities.find(r => r.id === newItemRarityId)?.color || (isLightMode ? "#1f2937" : "#e2e8f0"),
                                            }}
                                        >
                                            {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                                                <option key={r.id} value={r.id} style={selectOptionStyle}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min={0.000001}
                                            step="any"
                                            value={newItemWeight}
                                            onChange={e => setNewItemWeight(e.target.value)}
                                            placeholder="重み"
                                            className={`w-24 px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none`}
                                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                        />
                                        <button
                                            onClick={addItem}
                                            disabled={!newItemName.trim()}
                                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 ${isLightMode ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"}`}
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
                <SectionHeader id="pity" icon={Shield} title="天井設定" badge={pool.pityEnabled ? "ON" : "OFF"} />
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
                                            : isLightMode ? "bg-gray-300" : "bg-white/20"
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
                                                type="number"
                                                min={1}
                                                value={pool.pityThreshold}
                                                onChange={e => onPoolChange({ ...pool, pityThreshold: Math.max(1, parseInt(e.target.value) || 1) })}
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
                                                    color: pool.rarities.find(r => r.id === pool.pityGuaranteedRarityId)?.color || (isLightMode ? "#1f2937" : "#e2e8f0"),
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

            {/* 設定サマリ */}
            {pool.items.length > 0 && (
                <div className={`rounded-2xl p-4 ${textSecondary}`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Settings size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">設定サマリ</span>
                    </div>
                    <div className="text-[11px] space-y-1">
                        <p>📦 品目: {pool.items.length}種類</p>
                        <p>🎲 1回: {pool.pullCount}連</p>
                        {pool.pityEnabled && (
                            <p>🛡️ 天井: {pool.pityThreshold}回で {pool.rarities.find(r => r.id === pool.pityGuaranteedRarityId)?.name || "?"} 確定</p>
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

// DnD用の子コンポーネント
interface SortableItemProps {
    item: GachaItem;
    pool: GachaPool;
    isLightMode: boolean;
    editingItemId: string | null;
    editName: string;
    setEditName: (name: string) => void;
    startEditing: (item: GachaItem) => void;
    finishEditing: () => void;
    updateItem: (id: string, updates: Partial<GachaItem>) => void;
    onRequestRemoveItem: (id: string) => void;
    prob: number;
}

const MIN_WEIGHT = 0.000001;

function SortableItem({
    item,
    pool,
    isLightMode,
    editingItemId,
    editName,
    setEditName,
    startEditing,
    finishEditing,
    updateItem,
    onRequestRemoveItem,
    prob
}: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const isEditing = editingItemId === item.id;
    const rarity = pool.rarities.find(r => r.id === item.rarityId);
    // 重み入力中は文字列で保持し、blurで確定。入力のたびにparseFloatすると「0.」などが消えてバグるため
    const [weightInput, setWeightInput] = useState<string | null>(null);
    const weightDisplay = weightInput !== null ? weightInput : String(item.weight);

    const sortableStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textMuted = isLightMode ? "text-gray-700" : "text-white/65";
    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const selectOptionStyle = isLightMode ? { background: "#fff", color: "#1f2937" } : { background: "#1e1b4b", color: "#e2e8f0" };

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center gap-1.5 p-2 rounded-lg group ${isDragging ? "shadow-lg scale-[1.02]" : ""}`}
            style={{ ...sortableStyle, background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
        >
            {/* ドラッグハンドル */}
            <div {...attributes} {...listeners} className="cursor-grab hover:text-purple-400 text-gray-500/50 touch-none w-5 h-5 flex items-center justify-center shrink-0">
                <GripVertical size={14} />
            </div>

            {/* レア度プルダウン */}
            <select
                value={item.rarityId}
                onChange={e => updateItem(item.id, { rarityId: e.target.value })}
                className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0 outline-none cursor-pointer"
                style={{
                    color: rarity?.color,
                    background: rarity?.bgColor,
                    border: `1px solid ${rarity?.glowColor || "transparent"}`,
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    paddingRight: "14px",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(rarity?.color || "#888")}' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 2px center",
                }}
            >
                {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                    <option key={r.id} value={r.id} style={selectOptionStyle}>
                        {r.name}
                    </option>
                ))}
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

            {/* ウェイト（入力中は文字列のまま表示し、blurで数値確定） */}
            <input
                type="text"
                inputMode="decimal"
                value={weightDisplay}
                onFocus={() => setWeightInput(String(item.weight))}
                onChange={e => setWeightInput(e.target.value)}
                onBlur={() => {
                    const s = weightInput !== null ? weightInput.trim() : String(item.weight);
                    const n = parseFloat(s);
                    const valid = !Number.isNaN(n) && n >= MIN_WEIGHT ? n : MIN_WEIGHT;
                    updateItem(item.id, { weight: valid });
                    setWeightInput(null);
                }}
                className={`w-14 text-[10px] px-1.5 py-0.5 rounded text-right ${textPrimary} outline-none`}
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
            />
            <span className={`text-[10px] w-12 text-right tabular-nums ${textMuted}`}>
                {prob < 0.01 ? prob.toFixed(4) : prob.toFixed(2)}%
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
                        className={`p-1 rounded transition-colors ${isLightMode ? "hover:bg-gray-200 text-gray-600" : "hover:bg-white/10 text-white/65"}`}
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
