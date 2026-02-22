"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { CalculatorSettings } from "@/lib/calculator";

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

interface CalculatorSettingsPanelProps {
    settings: CalculatorSettings;
    onSettingsChange: (s: CalculatorSettings) => void;
    isLightMode: boolean;
    onClose?: () => void;
}

export default function CalculatorSettingsPanel({
    settings,
    onSettingsChange,
    isLightMode,
    onClose,
}: CalculatorSettingsPanelProps) {
    const { glassBorder } = useGlassStyle(isLightMode);
    const overlayBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

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
                    <span className={`text-sm font-bold ${textPrimary}`}>電卓設定</span>
                    <button onClick={onClose} className={`p-1 rounded-lg ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
                        <X size={16} className={textSecondary} />
                    </button>
                </div>
                <div className="px-4 py-3 flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto">
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
                            アクセント色
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {ACCENT_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => onSettingsChange({ ...settings, accentColor: c.value })}
                                    className={`h-8 rounded-lg transition-all ${settings.accentColor === c.value ? "ring-2 ring-offset-1" : ""}`}
                                    style={{
                                        background: c.value,
                                        ...(settings.accentColor === c.value ? { boxShadow: `0 0 0 2px ${isLightMode ? "#fff" : "rgba(255,255,255,0.3)"}` } : {}),
                                    }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>
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
                            className="w-full h-2 rounded-full accent-cyan-500"
                        />
                        <p className={`text-[10px] ${textSecondary} mt-0.5`}>{settings.orbIntensity}%</p>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
