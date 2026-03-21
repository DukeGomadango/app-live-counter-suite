import type { Edge, Node } from "@xyflow/react";

export const FLOWCHART_TOTAL_ID = "total";

export type LedgerMode = "add" | "subtract";

/** React Flow の line ノード data（永続化用） */
export type LineNodePersistedData = {
    label: string;
    emoji: string;
    step: number;
    count: number;
    mode: LedgerMode;
    target?: number;
};

/** 合計ノード data（計算値は親が同期。ラベルはユーザー編集可） */
export type LedgerTotalPersistedData = {
    addTotal: number;
    subTotalSigned: number;
    grandTotal: number;
    labelAdd?: string;
    labelSub?: string;
    labelGrand?: string;
};

const DEFAULT_LABELS = {
    labelAdd: "加算合計",
    labelSub: "減算合計",
    labelGrand: "総合計",
} as const;

export function isLineNodeType(type: string | undefined): boolean {
    return type === "line" || type === "counter";
}

function readLineFields(n: Node): { step: number; count: number; mode: LedgerMode } {
    const d = n.data as Record<string, unknown>;
    const step = Math.max(0, Number(d.step ?? d.value ?? 0));
    const count = Math.max(0, Number(d.count ?? 0));
    if (n.type === "line") {
        const mode = d.mode === "subtract" ? "subtract" : "add";
        return { step, count, mode };
    }
    const op = String(d.operation ?? "+");
    let mode: LedgerMode = "add";
    if (op === "-" || op === "/") mode = "subtract";
    return { step, count, mode };
}

/** 全行ノードから加算合計・減算合計（負）・総合計を算出 */
export function computeLedgerTotals(nodes: Node[]): Pick<LedgerTotalPersistedData, "addTotal" | "subTotalSigned" | "grandTotal"> {
    let addTotal = 0;
    let subMag = 0;
    for (const n of nodes) {
        if (!isLineNodeType(n.type)) continue;
        const { step, count, mode } = readLineFields(n);
        const c = step * count;
        if (mode === "subtract") subMag += c;
        else addTotal += c;
    }
    const subTotalSigned = -subMag;
    return { addTotal, subTotalSigned, grandTotal: addTotal + subTotalSigned };
}

/** 各行について total へ 1 本ずつ。それ以外のエッジは削除 */
export function ensureLineToTotalEdges(nodes: Node[], _edges: Edge[]): Edge[] {
    const lineNodes = nodes.filter((n) => n.type === "line");
    return lineNodes.map((n) => ({
        id: `edge-${n.id}-total`,
        source: n.id,
        target: FLOWCHART_TOTAL_ID,
        sourceHandle: "source-top",
        targetHandle: "target-bottom",
        type: "smoothstep",
    }));
}

function migrateLineNode(n: Node): Node {
    if (n.type !== "counter") return n;
    const d = n.data as Record<string, unknown>;
    const op = String(d.operation ?? "+");
    const mode: LedgerMode = op === "-" || op === "/" ? "subtract" : "add";
    const data: LineNodePersistedData = {
        label: String(d.label ?? "項目"),
        emoji: String(d.emoji ?? "✨"),
        step: Math.max(0, Number(d.value ?? 0)),
        count: Math.max(0, Number(d.count ?? 0)),
        mode,
        target: typeof d.target === "number" ? d.target : undefined,
    };
    return { ...n, type: "line", data };
}

function migrateTotalNode(n: Node): Node {
    const d = n.data as Record<string, unknown>;
    if (typeof d.grandTotal === "number" && typeof d.addTotal === "number" && typeof d.subTotalSigned === "number") {
        return n;
    }
    const value = Number(d.value ?? 0);
    return {
        ...n,
        type: "total",
        data: {
            addTotal: 0,
            subTotalSigned: 0,
            grandTotal: value,
            labelAdd: DEFAULT_LABELS.labelAdd,
            labelSub: DEFAULT_LABELS.labelSub,
            labelGrand: typeof d.label === "string" && d.label.trim() ? d.label : DEFAULT_LABELS.labelGrand,
        } satisfies LedgerTotalPersistedData,
    };
}

/** 旧 counter / 旧 total data を新形式にし、エッジを line→total のみにする */
export function migrateLegacyFlowchart(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[]; changed: boolean } {
    let changed = false;
    const nextNodes = nodes.map((n) => {
        if (n.type === "counter") {
            changed = true;
            return migrateLineNode(n);
        }
        if (n.id === FLOWCHART_TOTAL_ID || n.type === "total") {
            const m = migrateTotalNode(n);
            if (m !== n) changed = true;
            return m;
        }
        return n;
    });

    const ensured = ensureLineToTotalEdges(
        nextNodes.filter((n) => n.type === "line"),
        []
    );
    const canonical = JSON.stringify(
        edges.map((e) => ({ id: e.id, s: e.source, t: e.target, sh: e.sourceHandle, th: e.targetHandle })).sort((a, b) => a.id.localeCompare(b.id))
    );
    const canonical2 = JSON.stringify(
        ensured.map((e) => ({ id: e.id, s: e.source, t: e.target, sh: e.sourceHandle, th: e.targetHandle })).sort((a, b) => a.id.localeCompare(b.id))
    );
    if (canonical !== canonical2) changed = true;

    return { nodes: nextNodes, edges: ensured, changed };
}

/** レイアウト用の近似サイズ（CSS スケール前の論理座標） */
const LINE_W = 220;
/** 行ノードの論理高さ（キーパッド・進捗バー分を含む目安） */
const LINE_H = 360;
const TOTAL_W = 340;
const TOTAL_H = 400;
const MARGIN = 48;
const GAP_Y = 24;
/** 項目カード同士の横方向の隙間 */
const GAP_X = 24;

function snapGrid(v: number, grid: number): number {
    return Math.round(v / grid) * grid;
}

/** 合計を上中央、行をその下に横一列・全体を中央揃えで配置。位置が変わったときのみ changed */
export function layoutFlowchartNodes(nodes: Node[], viewportW: number, viewportH: number): { nodes: Node[]; changed: boolean } {
    const w = Math.max(400, viewportW);
    const lines = nodes.filter((n) => n.type === "line");
    if (nodes.findIndex((n) => n.id === FLOWCHART_TOTAL_ID) < 0) return { nodes, changed: false };

    const totalX = snapGrid(Math.max(MARGIN, (w - TOTAL_W) / 2), 24);
    const totalY = snapGrid(MARGIN, 24);

    const startY = snapGrid(totalY + TOTAL_H + GAP_Y, 24);

    const nLines = lines.length;
    const rowW = nLines > 0 ? nLines * LINE_W + (nLines - 1) * GAP_X : 0;
    const startX = snapGrid(Math.max(MARGIN, (w - rowW) / 2), 24);

    const posById = new Map<string, { x: number; y: number }>();
    lines.forEach((n, i) => {
        posById.set(n.id, { x: startX + i * (LINE_W + GAP_X), y: startY });
    });
    posById.set(FLOWCHART_TOTAL_ID, { x: totalX, y: totalY });

    let changed = false;
    const next = nodes.map((n) => {
        const p = posById.get(n.id);
        if (!p) return n;
        const draggable = false;
        if (n.position.x === p.x && n.position.y === p.y && n.draggable === draggable) return n;
        changed = true;
        return { ...n, position: { ...p }, draggable };
    });

    return { nodes: next, changed };
}

export function ledgerTotalsSignature(nodes: Node[]): string {
    const t = computeLedgerTotals(nodes);
    return `${t.addTotal}|${t.subTotalSigned}|${t.grandTotal}`;
}
