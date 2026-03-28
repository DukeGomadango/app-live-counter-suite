"use client";

import { useState, useCallback, type FormEvent } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Target, Save, Check, X, FolderOpen, Trash2 } from "lucide-react";
import { coerceStoredEmojiToDisplay } from "@/lib/constants";
import type { SavedChart, ChartNodeForMenu } from "@/lib/chartTypes";
import EmojiGlyph from "@/components/icons/EmojiGlyph";

export type ChartHamburgerSectionProps = {
    activeTab: "actions" | "save_load";
    isLightMode: boolean;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    bgSubtle: string;
    borderSubtle: string;
    /** border-t 用の実色（Tailwind クラス名は style に使えないため） */
    dividerBorderColor: string;
    inputBg: string;
    inputBorder: string;
    bgSubtleHover: string;
    confirmReset: boolean;
    onResetClick: () => void;
    globalTarget: number;
    onSetGlobalTarget?: (t: number) => void;
    groupedChartNodes: Record<string, ChartNodeForMenu[]>;
    onSetNodeTarget?: (id: string, target: number) => void;
    savedCharts: SavedChart[];
    onSaveChart?: (name: string) => void;
    onLoadChart?: (chart: SavedChart) => void;
    onDeleteChart?: (id: string) => void;
    onToggleMenu: () => void;
};

