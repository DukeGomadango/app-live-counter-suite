"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_ITEM_EMOJI, EMOJI_OPTIONS } from "@/lib/constants";

interface AddItemPanelProps {
    isLightMode: boolean;
    onAddItem: (label: string, emoji: string) => void;
    onExpand: () => void;
    onCollapse: () => void;
}

export default function AddItemPanel({ isLightMode, onAddItem, onExpand, onCollapse }: AddItemPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState("");
    const [emoji, setEmoji] = useState(DEFAULT_ITEM_EMOJI);
    const [isHovered, setIsHovered] = useState(false);

    // Add variables for mobile detection and modal state
    const [isMobile, setIsMobile] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Use microtask to avoid "setState synchronously within an effect" lint error
        Promise.resolve().then(() => setMounted(true));

        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleAdd = useCallback(() => {
        if (label.trim()) {
            onAddItem(label.trim(), emoji);
            setLabel("");
            setEmoji(DEFAULT_ITEM_EMOJI);
            setIsEditing(false);
            setIsHovered(false);
            setIsModalOpen(false);
            onCollapse();
        }
    }, [label, emoji, onAddItem, onCollapse]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setIsHovered(false);
        setIsModalOpen(false);
        onCollapse();
    }, [onCollapse]);

    const handleMouseEnter = useCallback(() => {
        if (isMobile) return;
        setIsHovered(true);
        onExpand();
    }, [isMobile, onExpand]);

    const handleMouseLeave = useCallback(() => {
        if (isMobile) return;
        setIsHovered(false);
        if (!isEditing) {
            onCollapse();
        }
    }, [isMobile, isEditing, onCollapse]);

    const borderColor = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
    const hoverBorderColor = isLightMode ? "rgba(168,85,247,0.4)" : "rgba(168,85,247,0.5)";

    const modalContent = isModalOpen && mounted ? (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                onClick={handleCancel}
                style={{ touchAction: "none" }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-sm rounded-[24px] p-5 shadow-2xl"
                    style={{
                        background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.95)",
                        border: isLightMode ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(168,85,247,0.3)",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(168,85,247,0.2)",
                    }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-base font-bold ${isLightMode ? "text-gray-800" : "text-white"}`}>項目を追加</h3>
                        <button onClick={handleCancel} aria-label="モーダルを閉じる" className={`w-8 h-8 rounded-full flex items-center justify-center ${isLightMode ? "bg-black/5 hover:bg-black/10" : "bg-white/10 hover:bg-white/20"} transition-colors`}>
                            <X size={16} className={isLightMode ? "text-gray-600" : "text-white/70"} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center mb-6 max-h-[160px] overflow-y-auto scroll-touch pr-1">
                        {EMOJI_OPTIONS.map((e) => (
                            <button
                                key={e}
                                type="button"
                                onClick={() => setEmoji(e)}
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl transition-all ${emoji === e
                                    ? "bg-purple-500/30 border border-purple-500/50 scale-110 shadow-lg"
                                    : `${isLightMode ? "hover:bg-black/5 bg-black/5" : "hover:bg-white/10 bg-white/5"}`
                                    }`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>

                    <p className={`text-xs font-bold mb-2 ml-1 ${isLightMode ? "text-gray-500" : "text-white/50"}`}>項目名</p>
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                            if (e.key === "Escape") handleCancel();
                        }}
                        placeholder="例：水曜日のネコ"
                        autoFocus
                        className={`w-full px-4 py-3.5 rounded-xl text-[15px] font-medium mb-6 outline-none transition-colors ${isLightMode
                            ? "bg-black/5 border border-black/10 text-gray-800 placeholder:text-gray-400 focus:border-purple-400/50 focus:bg-white"
                            : "bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:border-purple-500/50"
                            }`}
                    />

                    <button
                        onClick={handleAdd}
                        disabled={!label.trim()}
                        className="w-full py-3.5 rounded-xl text-base font-bold bg-purple-500/20 border border-purple-500/40 text-[rgba(168,85,247,0.9)] hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:border-transparent flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        追加する
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    ) : null;

    if (isMobile) {
        return (
            <>
                <div className="flex items-center justify-center p-2 w-full h-full">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        aria-label="項目を追加するモーダルを開く"
                        className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
                        style={{
                            border: `2px dashed ${hoverBorderColor}`,
                            background: isLightMode ? "rgba(168,85,247,0.04)" : "rgba(168,85,247,0.05)",
                        }}
                    >
                        <Plus size={28} className={isLightMode ? "text-purple-500" : "text-purple-400"} />
                        <span className={`text-xs font-medium ${isLightMode ? "text-purple-500" : "text-purple-400"}`}>
                            項目を追加
                        </span>
                    </button>
                </div>
                {mounted && document.body && createPortal(modalContent, document.body)}
            </>
        );
    }

    if (isEditing) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-square"
                onMouseLeave={handleMouseLeave}
            >
                <div
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl w-full h-full p-3"
                    style={{
                        background: isLightMode
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(12px)",
                        border: `1px solid ${isLightMode ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.3)"}`,
                        boxShadow: "0 0 20px rgba(168,85,247,0.1)",
                    }}
                >
                    <div className="flex flex-wrap gap-1 justify-center max-h-[120px] overflow-y-auto scroll-touch pr-1">
                        {EMOJI_OPTIONS.map((e) => (
                            <button
                                key={e}
                                type="button"
                                onClick={() => setEmoji(e)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all ${emoji === e
                                    ? "bg-purple-500/30 border border-purple-500/50 scale-110"
                                    : `${isLightMode ? "hover:bg-black/5" : "hover:bg-white/10"}`
                                    }`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                            if (e.key === "Escape") handleCancel();
                        }}
                        placeholder="項目名..."
                        autoFocus
                        className={`w-full px-2 py-1.5 rounded-lg text-xs text-center outline-none transition-colors ${isLightMode
                            ? "bg-black/5 border border-black/10 text-gray-800 placeholder:text-gray-400 focus:border-purple-400/50"
                            : "bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:border-purple-500/50"
                            }`}
                    />
                    <div className="flex gap-1.5 w-full">
                        <button
                            onClick={handleCancel}
                            className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${isLightMode
                                ? "bg-black/5 text-gray-500 hover:bg-black/10"
                                : "bg-white/5 text-white/40 hover:bg-white/10"
                                }`}
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!label.trim()}
                            className="flex-1 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-30"
                        >
                            追加
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // When not hovered: tiny dot-like button. When hovered: full panel.
    if (!isHovered) {
        return (
            <motion.div
                layout
                className="flex items-center justify-center p-2 w-full h-full"
                onMouseEnter={handleMouseEnter}
            >
                <button
                    onClick={() => { setIsEditing(true); onExpand(); }}
                    aria-label="新しい項目の入力を開始"
                    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                    style={{
                        border: `2px dashed ${borderColor}`,
                        background: "transparent",
                    }}
                >
                    <Plus
                        size={14}
                        className={isLightMode ? "text-black/40" : "text-white/40"}
                    />
                </button>
            </motion.div>
        );
    }

    // Hovered: expand to full grid cell
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="aspect-square w-full h-full p-2"
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => { setIsEditing(true); onExpand(); }}
                aria-label="新しい項目の入力を開始"
                className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
                style={{
                    border: `2px dashed ${hoverBorderColor}`,
                    background: isLightMode
                        ? "rgba(168,85,247,0.04)"
                        : "rgba(168,85,247,0.05)",
                }}
            >
                <Plus
                    size={28}
                    className={isLightMode ? "text-purple-500" : "text-purple-400"}
                />
                <span
                    className={`text-xs font-medium ${isLightMode ? "text-purple-500" : "text-purple-400"}`}
                >
                    項目を追加
                </span>
            </button>
        </motion.div>
    );
}
