import type { CoordinateExtent, Edge, Node } from "@xyflow/react";
import { coerceStoredEmojiToDisplay } from "@/lib/constants";

export const FLOWCHART_TOTAL_ID = "total";

/** React Flow のズーム範囲（fitView で初期表示に戻すときも同じ min/max を使う） */
export const FLOWCHART_ZOOM_MIN = 0.45;
export const FLOWCHART_ZOOM_MAX = 2;

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
        emoji: coerceStoredEmojiToDisplay(String(d.emoji ?? "✨")),
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

/** レイアウト用の近似サイズ（CSS スケール前の論理座標・カード幅は LineNode の w-[220px] に合わせる） */
const LINE_W = 220;
const TOTAL_W = 340;
const TOTAL_H = 400;
const MARGIN = 48;
const GAP_Y = 24;
/** 項目カード同士の横方向の隙間 */
const GAP_X = 24;

/** この幅以下をスマホ相当とみなし、項目グリッドの最低列数を 3 にする（`layoutFlowchartNodes` の viewportW と同期） */
const FLOWCHART_MOBILE_LAYOUT_MAX_W = 768;

/**
 * 項目が 2 個以上のときのグリッド列数の下限（PC）。
 * 狭い幅で 1 列にしか収まらない場合でもこの列数を目安にし、行がビューポートより横に長くなった分はパンで見る。
 */
const MIN_LINE_GRID_COLS_DESKTOP = 2;

/** スマホ幅での同上下限（三列を目安に並べる） */
const MIN_LINE_GRID_COLS_MOBILE = 3;

function minLineGridColsForViewport(viewportW: number): number {
    return viewportW <= FLOWCHART_MOBILE_LAYOUT_MAX_W ? MIN_LINE_GRID_COLS_MOBILE : MIN_LINE_GRID_COLS_DESKTOP;
}

/** 行ノードの推定高さ（キーパッド・進捗込み。パン境界・折り返し行の縦ピッチに使用） */
const LINE_NODE_BOUNDS_H = 400;

/** `translateExtent` のノード群まわりの余白 */
const TRANSLATE_EXTENT_PADDING = 96;

/**
 * ノード位置とカードサイズから、パン可能範囲（React Flow の translateExtent）を求める。
 */
export function flowchartTranslateExtent(nodes: Node[], cardSize: string | undefined): CoordinateExtent {
    const s = flowchartCardVisualScale(cardSize);
    const lineW = LINE_W * s;
    const lineH = LINE_NODE_BOUNDS_H * s;
    const totalW = TOTAL_W * s;
    const totalH = TOTAL_H * s;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const bump = (x: number, y: number, w: number, h: number) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
    };

    for (const n of nodes) {
        if (n.type === "line") {
            bump(n.position.x, n.position.y, lineW, lineH);
        } else if (n.type === "total" || n.id === FLOWCHART_TOTAL_ID) {
            bump(n.position.x, n.position.y, totalW, totalH);
        }
    }

    const pad = TRANSLATE_EXTENT_PADDING;

    if (!Number.isFinite(minX)) {
        return [
            [-pad, -pad],
            [totalW + pad, totalH + pad],
        ];
    }

    return [
        [minX - pad, minY - pad],
        [maxX + pad, maxY + pad],
    ];
}

/**
 * フローチャート行／合計カードの `transform: scale()` と一致させること。
 * （LineNode・TotalNode・layoutFlowchartNodes で共有し、スケール変更時に重ならないようにする）
 */
export function flowchartCardVisualScale(cardSize: string | undefined): number {
    const map: Record<string, number> = { S: 0.7, M: 0.85, L: 1.0, XL: 1.2 };
    const k = cardSize ?? "L";
    return map[k] ?? 1.0;
}

export type FlowchartLayoutOptions = {
    /** 設定のカードサイズ（未指定は L 相当の 1.0） */
    cardSize?: string;
};

function snapGrid(v: number, grid: number): number {
    return Math.round(v / grid) * grid;
}

/** ビューポート幅に応じた左右マージン（狭い画面で無駄な余白を減らす） */
function layoutHorizontalMargin(viewportW: number): number {
    if (viewportW <= 360) return 12;
    if (viewportW <= 480) return 16;
    if (viewportW <= 640) return 24;
    return MARGIN;
}

/**
 * 合計を「先頭行の項目ブロックの中央」の上に置き、その下にグリッド配置（収まる列数と最低列数の大きい方で折り返し）・各行は中央揃え。
 * 項目がないときだけ合計をビューポート中央に置く。
 * 狭いビュー（幅 768px 以下）では最低三列、それ以外では最低二列を目安にする。
 * 位置が変わったときのみ changed
 */
export function layoutFlowchartNodes(
    nodes: Node[],
    viewportW: number,
    _viewportH: number,
    options?: FlowchartLayoutOptions
): { nodes: Node[]; changed: boolean } {
    const s = flowchartCardVisualScale(options?.cardSize);
    const lineW = LINE_W * s;
    const totalW = TOTAL_W * s;
    const totalH = TOTAL_H * s;
    const gapX = GAP_X * s;
    const gapY = GAP_Y * s;

    const w = Math.max(240, viewportW);
    const m = layoutHorizontalMargin(viewportW);
    const lines = nodes.filter((n) => n.type === "line");
    if (nodes.findIndex((n) => n.id === FLOWCHART_TOTAL_ID) < 0) return { nodes, changed: false };

    const totalY = snapGrid(m, 24);

    const nLines = lines.length;
    const slotW = lineW + gapX;
    const innerW = Math.max(slotW, w - 2 * m);
    const maxFit = nLines === 0 ? 1 : Math.max(1, Math.floor(innerW / slotW));
    const minCols = minLineGridColsForViewport(viewportW);
    const cols =
        nLines === 0 ? 1 : nLines >= 2 ? Math.min(nLines, Math.max(maxFit, minCols)) : 1;
    const lineRowPitch = LINE_NODE_BOUNDS_H * s + gapY;

    /** 先頭行（合計の横位置の基準） */
    let totalX: number;
    if (nLines === 0) {
        totalX = snapGrid(Math.max(m, (w - totalW) / 2), 24);
    } else {
        const nodesFirstRow = Math.min(cols, nLines);
        const rowWidth = nodesFirstRow * lineW + (nodesFirstRow - 1) * gapX;
        const startXRow = snapGrid(Math.max(m, (w - rowWidth) / 2), 24);
        const rowCenterX = startXRow + rowWidth / 2;
        totalX = snapGrid(Math.max(m, rowCenterX - totalW / 2), 24);
    }

    const startY = snapGrid(totalY + totalH + gapY, 24);

    const posById = new Map<string, { x: number; y: number }>();
    lines.forEach((n, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const firstInRow = r * cols;
        const nodesThisRow = Math.min(cols, nLines - firstInRow);
        const rowWidth = nodesThisRow * lineW + (nodesThisRow - 1) * gapX;
        const startXRow = snapGrid(Math.max(m, (w - rowWidth) / 2), 24);
        posById.set(n.id, {
            x: startXRow + c * (lineW + gapX),
            y: startY + r * lineRowPitch,
        });
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

/** `ledgerTotalsSignature` の結果から総合計だけを取り出す（ノード同期前に増減演出へ使う） */
export function grandTotalFromLedgerSignature(sig: string): number {
    const parts = sig.split("|");
    if (parts.length < 3) return 0;
    const n = Number(parts[2]);
    return Number.isFinite(n) ? n : 0;
}
