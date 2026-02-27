"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { GachaPoolPreset } from "@/lib/gacha";

type SampleTemplate = { id: string; name: string; pool: { id: string } };

interface GachaSwitchDropdownProps {
    sampleTemplates: SampleTemplate[];
    presets: GachaPoolPreset[];
    onSelect: (value: string) => void;
    isLightMode: boolean;
    /** ダークモードで背景が明るいとき true。文字を暗くして視認性を確保 */
    textContrastLight?: boolean;
    className?: string;
    size?: "sm" | "md";
}

export default function GachaSwitchDropdown({
    sampleTemplates,
    presets,
    onSelect,
    isLightMode,
    textContrastLight = false,
    className = "",
    size = "md",
}: GachaSwitchDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const textLight = isLightMode || textContrastLight;
    const textCls = textLight ? "text-gray-900" : "text-white/95";
    const textMuted = textLight ? "text-gray-600" : "text-white/70";
    const hoverCls = textLight ? "hover:bg-black/5" : "hover:bg-white/10";
    const pad = size === "sm" ? "px-2 py-1" : "px-2 py-1.5";
    const widthCls = size === "sm" ? "max-w-[140px]" : "w-40";

    return (
        <div ref={ref} className={`relative shrink-0 ${widthCls} ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center justify-between gap-1 rounded-lg text-xs outline-none border backdrop-blur-md transition-colors ${pad} ${textCls} ${hoverCls}`}
                style={{
                    background: glassBg,
                    borderColor: glassBorder,
                }}
                title="ガチャを切り替え"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="truncate">ガチャを切り替え</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div
                    className="absolute top-full right-0 mt-1 z-[100] rounded-xl overflow-hidden shadow-xl border backdrop-blur-xl max-h-64 overflow-y-auto scroll-touch"
                    style={{
                        background: glassBg,
                        borderColor: glassBorder,
                    }}
                    role="listbox"
                >
                    <div className={`py-1 ${textCls}`}>
                        <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
                            サンプル
                        </div>
                        {sampleTemplates.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                role="option"
                                aria-selected={false}
                                onClick={() => {
                                    onSelect(`sample:${t.id}`);
                                    setOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs ${hoverCls} transition-colors ${textCls}`}
                            >
                                {t.name}
                            </button>
                        ))}
                        {presets.length > 0 && (
                            <>
                                <div className={`px-3 py-1.5 mt-1 text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
                                    保存済み
                                </div>
                                {[...presets].sort((a, b) => b.savedAt - a.savedAt).map((pre) => (
                                    <button
                                        key={pre.id}
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        onClick={() => {
                                            onSelect(`preset:${pre.id}`);
                                            setOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs ${hoverCls} transition-colors ${textCls}`}
                                    >
                                        {pre.name}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
