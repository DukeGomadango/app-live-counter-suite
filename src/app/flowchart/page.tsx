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

export default function FlowChartPage() {
    // 1. Sync appSettings
    const [appSettings, setAppSettings] = useLocalStorage<AppSettings>("counter-app-settings", {
        cardSize: "L" as const,
        showProjectName: false,
        projectName: "",
        projectNameSize: "M" as const,
        projectNameColor: "#a855f7",
        accentColor: "#a855f7",
        orbIntensity: 50,
    });

    // Some SettingsModal config assumes isLightMode exists in AppSettings, but we moved it out in Counter mode.
    // In Counter mode, it's stored in 'counter-light-mode'. We should sync that directly.
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("counter-light-mode", false);

    const accentColor = appSettings.accentColor || "#a855f7";

    // Header States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Save flowchart state to local storage
    const [nodes, setNodes] = useLocalStorage<Node[]>("flowchart-nodes", INITIAL_NODES);
    const [edges, setEdges] = useLocalStorage<Edge[]>("flowchart-edges", []);
    const [savedCharts, setSavedCharts] = useLocalStorage<SavedFlowChart[]>("flowchart-saved-charts", []);
    const [globalTarget, setGlobalTarget] = useLocalStorage<number>("flowchart-global-target", 0);

    const [ghostSourceId, setGhostSourceId] = useState<string | null>(null);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
        [setEdges]
    );

    // Node Callbacks
    const handleIncrement = useCallback((id: string) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                return { ...n, data: { ...n.data, count: (n.data as CounterNodeData).count + 1 } };
            }
            return n;
        }));
    }, [setNodes]);

    const handleDecrement = useCallback((id: string) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                return { ...n, data: { ...n.data, count: Math.max(0, (n.data as CounterNodeData).count - 1) } };
            }
            return n;
        }));
    }, [setNodes]);

    const handleUpdateConfig = useCallback((id: string, updates: Partial<CounterNodeData>) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                return { ...n, data: { ...n.data, ...updates } };
            }
            return n;
        }));
    }, [setNodes]);

    const handleUpdateTotalLabel = useCallback((id: string, newLabel: string) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                return { ...n, data: { ...n.data, label: newLabel } };
            }
            return n;
        }));
    }, [setNodes]);

    const handleDelete = useCallback((id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    }, [setNodes, setEdges]);

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

        setNodes(nds => [...nds, newNode]);
        setEdges(eds => [...eds, newEdge]);
        setGhostSourceId(null);
    }, [nodes, setNodes, setEdges]);

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
                        onDelete: handleDelete,
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
    }, [nodes, isLightMode, handleIncrement, handleDecrement, handleUpdateConfig, handleUpdateTotalLabel, handleDelete, globalTarget, handleSourceHover, handleSourceClick, handleQuickAdd, accentColor]);

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
                const data = node.data as any; // Cast as we don't know the exact type here
                const val = data.value || 0;
                const count = data.count || 0;
                const op = data.operation || "+";

                if (op === "+") {
                    outputValue = inputValue + (val * count);
                } else if (op === "-") {
                    outputValue = inputValue - (val * count);
                } else if (op === "*") {
                    // Start from input or from 1 if no input but it multiplies...?
                    // Let's assume multiplication multiplies the input. If count = 0, no effect (* 1).
                    // If input is 0, multiple is 0.
                    outputValue = inputValue * Math.pow(val, count);
                } else if (op === "/") {
                    const divisor = Math.pow(val, count);
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

        // Update Edge styles based on source output weights
        setEdges(eds => {
            let hasChanges = false;
            const newEdges = eds.map(e => {
                const sourceOutput = nodeOutputs.get(e.source) || 0;
                // Calculate thickness. Min 2, max 10. Scale by log base 10 roughly to handle huge numbers
                const thickness = Math.max(2, Math.min(10, 2 + Math.log10(sourceOutput > 0 ? sourceOutput : 1) * 2));
                const currentWidth = e.style?.strokeWidth || 2;

                // Only update if changed significantly to avoid jitter
                if (Math.abs(Number(currentWidth) - thickness) > 0.5) {
                    hasChanges = true;
                    return {
                        ...e,
                        style: {
                            ...e.style,
                            strokeWidth: thickness,
                            stroke: accentColor,
                        },
                        animated: true,
                    };
                }
                return {
                    ...e,
                    style: { ...e.style, stroke: accentColor }, // Ensure color is always synced
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

    const defaultEdgeOptions = useMemo(() => ({
        type: 'smoothstep',
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: accentColor,
        },
        style: { strokeWidth: 2, stroke: accentColor },
        animated: true,
    }), [accentColor]);

    return (
        <div
            className={`h-screen w-screen flex flex-col overflow-hidden relative z-10 ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0a051e]'}`}
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
                onDeleteChart={handleDeleteChart}
                globalTarget={globalTarget}
                onSetGlobalTarget={setGlobalTarget}
                viewMode="flowchart"
                flowchartNodes={nodes}
                onSetNodeTarget={handleSetNodeTarget}
            />

            <AnimatePresence>
                {isSettingsOpen && (
                    <SettingsModal
                        settings={appSettings}
                        isLightMode={isLightMode}
                        onSave={setAppSettings}
                        onClose={() => setIsSettingsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Background Orbs (Synced with Counter mode) */}
            {!isLightMode && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-50 z-0">
                    <motion.div
                        animate={{
                            x: [0, 100, -50, 0],
                            y: [0, -100, 50, 0],
                            scale: [1, 1.2, 0.8, 1],
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[20%] left-[20%] w-[40rem] h-[40rem] rounded-full blur-[120px]"
                        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, opacity: appSettings.orbIntensity }}
                    />
                    <motion.div
                        animate={{
                            x: [0, -100, 50, 0],
                            y: [0, 100, -50, 0],
                            scale: [1, 0.8, 1.2, 1],
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[100px]"
                        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, opacity: appSettings.orbIntensity * 0.8 }}
                    />
                </div>
            )}

            {/* Header: Mode Selector and Quick Actions */}
            <div
                className="absolute top-0 left-0 right-0 z-[30] flex items-center justify-between px-3 py-2 pointer-events-none"
            >
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="w-12 h-10" /> {/* Spacer for hamburger menu area */}
                    <ModeSelector isLightMode={isLightMode} />
                </div>

                {/* Top right area is now empty to avoid clutter, using Floating Action Button instead */}
            </div>

            <main className="flex-1 w-full h-full">
                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onReconnect={onReconnect}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    className="touch-none bg-transparent"
                    colorMode={isLightMode ? "light" : "dark"}
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={24}
                        size={2}
                        color={isLightMode ? `${accentColor}20` : `${accentColor}20`}
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
