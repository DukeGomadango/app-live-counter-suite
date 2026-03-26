"use client";

import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    BackgroundVariant,
    MarkerType,
} from "@xyflow/react";
import { FlowchartFitViewPanel } from "@/components/flowchart/FlowchartFitViewPanel";
import "@xyflow/react/dist/style.css";
import ModeSelector from "@/components/ModeSelector";
import LineNode from "@/components/flowchart/LineNode";
import TotalNode from "@/components/flowchart/TotalNode";
import { FlowchartNodeEnvProvider, type FlowchartNodeEnv } from "@/components/flowchart/FlowchartNodeEnvContext";
import { Plus } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { motion, AnimatePresence } from "framer-motion";
import HamburgerMenu, { SavedFlowChart } from "@/components/HamburgerMenu";
import SettingsModal, { AppSettings } from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { LineNodePersistedData } from "@/lib/flowchartLedger";
import {
    FLOWCHART_TOTAL_ID,
    FLOWCHART_ZOOM_MAX,
    FLOWCHART_ZOOM_MIN,
    computeLedgerTotals,
    grandTotalFromLedgerSignature,
    ledgerTotalsSignature,
    layoutFlowchartNodes,
    migrateLegacyFlowchart,
    flowchartTranslateExtent,
} from "@/lib/flowchartLedger";
import { FlowchartTotalPulseProvider, useFlowchartTotalPulse, type FlowchartTotalPulseKind } from "@/components/flowchart/FlowchartTotalPulseContext";
import type { LedgerTotalPersistedData } from "@/lib/flowchartLedger";

const nodeTypes = {
    line: LineNode,
    total: TotalNode,
};

const INITIAL_NODES: Node[] = [
    {
        id: FLOWCHART_TOTAL_ID,
        type: "total",
        position: { x: 600, y: 200 },
        draggable: false,
        data: {
            addTotal: 0,
            subTotalSigned: 0,
            grandTotal: 0,
            labelAdd: "加算合計",
            labelSub: "減算合計",
            labelGrand: "総合計",
        } satisfies LedgerTotalPersistedData,
    },
];

const INITIAL_EDGES: Edge[] = [];

/** PC でホイール／トラックパッドによるズーム。誤操作が気になる場合は false に変更 */
const FLOWCHART_ZOOM_ON_SCROLL = true;

const FLOWCHART_APP_SETTINGS_DEFAULT: AppSettings = {
    cardSize: "L" as const,
    edgeThickness: "M",
    showProjectName: false,
    projectName: "",
    projectNameSize: "M" as const,
    projectNameColor: "#a855f7",
    accentColor: "#a855f7",
    orbIntensity: 50,
    dotIntensity: 50,
    showStep5: true,
    showStep10: true,
    showStepFree: false,
    stepFreeValue: 1,
    flowchartFxIntensity: "normal",
};

function FlowchartLedgerPulseSync({ ledgerSig }: { ledgerSig: string }) {
    const { bump } = useFlowchartTotalPulse();
    const prevGrandRef = useRef<number | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingKindRef = useRef<FlowchartTotalPulseKind | null>(null);

    useEffect(() => {
        const grand = grandTotalFromLedgerSignature(ledgerSig);
        if (prevGrandRef.current === null) {
            prevGrandRef.current = grand;
            return;
        }
        const prev = prevGrandRef.current;
        if (grand === prev) return;
        const delta = grand - prev;
        prevGrandRef.current = grand;
        if (delta === 0) return;

        pendingKindRef.current = delta > 0 ? "up" : "down";
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            const kind = pendingKindRef.current;
            pendingKindRef.current = null;
            if (kind) bump(kind);
        }, 48);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [ledgerSig, bump]);

    return null;
}

