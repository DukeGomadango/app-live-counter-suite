"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Type, Palette, Maximize, Sparkles } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/layoutConstants";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import { useTheme } from "@/context/ThemeContext";

export type CardSize = "S" | "M" | "L" | "XL";
export type EdgeThickness = "S" | "M" | "L";

/** カードサイズのスライダー倍率（50–150、100=100%） */
export const CARD_SCALE_MIN = 50;
export const CARD_SCALE_MAX = 150;
export const CARD_SCALE_PRESETS: Record<CardSize, number> = { S: 80, M: 100, L: 120, XL: 140 };

export interface AppSettings {
    cardSize: CardSize;
    /** カードの表示倍率（50–150、未指定時は100） */
    cardScale?: number;
    edgeThickness?: EdgeThickness;
    showProjectName: boolean;
    projectName: string;
    projectNameSize: "S" | "M" | "L" | "XL";
    projectNameOrientation?: "horizontal" | "vertical";
    projectNameColor: string;
    accentColor: string;
    orbIntensity: number; // 0-100
    dotIntensity?: number; // 0-100
    /** ±5 ボタンを行カードに表示（カウンター・フローチャート） */
    showStep5?: boolean;
    /** ±10 ボタンを行カードに表示（カウンター・フローチャート） */
    showStep10?: boolean;
    /** ±自由記述ボタンを行カードに表示（カウンター・フローチャート） */
    showStepFree?: boolean;
    /** ±自由記述で加減算する値（カウンター・フローチャート） */
    stepFreeValue?: number;
    /** カード上に編集・削除ボタンを表示する（カウンターのみ） */
    showCardEditDelete?: boolean;
    /** カード上に目標達成ボタンを表示する（カウンターのみ） */
  showAchieveTargetButtonOnCard?: boolean;
  /** フローチャート：総合計が増減したときの短い視覚演出の強さ */
  flowchartFxIntensity?: "off" | "subtle" | "normal";
  /** フローチャート：接続線の流れアニメ。未指定＝自動（狭い画面ではオフ） */
  flowchartEdgeAnimated?: boolean;
  /** フローチャート：キャンバス背景。未指定＝ドット（従来どおり） */
  flowchartGridBackground?: "dots" | "lines" | "none";
}

interface SettingsModalProps {
    settings: AppSettings;
    isLightMode?: boolean;
    mode?: "counter" | "chart";
    onSave: (settings: AppSettings) => void;
    onClose: () => void;
}

const CARD_SIZE_OPTIONS: { value: CardSize; label: string; desc: string }[] = [
    { value: "S", label: "S", desc: "コンパクト" },
    { value: "M", label: "M", desc: "標準" },
    { value: "L", label: "L", desc: "大きめ" },
    { value: "XL", label: "XL", desc: "特大" },
];

