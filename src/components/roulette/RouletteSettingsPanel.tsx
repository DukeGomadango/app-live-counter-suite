"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { RouletteSettings, RouletteStyle } from "@/lib/roulette";

const ACCENT_COLORS = [
    { value: "#a855f7", label: "パープル" },
    { value: "#8b5cf6", label: "バイオレット" },
    { value: "#3b82f6", label: "ブルー" },
    { value: "#06b6d4", label: "シアン" },
    { value: "#22c55e", label: "グリーン" },
    { value: "#eab308", label: "イエロー" },
    { value: "#f97316", label: "オレンジ" },
    { value: "#ec4899", label: "ピンク" },
    { value: "#ef4444", label: "レッド" },
];

interface RouletteSettingsPanelProps {
    settings: RouletteSettings;
    onSettingsChange: (s: RouletteSettings) => void;
    isLightMode: boolean;
    onClose?: () => void;
    /** true のときオーバーレイではなくインライン（サイドバー内）表示 */
    inline?: boolean;
}

export default function RouletteSettingsPanel({
    settings,
    onSettingsChange,
    isLightMode,
    onClose,
    inline = false,
}: RouletteSettingsPanelProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const overlayBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

    const content = (
        <div className="px-4 py-3 flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto">
                    {/* アクセント色（オーブの色） */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            オーブの色
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {ACCENT_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => onSettingsChange({ ...settings, accentColor: c.value })}
                                    className={`h-8 rounded-lg transition-all ${settings.accentColor === c.value ? "ring-2 ring-purple-500 ring-offset-1" : ""}`}
                                    style={{ background: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* オーブの濃さ */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            オーブの濃さ
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={settings.orbIntensity}
                            onChange={(e) => onSettingsChange({ ...settings, orbIntensity: Number(e.target.value) })}
                            className="w-full h-2 rounded-full accent-purple-500"
                        />
                        <p className={`text-[10px] ${textSecondary} mt-0.5`}>{settings.orbIntensity}%</p>
                    </div>

                    {/* 表示方式: 針 / カジノ */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            表示方式
                        </label>
                        <div className="flex gap-2">
                            {(["needle", "casino"] as RouletteStyle[]).map((style) => (
                                <button
                                    key={style}
                                    onClick={() => onSettingsChange({ ...settings, style })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                        settings.style === style
                                            ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                                            : isLightMode ? "bg-black/5 text-gray-600 border border-black/10" : "bg-white/10 text-white/70 border border-white/10"
                                    }`}
                                >
                                    {style === "needle" ? "針で指す" : "ボール転がり"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 統計: バーチャート・円グラフ表示 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            統計の表示
                        </label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.statsShowBarChart !== false}
                                    onChange={(e) => onSettingsChange({ ...settings, statsShowBarChart: e.target.checked })}
                                    className="rounded accent-purple-500"
                                />
                                <span className={`text-sm ${textPrimary}`}>バーチャートを表示</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.statsShowPieChart === true}
                                    onChange={(e) => onSettingsChange({ ...settings, statsShowPieChart: e.target.checked })}
                                    className="rounded accent-purple-500"
                                />
                                <span className={`text-sm ${textPrimary}`}>円グラフを表示</span>
                            </label>
                        </div>
                    </div>
                </div>
    );

    if (inline) {
        return (
            <div
                className="rounded-2xl overflow-hidden border flex flex-col min-h-0 flex-1"
                style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(16px)" }}
            >
                <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: glassBorder }}>
                    <span className={`text-sm font-bold ${textPrimary}`}>ルーレット設定</span>
                </div>
                {content}
            </div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
                onClick={onClose ?? (() => {})}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="fixed top-14 right-4 z-[100] w-72 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                style={{ background: overlayBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(20px)" }}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: glassBorder }}>
                    <span className={`text-sm font-bold ${textPrimary}`}>ルーレット設定</span>
                    <button onClick={onClose} className={`p-1 rounded-lg ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
                        <X size={16} className={textSecondary} />
                    </button>
                </div>
                {content}
            </motion.div>
        </>
    );
}