export default function FlowchartContent({ isSplitMode = false, isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
    const [appSettings, setAppSettings] = useLocalStorage<AppSettings>("flowchart-app-settings", FLOWCHART_APP_SETTINGS_DEFAULT);
    const intensity = appSettings.flowchartFxIntensity ?? "normal";
    return (
        <FlowchartTotalPulseProvider intensityMode={intensity}>
            <FlowchartContentInner isSplitMode={isSplitMode} isRightPane={isRightPane} appSettings={appSettings} setAppSettings={setAppSettings} />
        </FlowchartTotalPulseProvider>
    );
}

function FlowchartContentInner({
    isSplitMode = false,
    isRightPane: _isRightPane = false,
    appSettings,
    setAppSettings,
}: {
    isSplitMode?: boolean;
    isRightPane?: boolean;
    appSettings: AppSettings;
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
}) {

    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("counter-light-mode", false);

    const accentColor = appSettings.accentColor || "#a855f7";

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
    const [chartToDelete, setChartToDelete] = useState<string | null>(null);

    const [nodes, setNodes] = useLocalStorage<Node[]>("flowchart-nodes", INITIAL_NODES);
    const [edges, setEdges] = useLocalStorage<Edge[]>("flowchart-edges", INITIAL_EDGES);

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const flowWrapRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });

    const [savedCharts, setSavedCharts] = useLocalStorage<SavedFlowChart[]>("flowchart-saved-charts", [
        {
            id: "sample-1",
            name: "サンプル（加減算の台帳）",
            notes: "項目を足すと自動で合計へ線が伸び、加算合計・減算合計・総合計が更新されます",
            nodes: [
                {
                    id: FLOWCHART_TOTAL_ID,
                    type: "total",
                    position: { x: 520, y: 120 },
                    draggable: false,
                    data: {
                        addTotal: 0,
                        subTotalSigned: 0,
                        grandTotal: 0,
                        labelAdd: "加算合計",
                        labelSub: "減算合計",
                        labelGrand: "総合計",
                    },
                    selected: false,
                },
                {
                    id: "sample-line-a",
                    type: "line",
                    position: { x: 48, y: 120 },
                    draggable: false,
                    data: { label: "ポイント", emoji: "⭐", step: 1, count: 0, mode: "add" },
                    selected: false,
                },
                {
                    id: "sample-line-b",
                    type: "line",
                    position: { x: 48, y: 424 },
                    draggable: false,
                    data: { label: "ペナルティ", emoji: "➖", step: 1, count: 0, mode: "subtract" },
                    selected: false,
                },
            ],
            edges: [
                { id: "edge-sample-line-a-total", source: "sample-line-a", target: FLOWCHART_TOTAL_ID, sourceHandle: "source-top", targetHandle: "target-bottom" },
                { id: "edge-sample-line-b-total", source: "sample-line-b", target: FLOWCHART_TOTAL_ID, sourceHandle: "source-top", targetHandle: "target-bottom" },
            ],
            updatedAt: Date.now(),
        },
    ]);
    const [globalTarget, setGlobalTarget] = useLocalStorage<number>("flowchart-global-target", 0);

    const [_past, setPast] = useLocalStorage<{ nodes: Node[]; edges: Edge[] }[]>("flowchart-undo-history", []);
    const [copiedElements, setCopiedElements] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

    const saveHistory = useCallback(
        (currentNodes: Node[], currentEdges: Edge[]) => {
            setPast((p) => [...p.slice(-20), { nodes: currentNodes, edges: currentEdges }]);
        },
        [setPast]
    );

    useEffect(() => {
        const el = flowWrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const cr = entries[0]?.contentRect;
            if (cr) setViewport({ w: cr.width, h: cr.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useLayoutEffect(() => {
        const r = migrateLegacyFlowchart(nodes, edges);
        if (!r.changed) return;
        setNodes(r.nodes);
        setEdges(r.edges);
    }, [nodes, edges, setNodes, setEdges]);

    useLayoutEffect(() => {
        if (viewport.w <= 0 || viewport.h <= 0) return;
        const r = layoutFlowchartNodes(nodes, viewport.w, viewport.h, { cardSize: appSettings.cardSize });
        if (!r.changed) return;
        setNodes(r.nodes);
    }, [nodes, viewport.w, viewport.h, appSettings.cardSize, setNodes]);

    const ledgerSig = useMemo(() => ledgerTotalsSignature(nodes), [nodes]);

    const translateExtent = useMemo(
        () => flowchartTranslateExtent(nodes, appSettings.cardSize),
        [nodes, appSettings.cardSize, viewport.w]
    );

    useEffect(() => {
        setNodes((nds) => {
            const t = computeLedgerTotals(nds);
            const totalNode = nds.find((n) => n.id === FLOWCHART_TOTAL_ID);
            if (!totalNode) return nds;
            const d = totalNode.data as LedgerTotalPersistedData;
            if (d.addTotal === t.addTotal && d.subTotalSigned === t.subTotalSigned && d.grandTotal === t.grandTotal) return nds;
            return nds.map((n) =>
                n.id === FLOWCHART_TOTAL_ID ? { ...n, data: { ...n.data, ...t } } : n
            );
        });
    }, [ledgerSig, setNodes]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

            const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
            const isCopy = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "c";
            const isCut = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "x";
            const isPaste = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "v";
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "z";

            if (isUndo) {
                e.preventDefault();
                setPast((p) => {
                    if (p.length === 0) return p;
                    const newPast = [...p];
                    const lastState = newPast.pop()!;
                    setNodes(lastState.nodes);
                    setEdges(lastState.edges);
                    return newPast;
                });
                return;
            }

            if (isCopy || isCut) {
                const selectedNodes = nodes.filter((n) => n.selected && n.id !== FLOWCHART_TOTAL_ID && n.type === "line");
                if (selectedNodes.length === 0) return;
                e.preventDefault();
                setCopiedElements({ nodes: selectedNodes, edges: [] });

                if (isCut) {
                    saveHistory(nodes, edges);
                    setNodes((nds) => nds.filter((n) => !n.selected || n.id === FLOWCHART_TOTAL_ID));
                    setEdges((eds) => eds.filter((edge) => !selectedNodes.some((sn) => sn.id === edge.source)));
                }
            }

            if (isPaste && copiedElements) {
                e.preventDefault();
                saveHistory(nodes, edges);

                const pastedNodes = copiedElements.nodes.map((n) => {
                    const newId = `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    const d = n.data as Record<string, unknown>;
                    const op = String(d.operation ?? "");
                    const mode =
                        d.mode === "subtract"
                            ? "subtract"
                            : op === "-" || op === "/"
                              ? "subtract"
                              : "add";
                    return {
                        ...n,
                        id: newId,
                        type: "line" as const,
                        draggable: false,
                        position: { x: n.position.x + 48, y: n.position.y + 48 },
                        selected: true,
                        data: {
                            label: String(d.label ?? "項目"),
                            emoji: String(d.emoji ?? "✨"),
                            step: Math.max(0, Number(d.step ?? d.value ?? 1)),
                            count: Math.max(0, Number(d.count ?? 0)),
                            mode,
                            target: typeof d.target === "number" ? d.target : undefined,
                        } satisfies LineNodePersistedData,
                    };
                });

                setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pastedNodes]);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- setPast は安定
    }, [nodes, edges, copiedElements, saveHistory, setNodes, setEdges]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const filtered = changes.filter((c) => {
                if (c.type === "remove") {
                    const id = "id" in c ? c.id : "";
                    if (id === FLOWCHART_TOTAL_ID) return false;
                }
                if (c.type === "position" && c.id === FLOWCHART_TOTAL_ID) return false;
                return true;
            });
            setNodes((nds) => applyNodeChanges(filtered, nds));
        },
        [setNodes]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const filtered = changes.filter((c) => c.type !== "remove");
            if (filtered.length === 0) return;
            setEdges((eds) => applyEdgeChanges(filtered, eds));
        },
        [setEdges]
    );

    const handleIncrement = useCallback(
        (id: string) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id || n.type !== "line") return n;
                    const d = n.data as LineNodePersistedData;
                    return { ...n, data: { ...d, count: d.count + 1 } };
                })
            );
        },
        [setNodes, saveHistory]
    );

    const handleDecrement = useCallback(
        (id: string) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id || n.type !== "line") return n;
                    const d = n.data as LineNodePersistedData;
                    return { ...n, data: { ...d, count: Math.max(0, d.count - 1) } };
                })
            );
        },
        [setNodes, saveHistory]
    );

    const handleAdjustLineCount = useCallback(
        (id: string, delta: number) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id || n.type !== "line") return n;
                    const d = n.data as LineNodePersistedData;
                    const sum = d.count + delta;
                    const next =
                        typeof sum === "number" && Number.isFinite(sum) ? Math.trunc(sum) : d.count;
                    return { ...n, data: { ...d, count: Math.max(0, next) } };
                })
            );
        },
        [setNodes, saveHistory]
    );

    const handleSetLineCount = useCallback(
        (id: string, value: number) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id || n.type !== "line") return n;
                    const d = n.data as LineNodePersistedData;
                    const v = Number.isFinite(value) ? Math.trunc(value) : 0;
                    return { ...n, data: { ...d, count: Math.max(0, v) } };
                })
            );
        },
        [setNodes, saveHistory]
    );

    const handleUpdateLineConfig = useCallback(
        (id: string, updates: Partial<LineNodePersistedData>) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id || n.type !== "line") return n;
                    const d = n.data as LineNodePersistedData;
                    const next = { ...d, ...updates };
                    if (next.step !== undefined) next.step = Math.max(0, next.step);
                    if (next.count !== undefined) next.count = Math.max(0, next.count);
                    return { ...n, data: next };
                })
            );
        },
        [setNodes, saveHistory]
    );

    const handleUpdateSummaryLabels = useCallback(
        (id: string, updates: Partial<Pick<LedgerTotalPersistedData, "labelAdd" | "labelSub" | "labelGrand">>) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id) return n;
                    return { ...n, data: { ...n.data, ...updates } };
                })
            );
        },
        [setNodes, saveHistory]
    );

    const handleDelete = useCallback(
        (id: string) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
            setNodes((nds) => nds.filter((n) => n.id !== id));
        },
        [setNodes, setEdges, saveHistory]
    );

    const requestDeleteNode = useCallback((id: string) => setNodeToDelete(id), []);

    const flowchartNodeEnv = useMemo<FlowchartNodeEnv>(
        () => ({
            isLightMode,
            accentColor,
            appSettings,
            globalTarget,
            onIncrement: handleIncrement,
            onDecrement: handleDecrement,
            onAdjustLineCount: handleAdjustLineCount,
            onSetLineCount: handleSetLineCount,
            onUpdateLineConfig: handleUpdateLineConfig,
            onDelete: requestDeleteNode,
            onUpdateSummaryLabels: handleUpdateSummaryLabels,
        }),
        [
            isLightMode,
            accentColor,
            appSettings,
            globalTarget,
            handleIncrement,
            handleDecrement,
            handleAdjustLineCount,
            handleSetLineCount,
            handleUpdateLineConfig,
            handleUpdateSummaryLabels,
            requestDeleteNode,
        ]
    );

    const styledEdges = useMemo(() => {
        const thicknessMap: Record<string, number> = { S: 1, M: 2, L: 4 };
        const strokeWidth = thicknessMap[appSettings.edgeThickness || "M"];
        return edges.map((e) => ({
            ...e,
            style: {
                ...e.style,
                strokeWidth,
                stroke: accentColor,
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: accentColor,
            },
            animated: true,
        }));
    }, [edges, accentColor, appSettings.edgeThickness]);

    const addNewNode = useCallback(() => {
        const id = `line-${Date.now()}`;
        saveHistory(nodesRef.current, edgesRef.current);
        const newNode: Node = {
            id,
            type: "line",
            position: { x: 0, y: 0 },
            draggable: false,
            data: {
                label: "新規項目",
                emoji: "✨",
                step: 1,
                count: 0,
                mode: "add",
            } satisfies LineNodePersistedData,
        };
        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [
            ...eds,
            {
                id: `edge-${id}-total`,
                source: id,
                target: FLOWCHART_TOTAL_ID,
                sourceHandle: "source-top",
                targetHandle: "target-bottom",
                type: "smoothstep",
            },
        ]);
    }, [setNodes, setEdges, saveHistory]);

    const handleSaveChart = useCallback(
        (name: string) => {
            const newChart: SavedFlowChart = {
                id: `chart-${Date.now()}`,
                name,
                nodes,
                edges,
                updatedAt: Date.now(),
            };
            setSavedCharts((prev) => [newChart, ...prev]);
        },
        [nodes, edges, setSavedCharts]
    );

    const handleLoadChart = useCallback(
        (chart: SavedFlowChart) => {
            const r = migrateLegacyFlowchart(chart.nodes as Node[], chart.edges as Edge[]);
            setNodes(r.nodes);
            setEdges(r.edges);
        },
        [setNodes, setEdges]
    );

    const handleDeleteChart = useCallback(
        (id: string) => {
            setSavedCharts((prev) => prev.filter((c) => c.id !== id));
        },
        [setSavedCharts]
    );

    const handleSetNodeTarget = useCallback(
        (id: string, target: number) => {
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id !== id) return n;
                    return { ...n, data: { ...n.data, target } };
                })
            );
        },
        [setNodes]
    );

    const defaultEdgeOptions = useMemo(() => {
        const thicknessMap: Record<string, number> = { S: 1, M: 2, L: 4 };
        const strokeWidth = thicknessMap[appSettings.edgeThickness || "M"];
        return {
            type: "smoothstep" as const,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: accentColor,
            },
            style: { strokeWidth, stroke: accentColor },
            animated: true,
            interactionWidth: 0,
        };
    }, [accentColor, appSettings.edgeThickness]);

    return (
        <div
            className={`h-full w-full flex flex-col overflow-hidden relative z-10 ${isLightMode ? "bg-[#f8f9fa]" : "bg-[#0a051e]"}`}
            style={{ "--accent-color": accentColor } as React.CSSProperties}
        >
            <FlowchartLedgerPulseSync ledgerSig={ledgerSig} />
            <HamburgerMenu
                isOpen={isMenuOpen}
                onToggle={() => setIsMenuOpen(!isMenuOpen)}
                isLightMode={isLightMode}
                onToggleTheme={() => setIsLightMode(!isLightMode)}
                onReset={() => {
                    setNodes(INITIAL_NODES);
                    setEdges([]);
                }}
                onOpenSettings={() => setIsSettingsOpen(true)}
                accentColor={accentColor}
                savedCharts={savedCharts}
                onSaveChart={handleSaveChart}
                onLoadChart={handleLoadChart}
                onDeleteChart={(id) => setChartToDelete(id)}
                globalTarget={globalTarget}
                onSetGlobalTarget={setGlobalTarget}
                viewMode="flowchart"
                flowchartNodes={nodes}
                onSetNodeTarget={handleSetNodeTarget}
                hideThemeToggle={false}
                hideModeSelector={isSplitMode}
            />

            <AnimatePresence>
                {isSettingsOpen && (
                    <SettingsModal
                        settings={appSettings}
                        isLightMode={isLightMode}
                        mode="flowchart"
                        onSave={setAppSettings}
                        onClose={() => setIsSettingsOpen(false)}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                open={nodeToDelete !== null}
                message="本当に削除しますか？"
                confirmLabel="削除する"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (nodeToDelete) {
                        handleDelete(nodeToDelete);
                        setNodeToDelete(null);
                    }
                }}
                onCancel={() => setNodeToDelete(null)}
            />
            <ConfirmDialog
                open={chartToDelete !== null}
                message="本当に削除しますか？"
                confirmLabel="削除する"
                cancelLabel="キャンセル"
                onConfirm={() => {
                    if (chartToDelete) {
                        handleDeleteChart(chartToDelete);
                        setChartToDelete(null);
                    }
                }}
                onCancel={() => setChartToDelete(null)}
            />

            <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}>
                <motion.div
                    animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
                    style={{
                        background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                        opacity: (appSettings.orbIntensity / 100) * (isLightMode ? 1.5 : 1),
                    }}
                />
                <motion.div
                    animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
                    style={{
                        background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`,
                        opacity: (appSettings.orbIntensity / 100) * 0.8 * (isLightMode ? 1.5 : 1),
                    }}
                />
            </div>

            <div
                className="absolute top-0 left-0 right-0 z-[30] flex items-center justify-between px-3 py-2 pointer-events-none"
            >
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="w-12 h-10" />
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
                </div>

                <AnimatePresence>
                    {!isSplitMode && appSettings.showProjectName && appSettings.projectName && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="absolute left-1/2 top-[72px] -translate-x-1/2 z-40 px-6 py-2 rounded-2xl backdrop-blur-md font-black cursor-grab active:cursor-grabbing border whitespace-nowrap shadow-xl pointer-events-auto"
                            style={{
                                color: appSettings.projectNameColor,
                                background: isLightMode ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.6)",
                                borderColor: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
                                fontSize:
                                    appSettings.projectNameSize === "XL"
                                        ? "2.5rem"
                                        : appSettings.projectNameSize === "L"
                                          ? "1.75rem"
                                          : appSettings.projectNameSize === "S"
                                            ? "1rem"
                                            : "1.25rem",
                                writingMode: appSettings.projectNameOrientation === "vertical" ? "vertical-rl" : "horizontal-tb",
                                margin: appSettings.projectNameOrientation === "vertical" ? "0 auto" : undefined,
                            }}
                        >
                            {appSettings.projectName}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <FlowchartNodeEnvProvider value={flowchartNodeEnv}>
                <main
                    ref={flowWrapRef}
                    className="flex-1 w-full h-full min-h-[320px]"
                    style={{ overscrollBehavior: "contain" }}
                >
                    {/* touch-manipulation: ダブルタップ拡大を抑えつつパンしやすくする。パンが効かない端末では className を touch-none に戻す */}
                    <ReactFlow
                        nodes={nodes}
                        edges={styledEdges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={true}
                        snapToGrid={true}
                        snapGrid={[24, 24]}
                        minZoom={FLOWCHART_ZOOM_MIN}
                        maxZoom={FLOWCHART_ZOOM_MAX}
                        zoomOnScroll={FLOWCHART_ZOOM_ON_SCROLL}
                        zoomOnPinch
                        zoomOnDoubleClick={false}
                        translateExtent={translateExtent}
                        fitView
                        fitViewOptions={{ padding: 0.2, minZoom: FLOWCHART_ZOOM_MIN, maxZoom: FLOWCHART_ZOOM_MAX }}
                        className="touch-manipulation bg-transparent"
                        colorMode={isLightMode ? "light" : "dark"}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={24}
                            size={2}
                            color={isLightMode ? `${accentColor}40` : `${accentColor}40`}
                            style={{ opacity: appSettings.dotIntensity !== undefined ? appSettings.dotIntensity / 100 : 0.5 }}
                        />
                        <FlowchartFitViewPanel
                            isLightMode={isLightMode}
                            accentColor={accentColor}
                            minZoom={FLOWCHART_ZOOM_MIN}
                            maxZoom={FLOWCHART_ZOOM_MAX}
                        />
                        <Controls
                            className="bg-white/5 border border-white/10 backdrop-blur-md rounded-lg shadow-xl"
                            showInteractive={false}
                        />
                    </ReactFlow>
                </main>
            </FlowchartNodeEnvProvider>

            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addNewNode}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white"
                style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 8px 30px ${accentColor}40`,
                }}
                title="項目を追加"
                type="button"
            >
                <Plus size={28} />
            </motion.button>
        </div>
    );
}
