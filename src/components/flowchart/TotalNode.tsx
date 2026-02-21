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

function TotalNode({ id, data }: NodeProps<TotalNodeType>) {
    const isLightMode = data?.isLightMode || false;
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

    const panelBg = isLightMode
        ? "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(240,245,255,0.5) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
    const panelBorder = isLightMode
        ? "rgba(255,255,255,0.8)"
        : "rgba(255,255,255,0.1)";
    const panelShadow = isLightMode
        ? `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8), 0 20px 50px -10px rgba(168,85,247,0.15)`
        : `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px -10px rgba(168,85,247,0.3), 0 0 40px rgba(168,85,247,0.2)`;

    return (
        <div
            className="rounded-3xl border p-8 shadow-2xl min-w-[280px] min-h-[160px] flex gap-4 flex-col items-center justify-center relative transition-colors duration-200"
            style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                background: panelBg,
                backdropFilter: isLightMode ? "blur(24px) saturate(1.2)" : "blur(16px)",
                WebkitBackdropFilter: isLightMode ? "blur(24px) saturate(1.2)" : "blur(16px)",
                borderColor: panelBorder,
                boxShadow: panelShadow,
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
                        <div className="flex justify-between items-end text-xs font-bold" style={{ color: isLightMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                            <span>進捗</span>
                            <span>{data.target.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${Math.min(100, (data.value / data.target) * 100)}%`,
                                    background: "#a855f7",
                                    boxShadow: "0 0 10px rgba(168,85,247,0.5)"
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(TotalNode);
