"use client";

import { useState } from "react";
import { Save, FolderOpen, Trash2, FileStack } from "lucide-react";
import type { GachaPool, GachaPoolPreset } from "@/lib/gacha";
import { generateId, getSampleTemplates, clonePoolWithNewIds } from "@/lib/gacha";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface GachaPresetsPanelProps {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    isLightMode: boolean;
}

export default function GachaPresetsPanel({ pool, onPoolChange, isLightMode }: GachaPresetsPanelProps) {
    const [presets, setPresets] = useLocalStorage<GachaPoolPreset[]>("gacha-presets", []);
    const [newPresetName, setNewPresetName] = useState("");

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/80";

    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    const samples = getSampleTemplates();

    const handleSave = () => {
        if (!newPresetName.trim()) return;
        setPresets(prev => [...prev, { id: generateId(), name: newPresetName.trim(), pool: JSON.parse(JSON.stringify(pool)), savedAt: Date.now() }]);
        setNewPresetName("");
    };

    return (
        <div className="flex flex-col gap-4 pr-1 pb-6">
            {/* 現在の設定を保存 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <div className={`px-4 py-3 border-b ${isLightMode ? "text-gray-900" : "text-white/90"}`} style={{ borderColor: glassBorder }}>
                    <span className="text-xs font-semibold uppercase tracking-wider">現在の設定を保存</span>
                </div>
                <div className="px-4 pb-4 pt-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newPresetName}
                            onChange={e => setNewPresetName(e.target.value)}
                            placeholder="プリセット名"
                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${textPrimary} ${isLightMode ? "placeholder:text-gray-600" : "placeholder:text-white/50"} outline-none`}
                            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                            onKeyDown={e => e.key === "Enter" && handleSave()}
                        />
                        <button
                            onClick={handleSave}
                            disabled={!newPresetName.trim()}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${isLightMode ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"}`}
                        >
                            <Save size={12} /> 保存
                        </button>
                    </div>
                </div>
            </div>

            {/* 保存済みプリセット */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <div className={`px-4 py-3 border-b ${textSecondary}`} style={{ borderColor: glassBorder }}>
                    <span className="text-xs font-semibold uppercase tracking-wider">保存済み — 読み込む</span>
                </div>
                <div className="px-4 pb-4 pt-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {presets.length === 0 ? (
                        <p className={`text-[11px] ${isLightMode ? "text-gray-600" : "text-white/70"}`}>保存したプリセットがありません</p>
                    ) : (
                        [...presets].sort((a, b) => b.savedAt - a.savedAt).map(pre => (
                            <div
                                key={pre.id}
                                className="flex items-center gap-2 p-2 rounded-lg"
                                style={{ background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}
                            >
                                <span className={`text-xs flex-1 truncate ${textPrimary}`}>{pre.name}</span>
                                <button
                                    onClick={() => onPoolChange(clonePoolWithNewIds(pre.pool))}
                                    className={`p-1.5 rounded text-[10px] transition-all ${isLightMode ? "text-blue-700 hover:bg-blue-50" : "text-blue-400 hover:bg-blue-500/20"}`}
                                    title="読み込む"
                                >
                                    <FolderOpen size={12} />
                                </button>
                                <button
                                    onClick={() => setPresets(prev => prev.filter(p => p.id !== pre.id))}
                                    className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                    title="削除"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* サンプルのテンプレート */}
            <div className="rounded-2xl overflow-hidden" style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}>
                <div className={`px-4 py-3 border-b ${textSecondary}`} style={{ borderColor: glassBorder }}>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <FileStack size={12} /> サンプルのテンプレート
                    </span>
                </div>
                <div className="px-4 pb-4 pt-3 flex flex-col gap-2">
                    {samples.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onPoolChange(clonePoolWithNewIds(t.pool))}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${isLightMode ? "hover:bg-purple-50 text-gray-900" : "hover:bg-white/10 text-white/90"}`}
                            style={{ border: `1px solid ${glassBorder}` }}
                        >
                            <span className="text-xs font-medium">{t.name}</span>
                            <span className={`text-[10px] ${isLightMode ? "text-gray-600" : "text-white/70"}`}>
                                {t.pool.conceptName} · {t.pool.pullCount}連
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
