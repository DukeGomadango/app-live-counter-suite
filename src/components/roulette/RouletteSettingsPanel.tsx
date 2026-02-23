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

                    {/* 表示方式: ミニマル / カジノ / クラシック / 木目調 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            表示方式
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {(["minimal", "casino", "classic", "orbit"] as RouletteStyle[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => onSettingsChange({ ...settings, style: s })}
                                    className={`flex-1 min-w-[72px] py-2 rounded-lg text-xs font-medium transition-all ${
                                        settings.style === s
                                            ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                                            : isLightMode ? "bg-black/5 text-gray-600 border border-black/10" : "bg-white/10 text-white/70 border border-white/10"
                                    }`}
                                >
                                    {s === "minimal" ? "ミニマル" : s === "casino" ? "カジノ" : s === "classic" ? "クラシック" : "木目調"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 演出量: 多め=回転長め・当たり派手 / 少なめ=回転短め・当たり控えめ */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            演出
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onSettingsChange({ ...settings, effectLevel: "low" })}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                    (settings.effectLevel ?? "low") === "low"
                                        ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                                        : isLightMode ? "bg-black/5 text-gray-600 border border-black/10" : "bg-white/10 text-white/70 border border-white/10"
                                }`}
                            >
                                少なめ
                            </button>
                            <button
                                type="button"
                                onClick={() => onSettingsChange({ ...settings, effectLevel: "high" })}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                    settings.effectLevel === "high"
                                        ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                                        : isLightMode ? "bg-black/5 text-gray-600 border border-black/10" : "bg-white/10 text-white/70 border border-white/10"
                                }`}
                            >
                                多め
                            </button>
                        </div>
                        <p className={`text-[10px] ${textSecondary} mt-1`}>多め: 回転じらし長め・当たり演出派手</p>
                    </div>

                    {/* 簡易表示の閾値 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            簡易表示の閾値
                        </label>
                        <p className={`text-[10px] ${textSecondary} mb-1`}>この数より多いスロットでラベルを非表示に</p>
                        <input
                            type="number"
                            min={10}
                            max={500}
                            value={settings.maxVisibleLabels ?? 80}
                            onChange={(e) => {
                                const v = e.target.value === "" ? undefined : Number(e.target.value);
                                onSettingsChange({ ...settings, maxVisibleLabels: v === undefined || Number.isNaN(v) ? 80 : Math.min(500, Math.max(10, v)) });
                            }}
                            className={`w-full px-2 py-1.5 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                        />
                    </div>

                    {/* 盤の一番下に表示するスロット */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            盤の一番下に表示するスロット
                        </label>
                        <p className={`text-[10px] ${textSecondary} mb-1`}>0=1番目、5=6番目（例: 1〜13のハイアンドローで6を下にしたいときは5）</p>
                        <input
                            type="number"
                            min={0}
                            value={settings.wheelOffsetIndex ?? 0}
                            onChange={(e) => {
                                const v = e.target.value === "" ? 0 : Number(e.target.value);
                                onSettingsChange({ ...settings, wheelOffsetIndex: Number.isNaN(v) || v < 0 ? 0 : v });
                            }}
                            className={`w-full px-2 py-1.5 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                        />
                    </div>

                    {/* 背景 */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            背景
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={settings.backgroundEnabled === true}
                                onChange={(e) => onSettingsChange({ ...settings, backgroundEnabled: e.target.checked })}
                                className="rounded accent-purple-500"
                            />
                            <span className={`text-sm ${textPrimary}`}>背景色を表示する</span>
                        </label>
                        {settings.backgroundEnabled && (
                            <>
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                    {ACCENT_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => onSettingsChange({ ...settings, backgroundColor: c.value })}
                                            className={`h-7 rounded-lg transition-all ${(settings.backgroundColor ?? "#1a1a2e") === c.value ? "ring-2 ring-purple-500 ring-offset-1" : ""}`}
                                            style={{ background: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <span className={`text-[10px] ${textSecondary}`}>不透明度</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={settings.backgroundOpacity ?? 100}
                                        onChange={(e) => onSettingsChange({ ...settings, backgroundOpacity: Number(e.target.value) })}
                                        className="w-full h-2 rounded-full accent-purple-500"
                                    />
                                    <p className={`text-[10px] ${textSecondary}`}>{settings.backgroundOpacity ?? 100}%</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 企画名（ルーレット名） */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            企画名（ルーレット名）
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={settings.showProjectName === true}
                                onChange={(e) => onSettingsChange({ ...settings, showProjectName: e.target.checked })}
                                className="rounded accent-purple-500"
                            />
                            <span className={`text-sm ${textPrimary}`}>画面上に企画名を表示する</span>
                        </label>
                        <input
                            type="text"
                            value={settings.projectName ?? ""}
                            onChange={(e) => onSettingsChange({ ...settings, projectName: e.target.value })}
                            placeholder="ルーレット名や企画名を入力"
                            className={`w-full px-2 py-1.5 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400" : "bg-white/10 border-white/20 text-white placeholder:text-white/40"}`}
                        />
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
