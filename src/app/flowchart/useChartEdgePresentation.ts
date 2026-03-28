"use client";

import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

export function useChartEdgePresentation(
    edges: Edge[],
    accentColor: string,
    edgeThickness: string | undefined,
    effectiveEdgeAnimated: boolean
) {
    const styledEdges = useMemo(() => {
        const thicknessMap: Record<string, number> = { S: 1, M: 2, L: 4 };
        const strokeWidth = thicknessMap[edgeThickness || "M"];
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
            animated: effectiveEdgeAnimated,
        }));
    }, [edges, accentColor, edgeThickness, effectiveEdgeAnimated]);

    const defaultEdgeOptions = useMemo(() => {
        const thicknessMap: Record<string, number> = { S: 1, M: 2, L: 4 };
        const strokeWidth = thicknessMap[edgeThickness || "M"];
        return {
            type: "smoothstep" as const,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: accentColor,
            },
            style: { strokeWidth, stroke: accentColor },
            animated: effectiveEdgeAnimated,
            interactionWidth: 0,
        };
    }, [accentColor, edgeThickness, effectiveEdgeAnimated]);

    return { styledEdges, defaultEdgeOptions };
}
