"use client";

import {
    useState,
    useCallback,
    useMemo,
    useEffect,
    useLayoutEffect,
    useRef,
    type Dispatch,
    type SetStateAction,
    type CSSProperties,
} from "react";
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    type Node,
    type Edge,
    type NodeChange,
    type EdgeChange,
    BackgroundVariant,
} from "@xyflow/react";
import { ChartFitViewPanel } from "@/components/chart/ChartFitViewPanel";
import "@xyflow/react/dist/style.css";
import ModeSelector from "@/components/ModeSelector";
import LineNode from "@/components/chart/LineNode";
import TotalNode from "@/components/chart/TotalNode";
import { ChartNodeEnvProvider, type ChartNodeEnv } from "@/components/chart/ChartNodeEnvContext";
import { Plus } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDebouncedLocalStorage } from "@/hooks/useDebouncedLocalStorage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import HamburgerMenu from "@/components/HamburgerMenu";
import SettingsModal, { type AppSettings } from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
    CHART_LAYOUT_BREAKPOINT_PX,
    CHART_TOTAL_ID,
    CHART_ZOOM_MAX,
    CHART_ZOOM_MIN,
    ledgerTotalsSignature,
    layoutChartNodes,
    migrateLegacyChart,
    chartTranslateExtent,
    mergeLedgerTotalsIntoNodes,
} from "@/lib/chartLedger";
import type { SavedChart } from "@/lib/chartTypes";
import { ChartTotalPulseProvider } from "@/components/chart/ChartTotalPulseContext";
import { ChartLedgerPulseSync } from "@/components/chart/ChartLedgerPulseSync";
import {
    CHART_APP_SETTINGS_DEFAULT,
    CHART_INITIAL_EDGES,
    CHART_INITIAL_NODES,
    CHART_SAMPLE_SAVED_CHARTS,
    CHART_ZOOM_ON_SCROLL,
} from "./chartDefaults";
import { useChartKeyboardShortcuts } from "./useChartKeyboardShortcuts";
import { useChartLineActions } from "./useChartLineActions";
import { useChartEdgePresentation } from "./useChartEdgePresentation";
import { useTheme } from "@/context/ThemeContext";

const nodeTypes = {
    line: LineNode,
    total: TotalNode,
};

export default function ChartContent({
    isSplitMode = false,
    isRightPane: _isRightPane = false,
}: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
    const [appSettings, setAppSettings] = useLocalStorage<AppSettings>(
        "flowchart-app-settings",
        CHART_APP_SETTINGS_DEFAULT
    );
    const intensity = appSettings.flowchartFxIntensity ?? "normal";
    return (
        <ChartTotalPulseProvider intensityMode={intensity}>
            <ChartContentInner isSplitMode={isSplitMode} appSettings={appSettings} setAppSettings={setAppSettings} />
        </ChartTotalPulseProvider>
    );
}

