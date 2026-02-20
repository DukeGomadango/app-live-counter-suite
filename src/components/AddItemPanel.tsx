"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState, useCallback } from "react";

interface AddItemPanelProps {
    isLightMode: boolean;
    onAddItem: (label: string, emoji: string) => void;
    onExpand: () => void;
    onCollapse: () => void;
}

const QUICK_EMOJIS = [
    "⭐", "🌟", "💎", "🔥", "❤️", "💜", "💙", "💚",
    "🎯", "🎨", "🎵", "🎮", "🐱", "🐶", "🌸", "🌈",
    "😀", "😎", "👑", "🏆", "🍎", "🌙", "⚽", "🚀",
];

export default function AddItemPanel({ isLightMode, onAddItem, onExpand, onCollapse }: AddItemPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState("");
    const [emoji, setEmoji] = useState("⭐");
    const [isHovered, setIsHovered] = useState(false);

    const handleAdd = useCallback(() => {
        if (label.trim()) {
            onAddItem(label.trim(), emoji);
            setLabel("");
            setEmoji(QUICK_EMOJIS[0]);
            setIsEditing(false);
            setIsHovered(false);
            onCollapse();
        }
    }, [label, emoji, onAddItem, onCollapse]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setIsHovered(false);
        onCollapse();
    }, [onCollapse]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        onExpand();
    }, [onExpand]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        if (!isEditing) {
            onCollapse();
        }
    }, [isEditing, onCollapse]);

    const borderColor = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
    const hoverBorderColor = isLightMode ? "rgba(168,85,247,0.4)" : "rgba(168,85,247,0.5)";

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
                    <div className="flex flex-wrap gap-1 justify-center">
                        {QUICK_EMOJIS.slice(0, 16).map((e) => (
                            <button
                                key={e}
                                onClick={() => setEmoji(e)}
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-all ${emoji === e
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

    // Always show the tiny dot-like button when not editing, but handle hover events
    return (
        <motion.div
            layout
            className="flex items-center justify-center aspect-square w-full h-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => { setIsEditing(true); onExpand(); }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                style={{
                    border: `2px dashed ${isHovered ? hoverBorderColor : borderColor}`,
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
