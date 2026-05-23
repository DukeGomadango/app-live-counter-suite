"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Z_INDEX } from "@/lib/layoutConstants";

export interface PartialUnmappedPullDialogProps {
    open: boolean;
    unmappedCount: number;
    mappedCount: number;
    dontShowAgain: boolean;
    onDontShowAgainChange: (checked: boolean) => void;
    onConfirmRoll: () => void;
    onOpenDistribution: () => void;
    onCancel: () => void;
}

export default function PartialUnmappedPullDialog({
    open,
    unmappedCount,
    mappedCount,
    dontShowAgain,
    onDontShowAgainChange,
    onConfirmRoll,
    onOpenDistribution,
    onCancel,
}: PartialUnmappedPullDialogProps) {
    const { isLightMode } = useTheme();

    useEffect(() => {
        if (!open) return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [open, onCancel]);

    const bgPanel = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,12,45,0.95)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const overlayBg = isLightMode
        ? "rgba(0,0,0,0.4)"
        : "rgba(0,0,0,0.6)";

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="partial-unmapped-pull-dialog"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{
                        zIndex: Z_INDEX.CONFIRM_DIALOG,
                        background: overlayBg,
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onCancel();
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        style={{
                            background: bgPanel,
                            border: `1px solid ${borderColor}`,
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="partial-unmapped-pull-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8 pb-4">
                            <div className="flex flex-col items-center text-center gap-5">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border bg-amber-500/20 border-amber-500/30 text-amber-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h2
                                        id="partial-unmapped-pull-title"
                                        className={`text-xl font-black tracking-tight ${textPrimary}`}
                                    >
                                        未紐づけの景品があります
                                    </h2>
                                    <p className={`text-sm ${textSecondary} leading-relaxed px-2 font-medium`}>
                                        {unmappedCount}件の景品に配布ファイルがありません（{mappedCount}件は紐づけ済み）。
                                        このまま抽選すると、未紐づけの当選はリンクシェアの配布ファイルに含まれません。
                                    </p>
                                </div>
                            </div>
                        </div>

                        <label
                            className={`flex items-center justify-center gap-2 px-8 pb-4 cursor-pointer text-xs font-medium ${textSecondary}`}
                        >
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => onDontShowAgainChange(e.target.checked)}
                                className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                            />
                            このガチャでは次回から表示しない
                        </label>

                        <div className="flex flex-col gap-2 p-6 pt-2">
                            <button
                                type="button"
                                onClick={onConfirmRoll}
                                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.1em] bg-purple-500/20 border border-purple-500/40 text-purple-500 hover:bg-purple-500/30"
                            >
                                このまま抽選する
                            </button>
                            <button
                                type="button"
                                onClick={onOpenDistribution}
                                className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.1em] border ${
                                    isLightMode
                                        ? "bg-black/5 border-black/10 text-gray-700 hover:bg-black/10"
                                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                                }`}
                            >
                                配布タブを開く
                            </button>
                            <button
                                type="button"
                                onClick={onCancel}
                                className={`w-full py-2.5 rounded-2xl text-xs font-bold ${textSecondary} hover:opacity-80`}
                            >
                                キャンセル
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onCancel}
                            className={`absolute top-5 right-5 p-1.5 rounded-xl transition-colors hover:bg-black/5 ${textSecondary} opacity-40 hover:opacity-100`}
                            aria-label="閉じる"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
