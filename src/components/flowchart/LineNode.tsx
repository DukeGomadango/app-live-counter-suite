"use client";

import { memo, useRef, useCallback, useState, useEffect, useMemo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { CardSize } from "@/components/SettingsModal";
import { EMOJI_OPTIONS, coerceStoredEmojiToDisplay } from "@/lib/constants";
import { useFlowchartNodeEnv, type LineNodePersistedData } from "./FlowchartNodeEnvContext";
import { flowchartCardVisualScale, type LedgerMode } from "@/lib/flowchartLedger";
import { StepKeypad, type StepKeypadColumn } from "@/components/StepKeypad";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function sanitizeUnsignedCountInput(raw: string): string {
    return raw.replace(/[^0-9]/g, "");
}

const HOLD_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;
const TAP_WINDOW_MS = 200;

export type LineNodeData = LineNodePersistedData;
export type LineNodeType = Node<LineNodeData, "line">;

function modeStyles(mode: LedgerMode, isLightMode: boolean) {
    if (mode === "add") return isLightMode ? "text-green-600 bg-green-100" : "text-green-400 bg-green-500/20";
    return isLightMode ? "text-red-600 bg-red-100" : "text-red-400 bg-red-500/20";
}

function LineNode({ id, data }: NodeProps<LineNodeType>) {
    const env = useFlowchartNodeEnv();
    const isLightMode = env.isLightMode;
    const isAchieved = data.target !== undefined && data.target > 0 && data.count >= data.target;
    const accentColor = env.accentColor;
    const appSettings = env.appSettings;

    const scale = flowchartCardVisualScale(appSettings.cardSize);

    const [isEditingEmoji, setIsEditingEmoji] = useState(false);
    const [isEditingCount, setIsEditingCount] = useState(false);
    const [editCountValue, setEditCountValue] = useState("");

    const isDesktop = useMediaQuery("(min-width: 768px)");
    const cardSize = (appSettings.cardSize ?? "L") as CardSize;
    const effectiveCardSizeForKeypad: CardSize = isDesktop && (cardSize === "S" || cardSize === "M") ? "L" : cardSize;

    const showStep5 = appSettings.showStep5 ?? true;
    const showStep10 = appSettings.showStep10 ?? true;
    const showStepFree = appSettings.showStepFree ?? false;
    const stepFreeValue = Math.max(1, appSettings.stepFreeValue ?? 1);

    const stepKeypadColumns = useMemo((): StepKeypadColumn[] => {
        const c: StepKeypadColumn[] = [];
        const cnt = data.count;
        if (showStep5) {
            c.push({
                plusLabel: "+5",
                minusLabel: "-5",
                plus: 5,
                minus: -5,
                disabledMinus: cnt < 5,
            });
        }
        if (showStep10) {
            c.push({
                plusLabel: "+10",
                minusLabel: "-10",
                plus: 10,
                minus: -10,
                disabledMinus: cnt < 10,
            });
        }
        if (showStepFree && stepFreeValue >= 1) {
            c.push({
                plusLabel: `+${stepFreeValue}`,
                minusLabel: `-${stepFreeValue}`,
                plus: stepFreeValue,
                minus: -stepFreeValue,
                disabledMinus: cnt < stepFreeValue,
            });
        }
        return c;
    }, [showStep5, showStep10, showStepFree, stepFreeValue, data.count]);

    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const incrementPointerDownRef = useRef(false);
    const decrementPointerDownRef = useRef(false);
    const tapPendingRef = useRef(false);
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    useEffect(
        () => () => {
            if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        },
        []
    );

    const doTapIncrement = useCallback(() => {
        if (isEditingCount) return;
        env.onIncrement(id);
    }, [id, env, isEditingCount]);

    const handleCountAreaPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const el = e.target as HTMLElement;
        if (el.closest("button") || el.closest("[data-count-editable]") || el.closest("input") || el.closest('[role="group"]')) return;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapPendingRef.current = true;
        tapTimerRef.current = setTimeout(() => {
            tapPendingRef.current = false;
            tapTimerRef.current = null;
        }, TAP_WINDOW_MS);
    }, []);

    const handleCountAreaPointerUp = useCallback(
        (e: React.PointerEvent) => {
            const el = e.target as HTMLElement;
            if (el.closest("button") || el.closest("[data-count-editable]") || el.closest("input") || el.closest('[role="group"]')) return;
            if (tapTimerRef.current) {
                clearTimeout(tapTimerRef.current);
                tapTimerRef.current = null;
            }
            if (tapPendingRef.current) {
                tapPendingRef.current = false;
                doTapIncrement();
            }
        },
        [doTapIncrement]
    );

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
                    env.onIncrement(id);
                }, REPEAT_INTERVAL_MS);
            }, HOLD_DELAY_MS);
        },
        [id, env, stopRepeat]
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
            } catch {
                /* ignore */
            }
            if (hadPointerDown && !wasRepeating) env.onIncrement(id);
        },
        [id, env, stopRepeat]
    );

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
                    env.onDecrement(id);
                }, REPEAT_INTERVAL_MS);
            }, HOLD_DELAY_MS);
        },
        [id, env, stopRepeat]
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
            } catch {
                /* ignore */
            }
            if (hadPointerDown && !wasRepeating) env.onDecrement(id);
        },
        [id, env, stopRepeat]
    );

    const opStyles = modeStyles(data.mode, isLightMode);

    const arrowBg = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
    const arrowHoverBg = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)";
    const arrowColor = isLightMode ? "text-gray-600" : "text-white/70";

    const panelBg = isLightMode
        ? "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(240,245,255,0.5) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
    const panelBorder = isLightMode ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)";
    const panelShadow = isLightMode
        ? `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`
        : `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`;

    return (
        <div
            className={`rounded-2xl border w-[220px] transition-all relative group ${isAchieved ? "ring-2 ring-green-500/30 dark:ring-green-400/30" : ""}`}
            style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                background: panelBg,
                backdropFilter: isLightMode ? "blur(24px) saturate(1.2)" : "blur(16px)",
                WebkitBackdropFilter: isLightMode ? "blur(24px) saturate(1.2)" : "blur(16px)",
                borderColor: isAchieved ? (isLightMode ? "#22c55e" : "#4ade80") : panelBorder,
                boxShadow: isAchieved
                    ? isLightMode
                        ? `0 0 20px rgba(34,197,94,0.3)`
                        : `0 0 20px rgba(74,222,128,0.2)`
                    : panelShadow,
            }}
        >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <Handle
                    type="source"
                    position={Position.Top}
                    id="source-top"
                    className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !top-auto"
                    style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }}
                />
            </div>

            <div className="absolute -top-3 -right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    type="button"
                    onClick={() => env.onDelete(id)}
                    className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform touch-manipulation"
                    aria-label="削除"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="p-3">
                <div
                    className="flex items-center justify-between mb-3 border-b pb-2"
                    style={{ borderColor: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                style={{
                                    color: accentColor,
                                    filter: isLightMode ? "none" : "drop-shadow(0 0 8px rgba(255,255,255,0.2))",
                                }}
                                onClick={() => setIsEditingEmoji(!isEditingEmoji)}
                                aria-label="絵文字を変更"
                            >
                                <span className="text-xl leading-none block">{coerceStoredEmojiToDisplay(data.emoji)}</span>
                            </button>
                            {isEditingEmoji && (
                                <div
                                    className="absolute top-full left-0 mt-1 p-2 rounded-xl border grid grid-cols-6 gap-1 z-50 w-52 max-h-48 overflow-y-auto shadow-xl"
                                    style={{
                                        background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15,8,35,0.95)",
                                        borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                                        backdropFilter: "blur(12px)",
                                    }}
                                >
                                    {EMOJI_OPTIONS.map((e) => (
                                        <button
                                            key={e}
                                            type="button"
                                            onClick={() => {
                                                env.onUpdateLineConfig(id, { emoji: e });
                                                setIsEditingEmoji(false);
                                            }}
                                            className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-base"
                                            style={{ color: accentColor }}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            value={data.label}
                            onChange={(e) => env.onUpdateLineConfig(id, { label: e.target.value })}
                            className="text-sm font-semibold bg-transparent outline-none min-w-0 flex-1 truncate"
                            style={{ color: isLightMode ? "#1f2937" : "#f3f4f6" }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3 bg-black/5 dark:bg-white/5 p-1.5 rounded-xl">
                    <select
                        value={data.mode}
                        onChange={(e) => env.onUpdateLineConfig(id, { mode: e.target.value as LedgerMode })}
                        className={`min-w-[4.5rem] h-8 flex items-center justify-center rounded-lg font-bold text-xs outline-none cursor-pointer px-1 ${opStyles}`}
                        aria-label="加算または減算"
                    >
                        <option value="add">加算</option>
                        <option value="subtract">減算</option>
                    </select>

                    <input
                        type="number"
                        min={0}
                        step={1}
                        value={data.step === 0 ? "" : data.step}
                        onChange={(e) => env.onUpdateLineConfig(id, { step: Math.max(0, parseFloat(e.target.value) || 0) })}
                        placeholder="幅"
                        className="flex-1 w-full bg-transparent font-mono text-lg font-bold outline-none tabular-nums text-right px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: isLightMode ? "#1f2937" : "#f3f4f6" }}
                    />

                    <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => env.onUpdateLineConfig(id, { step: data.step + 1 })}
                            className={`w-5 h-4 flex items-center justify-center rounded ${isLightMode ? "bg-black/5 hover:bg-black/10" : "bg-white/5 hover:bg-white/10"} transition-colors`}
                        >
                            <ChevronUp size={10} className={isLightMode ? "text-gray-700" : "text-white/90"} />
                        </button>
                        <button
                            type="button"
                            onClick={() => env.onUpdateLineConfig(id, { step: Math.max(0, data.step - 1) })}
                            className={`w-5 h-4 flex items-center justify-center rounded ${isLightMode ? "bg-black/5 hover:bg-black/10" : "bg-white/5 hover:bg-white/10"} transition-colors`}
                        >
                            <ChevronDown size={10} className={isLightMode ? "text-gray-700" : "text-white/90"} />
                        </button>
                    </div>
                </div>

                <div
                    className="flex flex-col gap-1.5"
                    onPointerDown={handleCountAreaPointerDown}
                    onPointerUp={handleCountAreaPointerUp}
                    onPointerLeave={() => {
                        if (tapTimerRef.current) {
                            clearTimeout(tapTimerRef.current);
                            tapTimerRef.current = null;
                        }
                        tapPendingRef.current = false;
                    }}
                    onPointerCancel={() => {
                        if (tapTimerRef.current) {
                            clearTimeout(tapTimerRef.current);
                            tapTimerRef.current = null;
                        }
                        tapPendingRef.current = false;
                    }}
                >
                    <div className="flex items-stretch gap-1.5 min-h-0">
                        <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onPointerDown={handleIncrementPointerDown}
                                onPointerUp={handleIncrementPointerUp}
                                onPointerLeave={handleIncrementPointerUp}
                                onPointerCancel={handleIncrementPointerUp}
                                onContextMenu={(e) => e.preventDefault()}
                                aria-label="カウントを1増やす（長押しで連続）"
                                className={`w-6 h-5 sm:w-7 sm:h-6 rounded flex items-center justify-center cursor-pointer transition-colors select-none touch-manipulation ${arrowColor}`}
                                style={{ background: arrowBg }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = arrowHoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = arrowBg;
                                }}
                            >
                                <ChevronUp size={16} className={isLightMode ? "text-gray-700" : "text-white/90"} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onPointerDown={handleDecrementPointerDown}
                                onPointerUp={handleDecrementPointerUp}
                                onPointerLeave={handleDecrementPointerUp}
                                onPointerCancel={handleDecrementPointerUp}
                                onContextMenu={(e) => e.preventDefault()}
                                disabled={data.count <= 0}
                                aria-label="カウントを1減らす（長押しで連続）"
                                className={`w-6 h-5 sm:w-7 sm:h-6 rounded flex items-center justify-center cursor-pointer transition-colors select-none touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed ${arrowColor}`}
                                style={{ background: arrowBg }}
                                onMouseEnter={(e) => {
                                    if (!e.currentTarget.disabled) e.currentTarget.style.background = arrowHoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = arrowBg;
                                }}
                            >
                                <ChevronDown size={16} className={isLightMode ? "text-gray-700" : "text-white/90"} />
                            </button>
                        </div>

                        <div
                            className="flex-1 flex items-center justify-center py-2 rounded-xl border relative select-none min-w-0"
                            style={{
                                backgroundColor: `${accentColor}1A`,
                                borderColor: `${accentColor}33`,
                                color: accentColor,
                            }}
                        >
                            {isEditingCount ? (
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editCountValue}
                                    onChange={(e) => setEditCountValue(sanitizeUnsignedCountInput(e.target.value))}
                                    onBlur={() => {
                                        const t = editCountValue.trim();
                                        const n = t === "" ? 0 : parseInt(t, 10);
                                        const v = Number.isNaN(n) ? 0 : Math.max(0, n);
                                        env.onSetLineCount(id, v);
                                        setIsEditingCount(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                    autoFocus
                                    className="w-full max-w-[6rem] text-center text-xl font-bold font-mono tabular-nums leading-none bg-transparent border-b-2 outline-none px-1"
                                    style={{ borderColor: accentColor, color: accentColor }}
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    data-count-editable
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingCount(true);
                                        setEditCountValue(String(data.count));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setIsEditingCount(true);
                                            setEditCountValue(String(data.count));
                                        }
                                    }}
                                    className="text-xl font-bold font-mono tabular-nums leading-none cursor-text rounded px-0.5 hover:bg-black/5 dark:hover:bg-white/5"
                                    title="クリックで数を直接編集"
                                >
                                    {data.count}
                                </span>
                            )}
                        </div>
                    </div>

                    {stepKeypadColumns.length > 0 && (
                        <StepKeypad
                            id={id}
                            columns={stepKeypadColumns}
                            onAdjustBy={env.onAdjustLineCount}
                            isLightMode={isLightMode}
                            cardSize={effectiveCardSizeForKeypad}
                            fullWidth
                            compact={isDesktop}
                        />
                    )}
                </div>

                {data.target !== undefined && data.target > 0 && (
                    <div className="mt-3 w-full space-y-1">
                        <div
                            className="flex justify-between items-end text-[10px] font-bold"
                            style={{
                                color: isAchieved
                                    ? isLightMode
                                        ? "#16a34a"
                                        : "#4ade80"
                                    : isLightMode
                                      ? "rgba(0,0,0,0.58)"
                                      : "rgba(255,255,255,0.58)",
                            }}
                        >
                            <span>{isAchieved ? "✨ CLEAR!" : "進捗"}</span>
                            <span>{data.target.toLocaleString()}</span>
                        </div>
                        <div
                            className="w-full h-1.5 rounded-full overflow-hidden"
                            style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}
                        >
                            <div
                                className="h-full transition-all duration-500 ease-out relative"
                                style={{
                                    width: `${Math.min(100, (data.count / data.target) * 100)}%`,
                                    background: isAchieved
                                        ? `linear-gradient(90deg, #4ade80, #22c55e)`
                                        : `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
                                    boxShadow: isAchieved ? `0 0 10px rgba(74,222,128,0.8)` : `0 0 10px ${accentColor}`,
                                }}
                            >
                                <div className="absolute inset-0 opacity-50 motion-reduce:animate-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%,transparent_100%)] bg-[length:10px_10px] animate-[shine_1s_linear_infinite]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(LineNode);
