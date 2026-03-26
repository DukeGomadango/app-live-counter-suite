"use client";

import { memo, useState, useEffect } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { Calculator } from "lucide-react";
import { useFlowchartNodeEnv } from "./FlowchartNodeEnvContext";
import { useFlowchartTotalPulseOptional } from "./FlowchartTotalPulseContext";
import { flowchartCardVisualScale, type LedgerTotalPersistedData } from "@/lib/flowchartLedger";
import EmojiGlyph from "@/components/icons/EmojiGlyph";

export type TotalNodeData = LedgerTotalPersistedData;
export type TotalNodeType = Node<TotalNodeData, "total">;

type LabelKey = "labelAdd" | "labelSub" | "labelGrand";

const DEFAULTS: Record<LabelKey, string> = {
    labelAdd: "加算合計",
    labelSub: "減算合計",
    labelGrand: "総合計",
};

function TotalNode({ id, data, selected }: NodeProps<TotalNodeType>) {
    const env = useFlowchartNodeEnv();
    const isLightMode = env.isLightMode;
    const target = env.globalTarget;
    const grand = data.grandTotal ?? 0;
    const isTargetAchieved = target > 0 && grand >= target;

    const [editing, setEditing] = useState<LabelKey | null>(null);
    const [editValue, setEditValue] = useState("");

    const appSettings = env.appSettings;
    const accentColor = env.accentColor;

    const pulseCtx = useFlowchartTotalPulseOptional();
    const pulse = pulseCtx?.pulse ?? { token: 0, kind: null as "up" | "down" | null };
    const fx = appSettings.flowchartFxIntensity ?? "normal";
    const [pulsePhase, setPulsePhase] = useState<"up" | "down" | null>(null);

    useEffect(() => {
        if (!pulseCtx || fx === "off" || !pulse.kind) return;
        setPulsePhase(pulse.kind);
        const ms = pulse.kind === "up" ? (fx === "subtle" ? 320 : 400) : fx === "subtle" ? 180 : 230;
        const t = window.setTimeout(() => setPulsePhase(null), ms);
        return () => clearTimeout(t);
    }, [pulse.token, pulse.kind, pulseCtx, fx]);

    const pulseOverlayClass =
        pulsePhase === "up"
            ? fx === "subtle"
                ? "flowchart-total-pulse-overlay--up-subtle"
                : "flowchart-total-pulse-overlay--up"
            : pulsePhase === "down"
              ? fx === "subtle"
                  ? "flowchart-total-pulse-overlay--down-subtle"
                  : "flowchart-total-pulse-overlay--down"
              : "";

    const scale = flowchartCardVisualScale(appSettings.cardSize);

    const startEdit = (key: LabelKey) => {
        const cur = (data[key] as string | undefined) || DEFAULTS[key];
        setEditValue(cur);
        setEditing(key);
    };

    const saveEdit = () => {
        if (!editing) return;
        const v = editValue.trim() || DEFAULTS[editing];
        env.onUpdateSummaryLabels(id, { [editing]: v });
        setEditing(null);
    };

    const labelAdd = data.labelAdd || DEFAULTS.labelAdd;
    const labelSub = data.labelSub || DEFAULTS.labelSub;
    const labelGrand = data.labelGrand || DEFAULTS.labelGrand;
    const addTotal = data.addTotal ?? 0;
    const subSigned = data.subTotalSigned ?? 0;

    const renderLabelRow = (key: LabelKey, value: string) =>
        editing === key ? (
            <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                autoFocus
                className={`text-xs font-bold uppercase tracking-wider text-center bg-transparent border-b border-purple-400 outline-none w-full max-w-[200px] font-medium ${isLightMode ? "text-gray-700" : "text-white"}`}
            />
        ) : (
            <span
                onDoubleClick={() => startEdit(key)}
                className={`text-xs font-bold uppercase tracking-wider cursor-text hover:text-purple-400 transition-colors font-medium ${isLightMode ? "text-gray-600" : "text-white/70"}`}
            >
                {value}
            </span>
        );

    return (
        <div
            className={`relative group flex flex-col items-center justify-center p-6 rounded-3xl border-4 transition-all duration-300 min-w-[280px] max-w-[360px] ${
                isTargetAchieved
                    ? "ring-4 ring-yellow-500/50 dark:ring-yellow-400/50 motion-reduce:animate-none animate-[pulse_2s_ease-in-out_infinite]"
                    : ""
            } ${selected ? "scale-[1.02] z-10" : "hover:scale-[1.01]"}`}
            style={{
                ["--flowchart-pulse-accent" as string]: accentColor,
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,10,10,0.95)",
                borderColor: isTargetAchieved
                    ? isLightMode
                        ? "#eab308"
                        : "#facc15"
                    : selected
                      ? "#a855f7"
                      : isLightMode
                        ? "rgba(0,0,0,0.1)"
                        : "rgba(255,255,255,0.1)",
                boxShadow: isTargetAchieved
                    ? isLightMode
                        ? "0 0 40px rgba(234,179,8,0.4), inset 0 0 20px rgba(234,179,8,0.1)"
                        : "0 0 40px rgba(250,204,21,0.3), inset 0 0 20px rgba(250,204,21,0.2)"
                    : selected
                      ? isLightMode
                          ? "0 0 30px rgba(0,0,0,0.15)"
                          : "0 0 30px rgba(255,255,255,0.1)"
                      : isLightMode
                        ? "0 10px 30px rgba(0,0,0,0.1)"
                        : "0 10px 30px rgba(0,0,0,0.5)",
                backdropFilter: "blur(16px)",
            }}
        >
            {pulseOverlayClass ? (
                <div
                    key={pulse.token}
                    className={`absolute inset-0 rounded-[1.4rem] pointer-events-none z-[1] ${pulseOverlayClass}`}
                    aria-hidden
                />
            ) : null}
            {/* 項目→合計の矢印はすべて target-bottom のみ（上下左右に見える接続点は出さない） */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex z-10">
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="target-bottom"
                    className="!w-4 !h-4 !border-2 !relative !transform-none !left-auto !bottom-auto"
                    style={{ background: isLightMode ? "#fff" : "#1a103c", borderColor: accentColor }}
                />
            </div>

            <div className="flex flex-col items-stretch justify-center w-full gap-3">
                <div className="flex items-center gap-2 justify-center mb-1">
                    <Calculator size={18} className="text-purple-400 shrink-0" />
                    <span className={`text-[10px] font-semibold ${isLightMode ? "text-gray-500" : "text-white/55"}`}>合計</span>
                </div>

                <div className="flex flex-col gap-1 px-1">
                    <div className="flex items-center justify-between gap-2">
                        {renderLabelRow("labelAdd", labelAdd)}
                        <span
                            className="text-lg font-bold font-mono tabular-nums shrink-0"
                            style={{ color: isLightMode ? "#15803d" : "#4ade80" }}
                        >
                            {addTotal.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        {renderLabelRow("labelSub", labelSub)}
                        <span
                            className="text-lg font-bold font-mono tabular-nums shrink-0"
                            style={{ color: subSigned < 0 ? (isLightMode ? "#dc2626" : "#f87171") : isLightMode ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)" }}
                        >
                            {subSigned.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="border-t pt-3 mt-1" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
                    <div className="flex flex-col items-center gap-1">
                        {renderLabelRow("labelGrand", labelGrand)}
                        <div
                            className="text-5xl sm:text-6xl font-black tabular-nums tracking-tighter"
                            style={{
                                color: grand !== 0 ? "#a855f7" : isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)",
                                textShadow:
                                    grand !== 0
                                        ? "0 0 24px rgba(168,85,247,0.5), 0 0 48px rgba(168,85,247,0.25)"
                                        : "none",
                            }}
                        >
                            {grand.toLocaleString()}
                        </div>
                    </div>
                </div>

                {target > 0 && (
                    <div className="w-full mt-1 space-y-2">
                        <div
                            className="flex justify-between items-end text-xs font-bold"
                            style={{
                                color: isTargetAchieved
                                    ? isLightMode
                                        ? "#d97706"
                                        : "#facc15"
                                    : isLightMode
                                      ? "rgba(0,0,0,0.58)"
                                      : "rgba(255,255,255,0.58)",
                            }}
                        >
                            <span className="inline-flex items-center gap-1">
                                {isTargetAchieved && <EmojiGlyph emoji="✨" size={14} />}
                                {isTargetAchieved ? "総合目標達成！" : "進捗（総合計）"}
                                {isTargetAchieved && <EmojiGlyph emoji="✨" size={14} />}
                            </span>
                            <span>{target.toLocaleString()}</span>
                        </div>
                        <div
                            className="w-full h-3 rounded-full overflow-hidden"
                            style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out relative"
                                style={{
                                    width: `${Math.min(100, (grand / target) * 100)}%`,
                                    background: isTargetAchieved
                                        ? "linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)"
                                        : "#a855f7",
                                    boxShadow: isTargetAchieved
                                        ? "0 0 15px rgba(250,204,21,0.8)"
                                        : "0 0 10px rgba(168,85,247,0.5)",
                                }}
                            >
                                {isTargetAchieved && (
                                    <div className="absolute inset-0 opacity-50 motion-reduce:animate-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] bg-[length:15px_15px] animate-[shine_1s_linear_infinite]" />
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
