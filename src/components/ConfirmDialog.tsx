"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

export default function ConfirmDialog({
    open,
    title = "確認",
    message,
    confirmLabel = "実行する",
    cancelLabel = "キャンセル",
    onConfirm,
    onCancel,
    danger = false,
}: ConfirmDialogProps) {
    const { isLightMode } = useTheme();

    useEffect(() => {
        if (!open) return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [open, onCancel]);

    // Theme-aware styles matching Dango Tool standards
    const bgPanel = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,12,45,0.95)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const bgSubtleHover = isLightMode ? "hover:bg-black/10" : "hover:bg-white/10";

    // Adaptive Ambient Glow
    const overlayBg = danger 
        ? (isLightMode ? "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(0,0,0,0.4) 100%)" : "radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(0,0,0,0.6) 100%)")
        : (isLightMode ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.6)");

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="confirm-dialog-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ 
                        background: overlayBg, 
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)"
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        style={{
                            background: bgPanel,
                            border: `1px solid ${borderColor}`,
                            perspective: "1000px"
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 2026 Light Sweep Effect */}
                        <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                                transform: "skewX(-20deg)"
                            }}
                        />

                        {/* Content Area */}
                        <div className="p-8 pb-6">
                            <div className="flex flex-col items-center text-center gap-5">
                                {/* Pulsing Warning Icon */}
                                <motion.div 
                                    animate={{ 
                                        boxShadow: danger 
                                            ? ["0 0 0px rgba(239,68,68,0)", "0 0 25px rgba(239,68,68,0.4)", "0 0 0px rgba(239,68,68,0)"]
                                            : ["0 0 0px rgba(168,85,247,0)", "0 0 25px rgba(168,85,247,0.4)", "0 0 0px rgba(168,85,247,0)"]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                                        danger 
                                            ? "bg-red-500/20 border-red-500/30 text-red-400" 
                                            : "bg-purple-500/20 border-purple-500/30 text-purple-400"
                                    }`}
                                >
                                    <AlertTriangle size={32} />
                                </motion.div>
                                
                                <div className="space-y-2">
                                    <h2 id="confirm-dialog-title" className={`text-xl font-black tracking-tight ${textPrimary}`}>
                                        {title}
                                    </h2>
                                    <p className={`text-sm ${textSecondary} leading-relaxed px-2 font-medium`}>
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Buttons */}
                        <div className="flex gap-3 p-6 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all dango-btn-tier3 border ${
                                    isLightMode 
                                        ? "bg-black/5 border-black/5 text-gray-500 hover:bg-black/10" 
                                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                }`}
                                style={{ "--btn-glow-color": "rgba(0,0,0,0.1)" } as any}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all dango-btn-tier3 border shadow-lg ${
                                    danger
                                        ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 shadow-red-500/10"
                                        : "bg-purple-500/20 border-purple-500/40 text-purple-400 hover:bg-purple-500/30 shadow-purple-500/10"
                                }`}
                                style={{ "--btn-glow-color": danger ? "rgba(239,68,68,0.5)" : "rgba(168,85,247,0.5)" } as any}
                            >
                                {confirmLabel}
                            </button>
                        </div>

                        {/* Close Icon (Top Right) */}
                        <button
                            onClick={onCancel}
                            className={`absolute top-5 right-5 p-1.5 rounded-xl transition-colors ${bgSubtleHover} ${textSecondary} opacity-40 hover:opacity-100`}
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


