"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Trash2, Pencil } from "lucide-react";
import { useState, useCallback } from "react";

interface CounterPanelProps {
    id: string;
    label: string;
    emoji: string;
    color: string;
    count: number;
    target: number;
    onIncrement: (id: string) => void;
    onDecrement: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onEditItem: (id: string) => void;
    isLightMode: boolean;
}

export default function CounterPanel({
    id,
    label,
    emoji,
    color,
    count,
    target,
    onIncrement,
    onDecrement,
    onDeleteItem,
    onEditItem,
    isLightMode,
}: CounterPanelProps) {
    const [isPop, setIsPop] = useState(false);
    const [popDirection, setPopDirection] = useState<"up" | "down">("up");
    const [isHovered, setIsHovered] = useState(false);

    const handleLeftClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            onIncrement(id);
            setPopDirection("up");
            setIsPop(true);
            setTimeout(() => setIsPop(false), 300);
        },
        [id, onIncrement]
    );

    const handleIncrement = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onIncrement(id);
            setPopDirection("up");
            setIsPop(true);
            setTimeout(() => setIsPop(false), 300);
        },
        [id, onIncrement]
    );

    const handleDecrement = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (count > 0) {
                onDecrement(id);
                setPopDirection("down");
                setIsPop(true);
                setTimeout(() => setIsPop(false), 300);
            }
        },
        [id, count, onDecrement]
    );

    // Prevent context menu
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
    }, []);

    // Theme-aware styles
    const panelBg = isLightMode
        ? "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.15) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
    const panelBorder = isLightMode
        ? "1px solid rgba(255,255,255,0.5)"
        : "1px solid rgba(255,255,255,0.1)";
    const panelShadow = isLightMode
        ? `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)`
        : `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`;
    const countColor = count > 0 ? color : isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)";
    const countShadow = count > 0
        ? `0 0 20px ${color}60, 0 0 40px ${color}30`
        : "none";
    const labelColor = isLightMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";
    const targetReached = target > 0 && count >= target;

    // Arrow button styles
    const arrowBg = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
    const arrowHoverBg = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)";
    const arrowColor = isLightMode ? "text-gray-500" : "text-white/60";

    return (
        <div
            className="no-context-menu relative group aspect-square"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                onClick={handleLeftClick}
                onContextMenu={handleContextMenu}
                className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden w-full h-full"
                style={{
                    background: panelBg,
                    backdropFilter: isLightMode ? "blur(20px) saturate(1.2)" : "blur(16px)",
                    WebkitBackdropFilter: isLightMode ? "blur(20px) saturate(1.2)" : "blur(16px)",
                    border: targetReached ? `2px solid ${color}80` : panelBorder,
                    boxShadow: targetReached ? `${panelShadow}, 0 0 20px ${color}30` : panelShadow,
                }}
            >
                {/* Glow effect on hover */}
                <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                        background: `radial-gradient(circle at center, ${color}18 0%, transparent 70%)`,
                        boxShadow: `inset 0 0 40px ${color}10`,
                    }}
                />

                {/* Accent line at top */}
                <div
                    className="absolute top-0 left-[10%] right-[10%] h-[1.5px] opacity-70"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                    }}
                />

                {/* Emoji */}
                <span className="relative z-10 drop-shadow-lg text-xl sm:text-2xl lg:text-3xl">
                    {emoji}
                </span>

                {/* Count row: △ count/target ▽ */}
                <div className="relative z-10 flex items-center gap-0.5">
                    {/* Count number with animation */}
                    <div className="flex items-baseline gap-0.5">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={count}
                                initial={{
                                    opacity: 0,
                                    y: popDirection === "up" ? 10 : -10,
                                    scale: 0.5,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: isPop ? 1.3 : 1,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: popDirection === "up" ? -10 : 10,
                                    scale: 0.5,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 25,
                                }}
                                className="font-bold tabular-nums text-2xl sm:text-3xl lg:text-4xl"
                                style={{
                                    color: countColor,
                                    textShadow: countShadow,
                                }}
                            >
                                {count}
                            </motion.span>
                        </AnimatePresence>

                        {/* Target */}
                        {target > 0 && (
                            <span
                                className="text-xs sm:text-sm font-medium tabular-nums"
                                style={{
                                    color: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)",
                                }}
                            >
                                /{target}
                            </span>
                        )}
                    </div>

                    {/* △▽ buttons - right side of count */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -5 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col gap-0.5 ml-1"
                            >
                                <button
                                    onClick={handleIncrement}
                                    aria-label={`${label}を1増やす`}
                                    className={`w-5 h-4 sm:w-6 sm:h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${arrowColor}`}
                                    style={{ background: arrowBg }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = arrowHoverBg; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = arrowBg; }}
                                >
                                    <ChevronUp size={14} />
                                </button>
                                {count > 0 && (
                                    <button
                                        onClick={handleDecrement}
                                        aria-label={`${label}を1減らす`}
                                        className={`w-5 h-4 sm:w-6 sm:h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${arrowColor}`}
                                        style={{ background: arrowBg }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = arrowHoverBg; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = arrowBg; }}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Label */}
                <span
                    className="relative z-10 font-medium tracking-wide text-xs sm:text-sm"
                    style={{ color: labelColor }}
                >
                    {label}
                </span>

                {/* Target reached indicator - Absolutely positioned to prevent layout shift */}
                {targetReached && (
                    <span
                        className="absolute top-1.5 left-2 z-20 text-[10px] font-bold tracking-wider"
                        style={{ color }}
                    >
                        ✓ 達成
                    </span>
                )}

                {/* Edit & Delete buttons - top right on hover */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.12 }}
                            className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditItem(id); }}
                                aria-label={`${label}を編集`}
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                                style={{
                                    background: isLightMode ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.15)",
                                    border: isLightMode ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(139,92,246,0.25)",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = isLightMode ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.3)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isLightMode ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.15)"; }}
                            >
                                <Pencil size={10} className="text-purple-400" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem(id); }}
                                aria-label={`${label}を削除`}
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                                style={{
                                    background: isLightMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.15)",
                                    border: isLightMode ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(239,68,68,0.25)",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = isLightMode ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.3)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isLightMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.15)"; }}
                            >
                                <Trash2 size={11} className="text-red-400" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ripple effect */}
                <AnimatePresence>
                    {isPop && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute inset-0 rounded-2xl z-0"
                            style={{ border: `2px solid ${color}` }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