function ChartContentInner({
    isSplitMode = false,
    appSettings,
    setAppSettings,
}: {
    isSplitMode?: boolean;
    appSettings: AppSettings;
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
}) {
    const { isLightMode, toggleTheme } = useTheme();

    const accentColor = appSettings.accentColor || "#a855f7";

    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const isNarrowViewport = useMediaQuery(`(max-width: ${CHART_LAYOUT_BREAKPOINT_PX}px)`);
    const effectiveEdgeAnimated = useMemo(() => {
        if (prefersReducedMotion) return false;
        const a = appSettings.flowchartEdgeAnimated;
        if (a === true) return true;
        if (a === false) return false;
        return !isNarrowViewport;
    }, [prefersReducedMotion, isNarrowViewport, appSettings.flowchartEdgeAnimated]);

    const showAmbientOrbs = !prefersReducedMotion && (appSettings.orbIntensity ?? 0) > 0;

    const gridBackgroundMode = appSettings.flowchartGridBackground ?? "dots";
    const gridOpacity = (appSettings.dotIntensity ?? 50) / 100;
    const showFlowBackground = gridBackgroundMode !== "none" && gridOpacity > 0;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
    const [chartToDelete, setChartToDelete] = useState<string | null>(null);

    const [nodes, setNodes] = useDebouncedLocalStorage<Node[]>("flowchart-nodes", CHART_INITIAL_NODES, 400);
    const [edges, setEdges] = useDebouncedLocalStorage<Edge[]>("flowchart-edges", CHART_INITIAL_EDGES, 400);

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    useLayoutEffect(() => {
        nodesRef.current = nodes;
        edgesRef.current = edges;
    });

    const flowWrapRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });

    const [savedCharts, setSavedCharts] = useLocalStorage<SavedChart[]>(
        "flowchart-saved-charts",
        CHART_SAMPLE_SAVED_CHARTS
    );
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
        const r = migrateLegacyChart(nodes, edges);
        if (!r.changed) return;
        setNodes(r.nodes);
        setEdges(r.edges);
    }, [nodes, edges, setNodes, setEdges]);

    useLayoutEffect(() => {
        if (viewport.w <= 0 || viewport.h <= 0) return;
        const r = layoutChartNodes(nodes, viewport.w, {
            cardSize: appSettings.cardSize,
            cardScale: appSettings.cardScale,
        });
        if (!r.changed) return;
        setNodes(r.nodes);
    }, [nodes, viewport.w, viewport.h, appSettings.cardSize, appSettings.cardScale, setNodes]);

    const ledgerSig = useMemo(() => ledgerTotalsSignature(nodes), [nodes]);

    const translateExtent = useMemo(
        () => chartTranslateExtent(nodes, appSettings.cardSize, appSettings.cardScale),
        [nodes, appSettings.cardSize, appSettings.cardScale]
    );

    useEffect(() => {
        setNodes((nds) => mergeLedgerTotalsIntoNodes(nds));
    }, [ledgerSig, setNodes]);

    useChartKeyboardShortcuts({
        nodes,
        edges,
        copiedElements,
        setCopiedElements,
        setNodes,
        setEdges,
        setPast,
        saveHistory,
    });

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const filtered = changes.filter((c) => {
                if (c.type === "remove") {
                    const id = "id" in c ? c.id : "";
                    if (id === CHART_TOTAL_ID) return false;
                }
                if (c.type === "position" && c.id === CHART_TOTAL_ID) return false;
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

    const {
        handleIncrement,
        handleDecrement,
        handleAdjustLineCount,
        handleSetLineCount,
        handleUpdateLineConfig,
        handleUpdateSummaryLabels,
        handleDelete,
        requestDeleteNode,
        addNewNode,
    } = useChartLineActions(nodesRef, edgesRef, setNodes, setEdges, saveHistory, setNodeToDelete);

    const chartNodeEnv = useMemo<ChartNodeEnv>(
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

    const { styledEdges, defaultEdgeOptions } = useChartEdgePresentation(
        edges,
        accentColor,
        appSettings.edgeThickness,
        effectiveEdgeAnimated
    );

    const handleSaveChart = useCallback(
        (name: string) => {
            const newChart: SavedChart = {
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
        (chart: SavedChart) => {
            const r = migrateLegacyChart(chart.nodes as Node[], chart.edges as Edge[]);
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

    return (
        <div
            className={`h-full w-full flex flex-col overflow-hidden relative z-10 ${isLightMode ? "bg-[#f8f9fa]" : "bg-[#0a051e]"}`}
            style={{ "--accent-color": accentColor } as CSSProperties}
        >
            <ChartLedgerPulseSync ledgerSig={ledgerSig} />
            <HamburgerMenu
                isOpen={isMenuOpen}
                onToggle={() => setIsMenuOpen(!isMenuOpen)}
                isLightMode={isLightMode}
                onToggleTheme={toggleTheme}
                onReset={() => {
                    setNodes(CHART_INITIAL_NODES);
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
                viewMode="chart"
                chartNodes={nodes}
                onSetNodeTarget={handleSetNodeTarget}
                hideThemeToggle={false}
                hideModeSelector={isSplitMode}
            />

            <AnimatePresence>
                {isSettingsOpen && (
                    <SettingsModal
                        settings={appSettings}
                        isLightMode={isLightMode}
                        mode="chart"
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

            {showAmbientOrbs && (
                <div
                    className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}
                >
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
            )}

            <div className="absolute top-0 left-0 right-0 z-[30] flex items-center justify-between px-3 py-2 pointer-events-none">
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
                                writingMode:
                                    appSettings.projectNameOrientation === "vertical" ? "vertical-rl" : "horizontal-tb",
                                margin: appSettings.projectNameOrientation === "vertical" ? "0 auto" : undefined,
                            }}
                        >
                            {appSettings.projectName}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ChartNodeEnvProvider value={chartNodeEnv}>
                <main
                    ref={flowWrapRef}
                    className="flex-1 w-full h-full min-h-[320px]"
                    style={{ overscrollBehavior: "contain" }}
                >
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
                        minZoom={CHART_ZOOM_MIN}
                        maxZoom={CHART_ZOOM_MAX}
                        zoomOnScroll={CHART_ZOOM_ON_SCROLL}
                        zoomOnPinch
                        zoomOnDoubleClick={false}
                        translateExtent={translateExtent}
                        fitView
                        fitViewOptions={{ padding: 0.2, minZoom: CHART_ZOOM_MIN, maxZoom: CHART_ZOOM_MAX }}
                        className="touch-manipulation bg-transparent"
                        colorMode={isLightMode ? "light" : "dark"}
                    >
                        {showFlowBackground && (
                            <Background
                                variant={gridBackgroundMode === "lines" ? BackgroundVariant.Lines : BackgroundVariant.Dots}
                                gap={24}
                                size={2}
                                color={`${accentColor}40`}
                                style={{ opacity: gridOpacity }}
                            />
                        )}
                        <ChartFitViewPanel
                            isLightMode={isLightMode}
                            accentColor={accentColor}
                            minZoom={CHART_ZOOM_MIN}
                            maxZoom={CHART_ZOOM_MAX}
                        />
                        <Controls
                            className="bg-white/5 border border-white/10 backdrop-blur-md rounded-lg shadow-xl"
                            showInteractive={false}
                        />
                    </ReactFlow>
                </main>
            </ChartNodeEnvProvider>

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
