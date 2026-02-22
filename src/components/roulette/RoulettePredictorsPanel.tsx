"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { RoulettePredictor } from "@/lib/roulette";

interface RoulettePredictorsPanelProps {
    predictors: RoulettePredictor[];
    onChange: (predictors: RoulettePredictor[]) => void;
    slots: string[];
    resultLabel: string | null;
    isLightMode: boolean;
}

function generateId() {
    return crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function RoulettePredictorsPanel({
    predictors,
    onChange,
    slots,
    resultLabel,
    isLightMode,
}: RoulettePredictorsPanelProps) {
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
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
    };

    return (
        <div
            ref={ref}
            className="rounded-2xl border flex flex-col overflow-hidden min-h-0 flex-1 w-full md:w-64 min-w-0"
            style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(16px)", maxHeight: "min(420px, 60vh)" }}
        >
            <div className="px-3 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: glassBorder }}>
                <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>誰の予想</span>
                <button
                    type="button"
                    onClick={add}
                    className="p-1 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
                    title="追加"
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                <AnimatePresence mode="popLayout">
                    {predictors.map((p) => {
                        const isHit = resultLabel != null && p.prediction.trim() === resultLabel;
                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="rounded-xl border p-2 space-y-1.5"
                                style={{ borderColor: glassBorder }}
                            >
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={p.name}
                                        onChange={(e) => updateOne(p.id, { name: e.target.value })}
                                        placeholder="名前"
                                        className={`flex-1 min-w-0 px-2 py-1 rounded text-sm border ${isLightMode ? "bg-white/90 border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                                    />
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
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setOpenDropdownId(openDropdownId === p.id ? null : p.id)}
                                        className={`w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-sm border ${isLightMode ? "bg-white/90 border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                                    >
                                        <span className="truncate">{p.prediction || "予想を選択..."}</span>
                                        <ChevronDown size={12} className={`shrink-0 ${openDropdownId === p.id ? "rotate-180" : ""}`} />
                                    </button>
                                    <AnimatePresence>
                                        {openDropdownId === p.id && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-xl z-50 max-h-40 overflow-y-auto"
                                                style={{ background: dropdownBg, borderColor: glassBorder }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => { updateOne(p.id, { prediction: "" }); setOpenDropdownId(null); }}
                                                    className={`w-full px-2 py-1.5 text-left text-sm ${isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                                                >
                                                    クリア
                                                </button>
                                                {slots.map((label) => (
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
                                </div>
                                {isHit && (
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
