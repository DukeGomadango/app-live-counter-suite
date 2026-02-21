"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { Calculator } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AppSettings } from "../../components/SettingsModal";

export type TotalNodeData = {
    value: number;
    target?: number;
    label?: string;
    isLightMode: boolean;
    onUpdateLabel?: (id: string, newLabel: string) => void;
};

export type TotalNodeType = Node<TotalNodeData, "total">;

function TotalNode({ id, data, selected }: NodeProps<TotalNodeType>) {
    const isLightMode = data.isLightMode || false;
    const isTargetAchieved = data.target !== undefined && data.target > 0 && data.value >= data.target;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label || "総合計 (TOTAL SCORE)");

    const handleSave = () => {
        if (editValue.trim() !== "") {
            data.onUpdateLabel?.(id, editValue.trim());
        } else {
            setEditValue(data.label || "総合計 (TOTAL SCORE)");
        }
        setIsEditing(false);
    };

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

    return (
        <div
            className={`relative group flex flex-col items-center justify-center p-8 rounded-3xl border-4 transition-all duration-300 min-w-[300px] ${isTargetAchieved ? "ring-4 ring-yellow-500/50 dark:ring-yellow-400/50 animate-[pulse_2s_ease-in-out_infinite]" : ""
                } ${selected
                    ? "scale-[1.02] z-10"
                    : "hover:scale-[1.01]"
                }`}
            style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,10,10,0.95)",
                borderColor: isTargetAchieved ? (isLightMode ? "#eab308" : "#facc15") : (selected ? "#a855f7" : isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"),
                boxShadow: isTargetAchieved
                    ? (isLightMode ? "0 0 40px rgba(234,179,8,0.4), inset 0 0 20px rgba(234,179,8,0.1)" : "0 0 40px rgba(250,204,21,0.3), inset 0 0 20px rgba(250,204,21,0.2)")
                    : (selected
                        ? (isLightMode ? "0 0 30px rgba(0,0,0,0.15)" : "0 0 30px rgba(255,255,255,0.1)")
                        : (isLightMode ? "0 10px 30px rgba(0,0,0,0.1)" : "0 10px 30px rgba(0,0,0,0.5)")),
                backdropFilter: "blur(16px)",
            }}
        >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex z-10">
                <Handle type="target" position={Position.Top} id="target-top" className="!w-5 !h-5 !border-[3px] !relative !transform-none !left-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: "#a855f7" }} />
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex z-10">
                <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-5 !h-5 !border-[3px] !relative !transform-none !left-auto !bottom-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: "#a855f7" }} />
            </div>

            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex z-10">
                <Handle type="target" position={Position.Left} id="target-left" className="!w-5 !h-5 !border-[3px] !relative !transform-none !left-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: "#a855f7" }} />
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex z-10">
                <Handle type="target" position={Position.Right} id="target-right" className="!w-5 !h-5 !border-[3px] !relative !transform-none !right-auto !top-auto" style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: "#a855f7" }} />
            </div>

            <div className="flex flex-col items-center justify-center w-full">
                <div className="flex items-center gap-2 justify-center mb-3">
                    <Calculator size={20} className="text-purple-400" />
                    {isEditing ? (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            autoFocus
                            className={`text-base font-bold uppercase tracking-widest text-center bg-transparent border-b border-purple-400 outline-none w-48 ${isLightMode ? "text-gray-700" : "text-white"}`}
                        />
                    ) : (
                        <span
                            onDoubleClick={() => setIsEditing(true)}
                            className={`text-base font-bold uppercase tracking-widest cursor-text hover:text-purple-400 transition-colors ${isLightMode ? "text-gray-500" : "text-white/60"}`}
                        >
                            {data.label || "総合計 (TOTAL SCORE)"}
                        </span>
                    )}
                </div>
                <div
                    className="text-7xl font-black tabular-nums tracking-tighter"
                    style={{
                        color: data.value > 0 ? "#a855f7" : isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)",
                        textShadow: data.value > 0
                            ? "0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(168,85,247,0.3)"
                            : "none",
                    }}
                >
                    {data.value.toLocaleString()}
                </div>

                {data.target !== undefined && data.target > 0 && (
                    <div className="w-full mt-4 space-y-2">
                        <div className="flex justify-between items-end text-xs font-bold" style={{
                            color: isTargetAchieved ? (isLightMode ? "#d97706" : "#facc15") : (isLightMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)")
                        }}>
                            <span>{isTargetAchieved ? "✨ 総合目標達成！ ✨" : "進捗"}</span>
                            <span>{data.target.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out relative"
                                style={{
                                    width: `${Math.min(100, (data.value / data.target) * 100)}%`,
                                    background: isTargetAchieved ? "linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)" : "#a855f7",
                                    boxShadow: isTargetAchieved ? "0 0 15px rgba(250,204,21,0.8)" : "0 0 10px rgba(168,85,247,0.5)"
                                }}
                            >
                                {isTargetAchieved && (
                                    <div className="absolute inset-0 opacity-50 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] bg-[length:15px_15px] animate-[shine_1s_linear_infinite]" />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(TotalNode);
