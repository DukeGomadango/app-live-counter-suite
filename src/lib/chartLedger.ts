import type { CoordinateExtent, Edge, Node } from "@xyflow/react";
import { coerceStoredEmojiToDisplay } from "@/lib/constants";

export const CHART_TOTAL_ID = "total";

/** React Flow のズーム範囲（fitView で初期表示に戻すときも同じ min/max を使う） */
export const CHART_ZOOM_MIN = 0.45;
export const CHART_ZOOM_MAX = 2;

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

/** 行として扱うノード型（`counter` は localStorage 上の旧永続化型。読み込み時に line へ移行） */
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
export function ensureLineToTotalEdges(nodes: Node[]): Edge[] {
    const lineNodes = nodes.filter((n) => n.type === "line");
    return lineNodes.map((n) => ({
        id: `edge-${n.id}-total`,
        source: n.id,
        target: CHART_TOTAL_ID,
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

function edgeCanonicalKey(e: Edge): { id: string; s: string; t: string; sh: string | null; th: string | null } {
    return {
        id: e.id,
        s: e.source,
        t: e.target,
        sh: (e.sourceHandle as string | undefined) ?? null,
        th: (e.targetHandle as string | undefined) ?? null,
    };
}

function edgesMatchCanonical(edges: Edge[], ensured: Edge[]): boolean {
    if (edges.length !== ensured.length) return false;
    const norm = (e: Edge) => edgeCanonicalKey(e);
    const a = [...edges].map(norm).sort((x, y) => x.id.localeCompare(y.id));
    const b = [...ensured].map(norm).sort((x, y) => x.id.localeCompare(y.id));
    for (let i = 0; i < a.length; i++) {
        const x = a[i]!;
        const y = b[i]!;
        if (x.id !== y.id || x.s !== y.s || x.t !== y.t || x.sh !== y.sh || x.th !== y.th) return false;
    }
    return true;
}

/** 行ノードの集計を合計ノードの data に反映したノード配列を返す（変化がなければ同一参照のまま） */
export function mergeLedgerTotalsIntoNodes(nodes: Node[]): Node[] {
    const t = computeLedgerTotals(nodes);
    const totalNode = nodes.find((n) => n.id === CHART_TOTAL_ID);
    if (!totalNode) return nodes;
    const d = totalNode.data as LedgerTotalPersistedData;
    if (d.addTotal === t.addTotal && d.subTotalSigned === t.subTotalSigned && d.grandTotal === t.grandTotal) return nodes;
    return nodes.map((n) => (n.id === CHART_TOTAL_ID ? { ...n, data: { ...n.data, ...t } } : n));
}

/** 旧 counter / 旧 total data を新形式にし、エッジを line→total のみにする */
export function migrateLegacyChart(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[]; changed: boolean } {
    const hasCounter = nodes.some((n) => n.type === "counter");
    if (!hasCounter) {
        let totalsOk = true;
        for (const n of nodes) {
            if (n.id === CHART_TOTAL_ID || n.type === "total") {
                const m = migrateTotalNode(n);
                if (m !== n) {
                    totalsOk = false;
                    break;
                }
            }
        }
        if (totalsOk) {
            const ensured = ensureLineToTotalEdges(nodes);
            if (edgesMatchCanonical(edges, ensured)) {
                return { nodes, edges, changed: false };
            }
        }
    }

    let changed = false;
    const nextNodes = nodes.map((n) => {
        if (n.type === "counter") {
            changed = true;
            return migrateLineNode(n);
        }
        if (n.id === CHART_TOTAL_ID || n.type === "total") {
            const m = migrateTotalNode(n);
            if (m !== n) changed = true;
            return m;
        }
        return n;
    });

    const ensured = ensureLineToTotalEdges(nextNodes);
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
/** 合計カードの設計高（padding・大きい総合計表示・進捗バー・XL スケール時の余裕） */
const TOTAL_H = 480;
const MARGIN = 48;
const GAP_Y = 24;
/** 項目カード同士の横方向の隙間 */
const GAP_X = 24;

/**
 * Chart レイアウト・エッジアニメ既定のブレークポイント（px）。
 * `layoutChartNodes` の列数下限と UI の narrow 判定で同じ値を使う。
 */
export const CHART_LAYOUT_BREAKPOINT_PX = 768;

/**
 * 項目が 2 個以上のときのグリッド列数の下限（PC）。
 * 狭い幅で 1 列にしか収まらない場合でもこの列数を目安にし、行がビューポートより横に長くなった分はパンで見る。
 */
const MIN_LINE_GRID_COLS_DESKTOP = 2;

/** スマホ幅での同上下限（三列を目安に並べる） */
const MIN_LINE_GRID_COLS_MOBILE = 3;

function minLineGridColsForViewport(viewportW: number): number {
    return viewportW <= CHART_LAYOUT_BREAKPOINT_PX ? MIN_LINE_GRID_COLS_MOBILE : MIN_LINE_GRID_COLS_DESKTOP;
}

/** 行ノードの推定高さ（キーパッド・進捗込み。XL 時も外枠と線の取り付きがずれにくいよう余裕あり） */
const LINE_NODE_BOUNDS_H = 460;

/** `translateExtent` のノード群まわりの余白 */
const TRANSLATE_EXTENT_PADDING = 96;

/**
 * ノード位置とカードサイズから、パン可能範囲（React Flow の translateExtent）を求める。
 */
export function chartTranslateExtent(
    nodes: Node[],
    cardSize: string | undefined,
    cardScalePercent?: number
): CoordinateExtent {
    const s = chartEffectiveCardScale(cardSize, cardScalePercent);
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
        } else if (n.type === "total" || n.id === CHART_TOTAL_ID) {
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
 * （LineNode・TotalNode・layoutChartNodes で共有し、スケール変更時に重ならないようにする）
 */
export function chartCardVisualScale(cardSize: string | undefined): number {
    const map: Record<string, number> = { S: 0.7, M: 0.85, L: 1.0, XL: 1.2 };
    const k = cardSize ?? "L";
    return map[k] ?? 1.0;
}

/** 設定スライダー込みの実効スケール（極端な値で UI が壊れないよう clamp） */
const CHART_EFFECTIVE_SCALE_MIN = 0.35;
const CHART_EFFECTIVE_SCALE_MAX = 2.0;

export function chartEffectiveCardScale(cardSize: string | undefined, cardScalePercent?: number): number {
    const base = chartCardVisualScale(cardSize);
    const pct = cardScalePercent ?? 100;
    const raw = base * (Number.isFinite(pct) ? pct / 100 : 1);
    return Math.min(CHART_EFFECTIVE_SCALE_MAX, Math.max(CHART_EFFECTIVE_SCALE_MIN, raw));
}

/**
 * React Flow が測るノード外枠（layoutChartNodes / translateExtent と一致させ、エッジ経路の重なりを防ぐ）
 */
export function chartLineNodeRfOuterSize(
    cardSize: string | undefined,
    cardScalePercent?: number
): { width: number; height: number } {
    const s = chartEffectiveCardScale(cardSize, cardScalePercent);
    return { width: LINE_W * s, height: LINE_NODE_BOUNDS_H * s };
}

export function chartTotalNodeRfOuterSize(
    cardSize: string | undefined,
    cardScalePercent?: number
): { width: number; height: number } {
    const s = chartEffectiveCardScale(cardSize, cardScalePercent);
    return { width: TOTAL_W * s, height: TOTAL_H * s };
}

/** 内側カードの未スケール幅（LineNode の設計幅。transform の基準） */
export const CHART_LINE_INNER_W_PX = LINE_W;
/** 内側合計カードの未スケール幅（TotalNode の設計幅） */
export const CHART_TOTAL_INNER_W_PX = TOTAL_W;

export type ChartLayoutOptions = {
    /** 設定のカードサイズ（未指定は L 相当の 1.0） */
    cardSize?: string;
    /** 設定のカードスケール（%）。未指定は 100 */
    cardScale?: number;
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
 * 狭いビュー（`CHART_LAYOUT_BREAKPOINT_PX` 以下）では最低三列、それ以外では最低二列を目安にする。
 * 位置が変わったときのみ changed
 */
export function layoutChartNodes(nodes: Node[], viewportW: number, options?: ChartLayoutOptions): { nodes: Node[]; changed: boolean } {
    const s = chartEffectiveCardScale(options?.cardSize, options?.cardScale);
    const lineW = LINE_W * s;
    const totalW = TOTAL_W * s;
    const totalH = TOTAL_H * s;
    const gapX = GAP_X * s;
    const gapY = GAP_Y * s;

    const w = Math.max(240, viewportW);
    const m = layoutHorizontalMargin(viewportW);
    const lines = nodes.filter((n) => n.type === "line");
    if (nodes.findIndex((n) => n.id === CHART_TOTAL_ID) < 0) return { nodes, changed: false };

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
    posById.set(CHART_TOTAL_ID, { x: totalX, y: totalY });

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
