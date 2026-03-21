"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Trash2, Pencil } from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo, type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { CardSize } from "@/components/SettingsModal";
import { StepKeypad, type StepKeypadColumn } from "@/components/StepKeypad";

const ARROW_BTN_SIZE_CLASS: Record<CardSize, string> = {
    S: "w-5 h-4 sm:w-6 sm:h-5",
    M: "w-5 h-4 sm:w-6 sm:h-5",
    L: "w-6 h-5 sm:w-7 sm:h-6",
    XL: "w-7 h-6 sm:w-8 sm:h-7",
};

const ARROW_ICON_SIZE: Record<CardSize, number> = {
    S: 14,
    M: 14,
    L: 16,
    XL: 18,
};

/** 数字表示のフォントサイズ（cardSize に連動し、行全体のスケールを揃える） */
const COUNT_TEXT_CLASS: Record<CardSize, string> = {
    S: "text-2xl sm:text-3xl lg:text-4xl",
    M: "text-2xl sm:text-3xl lg:text-4xl",
    L: "text-3xl sm:text-4xl lg:text-5xl",
    XL: "text-4xl sm:text-5xl lg:text-6xl",
};

/** 768px 以上の正方形カード内（ホバー前も読みやすいよう、はみ出しない範囲で一段大きめ） */
const COUNT_TEXT_CLASS_SQUARE: Record<CardSize, string> = {
    S: "text-xl",
    M: "text-2xl",
    L: "text-3xl",
    XL: "text-4xl",
};

/** 直接編集用: 先頭のマイナスと数字のみ残す */
function sanitizeSignedCountInput(raw: string): string {
    const digitsAndMinus = raw.replace(/[^0-9-]/g, "");
    if (digitsAndMinus.startsWith("-")) {
        return "-" + digitsAndMinus.slice(1).replace(/-/g, "");
    }
    return digitsAndMinus.replace(/-/g, "");
}

