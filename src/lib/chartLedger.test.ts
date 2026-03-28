import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import {
    CHART_TOTAL_ID,
    computeLedgerTotals,
    mergeLedgerTotalsIntoNodes,
    ensureLineToTotalEdges,
    migrateLegacyChart,
    chartEffectiveCardScale,
} from "./chartLedger";

function baseTotalNode(overrides: Partial<Node["data"]> = {}): Node {
    return {
        id: CHART_TOTAL_ID,
        type: "total",
        position: { x: 0, y: 0 },
        data: {
            addTotal: 0,
            subTotalSigned: 0,
            grandTotal: 0,
            labelAdd: "加算合計",
            labelSub: "減算合計",
            labelGrand: "総合計",
            ...overrides,
        },
    };
}

function lineNode(id: string, count: number, step: number, mode: "add" | "subtract"): Node {
    return {
        id,
        type: "line",
        position: { x: 0, y: 0 },
        data: { label: "x", emoji: "⭐", step, count, mode },
    };
}

describe("computeLedgerTotals", () => {
    it("sums add lines", () => {
        const nodes = [baseTotalNode(), lineNode("a", 2, 3, "add")];
        const t = computeLedgerTotals(nodes);
        expect(t.addTotal).toBe(6);
        expect(t.grandTotal).toBe(6);
        expect(t.subTotalSigned === 0).toBe(true);
    });

    it("subtract lines accumulate as negative sub total", () => {
        const nodes = [baseTotalNode(), lineNode("s", 1, 4, "subtract")];
        expect(computeLedgerTotals(nodes)).toEqual({ addTotal: 0, subTotalSigned: -4, grandTotal: -4 });
    });

    it("mixes add and subtract", () => {
        const nodes = [baseTotalNode(), lineNode("a", 1, 10, "add"), lineNode("s", 2, 3, "subtract")];
        expect(computeLedgerTotals(nodes)).toEqual({ addTotal: 10, subTotalSigned: -6, grandTotal: 4 });
    });
});

describe("mergeLedgerTotalsIntoNodes", () => {
    it("returns same reference when totals already match", () => {
        const nodes = [baseTotalNode({ addTotal: 6, subTotalSigned: 0, grandTotal: 6 }), lineNode("a", 2, 3, "add")];
        const out = mergeLedgerTotalsIntoNodes(nodes);
        expect(out).toBe(nodes);
    });

    it("updates only total node when ledger differs", () => {
        const line = lineNode("a", 2, 3, "add");
        const total = baseTotalNode({ addTotal: 0, subTotalSigned: 0, grandTotal: 0 });
        const nodes = [total, line];
        const out = mergeLedgerTotalsIntoNodes(nodes);
        expect(out).not.toBe(nodes);
        const t = out.find((n) => n.id === CHART_TOTAL_ID);
        expect((t?.data as { grandTotal: number }).grandTotal).toBe(6);
        const l = out.find((n) => n.id === "a");
        expect(l).toBe(line);
    });
});

describe("ensureLineToTotalEdges", () => {
    it("creates one smoothstep edge per line to total", () => {
        const nodes = [baseTotalNode(), lineNode("l1", 0, 1, "add"), lineNode("l2", 0, 1, "add")];
        const e = ensureLineToTotalEdges(nodes);
        expect(e).toHaveLength(2);
        expect(e.every((x) => x.target === CHART_TOTAL_ID && x.type === "smoothstep")).toBe(true);
        expect(e.map((x) => x.source).sort()).toEqual(["l1", "l2"]);
    });
});

describe("migrateLegacyChart", () => {
    it("converts counter nodes to line and rebuilds edges", () => {
        const nodes: Node[] = [
            {
                id: CHART_TOTAL_ID,
                type: "total",
                position: { x: 0, y: 0 },
                data: { value: 0, label: "計" },
            },
            {
                id: "c1",
                type: "counter",
                position: { x: 10, y: 20 },
                data: { label: "旧", emoji: "✨", value: 2, count: 3, operation: "+" },
            },
        ];
        const edges: Edge[] = [];
        const r = migrateLegacyChart(nodes, edges);
        expect(r.changed).toBe(true);
        const c = r.nodes.find((n) => n.id === "c1");
        expect(c?.type).toBe("line");
        expect(r.edges).toHaveLength(1);
        expect(r.edges[0]?.source).toBe("c1");
        expect(r.edges[0]?.target).toBe(CHART_TOTAL_ID);
    });
});

describe("chartEffectiveCardScale", () => {
    it("combines card size preset with percent", () => {
        expect(chartEffectiveCardScale("L", 100)).toBeCloseTo(1, 5);
        expect(chartEffectiveCardScale("L", 50)).toBeCloseTo(0.5, 5);
    });

    it("clamps extreme percents", () => {
        expect(chartEffectiveCardScale("L", 1)).toBe(0.35);
        expect(chartEffectiveCardScale("XL", 500)).toBe(2.0);
    });
});
