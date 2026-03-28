"use client";

import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
    CHART_TOTAL_ID,
    mergeLedgerTotalsIntoNodes,
    type LineNodePersistedData,
    type LedgerTotalPersistedData,
} from "@/lib/chartLedger";

export function useChartLineActions(
    nodesRef: MutableRefObject<Node[]>,
    edgesRef: MutableRefObject<Edge[]>,
    setNodes: Dispatch<SetStateAction<Node[]>>,
    setEdges: Dispatch<SetStateAction<Edge[]>>,
    saveHistory: (currentNodes: Node[], currentEdges: Edge[]) => void,
    setNodeToDelete: Dispatch<SetStateAction<string | null>>
) {
    const handleIncrement = useCallback(
        (id: string) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                mergeLedgerTotalsIntoNodes(
                    nds.map((n) => {
                        if (n.id !== id || n.type !== "line") return n;
                        const d = n.data as LineNodePersistedData;
                        return { ...n, data: { ...d, count: d.count + 1 } };
                    })
                )
            );
        },
        [setNodes, saveHistory, nodesRef, edgesRef]
    );

    const handleDecrement = useCallback(
        (id: string) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                mergeLedgerTotalsIntoNodes(
                    nds.map((n) => {
                        if (n.id !== id || n.type !== "line") return n;
                        const d = n.data as LineNodePersistedData;
                        return { ...n, data: { ...d, count: Math.max(0, d.count - 1) } };
                    })
                )
            );
        },
        [setNodes, saveHistory, nodesRef, edgesRef]
    );

    const handleAdjustLineCount = useCallback(
        (id: string, delta: number) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                mergeLedgerTotalsIntoNodes(
                    nds.map((n) => {
                        if (n.id !== id || n.type !== "line") return n;
                        const d = n.data as LineNodePersistedData;
                        const sum = d.count + delta;
                        const next = typeof sum === "number" && Number.isFinite(sum) ? Math.trunc(sum) : d.count;
                        return { ...n, data: { ...d, count: Math.max(0, next) } };
                    })
                )
            );
        },
        [setNodes, saveHistory, nodesRef, edgesRef]
    );

    const handleSetLineCount = useCallback(
        (id: string, value: number) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                mergeLedgerTotalsIntoNodes(
                    nds.map((n) => {
                        if (n.id !== id || n.type !== "line") return n;
                        const d = n.data as LineNodePersistedData;
                        const v = Number.isFinite(value) ? Math.trunc(value) : 0;
                        return { ...n, data: { ...d, count: Math.max(0, v) } };
                    })
                )
            );
        },
        [setNodes, saveHistory, nodesRef, edgesRef]
    );

    const handleUpdateLineConfig = useCallback(
        (id: string, updates: Partial<LineNodePersistedData>) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setNodes((nds) =>
                mergeLedgerTotalsIntoNodes(
                    nds.map((n) => {
                        if (n.id !== id || n.type !== "line") return n;
                        const d = n.data as LineNodePersistedData;
                        const next = { ...d, ...updates };
                        if (next.step !== undefined) next.step = Math.max(0, next.step);
                        if (next.count !== undefined) next.count = Math.max(0, next.count);
                        return { ...n, data: next };
                    })
                )
            );
        },
        [setNodes, saveHistory, nodesRef, edgesRef]
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
        [setNodes, saveHistory, nodesRef, edgesRef]
    );

    const handleDelete = useCallback(
        (id: string) => {
            saveHistory(nodesRef.current, edgesRef.current);
            setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
            setNodes((nds) => mergeLedgerTotalsIntoNodes(nds.filter((n) => n.id !== id)));
        },
        [setNodes, setEdges, saveHistory, nodesRef, edgesRef]
    );

    const requestDeleteNode = useCallback((id: string) => setNodeToDelete(id), [setNodeToDelete]);

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
        setNodes((nds) => mergeLedgerTotalsIntoNodes([...nds, newNode]));
        setEdges((eds) => [
            ...eds,
            {
                id: `edge-${id}-total`,
                source: id,
                target: CHART_TOTAL_ID,
                sourceHandle: "source-top",
                targetHandle: "target-bottom",
                type: "smoothstep",
            },
        ]);
    }, [setNodes, setEdges, saveHistory, nodesRef, edgesRef]);

    return {
        handleIncrement,
        handleDecrement,
        handleAdjustLineCount,
        handleSetLineCount,
        handleUpdateLineConfig,
        handleUpdateSummaryLabels,
        handleDelete,
        requestDeleteNode,
        addNewNode,
    };
}
