"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Type, Palette, Maximize, Sparkles } from "lucide-react";
import { useState } from "react";

export type CardSize = "S" | "M" | "L" | "XL";

export interface AppSettings {
    cardSize: CardSize;
    showProjectName: boolean;
    projectName: string;
    projectNameSize: "S" | "M" | "L" | "XL";
    projectNameColor: string;
    accentColor: string;
    orbIntensity: number; // 0-100
}

interface SettingsModalProps {
    settings: AppSettings;
    isLightMode: boolean;
    onSave: (settings: AppSettings) => void;
    onClose: () => void;
}

const CARD_SIZE_OPTIONS: { value: CardSize; label: string; desc: string }[] = [
    { value: "S", label: "S", desc: "コンパクト" },
    { value: "M", label: "M", desc: "標準" },
    { value: "L", label: "L", desc: "大きめ" },
    { value: "XL", label: "XL", desc: "特大" },
];

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
    { value: "#14b8a6", label: "ティール" },
    { value: "#f43f5e", label: "ローズ" },
    { value: "#6366f1", label: "インディゴ" },
];

const PROJECT_NAME_SIZE_OPTIONS: { value: "S" | "M" | "L" | "XL"; label: string; css: string }[] = [
    { value: "S", label: "S", css: "text-sm sm:text-base" },
    { value: "M", label: "M", css: "text-lg sm:text-xl" },
    { value: "L", label: "L", css: "text-xl sm:text-2xl" },
    { value: "XL", label: "XL", css: "text-2xl sm:text-3xl" },
];

