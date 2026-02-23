"use client";

import { memo, useRef, useCallback, useState } from "react";
import { Handle, Position, NodeProps, Node, useNodeConnections } from "@xyflow/react";
import { Plus, Minus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AppSettings } from "../../components/SettingsModal";
import { EMOJI_OPTIONS } from "@/lib/constants";

export type OperationType = "+" | "-" | "*" | "/";

export type CounterNodeData = {
    label: string;
    emoji: string;
    operation: OperationType;
    value: number;
    count: number;
    color: string;
    isLightMode: boolean;
    onIncrement: (id: string) => void;
    onDecrement: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdateConfig: (id: string, updates: Partial<CounterNodeData>) => void;
    target?: number;
    isGhost?: boolean;
    onSourceHover?: (id: string, isHovering: boolean) => void;
    onSourceClick?: (id: string) => void;
    onQuickAdd?: (sourceId: string, position: Position) => void;
};

export type CounterNodeType = Node<CounterNodeData, "counter">;

function getOperationColor(op: OperationType, isLightMode: boolean) {
    if (op === "+" || op === "*") return isLightMode ? "text-green-600 bg-green-100" : "text-green-400 bg-green-500/20";
    return isLightMode ? "text-red-600 bg-red-100" : "text-red-400 bg-red-500/20";
}

