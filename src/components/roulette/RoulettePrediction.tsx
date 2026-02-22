"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface RoulettePredictionProps {
    value: string;
    onChange: (value: string) => void;
    slots: string[];
    isLightMode: boolean;
    placeholder?: string;
}

export default function RoulettePrediction({
    value,
    onChange,
    slots,
    isLightMode,
    placeholder = "予想を入力 or 選択",
}: RoulettePredictionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/60";
    const dropdownBg = isLightMode ? "rgba(255,255,255,0.98)" : "rgba(20,12,45,0.98)";
    const dropdownBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)";

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div
            className="rounded-xl border p-3 flex flex-col gap-2"
            style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(12px)" }}
        >
            <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>予想</label>
            <div className="flex flex-wrap gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`flex-1 min-w-[120px] px-3 py-2 rounded-lg text-sm border ${isLightMode ? "bg-white/90 border-gray-200 text-gray-800 placeholder:text-gray-400" : "bg-white/10 border-white/20 text-white placeholder:text-white/40"}`}
                />
                {slots.length > 0 && slots.length <= 30 && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border min-w-[100px] justify-between ${isLightMode ? "bg-white/90 border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
                        >
                            <span className="truncate">{value || "選択..."}</span>
                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-xl z-50 max-h-48 overflow-y-auto"
                                    style={{
                                        background: dropdownBg,
                                        borderColor: dropdownBorder,
                                        backdropFilter: "blur(12px)",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => { onChange(""); setIsOpen(false); }}
                                        className={`w-full px-3 py-2 text-left text-sm ${isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"}`}
                                    >
                                        選択...
                                    </button>
                                    {slots.map((label) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => { onChange(label); setIsOpen(false); }}
                                            className={`w-full px-3 py-2 text-left text-sm truncate ${value === label ? (isLightMode ? "bg-purple-100 text-purple-800" : "bg-purple-500/20 text-purple-200") : isLightMode ? "text-gray-800 hover:bg-gray-100" : "text-white/90 hover:bg-white/10"}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