export default function SettingsModal({
    settings: initialSettings,
    isLightMode,
    onSave,
    onClose,
}: SettingsModalProps) {
    const [settings, setSettings] = useState<AppSettings>({ ...initialSettings });

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    // Theme styles
    const bgOverlay = "rgba(0,0,0,0.5)";
    const bgPanel = isLightMode ? "rgba(255,255,255,0.97)" : "rgba(20,12,45,0.97)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";
    const inputBg = isLightMode ? "bg-black/5" : "bg-white/5";
    const inputBorder = isLightMode ? "border-black/10" : "border-white/10";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";
    const bgSubtleHover = isLightMode ? "hover:bg-black/10" : "hover:bg-white/10";

    const accentColor = settings.accentColor;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ background: bgOverlay, backdropFilter: "blur(8px)" }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
                    style={{
                        background: bgPanel,
                        border: `1px solid ${borderColor}`,
                        boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-5 py-4 shrink-0"
                        style={{ borderBottom: `1px solid ${borderColor}` }}
                    >
                        <h2 className={`text-base font-bold ${textPrimary} flex items-center gap-2`}>
                            ⚙️ 設定
                        </h2>
                        <button
                            onClick={onClose}
                            className={`w-8 h-8 rounded-xl ${bgSubtle} ${bgSubtleHover} flex items-center justify-center transition-colors`}
                        >
                            <X size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-6 overflow-y-auto flex-1">
                        {/* === Orb Intensity === */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={14} className={textSecondary} />
                                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                    背景オーブの濃さ
                                </label>
                                <span
                                    className={`ml-auto text-xs font-mono tabular-nums ${textMuted}`}
                                >
                                    {settings.orbIntensity}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.orbIntensity}
                                onChange={(e) => setSettings((s) => ({ ...s, orbIntensity: parseInt(e.target.value, 10) }))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, ${accentColor} ${settings.orbIntensity}%, ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${settings.orbIntensity}%)`,
                                    accentColor: accentColor,
                                }}
                            />
                            <div className={`flex justify-between text-[10px] mt-1 ${textMuted}`}>
                                <span>なし</span>
                                <span>最大</span>
                            </div>
                        </div>

                        {/* === Card Size === */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Maximize size={14} className={textSecondary} />
                                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                    カードサイズ
                                </label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {CARD_SIZE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSettings((s) => ({ ...s, cardSize: opt.value }))}
                                        className={`py-3 rounded-xl text-center transition-all duration-200 border ${settings.cardSize === opt.value
                                            ? "shadow-lg"
                                            : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                            }`}
                                        style={
                                            settings.cardSize === opt.value
                                                ? {
                                                    background: `${accentColor}20`,
                                                    borderColor: `${accentColor}50`,
                                                    boxShadow: `0 0 12px ${accentColor}20`,
                                                }
                                                : undefined
                                        }
                                    >
                                        <div
                                            className={`text-lg font-bold ${settings.cardSize === opt.value ? "" : textPrimary
                                                }`}
                                            style={settings.cardSize === opt.value ? { color: accentColor } : undefined}
                                        >
                                            {opt.label}
                                        </div>
                                        <div className={`text-[10px] mt-0.5 ${textMuted}`}>{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* === Project Name === */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Type size={14} className={textSecondary} />
                                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                    企画名の表示
                                </label>
                            </div>

                            {/* Toggle */}
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-sm ${textPrimary}`}>カード群の上に企画名を表示</span>
                                <button
                                    onClick={() => setSettings((s) => ({ ...s, showProjectName: !s.showProjectName }))}
                                    className="relative w-11 h-6 rounded-full transition-colors duration-200"
                                    style={{
                                        background: settings.showProjectName
                                            ? `${accentColor}60`
                                            : isLightMode
                                                ? "rgba(0,0,0,0.15)"
                                                : "rgba(255,255,255,0.15)",
                                    }}
                                >
                                    <motion.div
                                        className="absolute top-0.5 w-5 h-5 rounded-full shadow-md"
                                        animate={{ left: settings.showProjectName ? "22px" : "2px" }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        style={{
                                            background: settings.showProjectName
                                                ? accentColor
                                                : isLightMode
                                                    ? "white"
                                                    : "rgba(255,255,255,0.6)",
                                        }}
                                    />
                                </button>
                            </div>

                            {/* Name input */}
                            <AnimatePresence>
                                {settings.showProjectName && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-3"
                                    >
                                        <input
                                            value={settings.projectName}
                                            onChange={(e) =>
                                                setSettings((s) => ({ ...s, projectName: e.target.value }))
                                            }
                                            placeholder="例: 星座アンケート"
                                            className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3 py-2.5 text-sm ${textPrimary} outline-none transition-colors`}
                                            style={{ borderColor: `${accentColor}30` }}
                                        />

                                        {/* Font size */}
                                        <div>
                                            <span className={`text-xs ${textMuted} mb-1 block`}>文字サイズ</span>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {PROJECT_NAME_SIZE_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setSettings((s) => ({ ...s, projectNameSize: opt.value }))}
                                                        className={`py-1.5 rounded-lg text-xs font-medium text-center transition-all border ${settings.projectNameSize === opt.value
                                                            ? ""
                                                            : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                            }`}
                                                        style={
                                                            settings.projectNameSize === opt.value
                                                                ? { background: `${accentColor}20`, borderColor: `${accentColor}50`, color: accentColor }
                                                                : undefined
                                                        }
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Font color */}
                                        <div>
                                            <span className={`text-xs ${textMuted} mb-1 block`}>文字の色</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {ACCENT_COLORS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        onClick={() => setSettings((s) => ({ ...s, projectNameColor: c.value }))}
                                                        className="w-5 h-5 rounded-full transition-all hover:scale-110"
                                                        style={{
                                                            background: c.value,
                                                            boxShadow: settings.projectNameColor === c.value
                                                                ? `0 0 0 2px ${isLightMode ? "white" : "#140c2d"}, 0 0 0 3.5px ${c.value}`
                                                                : "none",
                                                        }}
                                                        title={c.label}
                                                    />
                                                ))}
                                                {/* White option for light text */}
                                                <button
                                                    onClick={() => setSettings((s) => ({ ...s, projectNameColor: "#ffffff" }))}
                                                    className="w-5 h-5 rounded-full transition-all hover:scale-110 border"
                                                    style={{
                                                        background: "#ffffff",
                                                        borderColor: "rgba(0,0,0,0.2)",
                                                        boxShadow: settings.projectNameColor === "#ffffff"
                                                            ? `0 0 0 2px ${isLightMode ? "#e5e7eb" : "#140c2d"}, 0 0 0 3.5px #ffffff`
                                                            : "none",
                                                    }}
                                                    title="ホワイト"
                                                />
                                                {/* Black option for dark text */}
                                                <button
                                                    onClick={() => setSettings((s) => ({ ...s, projectNameColor: "#111111" }))}
                                                    className="w-5 h-5 rounded-full transition-all hover:scale-110 border"
                                                    style={{
                                                        background: "#111111",
                                                        borderColor: "rgba(255,255,255,0.2)",
                                                        boxShadow: settings.projectNameColor === "#111111"
                                                            ? `0 0 0 2px ${isLightMode ? "white" : "#140c2d"}, 0 0 0 3.5px #111111`
                                                            : "none",
                                                    }}
                                                    title="ブラック"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* === Accent Color === */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Palette size={14} className={textSecondary} />
                                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                    アクセントカラー
                                </label>
                            </div>
                            <p className={`text-xs ${textMuted} mb-2`}>
                                ツール全体の色味を変更します
                            </p>
                            <div className="grid grid-cols-6 gap-2.5">
                                {ACCENT_COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setSettings((s) => ({ ...s, accentColor: c.value }))}
                                        className="relative w-full aspect-square rounded-xl transition-all duration-200 hover:scale-110"
                                        style={{
                                            background: c.value,
                                            boxShadow:
                                                settings.accentColor === c.value
                                                    ? `0 0 0 2.5px ${isLightMode ? "white" : "#140c2d"}, 0 0 0 4.5px ${c.value}, 0 0 15px ${c.value}40`
                                                    : `0 2px 8px ${c.value}30`,
                                        }}
                                        title={c.label}
                                    >
                                        {settings.accentColor === c.value && (
                                            <Check
                                                size={16}
                                                className="absolute inset-0 m-auto text-white drop-shadow-md"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="flex items-center gap-2 px-5 py-4 shrink-0"
                        style={{ borderTop: `1px solid ${borderColor}` }}
                    >
                        <button
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${bgSubtle} ${textSecondary} ${bgSubtleHover} transition-colors border ${isLightMode ? "border-black/10" : "border-white/10"}`}
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                            style={{
                                background: `${accentColor}20`,
                                color: accentColor,
                                border: `1px solid ${accentColor}40`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}30`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = `${accentColor}20`; }}
                        >
                            <Check size={14} />
                            保存
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