export default function ChartHamburgerSection({
    activeTab,
    isLightMode,
    accentColor,
    textPrimary,
    textSecondary,
    textMuted,
    bgSubtle,
    borderSubtle,
    dividerBorderColor,
    inputBg,
    inputBorder,
    bgSubtleHover,
    confirmReset,
    onResetClick,
    globalTarget,
    onSetGlobalTarget,
    groupedChartNodes,
    onSetNodeTarget,
    savedCharts,
    onSaveChart,
    onLoadChart,
    onDeleteChart,
    onToggleMenu,
}: ChartHamburgerSectionProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [newChartName, setNewChartName] = useState("");

    const handleSaveSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (newChartName.trim() && onSaveChart) {
                onSaveChart(newChartName.trim());
                setNewChartName("");
                setIsSaving(false);
            }
        },
        [newChartName, onSaveChart]
    );

    if (activeTab === "actions") {
        return (
            <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
            >
                <div className="space-y-2">
                    <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>キャンバス操作</h3>

                    <button
                        onClick={onResetClick}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                            confirmReset
                                ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                                : `border-transparent ${bgSubtle} ${bgSubtleHover} ${textPrimary}`
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    confirmReset ? "bg-red-500/20" : isLightMode ? "bg-black/5" : "bg-white/5"
                                }`}
                            >
                                <RotateCcw size={16} />
                            </div>
                            <span className="text-sm font-medium">
                                {confirmReset ? "本当にリセットしますか？" : "キャンバスを全消去"}
                            </span>
                        </div>
                        <span
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                                confirmReset
                                    ? "bg-red-500 text-white"
                                    : isLightMode
                                      ? "bg-black/10 text-gray-500"
                                      : "bg-white/10 text-white/50"
                            }`}
                        >
                            Reset
                        </span>
                    </button>
                </div>

                <div className="space-y-2 pt-2">
                    <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>総合計の目標</h3>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`}>
                                <Target size={16} />
                            </div>
                            <input
                                type="number"
                                value={globalTarget || ""}
                                onChange={(e) => onSetGlobalTarget?.(Math.max(0, Number(e.target.value)))}
                                placeholder="目標値を入力 (例: 1000)"
                                className={`w-full ${inputBg} border ${inputBorder} rounded-xl pl-10 pr-3 py-2.5 text-sm ${textPrimary} outline-none focus:border-purple-500/50 transition-colors bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-bold`}
                            />
                        </div>
                    </div>
                    <p className={`text-[10px] ${textMuted} pl-1`}>
                        入力した目標値と総合計を比較し、合計ノードに進捗バーが表示されます。
                    </p>
                </div>

                {Object.entries(groupedChartNodes).some(([, nodes]) => nodes.length > 0) && (
                    <div className="space-y-4 pt-4 border-t" style={{ borderColor: dividerBorderColor }}>
                        <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>個別ノードの目標設定</h3>
                        {(["add", "subtract"] as const).map((modeKey) => {
                            const nodes = groupedChartNodes[modeKey];
                            if (!nodes || nodes.length === 0) return null;

                            return (
                                <div key={modeKey} className="space-y-2">
                                    <div
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block backdrop-blur-md border ${
                                            isLightMode
                                                ? "bg-black/5 border-black/10 text-gray-600"
                                                : "bg-white/5 border-white/10 text-white/50"
                                        }`}
                                    >
                                        {modeKey === "add" ? "加算" : "減算"}
                                    </div>
                                    <div className="space-y-1.5 pl-1">
                                        {nodes.map((node) => {
                                            const data = node.data as {
                                                emoji?: string;
                                                label?: string;
                                                color?: string;
                                                value?: number;
                                                step?: number;
                                                target?: number;
                                                count?: number;
                                            };
                                            const step = data.step ?? data.value;
                                            return (
                                                <div
                                                    key={node.id}
                                                    className={`flex items-center gap-2 p-2 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                                                >
                                                    <span className="text-sm w-6 text-center shrink-0 inline-flex items-center justify-center">
                                                        <EmojiGlyph emoji={coerceStoredEmojiToDisplay(data.emoji)} size={14} />
                                                    </span>
                                                    <span
                                                        className={`flex-1 text-sm ${isLightMode ? "text-gray-700" : "text-white/80"} truncate`}
                                                    >
                                                        {data.label}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-mono tabular-nums" style={{ color: data.color }}>
                                                            {step}
                                                        </span>
                                                        <span className={`text-xs ${textMuted}`}>/</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={data.target || ""}
                                                            onChange={(e) =>
                                                                onSetNodeTarget?.(node.id, Math.max(0, Number(e.target.value)))
                                                            }
                                                            placeholder="目標"
                                                            className={`w-16 text-right ${inputBg} border ${inputBorder} rounded-lg px-2 py-1 text-xs ${textPrimary} outline-none focus:border-purple-500/40 transition-colors tabular-nums focus:w-20`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            key="save_load"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 pb-2"
        >
            <div className="space-y-3">
                <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>現在の状態を保存</h3>

                {!isSaving ? (
                    <button
                        onClick={() => setIsSaving(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all border border-dashed text-purple-600 bg-purple-500/10 hover:bg-purple-500/20"
                        style={{ color: accentColor, borderColor: accentColor }}
                    >
                        <Save size={16} />
                        <span className="text-sm font-semibold">新しく保存する</span>
                    </button>
                ) : (
                    <form onSubmit={handleSaveSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={newChartName}
                            onChange={(e) => setNewChartName(e.target.value)}
                            placeholder="名前を入力..."
                            className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/50 transition-colors bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10`}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500 text-white shrink-0 shadow-md hover:brightness-110 transition-all"
                            style={{ backgroundColor: accentColor }}
                        >
                            <Check size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSaving(false)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl ${bgSubtle} ${textSecondary} ${bgSubtleHover} transition-colors border border-black/10 dark:border-white/10`}
                        >
                            <X size={16} />
                        </button>
                    </form>
                )}
            </div>

            <div className="space-y-3">
                <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>保存したデータ</h3>

                {savedCharts.length === 0 ? (
                    <div
                        className={`p-4 rounded-xl text-center text-sm ${textMuted} bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 border-dashed`}
                    >
                        保存されたチャートはありません
                    </div>
                ) : (
                    <div className="space-y-2">
                        {savedCharts.map((chart) => (
                            <div
                                key={chart.id}
                                className={`group flex items-center justify-between p-3 rounded-xl border ${bgSubtleHover} transition-colors border-black/5 dark:border-white/5`}
                            >
                                <div
                                    className="flex-1 min-w-0 pr-2 cursor-pointer"
                                    onClick={() => {
                                        onLoadChart?.(chart);
                                        onToggleMenu();
                                    }}
                                >
                                    <div className={`text-sm font-bold ${textPrimary} truncate flex items-center gap-2`}>
                                        <FolderOpen size={14} className={textSecondary} />
                                        {chart.name}
                                    </div>
                                    <div className={`text-[10px] mt-1 ${textMuted} flex gap-2`}>
                                        <span>ノード: {chart.nodes.length}</span>
                                        <span>更新: {new Date(chart.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDeleteChart?.(chart.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                                    title="削除"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
