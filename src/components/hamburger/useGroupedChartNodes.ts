import { useMemo } from "react";
import type { ChartNodeForMenu } from "@/lib/chartTypes";

export function useGroupedChartNodes(
    viewMode: "counter" | "chart",
    chartNodes: ChartNodeForMenu[] | undefined
): Record<string, ChartNodeForMenu[]> {
    return useMemo(() => {
        if (viewMode !== "chart" || !chartNodes) return {} as Record<string, ChartNodeForMenu[]>;
        const lineNodes = chartNodes.filter((n) => n.type === "line" || n.type === "counter");
        const grouped: Record<string, ChartNodeForMenu[]> = { add: [], subtract: [] };
        lineNodes.forEach((n) => {
            const d = n.data as { mode?: string; operation?: string } | undefined;
            const mode: "add" | "subtract" =
                d?.mode === "subtract" || d?.operation === "-" || d?.operation === "/" ? "subtract" : "add";
            grouped[mode]!.push(n);
        });
        return grouped;
    }, [viewMode, chartNodes]);
}