interface CounterPanelProps {
    id: string;
    label: string;
    emoji: string;
    color: string;
    count: number;
    target: number;
    onIncrement: (id: string) => void;
    onDecrement: (id: string) => void;
    onSetCount?: (id: string, value: number) => void;
    onAdjustBy?: (id: string, delta: number) => void;
    showStep5?: boolean;
    showStep10?: boolean;
    showStepFree?: boolean;
    stepFreeValue?: number;
  onRequestAchieveTarget?: (id: string) => void;
  showAchieveTargetButton?: boolean;
    onDeleteItem: (id: string) => void;
    onEditItem: (id: string) => void;
    isLightMode: boolean;
    isOverlay?: boolean;
    /** カード上に編集・削除ボタンを表示する（設定でオフにできる） */
    showEditDeleteOnCard?: boolean;
    /** カードサイズ（L/XL で ±5・±10 と △▽ を大きく表示） */
    cardSize?: CardSize;
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
    onSetCount,
    onAdjustBy,
    showStep5 = true,
    showStep10 = true,
    showStepFree = false,
    stepFreeValue = 1,
    onDeleteItem,
    onEditItem,
    isLightMode,
    isOverlay = false,
    showEditDeleteOnCard = true,
    cardSize = "M",
  onRequestAchieveTarget,
  showAchieveTargetButton = true,
}: CounterPanelProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: isOverlay });
    const lastIncrementAt = useRef<number>(0);
    const pointerHandled = useRef(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const incrementPointerDownRef = useRef(false);
    const decrementPointerDownRef = useRef(false);
    const tapPendingRef = useRef(false);
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isPop, setIsPop] = useState(false);
    const [popDirection, setPopDirection] = useState<"up" | "down">("up");
    const [isHovered, setIsHovered] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const showHoverControls = isHovered || !isDesktop;
    /** タブレット/PC で S/M のときも ± と △▽ を少なくとも L サイズにし、＋と－のサイズを常に揃える */
    const effectiveCardSizeForButtons: CardSize =
        isDesktop && (cardSize === "S" || cardSize === "M") ? "L" : cardSize;
    const countTextClass = isDesktop
        ? (COUNT_TEXT_CLASS_SQUARE[cardSize] ?? COUNT_TEXT_CLASS_SQUARE.M)
        : (COUNT_TEXT_CLASS[cardSize] ?? COUNT_TEXT_CLASS.M);
    const countFontClass = isDesktop ? "font-extrabold" : "font-bold";
    const [isEditingCount, setIsEditingCount] = useState(false);
    const [editCountValue, setEditCountValue] = useState("");

    const doIncrement = useCallback(() => {
        if (pointerHandled.current) return;
        if (isEditingCount) return;
        const now = Date.now();
        if (now - lastIncrementAt.current < 400) return;
        lastIncrementAt.current = now;
        pointerHandled.current = true;
        onIncrement(id);
        setPopDirection("up");
        setIsPop(true);
        setTimeout(() => setIsPop(false), 300);
        setTimeout(() => { pointerHandled.current = false; }, 300);
    }, [id, onIncrement, isEditingCount]);

    // パネル領域: イベントを親（sortable）にバブルさせつつ、短いタップ時だけ pointerup で増加（長押しドラッグでは増やさない）
    const TAP_WINDOW_MS = 200;
    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            const el = e.target as HTMLElement;
            if (el.closest("button") || el.closest("[data-count-editable]") || el.closest("input")) return;
            if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
            tapPendingRef.current = true;
            tapTimerRef.current = setTimeout(() => {
                tapPendingRef.current = false;
                tapTimerRef.current = null;
            }, TAP_WINDOW_MS);
            // stopPropagation しないので sortable が pointer を受け取りドラッグできる
        },
        []
    );

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            const el = e.target as HTMLElement;
            if (el.closest("button") || el.closest("[data-count-editable]") || el.closest("input")) return;
            if (tapTimerRef.current) {
                clearTimeout(tapTimerRef.current);
                tapTimerRef.current = null;
            }
            if (tapPendingRef.current) {
                tapPendingRef.current = false;
                doIncrement();
            }
        },
        [doIncrement]
    );

    const handleLeftClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // 増加は handlePointerUp で行うため、click では何もしない
        },
        []
    );

    const HOLD_DELAY_MS = 400;
    const REPEAT_INTERVAL_MS = 80;

    const stopRepeat = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        if (repeatIntervalRef.current) {
            clearInterval(repeatIntervalRef.current);
            repeatIntervalRef.current = null;
        }
    }, []);

    useEffect(() => () => stopRepeat(), [stopRepeat]);
    useEffect(() => () => {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    }, []);

    const handleIncrementPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            incrementPointerDownRef.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            stopRepeat();
            holdTimerRef.current = setTimeout(() => {
                holdTimerRef.current = null;
                repeatIntervalRef.current = setInterval(() => {
                    onIncrement(id);
                }, REPEAT_INTERVAL_MS);
            }, HOLD_DELAY_MS);
        },
        [id, onIncrement, stopRepeat]
    );

    const handleIncrementPointerUp = useCallback(
        (e: React.PointerEvent) => {
            e.stopPropagation();
            const hadPointerDown = incrementPointerDownRef.current;
            incrementPointerDownRef.current = false;
            const wasRepeating = repeatIntervalRef.current !== null;
            stopRepeat();
            try {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
            } catch { /* ignore */ }
            if (hadPointerDown && !wasRepeating) doIncrement();
        },
        [doIncrement, stopRepeat]
    );

    const handleIncrementClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // 1回目は handleIncrementPointerUp で doIncrement するため、click では何もしない
    }, []);

    const handleDecrementPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            decrementPointerDownRef.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            stopRepeat();
            holdTimerRef.current = setTimeout(() => {
                holdTimerRef.current = null;
                repeatIntervalRef.current = setInterval(() => {
                    onDecrement(id);
                }, REPEAT_INTERVAL_MS);
            }, HOLD_DELAY_MS);
        },
        [id, onDecrement, stopRepeat]
    );

    const handleDecrementPointerUp = useCallback(
        (e: React.PointerEvent) => {
            e.stopPropagation();
            const hadPointerDown = decrementPointerDownRef.current;
            decrementPointerDownRef.current = false;
            const wasRepeating = repeatIntervalRef.current !== null;
            stopRepeat();
            try {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
            } catch { /* ignore */ }
            if (hadPointerDown && !wasRepeating) {
                onDecrement(id);
                setPopDirection("down");
                setIsPop(true);
                setTimeout(() => setIsPop(false), 300);
            }
        },
        [id, onDecrement, stopRepeat]
    );

    const handleDecrementClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

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
    const countColor =
        count !== 0 ? color : isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)";
    const countShadow =
        count !== 0
            ? `0 0 20px ${color}60, 0 0 40px ${color}30`
            : "none";
    const labelColor = isLightMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";
    const targetReached = target > 0 && count >= target;
  const canAchieveTarget = target > 0 && count < target && !!onRequestAchieveTarget;

    /** ドラッグ中のみ none（スクロールで並べ替えが途切れない）。それ以外は pan-y でカード上からも縦スクロールできる。 */
    const sortableTouchAction: CSSProperties["touchAction"] =
        isOverlay ? undefined : isDragging ? "none" : "pan-y";

    // Arrow button styles
    const arrowBg = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
    const arrowHoverBg = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)";
    const arrowColor = isLightMode ? "text-gray-500" : "text-white/60";

    const stepKeypadColumns = useMemo((): StepKeypadColumn[] => {
        const c: StepKeypadColumn[] = [];
        if (showStep5) {
            c.push({ plusLabel: "+5", minusLabel: "-5", plus: 5, minus: -5, disabledMinus: false });
        }
        if (showStep10) {
            c.push({ plusLabel: "+10", minusLabel: "-10", plus: 10, minus: -10, disabledMinus: false });
        }
        if (showStepFree && stepFreeValue >= 1) {
            c.push({
                plusLabel: `+${stepFreeValue}`,
                minusLabel: `-${stepFreeValue}`,
                plus: stepFreeValue,
                minus: -stepFreeValue,
                disabledMinus: false,
            });
        }
        return c;
    }, [showStep5, showStep10, showStepFree, stepFreeValue]);

    const hasStepControls = stepKeypadColumns.length > 0 && !!onAdjustBy;

    const stepControlsMotion = (
        <AnimatePresence>
            {showHoverControls && hasStepControls && onAdjustBy && (
                <motion.div
                    key="step-controls"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col w-full shrink-0 items-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <StepKeypad
                        id={id}
                        columns={stepKeypadColumns}
                        onAdjustBy={onAdjustBy}
                        isLightMode={isLightMode}
                        cardSize={effectiveCardSizeForButtons}
                        fullWidth
                        compact={isDesktop}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            style={{
                transform: isOverlay ? undefined : CSS.Translate.toString(transform),
                transition: isOverlay ? undefined : transition,
                zIndex: isDragging ? 50 : 0,
                opacity: isDragging ? 0.5 : 1,
                touchAction: sortableTouchAction,
            }}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
            className={`no-context-menu relative group w-full ${isDesktop ? "aspect-square" : "h-auto"} ${isOverlay ? "cursor-grabbing" : isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                onClick={handleLeftClick}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                    if (tapTimerRef.current) {
                        clearTimeout(tapTimerRef.current);
                        tapTimerRef.current = null;
                    }
                    tapPendingRef.current = false;
                }}
                onContextMenu={handleContextMenu}
                className={
                    isDesktop
                        ? "relative flex flex-col items-center h-full min-h-0 gap-0 py-1 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden w-full"
                        : "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden w-full h-auto min-h-0 py-0.5"
                }
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

                {/* Emoji（PC 正方形内では一段小さく） */}
                <span
                    className={
                        isDesktop
                            ? "relative z-10 shrink-0 drop-shadow-lg text-lg sm:text-xl leading-none"
                            : "relative z-10 drop-shadow-lg text-xl sm:text-2xl lg:text-3xl"
                    }
                >
                    {emoji}
                </span>

                {/* Count block: 上段は △▽+数字、下段はステップキーパッド（全幅）。PC は flex-1 で正方形内に収める */}
                <div
                    className={
                        isDesktop
                            ? "relative z-10 flex flex-1 min-h-0 flex-col items-center justify-center gap-0.5 min-w-0 w-full px-0.5"
                            : "relative z-10 flex flex-col items-center gap-0.5 min-w-0 w-full"
                    }
                >
                    <div className="flex items-center justify-center gap-1 min-w-0 w-full">
                        {/* 左: △▽（768px 未満は常時、以上はホバー時） */}
                        <AnimatePresence>
                            {showHoverControls && (
                                <motion.div
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-col gap-0.5 shrink-0"
                                >
                                    <button
                                        type="button"
                                        onClick={handleIncrementClick}
                                        onPointerDown={handleIncrementPointerDown}
                                        onPointerUp={handleIncrementPointerUp}
                                        onPointerLeave={handleIncrementPointerUp}
                                        onPointerCancel={handleIncrementPointerUp}
                                        aria-label={`${label}を1増やす（長押しで連続）`}
                                        className={`${ARROW_BTN_SIZE_CLASS[effectiveCardSizeForButtons]} rounded flex items-center justify-center cursor-pointer transition-colors select-none ${arrowColor}`}
                                        style={{ background: arrowBg }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = arrowHoverBg; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = arrowBg; }}
                                    >
                                        <ChevronUp size={ARROW_ICON_SIZE[effectiveCardSizeForButtons]} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDecrementClick}
                                        onPointerDown={handleDecrementPointerDown}
                                        onPointerUp={handleDecrementPointerUp}
                                        onPointerLeave={handleDecrementPointerUp}
                                        onPointerCancel={handleDecrementPointerUp}
                                        aria-label={`${label}を1減らす（長押しで連続）`}
                                        className={`${ARROW_BTN_SIZE_CLASS[effectiveCardSizeForButtons]} rounded flex items-center justify-center cursor-pointer transition-colors select-none ${arrowColor}`}
                                        style={{ background: arrowBg }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = arrowHoverBg; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = arrowBg; }}
                                    >
                                        <ChevronDown size={ARROW_ICON_SIZE[effectiveCardSizeForButtons]} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 中央: 数字 / target */}
                        <div className="flex-1 flex justify-center items-baseline min-w-0">
                            <div className="flex items-baseline gap-0.5">
                                {isEditingCount && onSetCount ? (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={editCountValue}
                                        onChange={(e) => setEditCountValue(sanitizeSignedCountInput(e.target.value))}
                                        onBlur={() => {
                                            const t = editCountValue.trim();
                                            const n =
                                                t === "" || t === "-"
                                                    ? 0
                                                    : (() => {
                                                        const p = parseInt(t, 10);
                                                        return Number.isNaN(p) ? 0 : p;
                                                    })();
                                            onSetCount(id, n);
                                            setIsEditingCount(false);
                                        }}
                                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                                        autoFocus
                                        className={`${countFontClass} tabular-nums ${countTextClass} w-[4.5rem] sm:w-24 min-w-0 bg-transparent border-b-2 outline-none text-center`}
                                        style={{ color: countColor, borderColor: color }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        data-count-editable
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { e.stopPropagation(); if (onSetCount) { setIsEditingCount(true); setEditCountValue(String(count)); } }}
                                        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && onSetCount) { e.preventDefault(); setIsEditingCount(true); setEditCountValue(String(count)); } }}
                                        className={`${countFontClass} tabular-nums ${countTextClass} ${onSetCount ? "cursor-text rounded px-0.5 hover:bg-black/5 dark:hover:bg-white/5" : ""}`}
                                        style={{ color: countColor, textShadow: countShadow }}
                                        title={onSetCount ? "クリックで数を直接編集" : undefined}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            <motion.span
                                                key={count}
                                                initial={{ opacity: 0, y: popDirection === "up" ? 10 : -10, scale: 0.5 }}
                                                animate={{ opacity: 1, y: 0, scale: isPop ? 1.3 : 1 }}
                                                exit={{ opacity: 0, y: popDirection === "up" ? -10 : 10, scale: 0.5 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                className="inline-block"
                                            >
                                                {count}
                                            </motion.span>
                                        </AnimatePresence>
                                    </span>
                                )}
                                {target > 0 && (
                                    <span className="text-xs sm:text-sm font-medium tabular-nums" style={{ color: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)" }}>/{target}</span>
                                )}
                            </div>
                        </div>

                    </div>

                    {hasStepControls && stepControlsMotion}
                </div>

                {/* Label */}
                <span
                    className={`relative z-10 shrink-0 font-medium tracking-wide text-xs sm:text-sm max-w-[95%] truncate text-center ${isDesktop ? "mt-0.5" : ""}`}
                    style={{ color: labelColor }}
                >
                    {label}
                </span>

                {/* Target reached indicator / achieve button */}
                {showAchieveTargetButton && (
                    <div className="absolute top-1.5 left-2 z-20 flex items-center gap-1">
                        {targetReached && (
                            <span
                                className="text-[10px] font-bold tracking-wider"
                                style={{ color }}
                            >
                                ✓ 達成
                            </span>
                        )}
                        {canAchieveTarget && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRequestAchieveTarget?.(id);
                                }}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors duration-150"
                                style={
                                    isLightMode
                                        ? {
                                              borderColor: `${color}33`,
                                              backgroundColor: `${color}0f`,
                                              color: "#374151",
                                          }
                                        : {
                                              borderColor: `${color}4d`,
                                              backgroundColor: `${color}14`,
                                              color: "#ffffff",
                                          }
                                }
                                onMouseEnter={(e) => {
                                    if (isLightMode) {
                                        e.currentTarget.style.backgroundColor = `${color}3d`;
                                        e.currentTarget.style.borderColor = `${color}80`;
                                        e.currentTarget.style.color = "#111827";
                                    } else {
                                        e.currentTarget.style.backgroundColor = `${color}66`;
                                        e.currentTarget.style.borderColor = `${color}99`;
                                        e.currentTarget.style.color = "#ffffff";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (isLightMode) {
                                        e.currentTarget.style.backgroundColor = `${color}0f`;
                                        e.currentTarget.style.borderColor = `${color}33`;
                                        e.currentTarget.style.color = "#374151";
                                    } else {
                                        e.currentTarget.style.backgroundColor = `${color}14`;
                                        e.currentTarget.style.borderColor = `${color}4d`;
                                        e.currentTarget.style.color = "#ffffff";
                                    }
                                }}
                            >
                                達成する
                            </button>
                        )}
                    </div>
                )}

                {/* Edit & Delete buttons（設定でオフ可・スマホでは常時表示） */}
                {showEditDeleteOnCard && (
                <AnimatePresence>
                    {showHoverControls && (
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
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors touch-manipulation"
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
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors touch-manipulation"
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
                )}

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