const EDGE_THICKNESS_OPTIONS: { value: EdgeThickness; label: string; desc: string }[] = [
    { value: "S", label: "細い", desc: "1px" },
    { value: "M", label: "標準", desc: "2px" },
    { value: "L", label: "太い", desc: "4px" },
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
    isLightMode: isLightModeProp,
    mode = "counter",
    onSave,
    onClose,
}: SettingsModalProps) {
    const { isLightMode: isLightModeContext } = useTheme();
    const isLightMode = isLightModeProp ?? isLightModeContext;

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

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 flex items-center justify-center p-4`}
                style={{ 
                    zIndex: Z_INDEX.MODAL, 
                    background: bgOverlay, 
                    backdropFilter: "blur(8px)" 
                }}
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
                            <EmojiGlyph emoji="⚙️" size={16} />
                            設定
                        </h2>
                        <button
                            onClick={onClose}
                            className={`w-8 h-8 rounded-xl ${bgSubtle} dango-btn-tier3 flex items-center justify-center transition-colors`}
                            style={{ "--btn-glow-color": "rgba(0,0,0,0.1)" } as React.CSSProperties}
                        >
                            <X size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-6 overflow-y-auto scroll-touch flex-1">
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

                        {/* === Step buttons (Counter + Flowchart line cards) === */}
                        {(mode === "counter" || mode === "chart") && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                        ±5 / ±10 / 自由記述
                                    </label>
                                </div>
                                {[
                                    { key: "step5", label: "±5 を表示", value: settings.showStep5 ?? true, onChange: () => setSettings((s) => ({ ...s, showStep5: !(s.showStep5 ?? true) })) },
                                    { key: "step10", label: "±10 を表示", value: settings.showStep10 ?? true, onChange: () => setSettings((s) => ({ ...s, showStep10: !(s.showStep10 ?? true) })) },
                                    { key: "stepFree", label: "±自由記述を表示", value: settings.showStepFree ?? false, onChange: () => setSettings((s) => ({ ...s, showStepFree: !(s.showStepFree ?? false) })) },
                                ].map(({ key, label, value, onChange }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className={`text-sm ${textPrimary}`}>{label}</span>
                                        <button
                                            type="button"
                                            onClick={onChange}
                                            className="relative w-11 h-6 rounded-full transition-colors duration-200"
                                            style={{
                                                background: value ? `${accentColor}60` : isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
                                            }}
                                        >
                                            <motion.div
                                                className="absolute top-0.5 w-5 h-5 rounded-full shadow-md"
                                                animate={{ left: value ? "22px" : "2px" }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                style={{
                                                    background: value ? accentColor : isLightMode ? "white" : "rgba(255,255,255,0.6)",
                                                }}
                                            />
                                        </button>
                                    </div>
                                ))}
                                {settings.showStepFree && (
                                    <div className="flex items-center gap-2 pl-1">
                                        <span className={`text-sm ${textPrimary}`}>加減算する値</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={settings.stepFreeValue ?? 1}
                                            onChange={(e) => setSettings((s) => ({ ...s, stepFreeValue: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                                            className={`w-16 px-2 py-1 rounded text-sm tabular-nums ${inputBg} ${inputBorder}`}
                                        />
                                    </div>
                                )}
                                {mode === "counter" && (
                                    <div className="space-y-2 pt-1 border-t mt-3 pt-3" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${textPrimary}`}>カードに編集・削除ボタンを表示</span>
                                            <button
                                                type="button"
                                                onClick={() => setSettings((s) => ({ ...s, showCardEditDelete: !(s.showCardEditDelete ?? true) }))}
                                                className="relative w-11 h-6 rounded-full transition-colors duration-200"
                                                style={{
                                                    background: (settings.showCardEditDelete ?? true) ? `${accentColor}60` : isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
                                                }}
                                            >
                                                <motion.div
                                                    className="absolute top-0.5 w-5 h-5 rounded-full shadow-md"
                                                    animate={{ left: (settings.showCardEditDelete ?? true) ? "22px" : "2px" }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    style={{
                                                        background: (settings.showCardEditDelete ?? true) ? accentColor : isLightMode ? "white" : "rgba(255,255,255,0.6)",
                                                    }}
                                                />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${textPrimary}`}>カードに「目標へ」ボタンを表示</span>
                                            <button
                                                type="button"
                                                onClick={() => setSettings((s) => ({ ...s, showAchieveTargetButtonOnCard: !(s.showAchieveTargetButtonOnCard ?? true) }))}
                                                className="relative w-11 h-6 rounded-full transition-colors duration-200"
                                                style={{
                                                    background: (settings.showAchieveTargetButtonOnCard ?? true) ? `${accentColor}60` : isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
                                                }}
                                            >
                                                <motion.div
                                                    className="absolute top-0.5 w-5 h-5 rounded-full shadow-md"
                                                    animate={{ left: (settings.showAchieveTargetButtonOnCard ?? true) ? "22px" : "2px" }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    style={{
                                                        background: (settings.showAchieveTargetButtonOnCard ?? true) ? accentColor : isLightMode ? "white" : "rgba(255,255,255,0.6)",
                                                    }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === Card Size === */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Maximize size={14} className={textSecondary} />
                                <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                    カードサイズ
                                </label>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {CARD_SIZE_OPTIONS.map((opt) => {
                                    const presetScale = CARD_SCALE_PRESETS[opt.value];
                                    const isActive = (settings.cardScale ?? 100) === presetScale;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setSettings((s) => ({ ...s, cardSize: opt.value, cardScale: presetScale }))}
                                            className={`py-3 rounded-xl text-center border dango-btn-tier3 ${isActive
                                                ? "shadow-lg"
                                                : `${bgSubtle} ${inputBorder}`
                                                }`}
                                            style={
                                                isActive
                                                    ? {
                                                        background: `${accentColor}20`,
                                                        borderColor: `${accentColor}50`,
                                                        boxShadow: `0 0 12px ${accentColor}20`,
                                                        "--btn-glow-color": accentColor,
                                                    } as React.CSSProperties
                                                    : { "--btn-glow-color": "currentColor" } as React.CSSProperties
                                            }
                                        >
                                            <div
                                                className={`text-lg font-bold ${isActive ? "" : textPrimary}`}
                                                style={isActive ? { color: accentColor } : undefined}
                                            >
                                                {opt.label}
                                            </div>
                                            <div className={`text-[10px] mt-0.5 ${textMuted}`}>{opt.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs ${textMuted} shrink-0`}>{(settings.cardScale ?? 100)}%</span>
                                <input
                                    type="range"
                                    min={CARD_SCALE_MIN}
                                    max={CARD_SCALE_MAX}
                                    value={settings.cardScale ?? 100}
                                    onChange={(e) => setSettings((s) => ({ ...s, cardScale: Number(e.target.value) }))}
                                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, ${accentColor} ${((settings.cardScale ?? 100) - CARD_SCALE_MIN) / (CARD_SCALE_MAX - CARD_SCALE_MIN) * 100}%, ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${((settings.cardScale ?? 100) - CARD_SCALE_MIN) / (CARD_SCALE_MAX - CARD_SCALE_MIN) * 100}%)`,
                                        accentColor,
                                    }}
                                />
                            </div>
                        </div>

                        {/* === Edge Thickness (Flowchart Only) === */}
                        {mode === "chart" && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className={textSecondary} />
                                    <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                        総合計の増減演出
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {(
                                        [
                                            { value: "off" as const, label: "オフ", desc: "演出なし" },
                                            { value: "subtle" as const, label: "控えめ", desc: "短く弱め" },
                                            { value: "normal" as const, label: "標準", desc: "既定" },
                                        ] as const
                                    ).map((opt) => {
                                        const active = (settings.flowchartFxIntensity ?? "normal") === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setSettings((s) => ({ ...s, flowchartFxIntensity: opt.value }))}
                                                className={`py-3 rounded-xl text-center transition-all duration-200 border ${
                                                    active ? "shadow-lg" : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                }`}
                                                style={
                                                    active
                                                        ? {
                                                               background: `${accentColor}20`,
                                                               borderColor: `${accentColor}50`,
                                                               boxShadow: `0 0 12px ${accentColor}20`,
                                                           }
                                                        : undefined
                                                }
                                            >
                                                <div
                                                    className={`text-lg font-bold ${active ? "" : textPrimary}`}
                                                    style={active ? { color: accentColor } : undefined}
                                                >
                                                    {opt.label}
                                                </div>
                                                <div className={`text-[10px] mt-0.5 ${textMuted}`}>{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {mode === "chart" && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className={textSecondary} />
                                    <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                        接続線の流れアニメーション
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {(
                                        [
                                            {
                                                value: "auto" as const,
                                                label: "自動",
                                                desc: "狭い画面ではオフ",
                                            },
                                            { value: "on" as const, label: "オン", desc: "常に表示" },
                                            { value: "off" as const, label: "オフ", desc: "常に非表示" },
                                        ] as const
                                    ).map((opt) => {
                                        const cur =
                                            settings.flowchartEdgeAnimated === true
                                                ? "on"
                                                : settings.flowchartEdgeAnimated === false
                                                  ? "off"
                                                  : "auto";
                                        const active = cur === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() =>
                                                    setSettings((s) => ({
                                                        ...s,
                                                        flowchartEdgeAnimated:
                                                            opt.value === "auto"
                                                                ? undefined
                                                                : opt.value === "on"
                                                                  ? true
                                                                  : false,
                                                    }))
                                                }
                                                className={`py-3 rounded-xl text-center transition-all duration-200 border ${
                                                    active ? "shadow-lg" : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                }`}
                                                style={
                                                    active
                                                        ? {
                                                               background: `${accentColor}20`,
                                                               borderColor: `${accentColor}50`,
                                                               boxShadow: `0 0 12px ${accentColor}20`,
                                                           }
                                                        : undefined
                                                }
                                            >
                                                <div
                                                    className={`text-lg font-bold ${active ? "" : textPrimary}`}
                                                    style={active ? { color: accentColor } : undefined}
                                                >
                                                    {opt.label}
                                                </div>
                                                <div className={`text-[10px] mt-0.5 ${textMuted}`}>{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className={`text-[10px] ${textMuted} -mt-4 mb-6`}>
                                    OS で動きを減らす設定にしているときは、自動的にオフになります
                                </p>
                            </div>
                        )}

                        {mode === "chart" && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className={textSecondary} />
                                    <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                        キャンバス背景
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {(
                                        [
                                            { value: "dots" as const, label: "ドット", desc: "従来どおり" },
                                            { value: "lines" as const, label: "線", desc: "やや軽量" },
                                            { value: "none" as const, label: "なし", desc: "非表示" },
                                        ] as const
                                    ).map((opt) => {
                                        const cur = settings.flowchartGridBackground ?? "dots";
                                        const active = cur === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() =>
                                                    setSettings((s) => ({
                                                        ...s,
                                                        flowchartGridBackground:
                                                            opt.value === "dots" ? undefined : opt.value,
                                                    }))
                                                }
                                                className={`py-3 rounded-xl text-center transition-all duration-200 border ${
                                                    active ? "shadow-lg" : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                }`}
                                                style={
                                                    active
                                                        ? {
                                                               background: `${accentColor}20`,
                                                               borderColor: `${accentColor}50`,
                                                               boxShadow: `0 0 12px ${accentColor}20`,
                                                           }
                                                        : undefined
                                                }
                                            >
                                                <div
                                                    className={`text-lg font-bold ${active ? "" : textPrimary}`}
                                                    style={active ? { color: accentColor } : undefined}
                                                >
                                                    {opt.label}
                                                </div>
                                                <div className={`text-[10px] mt-0.5 ${textMuted}`}>{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {mode === "chart" && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className={textSecondary} />
                                    <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                        線の太さ
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {EDGE_THICKNESS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSettings((s) => ({ ...s, edgeThickness: opt.value }))}
                                            className={`py-3 rounded-xl text-center transition-all duration-200 border ${settings.edgeThickness === opt.value
                                                ? "shadow-lg"
                                                : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                }`}
                                            style={
                                                settings.edgeThickness === opt.value
                                                    ? {
                                                        background: `${accentColor}20`,
                                                        borderColor: `${accentColor}50`,
                                                        boxShadow: `0 0 12px ${accentColor}20`,
                                                    }
                                                    : undefined
                                            }
                                        >
                                            <div
                                                className={`text-lg font-bold ${settings.edgeThickness === opt.value ? "" : textPrimary
                                                    }`}
                                                style={settings.edgeThickness === opt.value ? { color: accentColor } : undefined}
                                            >
                                                {opt.label}
                                            </div>
                                            <div className={`text-[10px] mt-0.5 ${textMuted}`}>{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* === Background Dots Intensity (Flowchart Only) === */}
                        {mode === "chart" && (settings.flowchartGridBackground ?? "dots") !== "none" && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className={textSecondary} />
                                    <label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                                        背景グリッドの濃さ
                                    </label>
                                    <span
                                        className={`ml-auto text-xs font-mono tabular-nums ${textMuted}`}
                                    >
                                        {settings.dotIntensity ?? 50}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.dotIntensity ?? 50}
                                    onChange={(e) => setSettings((s) => ({ ...s, dotIntensity: parseInt(e.target.value, 10) }))}
                                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, ${accentColor} ${settings.dotIntensity ?? 50}%, ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${settings.dotIntensity ?? 50}%)`,
                                        accentColor: accentColor,
                                    }}
                                />
                                <div className={`flex justify-between text-[10px] mt-1 ${textMuted}`}>
                                    <span>なし</span>
                                    <span>最大</span>
                                </div>
                            </div>
                        )}

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

                                        {/* Orientation */}
                                        <div>
                                            <span className={`text-xs ${textMuted} mb-1 block`}>向き</span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button
                                                    onClick={() => setSettings((s) => ({ ...s, projectNameOrientation: "horizontal" }))}
                                                    className={`py-1.5 rounded-lg text-xs font-medium text-center transition-all border ${settings.projectNameOrientation !== "vertical"
                                                        ? ""
                                                        : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                        }`}
                                                    style={
                                                        settings.projectNameOrientation !== "vertical"
                                                            ? { background: `${accentColor}20`, borderColor: `${accentColor}50`, color: accentColor }
                                                            : undefined
                                                    }
                                                >
                                                    横書き
                                                </button>
                                                <button
                                                    onClick={() => setSettings((s) => ({ ...s, projectNameOrientation: "vertical" }))}
                                                    className={`py-1.5 rounded-lg text-xs font-medium text-center transition-all border ${settings.projectNameOrientation === "vertical"
                                                        ? ""
                                                        : `${bgSubtle} ${inputBorder} ${bgSubtleHover}`
                                                        }`}
                                                    style={
                                                        settings.projectNameOrientation === "vertical"
                                                            ? { background: `${accentColor}20`, borderColor: `${accentColor}50`, color: accentColor }
                                                            : undefined
                                                    }
                                                >
                                                    縦書き
                                                </button>
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
                        className="px-5 py-4 shrink-0 flex gap-3"
                        style={{ borderTop: `1px solid ${borderColor}` }}
                    >
                        <button
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${bgSubtle} ${textSecondary} dango-btn-tier3 border ${isLightMode ? "border-black/10" : "border-white/10"}`}
                            style={{ "--btn-glow-color": "rgba(0,0,0,0.1)" } as React.CSSProperties}
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg dango-btn-tier1"
                            style={{
                                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                                boxShadow: `0 10px 20px ${accentColor}30`,
                                "--btn-glow-color": accentColor,
                            } as React.CSSProperties}
                        >
                            保存
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
