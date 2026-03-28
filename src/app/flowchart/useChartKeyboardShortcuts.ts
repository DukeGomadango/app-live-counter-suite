"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { LineNodePersistedData } from "@/lib/chartLedger";
import { CHART_TOTAL_ID, mergeLedgerTotalsIntoNodes } from "@/lib/chartLedger";

type SetPast = Dispatch<SetStateAction<{ nodes: Node[]; edges: Edge[] }[]>>;

export function useChartKeyboardShortcuts({
    nodes,
    edges,
    copiedElements,
    setCopiedElements,
    setNodes,
    setEdges,
    setPast,
    saveHistory,
}: {
    nodes: Node[];
    edges: Edge[];
    copiedElements: { nodes: Node[]; edges: Edge[] } | null;
    setCopiedElements: Dispatch<SetStateAction<{ nodes: Node[]; edges: Edge[] } | null>>;
    setNodes: Dispatch<SetStateAction<Node[]>>;
    setEdges: Dispatch<SetStateAction<Edge[]>>;
    setPast: SetPast;
    saveHistory: (currentNodes: Node[], currentEdges: Edge[]) => void;
}): void {
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
                const selectedNodes = nodes.filter((n) => n.selected && n.id !== CHART_TOTAL_ID && n.type === "line");
                if (selectedNodes.length === 0) return;
                e.preventDefault();
                setCopiedElements({ nodes: selectedNodes, edges: [] });

                if (isCut) {
                    saveHistory(nodes, edges);
                    setNodes((nds) =>
                        mergeLedgerTotalsIntoNodes(nds.filter((n) => !n.selected || n.id === CHART_TOTAL_ID))
                    );
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
                        d.mode === "subtract" ? "subtract" : op === "-" || op === "/" ? "subtract" : "add";
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

                setNodes((nds) =>
                    mergeLedgerTotalsIntoNodes([...nds.map((n) => ({ ...n, selected: false })), ...pastedNodes])
                );
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nodes, edges, copiedElements, saveHistory, setNodes, setEdges, setCopiedElements, setPast]);
}