function CounterNode({ id, data }: NodeProps<CounterNodeType>) {
    const isLightMode = data.isLightMode || false;
    const isAchieved = data.target !== undefined && data.target > 0 && data.count >= data.target;
    const accentColor = data.color || "#a855f7";

    // Read settings directly for scaling
    const [appSettings] = useLocalStorage<AppSettings>("flowchart-app-settings", {
        cardSize: "L",
        edgeThickness: "M",
        showProjectName: false,
        projectName: "",
        projectNameSize: "M",
        projectNameColor: "#a855f7",
        accentColor: "#a855f7",
        orbIntensity: 50,
    });

    const scaleMap: Record<string, number> = {
        S: 0.7,
        M: 0.85,
        L: 1.0,
        XL: 1.2,
    };
    const scale = scaleMap[appSettings.cardSize] || 1.0;

    const [isEditingEmoji, setIsEditingEmoji] = useState(false);

    // Long press logic
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const stopHolding = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const startIncrement = useCallback((e: React.PointerEvent) => {
        data.onIncrement(id);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                data.onIncrement(id);
            }, 100);
        }, 500);
    }, [id, data]);

    const startDecrement = useCallback((e: React.PointerEvent) => {
        data.onDecrement(id);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                data.onDecrement(id);
            }, 100);
        }, 500);
    }, [id, data]);

    const opStyles = getOperationColor(data.operation, isLightMode);

    // Track connections for each source handle
    const topConns = useNodeConnections({ handleType: "source", handleId: "source-top" });
    const rightConns = useNodeConnections({ handleType: "source", handleId: "source-right" });
    const bottomConns = useNodeConnections({ handleType: "source", handleId: "source-bottom" });
    const leftConns = useNodeConnections({ handleType: "source", handleId: "source-left" });

    // Ghost button sub-component
    const renderGhostAddButton = (position: Position) => {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    data.onQuickAdd?.(id, position);
                }}
                className="w-5 h-5 rounded-full border border-dashed flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 bg-black/5 dark:bg-white/5 backdrop-blur-md pointer-events-auto touch-manipulation"
                style={{ borderColor: accentColor, color: accentColor }}
            >
                <Plus size={10} strokeWidth={3} />
            </button>
        );
    };

    const panelBg = isLightMode
        ? "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(240,245,255,0.5) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
    const panelBorder = isLightMode
        ? "rgba(255,255,255,0.8)"
        : "rgba(255,255,255,0.1)";
    const panelShadow = isLightMode
        ? `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`
        : `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`;

    return (
        <div
            className={`rounded-2xl border w-[220px] transition-all relative group ${isAchieved ? "ring-2 ring-green-500/30 dark:ring-green-400/30" : ""
                }`}
            style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                background: panelBg,
                backdropFilter: isLightMode ? "blur(24px) saturate(1.2)" : "blur(16px)",
                WebkitBackdropFilter: isLightMode ? "blur(24px) saturate(1.2)" : "blur(16px)",
                borderColor: isAchieved ? (isLightMode ? "#22c55e" : "#4ade80") : panelBorder,
                boxShadow: isAchieved
                    ? (isLightMode ? `0 0 20px rgba(34,197,94,0.3)` : `0 0 20px rgba(74,222,128,0.2)`)
                    : panelShadow,
            }}
        >
            {/* --- Handles --- */}


            {/* Top Handles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                <div className={`flex gap-1.5 relative ${isLightMode ? 'bg-white/90 border-black/10' : 'bg-[#1a103c]/90 border-white/10'} backdrop-blur-md px-1.5 py-0.5 rounded-full border items-center shadow-sm`}>
                    <div className="flex gap-0.5 items-center">
                        <span className={`text-[8px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pl-0.5`}>IN</span>
                        <Handle type="target" position={Position.Top} id="target-top" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !left-auto !top-auto !bg-transparent" style={{ borderColor: accentColor }} />
                    </div>
                    <div className={`w-[1px] h-3 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    <div className="flex gap-0.5 items-center">
                        <Handle type="source" position={Position.Top} id="source-top" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !left-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                        <span className={`text-[8px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pr-0.5`}>OUT</span>
                    </div>
                </div>
                {topConns.length === 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        {renderGhostAddButton(Position.Top)}
                    </div>
                )}
            </div>

            {/* Bottom Handles */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-1 z-10">
                <div className={`flex gap-1.5 relative ${isLightMode ? 'bg-white/90 border-black/10' : 'bg-[#1a103c]/90 border-white/10'} backdrop-blur-md px-1.5 py-0.5 rounded-full border items-center shadow-sm`}>
                    <div className="flex gap-0.5 items-center">
                        <span className={`text-[8px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pl-0.5`}>IN</span>
                        <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !left-auto !bottom-auto !bg-transparent" style={{ borderColor: accentColor }} />
                    </div>
                    <div className={`w-[1px] h-3 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    <div className="flex gap-0.5 items-center">
                        <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !left-auto !bottom-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                        <span className={`text-[8px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pr-0.5`}>OUT</span>
                    </div>
                </div>
                {bottomConns.length === 0 && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                        {renderGhostAddButton(Position.Bottom)}
                    </div>
                )}
            </div>

            {/* Left Handles */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {leftConns.length === 0 && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                        {renderGhostAddButton(Position.Left)}
                    </div>
                )}
                <div className={`flex flex-col gap-1.5 relative ${isLightMode ? 'bg-white/90 border-black/10' : 'bg-[#1a103c]/90 border-white/10'} backdrop-blur-md px-0.5 py-1.5 rounded-full border items-center shadow-sm`}>
                    <div className="flex flex-col gap-0.5 items-center">
                        <span className={`text-[7px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pt-0.5`}>IN</span>
                        <Handle type="target" position={Position.Left} id="target-left" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !left-auto !top-auto !bg-transparent" style={{ borderColor: accentColor }} />
                    </div>
                    <div className={`w-3 h-[1px] ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    <div className="flex flex-col gap-0.5 items-center">
                        <Handle type="source" position={Position.Left} id="source-left" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !left-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                        <span className={`text-[7px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pb-0.5`}>OUT</span>
                    </div>
                </div>
            </div>

            {/* Right Handles (Interactive ghost source handle wrapper) */}
            <div
                onMouseEnter={() => data.onSourceHover?.(id, true)}
                onMouseLeave={() => data.onSourceHover?.(id, false)}
                onClick={(e) => {
                    e.stopPropagation();
                    data.onSourceClick?.(id);
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex items-center gap-1 z-10 p-2 cursor-crosshair"
            >
                <div className={`flex flex-col gap-1.5 relative ${isLightMode ? 'bg-white/90 border-black/10' : 'bg-[#1a103c]/90 border-white/10'} backdrop-blur-md px-0.5 py-1.5 rounded-full border items-center shadow-sm pointer-events-none`}>
                    <div className="flex flex-col gap-0.5 items-center">
                        <span className={`text-[7px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pt-0.5`}>IN</span>
                        <Handle type="target" position={Position.Right} id="target-right" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !right-auto !top-auto !bg-transparent pointer-events-none" style={{ borderColor: accentColor }} />
                    </div>
                    <div className={`w-3 h-[1px] ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
                    <div className="flex flex-col gap-0.5 items-center">
                        <Handle type="source" position={Position.Right} id="source-right" className="!w-2.5 !h-2.5 !border-2 !relative !transform-none !right-auto !top-auto pointer-events-none" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                        <span className={`text-[7px] font-bold ${isLightMode ? 'text-gray-500' : 'text-white/60'} leading-none select-none pb-0.5`}>OUT</span>
                    </div>
                </div>
                {rightConns.length === 0 && (
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                        {renderGhostAddButton(Position.Right)}
                    </div>
                )}
            </div>

            {/* Config & Delete (常時表示 on mobile / ホバーで表示 on desktop) */}
            <div className="absolute -top-3 -right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={() => data.onDelete(id)}
                    className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform touch-manipulation"
                    aria-label="削除"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="p-3">
                {/* Header: Emoji, Label, config row */}
                <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <span
                                className="text-xl px-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
                                style={{ filter: isLightMode ? "none" : "drop-shadow(0 0 8px rgba(255,255,255,0.2))" }}
                                onClick={() => setIsEditingEmoji(!isEditingEmoji)}
                            >
                                {data.emoji}
                            </span>
                            {isEditingEmoji && (
                                <div
                                    className="absolute top-full left-0 mt-1 p-2 rounded-xl border grid grid-cols-6 gap-1 z-50 w-48 shadow-xl"
                                    style={{
                                        background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15,8,35,0.95)",
                                        borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                                        backdropFilter: "blur(12px)",
                                    }}
                                >
                                    {EMOJI_OPTIONS.map((e) => (
                                        <button
                                            key={e}
                                            onClick={() => {
                                                data.onUpdateConfig(id, { emoji: e });
                                                setIsEditingEmoji(false);
                                            }}
                                            className="w-6 h-6 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
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
                            onChange={(e) => data.onUpdateConfig(id, { label: e.target.value })}
                            className="text-sm font-semibold bg-transparent outline-none w-24 truncate"
                            style={{ color: isLightMode ? "#1f2937" : "#f3f4f6" }}
                        />
                    </div>
                </div>

                {/* Body: Value Settings */}
                <div className="flex items-center gap-1.5 mb-3 bg-black/5 dark:bg-white/5 p-1.5 rounded-xl">
                    <select
                        value={data.operation}
                        onChange={(e) => data.onUpdateConfig(id, { operation: e.target.value as OperationType })}
                        className={`w-9 h-8 flex items-center justify-center rounded-lg font-bold text-base outline-none cursor-pointer appearance-none text-center ${opStyles}`}
                    >
                        <option value="+">+</option>
                        <option value="-">-</option>
                        <option value="*">×</option>
                        <option value="/">÷</option>
                    </select>

                    <input
                        type="number"
                        min="0"
                        value={data.value === 0 ? "" : data.value}
                        onChange={(e) => data.onUpdateConfig(id, { value: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="flex-1 w-full bg-transparent font-mono text-lg font-bold outline-none tabular-nums text-right px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: isLightMode ? "#1f2937" : "#f3f4f6" }}
                    />

                    <div className="flex flex-col gap-0.5">
                        <button
                            onClick={() => data.onUpdateConfig(id, { value: data.value + 1 })}
                            className={`w-5 h-4 flex items-center justify-center rounded ${isLightMode ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'} transition-colors`}
                        >
                            <ChevronUp size={10} className={isLightMode ? "text-gray-600" : "text-white/80"} />
                        </button>
                        <button
                            onClick={() => data.onUpdateConfig(id, { value: Math.max(0, data.value - 1) })}
                            className={`w-5 h-4 flex items-center justify-center rounded ${isLightMode ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'} transition-colors`}
                        >
                            <ChevronDown size={10} className={isLightMode ? "text-gray-600" : "text-white/80"} />
                        </button>
                    </div>
                </div>

                {/* Counter Actions */}
                <div className="flex items-stretch gap-2">
                    <button
                        onPointerDown={startDecrement}
                        onPointerUp={(e) => { stopHolding(); (e.target as HTMLElement).releasePointerCapture(e.pointerId); }}
                        onPointerLeave={stopHolding}
                        onPointerCancel={stopHolding}
                        onContextMenu={(e) => e.preventDefault()}
                        disabled={data.count <= 0}
                        className="w-10 flex flex-col items-center justify-center rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed select-none"
                        style={{
                            background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
                        }}
                    >
                        <Minus size={16} className={isLightMode ? "text-gray-600" : "text-white/60"} />
                    </button>

                    <div
                        className="flex-1 flex items-center justify-center py-2 rounded-xl border relative select-none"
                        style={{
                            backgroundColor: `${accentColor}1A`,
                            borderColor: `${accentColor}33`,
                            color: accentColor,
                        }}
                    >
                        <span className="text-xl font-bold font-mono tabular-nums leading-none">
                            {data.count}
                        </span>
                    </div>

                    <button
                        onPointerDown={startIncrement}
                        onPointerUp={(e) => { stopHolding(); (e.target as HTMLElement).releasePointerCapture(e.pointerId); }}
                        onPointerLeave={stopHolding}
                        onPointerCancel={stopHolding}
                        onContextMenu={(e) => e.preventDefault()}
                        className="w-10 flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 shadow-sm select-none touch-manipulation"
                        style={{
                            background: accentColor,
                            color: "white",
                        }}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {data.target !== undefined && data.target > 0 && (
                    <div className="mt-3 w-full space-y-1">
                        <div className="flex justify-between items-end text-[10px] font-bold" style={{
                            color: isAchieved ? (isLightMode ? "#16a34a" : "#4ade80") : (isLightMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)")
                        }}>
                            <span>{isAchieved ? "✨ CLEAR!" : "進捗"}</span>
                            <span>{data.target.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
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
                                <div className="absolute inset-0 opacity-50 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%,transparent_100%)] bg-[length:10px_10px] animate-[shine_1s_linear_infinite]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(CounterNode);
