"use client";

import { memo, useRef, useCallback } from "react";
import { Handle, Position, NodeProps, Node, useNodeConnections } from "@xyflow/react";
import { Plus, Minus, Trash2 } from "lucide-react";

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
    const isLightMode = data?.isLightMode || false;
    const accentColor = data.color || "#a855f7";

    // Long press logic
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const stopHolding = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const startIncrement = useCallback(() => {
        data.onIncrement(id);
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                data.onIncrement(id);
            }, 100);
        }, 500);
    }, [id, data]);

    const startDecrement = useCallback(() => {
        data.onDecrement(id);
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
    const GhostAddButton = ({ position }: { position: Position }) => {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    data.onQuickAdd?.(id, position);
                }}
                className="w-5 h-5 rounded-full border border-dashed flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 bg-black/5 dark:bg-white/5 backdrop-blur-md pointer-events-auto"
                style={{ borderColor: accentColor, color: accentColor }}
            >
                <Plus size={10} strokeWidth={3} />
            </button>
        );
    };

    return (
        <div
            className="rounded-2xl border w-[220px] transition-all relative group"
            style={{
                background: isLightMode ? "rgba(255,255,255,0.85)" : "rgba(10,5,30,0.85)",
                backdropFilter: "blur(12px)",
                borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                boxShadow: isLightMode
                    ? "0 4px 20px -10px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.5)"
                    : "0 4px 30px -10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
            }}
        >
            {/* --- Handles --- */}

            {/* Top Handles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                <div className="flex gap-1 relative">
                    <Handle type="target" position={Position.Top} id="target-top" className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !top-auto !bg-transparent" style={{ borderColor: accentColor }} />
                    <Handle type="source" position={Position.Top} id="source-top" className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                </div>
                {topConns.length === 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <GhostAddButton position={Position.Top} />
                    </div>
                )}
            </div>

            {/* Bottom Handles */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-1 z-10">
                <div className="flex gap-1 relative">
                    <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !bottom-auto !bg-transparent" style={{ borderColor: accentColor }} />
                    <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !bottom-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                </div>
                {bottomConns.length === 0 && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                        <GhostAddButton position={Position.Bottom} />
                    </div>
                )}
            </div>

            {/* Left Handles */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {leftConns.length === 0 && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                        <GhostAddButton position={Position.Left} />
                    </div>
                )}
                <div className="flex flex-col gap-1 relative">
                    <Handle type="target" position={Position.Left} id="target-left" className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !top-auto !bg-transparent" style={{ borderColor: accentColor }} />
                    <Handle type="source" position={Position.Left} id="source-left" className="!w-3 !h-3 !border-2 !relative !transform-none !left-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
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
                <div className="flex flex-col gap-1 relative">
                    <Handle type="target" position={Position.Right} id="target-right" className="!w-3 !h-3 !border-2 !relative !transform-none !right-auto !top-auto !bg-transparent pointer-events-none" style={{ borderColor: accentColor }} />
                    <Handle type="source" position={Position.Right} id="source-right" className="!w-3 !h-3 !border-2 !relative !transform-none !right-auto !top-auto pointer-events-none" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }} />
                </div>
                {rightConns.length === 0 && (
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                        <GhostAddButton position={Position.Right} />
                    </div>
                )}
            </div>

            {/* Config & Delete (Hidden by default, show on hover) */}
            <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={() => data.onDelete(id)}
                    className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="p-3">
                {/* Header: Emoji, Label, config row */}
                <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl" style={{ filter: isLightMode ? "none" : "drop-shadow(0 0 8px rgba(255,255,255,0.2))" }}>
                            {data.emoji}
                        </span>
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
                <div className="flex items-center gap-2 mb-3 bg-black/5 dark:bg-white/5 p-1.5 rounded-xl">
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
                </div>

                {/* Counter Actions */}
                <div className="flex items-stretch gap-2">
                    <button
                        onPointerDown={startDecrement}
                        onPointerUp={stopHolding}
                        onPointerLeave={stopHolding}
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
                        onPointerUp={stopHolding}
                        onPointerLeave={stopHolding}
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
            </div>
        </div>
    );
}

export default memo(CounterNode);
