"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, RefreshCw, CheckCircle2, PackageCheck, ArrowRight, Settings2 } from "lucide-react";
import type { GachaPool, GachaItem, Player } from "@/lib/gacha";
import { refillItemStock } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface GachaItemRefillModalProps {
    open: boolean;
    item: GachaItem | null;
    pool: GachaPool;
    players: Player[];
    isLightMode?: boolean;
    onClose: () => void;
    onRefill: (updatedPool: GachaPool) => void;
}

export default function GachaItemRefillModal({
    open,
    item,
    pool,
    players,
    isLightMode = false,
    onClose,
    onRefill,
}: GachaItemRefillModalProps) {
    const hasInitialLimit = Boolean(item?.maxGlobalCount && item.maxGlobalCount > 0);
    const [enableLimit, setEnableLimit] = useState(hasInitialLimit);
    const [maxGlobalInput, setMaxGlobalInput] = useState(hasInitialLimit && item?.maxGlobalCount ? String(item.maxGlobalCount) : "20");
    const [mode, setMode] = useState<"add" | "subtract" | "reset">("add");
    const [amountInput, setAmountInput] = useState("10");

    // モーダルが開いた際・対象アイテム変更時の状態同期（レンダーフェーズ調整）
    const [prevKey, setPrevKey] = useState<string | null>(item ? `${item.id}-${open}` : null);
    const currentKey = item ? `${item.id}-${open}` : null;
    if (currentKey !== prevKey) {
        setPrevKey(currentKey);
        const hasLimit = Boolean(item?.maxGlobalCount && item.maxGlobalCount > 0);
        setEnableLimit(hasLimit);
        setMaxGlobalInput(hasLimit && item?.maxGlobalCount ? String(item.maxGlobalCount) : "20");
        setMode("add");
        setAmountInput("10");
    }

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/80";
    const textMuted = isLightMode ? "text-gray-500" : "text-white/45";
    const inputBg = isLightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";

    if (!open || !item) return null;

    const rarity = pool.rarities.find(r => r.id === item.rarityId);

    // 生の累積排出数（プレイヤー獲得合計）
    let rawDrawn = 0;
    for (const p of players) {
        const count = p.poolStates?.[pool.id]?.inventory?.[item.id]?.count || 0;
        rawDrawn += count;
    }

    const currentOffset = pool.stockRefillOffsets?.[item.id] ?? 0;
    const currentEffectiveDrawn = Math.max(0, rawDrawn - currentOffset);
    const currentMaxGlobal = item.maxGlobalCount !== undefined && item.maxGlobalCount !== null && item.maxGlobalCount > 0
        ? item.maxGlobalCount
        : null;

    const currentRemaining = currentMaxGlobal !== null
        ? Math.max(0, currentMaxGlobal - currentEffectiveDrawn)
        : null;

    // プレビュー計算
    const parsedMaxGlobal = enableLimit ? Math.max(1, parseInt(maxGlobalInput, 10) || 1) : null;
    const amountNum = Math.max(1, parseInt(amountInput, 10) || 1);

    let previewOffset = currentOffset;
    if (mode === "reset") {
        previewOffset = rawDrawn;
    } else if (mode === "subtract") {
        previewOffset = currentOffset - amountNum;
    } else {
        previewOffset = currentOffset + amountNum;
    }

    const previewEffectiveDrawn = Math.max(0, rawDrawn - previewOffset);
    const previewRemaining = parsedMaxGlobal !== null
        ? Math.max(0, parsedMaxGlobal - previewEffectiveDrawn)
        : null;

    const handleApply = () => {
        const targetMaxGlobal = enableLimit ? (parsedMaxGlobal ?? null) : null;
        const updatedPool = refillItemStock(pool, item.id, mode, amountNum, players, targetMaxGlobal);
        onRefill(updatedPool);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-5 border flex flex-col gap-4 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    style={{ background: glassBg, borderColor: glassBorder }}
                >
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: glassBorder }}>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                <PackageCheck size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-bold ${textPrimary}`}>在庫・個数制限の調整</h3>
                                    {rarity && (
                                        <span
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                            style={{ color: rarity.color, background: rarity.bgColor, border: `1px solid ${rarity.glowColor}` }}
                                        >
                                            {rarity.name}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs font-semibold ${textSecondary}`}>{item.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors ${isLightMode ? "hover:bg-black/5 text-gray-500" : "hover:bg-white/10 text-white/60"}`}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 現在のステータス要約 */}
                    <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                        <div>
                            <span className={`text-[10px] block ${textMuted}`}>全体上限</span>
                            <span className={`text-xs font-bold ${textPrimary}`}>
                                {currentMaxGlobal ? `${currentMaxGlobal}個` : "無制限"}
                            </span>
                        </div>
                        <div>
                            <span className={`text-[10px] block ${textMuted}`}>累積排出数</span>
                            <span className={`text-xs font-bold ${textSecondary}`}>{rawDrawn}個</span>
                        </div>
                        <div>
                            <span className={`text-[10px] block ${textMuted}`}>現在の残り</span>
                            <span className={`text-xs font-bold ${currentRemaining === 0 ? "text-rose-500" : "text-emerald-500"}`}>
                                {currentRemaining !== null ? `${currentRemaining}個` : "∞"}
                            </span>
                        </div>
                    </div>

                    {/* セクション 1: 全体個数制限の変更 */}
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Settings2 size={14} className="text-purple-400" />
                                <span className={`text-xs font-bold ${textPrimary}`}>全体上限個数の変更</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={enableLimit}
                                    onChange={e => setEnableLimit(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                                <span className={`font-semibold ${textSecondary}`}>上限制限を設定</span>
                            </label>
                        </div>

                        {enableLimit ? (
                            <div className="flex flex-col gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={maxGlobalInput}
                                        onChange={e => setMaxGlobalInput(e.target.value)}
                                        placeholder="例: 20"
                                        className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/30 ${textPrimary}`}
                                        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                    />
                                    <span className={`text-xs font-semibold ${textMuted}`}>個に設定</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[10, 20, 30, 50, 100].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setMaxGlobalInput(String(num))}
                                            className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all ${
                                                maxGlobalInput === String(num)
                                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                                    : `${isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/5 text-white/70"} border-transparent`
                                            }`}
                                        >
                                            {num}個
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className={`text-[11px] ${textMuted}`}>
                                上限制限なし（何個でも排出可能）に設定します。
                            </p>
                        )}
                    </div>

                    {/* セクション 2: 在庫の増減・フル補充 */}
                    <div className="flex flex-col gap-2.5">
                        <label className={`text-xs font-bold ${textPrimary}`}>在庫の増減・補充操作</label>

                        {/* モード切り替えタブ */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setMode("add")}
                                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                                    mode === "add"
                                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10"
                                        : `${isLightMode ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"} border-transparent`
                                }`}
                            >
                                <Plus size={15} className="mb-0.5 text-purple-400" />
                                追加入荷 (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("subtract")}
                                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                                    mode === "subtract"
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                                        : `${isLightMode ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"} border-transparent`
                                }`}
                            >
                                <Minus size={15} className="mb-0.5 text-amber-400" />
                                在庫削減 (-)
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("reset")}
                                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                                    mode === "reset"
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                                        : `${isLightMode ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"} border-transparent`
                                }`}
                            >
                                <RefreshCw size={15} className="mb-0.5 text-emerald-400" />
                                フル補充 (0リセット)
                            </button>
                        </div>

                        {/* 個数入力 & ステッパー & クイックチップ */}
                        {mode !== "reset" ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAmountInput(String(Math.max(1, amountNum - 1)))}
                                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 font-bold transition-all ${isLightMode ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-white/5 hover:bg-white/10 text-white"}`}
                                        style={{ borderColor: inputBorder }}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={amountInput}
                                        onChange={e => setAmountInput(e.target.value)}
                                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 ${
                                            mode === "subtract" ? "focus:ring-amber-500/30" : "focus:ring-purple-500/30"
                                        } ${textPrimary}`}
                                        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setAmountInput(String(amountNum + 1))}
                                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 font-bold transition-all ${isLightMode ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-white/5 hover:bg-white/10 text-white"}`}
                                        style={{ borderColor: inputBorder }}
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <span className={`text-xs font-semibold ${textMuted}`}>個</span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {(mode === "add" ? [1, 5, 10, 20, 50] : [1, 5, 10, 20]).map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setAmountInput(String(num))}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                                amountInput === String(num)
                                                    ? mode === "subtract"
                                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                                        : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                                    : `${isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/5 text-white/70"} border-transparent`
                                            }`}
                                        >
                                            {mode === "add" ? `+${num}` : `-${num}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className={`text-[11px] p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300`}>
                                排出カウントをリセットし、現在の上限（{parsedMaxGlobal !== null ? `${parsedMaxGlobal}個` : "無制限"}）まで満タンに補充します。
                            </p>
                        )}
                    </div>

                    {/* プレビュー表示 */}
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-purple-300 font-medium">調整後の設定プレビュー:</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] ${textMuted}`}>
                                    上限: {currentMaxGlobal ? `${currentMaxGlobal}個` : "無制限"}
                                </span>
                                <ArrowRight size={12} className="text-purple-400" />
                                <span className="text-xs font-bold text-purple-200">
                                    {parsedMaxGlobal ? `${parsedMaxGlobal}個` : "無制限"}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`text-[11px] ${textMuted}`}>残り在庫:</span>
                                <span className={`text-sm font-extrabold ${previewRemaining === 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                    {previewRemaining !== null ? `${previewRemaining} 個` : "無制限"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: glassBorder }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isLightMode ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                        >
                            キャンセル
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                            <CheckCircle2 size={15} />
                            設定を保存する
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
