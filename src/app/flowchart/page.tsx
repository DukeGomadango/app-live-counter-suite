"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
    BackgroundVariant,
    MarkerType,
    reconnectEdge,
    Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ModeSelector from "@/components/ModeSelector";
import CounterNode, { CounterNodeData } from "@/components/flowchart/CounterNode";
import TotalNode, { TotalNodeData } from "@/components/flowchart/TotalNode";
import { Plus } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { motion, AnimatePresence } from "framer-motion";
import HamburgerMenu, { SavedFlowChart } from "@/components/HamburgerMenu";
import SettingsModal, { AppSettings } from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";

const nodeTypes = {
    counter: CounterNode,
    total: TotalNode,
};

const INITIAL_NODES: Node[] = [
    {
        id: "total",
        type: "total",
        position: { x: 500, y: 250 },
        data: { value: 0, isLightMode: false },
    },
];

const INITIAL_EDGES: Edge[] = [];

export default function FlowChartPage({ isSplitMode = false, isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
    // 1. Sync appSettings
    const [appSettings, setAppSettings] = useLocalStorage<AppSettings>("flowchart-app-settings", {
        cardSize: "L" as const,
        edgeThickness: "M",
        showProjectName: false,
        projectName: "",
        projectNameSize: "M" as const,
        projectNameColor: "#a855f7",
        accentColor: "#a855f7",
        orbIntensity: 50,
        dotIntensity: 50,
    });

    // Some SettingsModal config assumes isLightMode exists in AppSettings, but we moved it out in Counter mode.
    // In Counter mode, it's stored in 'counter-light-mode'. We should sync that directly.
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("counter-light-mode", false);

    const accentColor = appSettings.accentColor || "#a855f7";

    // Header States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
    const [chartToDelete, setChartToDelete] = useState<string | null>(null);

    // Save flowchart state to local storage
    const [nodes, setNodes] = useLocalStorage<Node[]>("flowchart-nodes", INITIAL_NODES);
    const [edges, setEdges] = useLocalStorage<Edge[]>("flowchart-edges", INITIAL_EDGES);
    const [savedCharts, setSavedCharts] = useLocalStorage<SavedFlowChart[]>("flowchart-saved-charts", [
        {
            id: "sample-1",
            name: "サンプル 1 (基本的な使い方)",
            notes: "数珠つなぎ（直列）で繋ぐと掛け算が適用されます",
            nodes: [
                { id: "total", type: "total", position: { x: 1040, y: 336 }, data: { value: 0, isLightMode: false }, selected: false },
                { id: "template-add-1", type: "counter", position: { x: 40, y: 336 }, data: { label: "加算", emoji: "➕", color: "#a855f7", operation: "+", value: 1, count: 0, isLightMode: false }, selected: false },
                { id: "template-add-2", type: "counter", position: { x: 290, y: 336 }, data: { label: "加算", emoji: "✨", color: "#3b82f6", operation: "+", value: 2, count: 0, isLightMode: false }, selected: false },
                { id: "template-sub-5", type: "counter", position: { x: 540, y: 336 }, data: { label: "減算", emoji: "➖", color: "#ef4444", operation: "-", value: 5, count: 0, isLightMode: false }, selected: false },
                { id: "template-mul-2", type: "counter", position: { x: 790, y: 336 }, data: { label: "乗算", emoji: "⭐", color: "#eab308", operation: "*", value: 2, count: 0, isLightMode: false }, selected: false }
            ],
            edges: [
                { id: "e-add1-add2", source: "template-add-1", sourceHandle: "source-right", target: "template-add-2", targetHandle: "target-left" },
                { id: "e-add2-sub5", source: "template-add-2", sourceHandle: "source-right", target: "template-sub-5", targetHandle: "target-left" },
                { id: "e-sub5-mul2", source: "template-sub-5", sourceHandle: "source-right", target: "template-mul-2", targetHandle: "target-left" },
                { id: "e-mul2-total", source: "template-mul-2", sourceHandle: "source-right", target: "total", targetHandle: "target-left" }
            ],
            updatedAt: 1740000000000
        }
    ]);
    const [globalTarget, setGlobalTarget] = useLocalStorage<number>("flowchart-global-target", 0);

    const [ghostSourceId, setGhostSourceId] = useState<string | null>(null);

    // History and Clipboard for Keyboard Shortcuts
    const [past, setPast] = useLocalStorage<{ nodes: Node[], edges: Edge[] }[]>("flowchart-undo-history", []);
    const [copiedElements, setCopiedElements] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);

    const saveHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
        setPast(p => [...p.slice(-20), { nodes: currentNodes, edges: currentEdges }]);
    }, [setPast]);

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCopy = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'c';
            const isCut = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'x';
            const isPaste = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'v';
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'z';

            if (isUndo) {
                e.preventDefault();
                setPast(p => {
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
                const selectedNodes = nodes.filter(n => n.selected && n.id !== 'total');
                if (selectedNodes.length === 0) return;
                e.preventDefault();

                const selectedEdges = edges.filter(edge => selectedNodes.some(n => n.id === edge.source) && selectedNodes.some(n => n.id === edge.target));
                setCopiedElements({ nodes: selectedNodes, edges: selectedEdges });

                if (isCut) {
                    saveHistory(nodes, edges);
                    setNodes(nds => nds.filter(n => !n.selected || n.id === 'total'));
                    setEdges(eds => eds.filter(edge => !selectedNodes.some(n => n.id === edge.source || n.id === edge.target)));
                }
            }

            if (isPaste && copiedElements) {
                e.preventDefault();
                saveHistory(nodes, edges);

                const idMap = new Map<string, string>();
                const pastedNodes = copiedElements.nodes.map(n => {
                    const newId = `counter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    idMap.set(n.id, newId);
                    return { ...n, id: newId, position: { x: n.position.x + 50, y: n.position.y + 50 }, selected: true };
                });
                const pastedEdges = copiedElements.edges.map(e => ({
                    ...e,
                    id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    source: idMap.get(e.source) || e.source,
                    target: idMap.get(e.target) || e.target,
                    selected: true
                }));

                setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...pastedNodes]);
                setEdges(eds => [...eds.map(e => ({ ...e, selected: false })), ...pastedEdges]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, edges, copiedElements, saveHistory, setNodes, setEdges]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    const onConnect = useCallback(
        (params: Connection | Edge) => {
            saveHistory(nodes, edges);
            setEdges((eds) => {
                return addEdge(params, eds);
            });
        },
        [setEdges, nodes, edges, saveHistory]
    );

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
        [setEdges]
    );

    // Node Callbacks
    const handleIncrement = useCallback((id: string) => {
        saveHistory(nodes, edges);
        setNodes((nds) => {
            return nds.map((n) => {
                if (n.id === id) {
                    return { ...n, data: { ...n.data, count: (n.data as CounterNodeData).count + 1 } };
                }
                return n;
            });
        });
    }, [nodes, edges, setNodes, saveHistory]);

    const handleDecrement = useCallback((id: string) => {
        saveHistory(nodes, edges);
        setNodes((nds) => {
            return nds.map((n) => {
                if (n.id === id) {
                    return { ...n, data: { ...n.data, count: Math.max(0, (n.data as CounterNodeData).count - 1) } };
                }
                return n;
            });
        });
    }, [nodes, edges, setNodes, saveHistory]);

    const handleUpdateConfig = useCallback((id: string, updates: Partial<CounterNodeData>) => {
        saveHistory(nodes, edges);
        setNodes((nds) => {
            return nds.map((n) => {
                if (n.id === id) {
                    return { ...n, data: { ...n.data, ...updates } };
                }
                return n;
            });
        });
    }, [nodes, edges, setNodes, saveHistory]);

    const handleUpdateTotalLabel = useCallback((id: string, newLabel: string) => {
        saveHistory(nodes, edges);
        setNodes((nds) => {
            return nds.map((n) => {
                if (n.id === id) {
                    return { ...n, data: { ...n.data, label: newLabel } };
                }
                return n;
            });
        });
    }, [nodes, edges, setNodes, saveHistory]);

    const handleDelete = useCallback((id: string) => {
        saveHistory(nodes, edges);
        setEdges((eds) => {
            return eds.filter((e) => e.source !== id && e.target !== id);
        });
        setNodes((nds) => nds.filter((n) => n.id !== id));
    }, [nodes, edges, setNodes, setEdges, saveHistory]);

    const requestDeleteNode = useCallback((id: string) => setNodeToDelete(id), []);

    const onNodeDragStart = useCallback(() => {
        saveHistory(nodes, edges);
    }, [nodes, edges, saveHistory]);

    const handleSourceHover = useCallback((id: string, isHovering: boolean) => {
        setGhostSourceId(isHovering ? id : null);
    }, []);

    const handleSourceClick = useCallback((id: string) => {
        const sourceNode = nodes.find(n => n.id === id);
        if (!sourceNode) return;

        const newId = `counter-${Date.now()}`;
        const newNode: Node = {
            id: newId,
            type: "counter",
            position: { x: sourceNode.position.x + 350, y: sourceNode.position.y },
            data: {
                label: "新規イベント",
                emoji: "✨",
                operation: "+",
                value: 1,
                count: 1,
            },
        };
        const newEdge: Edge = {
            id: `edge-${id}-${newId}`,
            source: id,
            target: newId,
        };

        setNodes((nds) => {
            saveHistory(nds, edges);
            return [...nds, newNode];
        });
        setEdges((eds) => [...eds, newEdge]);
        setGhostSourceId(null);
    }, [nodes, edges, setNodes, setEdges, saveHistory]);

    const handleQuickAdd = useCallback((sourceId: string, position: Position) => {
        const sourceNode = nodes.find(n => n.id === sourceId);
        if (!sourceNode) return;

        let newX = sourceNode.position.x;
        let newY = sourceNode.position.y;

        // Space out nodes based on handle direction
        if (position === Position.Right) newX += 300;
        else if (position === Position.Left) newX -= 300;
        else if (position === Position.Bottom) newY += 180;
        else if (position === Position.Top) newY -= 180;

        const newId = `counter-${Date.now()}`;
        const newNode: Node = {
            id: newId,
            type: "counter",
            position: { x: newX, y: newY },
            data: {
                label: "新規イベント",
                emoji: "✨",
                operation: "+",
                value: 1,
                count: 1,
            },
        };

        const newEdge: Edge = {
            id: `edge-${sourceId}-${newId}`,
            source: sourceId,
            sourceHandle: `source-${position}`,
            target: newId,
            // Depending on which way we grow, attempt to connect to opposite handle
            targetHandle: `target-${position === Position.Right ? "left" : position === Position.Left ? "right" : position === Position.Bottom ? "top" : "bottom"}`,
        };

        setNodes(nds => [...nds, newNode]);
        setEdges(eds => [...eds, newEdge]);
    }, [nodes, setNodes, setEdges]);

    // Update node data with callbacks and light mode without triggering infinite re-renders
    const nodesWithCallbacks = useMemo(() => {
        return nodes.map((node) => {
            if (node.type === "counter") {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        isLightMode,
                        color: accentColor,
                        onIncrement: handleIncrement,
                        onDecrement: handleDecrement,
                        onUpdateConfig: handleUpdateConfig,
                        onDelete: requestDeleteNode,
                        onSourceHover: handleSourceHover,
                        onSourceClick: handleSourceClick,
                        onQuickAdd: handleQuickAdd,
                    },
                };
            }
            if (node.type === "total") {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        target: globalTarget,
                        isLightMode,
                        onUpdateLabel: handleUpdateTotalLabel,
                    },
                };
            }
            return node;
        });
    }, [nodes, isLightMode, handleIncrement, handleDecrement, handleUpdateConfig, handleUpdateTotalLabel, requestDeleteNode, globalTarget, handleSourceHover, handleSourceClick, handleQuickAdd, accentColor]);

    const displayNodes = useMemo(() => {
        if (!ghostSourceId) return nodesWithCallbacks;
        const sourceNode = nodesWithCallbacks.find(n => n.id === ghostSourceId);
        if (!sourceNode) return nodesWithCallbacks;

        const ghostNode: Node = {
            id: "ghost-node",
            type: "counter",
            position: { x: sourceNode.position.x + 350, y: sourceNode.position.y },
            data: {
                label: "クリックで追加",
                emoji: "➕",
                operation: "+",
                value: 1,
                count: 1,
                color: accentColor,
                isLightMode,
                isGhost: true,
            },
            style: { pointerEvents: "none" }, // Makes it ignore mouse interactions over it
        };
        return [...nodesWithCallbacks, ghostNode];
    }, [nodesWithCallbacks, ghostSourceId, accentColor, isLightMode]);

    const displayEdges = useMemo(() => {
        if (!ghostSourceId) return edges;
        const ghostEdge: Edge = {
            id: "ghost-edge",
            source: ghostSourceId,
            target: "ghost-node",
            type: "smoothstep",
            animated: true,
            style: { strokeWidth: 2, stroke: accentColor, strokeDasharray: "5 5", opacity: 0.5 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: accentColor },
        };
        return [...edges, ghostEdge];
    }, [edges, ghostSourceId, accentColor]);

    // Topological calculation
    useEffect(() => {
        // Build graph representations
        // Create an adjacency list: node -> outgoing edges
        const adjacency = new Map<string, string[]>();
        // And incoming edges: target -> edge[]
        const incomingEdges = new Map<string, Edge[]>();

        nodes.forEach(n => {
            adjacency.set(n.id, []);
            incomingEdges.set(n.id, []);
        });

        edges.forEach(e => {
            if (adjacency.has(e.source)) adjacency.get(e.source)!.push(e.target);
            if (incomingEdges.has(e.target)) incomingEdges.get(e.target)!.push(e);
        });

        // Compute indegree
        const inDegree = new Map<string, number>();
        nodes.forEach(n => inDegree.set(n.id, 0));
        edges.forEach(e => {
            if (inDegree.has(e.target)) inDegree.set(e.target, inDegree.get(e.target)! + 1);
        });

        // Find sources (inDegree === 0)
        const queue: string[] = [];
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) queue.push(nodeId);
        });

        // Store computed output value for each node
        const nodeOutputs = new Map<string, number>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const node = nodes.find(n => n.id === currentId);
            if (!node) continue;

            // 1. Calculate input value for this node (sum of all incoming edges outputs)
            let inputValue = 0;
            const myIncomingEdges = incomingEdges.get(currentId) || [];
            myIncomingEdges.forEach(e => {
                inputValue += nodeOutputs.get(e.source) || 0;
            });

            // 2. Calculate output value based on node type
            let outputValue = 0;

            if (node.type === "counter") {
                const data = node.data as unknown as CounterNodeData;
                const val = data.value || 0;
                const count = data.count || 0;
                const op = data.operation || "+";

                if (op === "+") {
                    outputValue = inputValue + (val * count);
                } else if (op === "-") {
                    outputValue = inputValue - (val * count);
                } else if (op === "*") {
                    // Linear multiplier: val * count
                    const multiplier = count === 0 ? 1 : (val * count);
                    outputValue = inputValue * multiplier;
                } else if (op === "/") {
                    const divisor = count === 0 ? 1 : (val * count);
                    outputValue = divisor !== 0 ? inputValue / divisor : 0;
                }
            } else if (node.type === "total") {
                outputValue = inputValue; // Total node just displays the input
            }

            nodeOutputs.set(currentId, outputValue);

            // Decrease indegree of neighbors
            const neighbors = adjacency.get(currentId) || [];
            neighbors.forEach(neighbor => {
                const degree = inDegree.get(neighbor)! - 1;
                inDegree.set(neighbor, degree);
                if (degree === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Update Nodes and Edges
        setNodes(nds => {
            let hasChanges = false;
            const newNodes = nds.map(n => {
                if (n.type === "total") {
                    const calculatedValue = nodeOutputs.get(n.id) || 0;
                    if (n.data.value !== calculatedValue) {
                        hasChanges = true;
                        return {
                            ...n,
                            data: { ...n.data, value: calculatedValue }
                        };
                    }
                }
                return n;
            });
            return hasChanges ? newNodes : nds;
        });

        // Update Edge styles based on source output weights and accent color
        setEdges(eds => {
            let hasChanges = false;
            const newEdges = eds.map(e => {
                const sourceOutput = nodeOutputs.get(e.source) || 0;
                const thickness = Math.max(2, Math.min(10, 2 + Math.log10(sourceOutput > 0 ? sourceOutput : 1) * 2));
                const currentWidth = e.style?.strokeWidth || 2;
                const currentStroke = e.style?.stroke;
                const thicknessChanged = Math.abs(Number(currentWidth) - thickness) > 0.5;
                const strokeChanged = currentStroke !== accentColor;

                if (thicknessChanged || strokeChanged) hasChanges = true;
                return {
                    ...e,
                    style: {
                        ...e.style,
                        strokeWidth: thicknessChanged ? thickness : (e.style?.strokeWidth ?? 2),
                        stroke: accentColor,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: accentColor,
                    },
                    animated: true,
                };
            });
            return hasChanges ? newEdges : eds;
        });

    }, [nodes, edges, setNodes, setEdges, accentColor]);

    const addNewNode = () => {
        const id = `node-${Date.now()}`;
        const newNode: Node = {
            id,
            type: "counter",
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: {
                label: "新規イベント",
                emoji: "✨",
                operation: "+",
                value: 1,
                count: 0,
                color: accentColor,
            } as CounterNodeData,
        };
        setNodes((nds) => [...nds, newNode]);
    };

    const handleSaveChart = useCallback((name: string) => {
        const newChart: SavedFlowChart = {
            id: `chart-${Date.now()}`,
            name,
            nodes,
            edges,
            updatedAt: Date.now(),
        };
        setSavedCharts((prev) => [newChart, ...prev]);
    }, [nodes, edges, setSavedCharts]);

    const handleLoadChart = useCallback((chart: SavedFlowChart) => {
        setNodes(chart.nodes);
        setEdges(chart.edges);
    }, [setNodes, setEdges]);

    const handleDeleteChart = useCallback((id: string) => {
        setSavedCharts((prev) => prev.filter(c => c.id !== id));
    }, [setSavedCharts]);

    const handleSetNodeTarget = useCallback((id: string, target: number) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                return { ...n, data: { ...n.data, target } };
            }
            return n;
        }));
    }, [setNodes]);

    const defaultEdgeOptions = useMemo(() => {
        const thicknessMap: Record<string, number> = {
            S: 1,
            M: 2,
            L: 4,
        };
        const strokeWidth = thicknessMap[appSettings.edgeThickness || "M"];

        return {
            type: 'smoothstep',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: accentColor,
            },
            style: { strokeWidth, stroke: accentColor },
            animated: true,
        };
    }, [accentColor, appSettings.edgeThickness]);

    return (
        <div
            className={`h-full w-full flex flex-col overflow-hidden relative z-10 ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0a051e]'}`}
            style={{ "--accent-color": accentColor } as React.CSSProperties}
        >
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
                hideThemeToggle={isSplitMode && !isRightPane}
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

            {/* Background Orbs (Expanded and scattered for Flowchart) */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? 'mix-blend-multiply opacity-20' : 'opacity-80'}`}>
                <motion.div
                    animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, opacity: (appSettings.orbIntensity / 100) * (isLightMode ? 1.5 : 1) }}
                />
                <motion.div
                    animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`, opacity: (appSettings.orbIntensity / 100) * 0.8 * (isLightMode ? 1.5 : 1) }}
                />
                <motion.div
                    animate={{ x: [0, 50, -100, 0], y: [0, 50, -100, 0], scale: [1, 1.1, 0.9, 1] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[40%] left-[30%] w-[40rem] h-[40rem] rounded-full blur-[100px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`, opacity: (appSettings.orbIntensity / 100) * 0.6 * (isLightMode ? 1.5 : 1) }}
                />
                <motion.div
                    animate={{ x: [0, -80, 80, 0], y: [0, -50, 100, 0], scale: [1, 1.3, 0.7, 1] }}
                    transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[20%] right-[20%] w-[45rem] h-[45rem] rounded-full blur-[130px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 65%)`, opacity: (appSettings.orbIntensity / 100) * 0.7 * (isLightMode ? 1.5 : 1) }}
                />
                <motion.div
                    animate={{ x: [0, 120, -120, 0], y: [0, 80, -80, 0], scale: [1, 0.9, 1.4, 1] }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[20%] left-[15%] w-[55rem] h-[55rem] rounded-full blur-[140px]"
                    style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 55%)`, opacity: (appSettings.orbIntensity / 100) * 0.5 * (isLightMode ? 1.5 : 1) }}
                />
            </div>

            {/* Header: Mode Selector and Quick Actions */}
            <div
                className="absolute top-0 left-0 right-0 z-[30] flex items-center justify-between px-3 py-2 pointer-events-none"
            >
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="w-12 h-10" /> {/* Spacer for hamburger menu area */}
                    <ModeSelector isLightMode={isLightMode} />
                </div>

                {/* Optional Project Name Display for Flowchart */}
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
                                    appSettings.projectNameSize === "XL" ? "2.5rem" :
                                        appSettings.projectNameSize === "L" ? "1.75rem" :
                                            appSettings.projectNameSize === "S" ? "1rem" : "1.25rem",
                                writingMode: appSettings.projectNameOrientation === "vertical" ? "vertical-rl" : "horizontal-tb",
                                margin: appSettings.projectNameOrientation === "vertical" ? "0 auto" : undefined,
                            }}
                        >
                            {appSettings.projectName}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <main className="flex-1 w-full h-full">
                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onReconnect={onReconnect}
                    onNodeDragStart={onNodeDragStart}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    snapToGrid={true}
                    snapGrid={[24, 24]}
                    fitView
                    fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                    className="touch-none bg-transparent"
                    colorMode={isLightMode ? "light" : "dark"}
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={24}
                        size={2}
                        color={isLightMode ? `${accentColor}40` : `${accentColor}40`}
                        style={{ opacity: appSettings.dotIntensity !== undefined ? appSettings.dotIntensity / 100 : 0.5 }}
                    />
                    <Controls
                        className="bg-white/5 border border-white/10 backdrop-blur-md rounded-lg shadow-xl"
                        showInteractive={false}
                    />
                </ReactFlow>
            </main>
            {/* Floating Add Node Button */}
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
                title="ノードを追加"
            >
                <Plus size={28} />
            </motion.button>
        </div>
    );
}
