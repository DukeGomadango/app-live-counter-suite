"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, History } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { RoulettePredictor, RouletteHitHistoryEntry, HighLowZone } from "@/lib/roulette";
import { HIGH_LOW_PREDICTIONS } from "@/lib/roulette";

const HIGH_LOW_LABELS: Record<HighLowZone, string> = { low: "ロー", "6pin": "中心", high: "ハイ" };

interface RoulettePredictorsPanelProps {
    predictors: RoulettePredictor[];
    onChange: (predictors: RoulettePredictor[]) => void;
    slots: string[];
    resultLabel: string | null;
    /** ハイアンドローモード時の結果ゾーン（当たり表示用） */
    resultZone?: HighLowZone | null;
    /** 予想入力モード（highLow のときハイ/ロー/中心のみ選択） */
    predictorMode?: "default" | "highLow";
    isLightMode: boolean;
    hitHistory?: RouletteHitHistoryEntry[];
    onViewPredictorHistory?: (predictorId: string) => void;
    /** あたり履歴をリセットする確認を要求する（親で確認ダイアログ表示） */
    onRequestClearHitHistory?: () => void;
}

function generateId() {
    return crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function RoulettePredictorsPanel({
    predictors,
    onChange,
    slots,
    resultLabel,
    resultZone = null,
    predictorMode = "default",
    isLightMode,
    hitHistory = [],
    onViewPredictorHistory,
    onRequestClearHitHistory,
}: RoulettePredictorsPanelProps) {
    const isHighLowMode = predictorMode === "highLow" && slots.length >= 2;
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const ref = useRef<HTMLDivElement>(null);
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/60";
    const dropdownBg = isLightMode ? "rgba(255,255,255,0.98)" : "rgba(20,12,45,0.98)";

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpenDropdownId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateOne = (id: string, patch: Partial<RoulettePredictor>) => {
        onChange(
            predictors.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
    };

    const add = () => {
        onChange([...predictors, { id: generateId(), name: `プレイヤー${predictors.length + 1}`, prediction: "" }]);
    };

    const remove = (id: string) => {
        if (predictors.length <= 1) return;
        onChange(predictors.filter((p) => p.id !== id));
        setOpenDropdownId(null);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(predictors.map((p) => p.id)));
    const clearSelection = () => setSelectedIds(new Set());
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const removeSelected = () => {
        if (selectedIds.size === 0 || predictors.length <= 1) return;
        const next = predictors.filter((p) => !selectedIds.has(p.id));
        if (next.length === 0) return;
        onChange(next);
        setSelectedIds(new Set());
        setOpenDropdownId(null);
    };

    return (
        <div
            ref={ref}
            className="rounded-2xl border flex flex-col overflow-hidden min-h-0 flex-1 w-full min-w-0"
            style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(16px)" }}
        >
            <div className="px-3 py-2 border-b flex items-center justify-between shrink-0 flex-wrap gap-1" style={{ borderColor: glassBorder }}>
                <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>誰の予想</span>
                <div className="flex items-center gap-1">
                    {onRequestClearHitHistory && hitHistory.length > 0 && (
                        <button
                            type="button"
                            onClick={onRequestClearHitHistory}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${textSecondary} hover:underline`}
                        >
                            記録をリセット
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={add}
                    className="p-1 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
                    title="追加"
                >
                    <Plus size={16} />
                </button>
            </div>
            {predictors.length > 0 && (
                <div className="px-3 py-1.5 border-b flex items-center gap-2 shrink-0 flex-wrap" style={{ borderColor: glassBorder }}>
                    <button type="button" onClick={selectAll} className={`text-[10px] px-1.5 py-0.5 rounded ${textSecondary} hover:underline`}>全選択</button>
                    <button type="button" onClick={clearSelection} className={`text-[10px] px-1.5 py-0.5 rounded ${textSecondary} hover:underline`}>解除</button>
                    {selectedIds.size > 0 && predictors.length > 1 && (
                        <button type="button" onClick={removeSelected} className="text-[10px] px-1.5 py-0.5 rounded text-red-400/90 hover:underline">選択削除</button>
                    )}
                </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                <AnimatePresence mode="popLayout">
                    {predictors.map((p) => {
                        const isHit = isHighLowMode
                            ? resultZone != null && p.prediction === resultZone
                            : resultLabel != null && p.prediction.trim() === resultLabel;
                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`rounded-xl border p-2 space-y-1.5 ${p.participating === false ? "opacity-60" : ""}`}
                                style={{ borderColor: glassBorder }}
                            >
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(p.id)}
                                        onChange={() => toggleSelect(p.id)}
                                        className="rounded accent-purple-500 shrink-0"
                                        title="一括選択"
                                    />
                                    <label className="flex items-center gap-1 shrink-0 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={p.participating !== false}
                                            onChange={(e) => updateOne(p.id, { participating: e.target.checked })}
                                            className="rounded accent-purple-500"
                                        />
                                        <span className={`text-[10px] ${textSecondary}`}>参加</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={p.name}
                                        onChange={(e) => updateOne(p.id, { name: e.target.value })}
                                        placeholder="名前"
                                        className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white/90 border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                                    />
                                    {onViewPredictorHistory && (
                                        <button
                                            type="button"
                                            onClick={() => onViewPredictorHistory(p.id)}
                                            className={`p-1 rounded shrink-0 ${isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/70 hover:bg-white/10"}`}
                                            title="あたり履歴を見る"
                                        >
                                            <History size={14} />
                                        </button>
                                    )}
                                    {predictors.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => remove(p.id)}
                                            className="p-1 rounded text-red-400/80 hover:bg-red-500/20 shrink-0"
                                            title="削除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                {isHighLowMode ? (
                                    <div className="flex gap-1.5 flex-wrap">
                                        {HIGH_LOW_PREDICTIONS.map((zone) => (
                                            <button
                                                key={zone}
                                                type="button"
                                                onClick={() => updateOne(p.id, { prediction: p.prediction === zone ? "" : zone })}
                                                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                    p.prediction === zone
                                                        ? isLightMode ? "bg-purple-500 text-white" : "bg-purple-500/80 text-white"
                                                        : isLightMode ? "bg-white/90 border border-gray-200 text-gray-700 hover:bg-gray-100" : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20"
                                                }`}
                                            >
                                                {HIGH_LOW_LABELS[zone]}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={p.prediction}
                                                onChange={(e) => updateOne(p.id, { prediction: e.target.value })}
                                                placeholder="予想を入力または選択"
                                                className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm border ${isLightMode ? "bg-white/90 border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setOpenDropdownId(openDropdownId === p.id ? null : p.id)}
                                                className={`shrink-0 px-2 py-1.5 rounded-lg text-xs border ${isLightMode ? "bg-white/90 border-gray-200 text-gray-600" : "bg-white/10 border-white/20 text-white/80"}`}
                                                title="候補から選ぶ"
                                            >
                                                候補
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {openDropdownId === p.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -4 }}
                                                    className="rounded-lg border shadow-xl z-50 max-h-40 overflow-y-auto"
                                                    style={{ background: dropdownBg, borderColor: glassBorder }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => { updateOne(p.id, { prediction: "" }); setOpenDropdownId(null); }}
                                                        className={`w-full px-2 py-1.5 text-left text-sm ${isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                                                    >
                                                        クリア
                                                    </button>
                                                    {[...new Set(slots)].map((label) => (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            onClick={() => { updateOne(p.id, { prediction: label }); setOpenDropdownId(null); }}
                                                            className={`w-full px-2 py-1.5 text-left text-sm truncate ${p.prediction === label ? (isLightMode ? "bg-purple-100 text-purple-800" : "bg-purple-500/20 text-purple-200") : isLightMode ? "text-gray-800 hover:bg-gray-100" : "text-white/90 hover:bg-white/10"}`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                                {isHit && p.participating !== false && (
                                    <p className={`text-[10px] font-bold ${isLightMode ? "text-green-700" : "text-green-400"}`}>当たり!</p>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
