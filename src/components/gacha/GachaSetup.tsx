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
} from "lucide-react";
import type { GachaPool, GachaItem, RarityTier } from "@/lib/gacha";
import { generateId, calculateProbabilities, getRarityProbabilities } from "@/lib/gacha";

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

    const glassBg = isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)";
    const glassBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/90";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";
    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    const probabilities = calculateProbabilities(pool.items);
    const rarityProbs = getRarityProbabilities(pool.items, pool.rarities);

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
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 pb-4">
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
                                            className="flex items-center gap-2 p-2 rounded-lg"
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
                                                className={`flex-1 px-2 py-1 rounded text-xs font-bold ${textPrimary} outline-none`}
                                                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                            />
                                            <span className={`text-[10px] w-8 text-center ${textMuted}`}>#{rarity.sortOrder}</span>
                                            {pool.rarities.length > 1 && (
                                                <button
                                                    onClick={() => removeRarity(rarity.id)}
                                                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
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
                            <div className="px-4 pb-4">
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

                                {/* 品目リスト */}
                                <div className="flex flex-col gap-1.5 mb-3 max-h-48 overflow-y-auto">
                                    {pool.items.map(item => {
                                        const rarity = pool.rarities.find(r => r.id === item.rarityId);
                                        const prob = probabilities.get(item.id) || 0;
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-2 p-2 rounded-lg group"
                                                style={{ background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
                                            >
                                                <span
                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                                    style={{ color: rarity?.color, background: rarity?.bgColor }}
                                                >
                                                    {rarity?.name || "?"}
                                                </span>
                                                <span className={`text-xs flex-1 truncate ${textPrimary}`}>{item.name}</span>
                                                <input
                                                    type="number"
                                                    min={0.000001}
                                                    step="any"
                                                    value={item.weight}
                                                    onChange={e => updateItem(item.id, { weight: Math.max(0.000001, parseFloat(e.target.value) || 0.000001) })}
                                                    className={`w-16 text-[10px] px-1.5 py-0.5 rounded text-right ${textPrimary} outline-none`}
                                                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                                />
                                                <span className={`text-[10px] w-14 text-right tabular-nums ${textMuted}`}>
                                                    {prob < 0.01 ? prob.toFixed(4) : prob.toFixed(2)}%
                                                </span>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}
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
                                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                        >
                                            {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
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
                                                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                            >
                                                {pool.rarities.sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
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
        </div>
    );
}
