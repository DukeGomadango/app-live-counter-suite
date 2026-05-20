"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Settings, RotateCcw, Users } from "lucide-react";
import { useState } from "react";
import { Z_INDEX } from "@/lib/layoutConstants";

interface HeaderProps {
    totalCount: number;
    onToggleSettings: () => void;
    onReset: () => void;
    isSettingsMode: boolean;
}

export default function Header({
    totalCount,
    onToggleSettings,
    onReset,
    isSettingsMode,
}: HeaderProps) {
    const [showControls, setShowControls] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const handleReset = () => {
        if (confirmReset) {
            onReset();
            setConfirmReset(false);
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
        }
    };

    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex items-center justify-between px-4 py-2"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => {
                setShowControls(false);
                setConfirmReset(false);
            }}
            style={{
                zIndex: Z_INDEX.HEADER,
                background: "rgba(10, 5, 30, 0.6)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
        >
            {/* Left side: app info & total */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-purple-400" />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Counter
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    <span className="text-xs text-white/40">合計</span>
                    <AnimatePresence mode="popLayout">
                        <motion.span
                            key={totalCount}
                            initial={{ opacity: 0, y: -8, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="text-sm font-bold tabular-nums"
                            style={{
                                color: totalCount > 0 ? "#a855f7" : "rgba(255,255,255,0.4)",
                                textShadow: totalCount > 0 ? "0 0 10px rgba(168,85,247,0.4)" : "none",
                            }}
                        >
                            {totalCount}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>

            {/* Right side: controls (appear on hover) */}
            <AnimatePresence>
                {(showControls || isSettingsMode) && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5"
                    >
                        <button
                            onClick={handleReset}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all duration-200 ${confirmReset
                                    ? "bg-red-500/20 border border-red-500/30 text-red-400"
                                    : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                                }`}
                        >
                            <RotateCcw size={11} />
                            {confirmReset ? "確認" : "リセット"}
                        </button>
                        <button
                            onClick={onToggleSettings}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all duration-200 border ${isSettingsMode
                                    ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                                }`}
                        >
                            <Settings size={11} />
                            設定
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
