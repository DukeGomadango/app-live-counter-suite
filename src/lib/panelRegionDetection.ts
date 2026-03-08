/**
 * パネル: 線で切り分けた画像から領域（多角形）を検出する。
 * 幾何ベース: 交差・接点（他線分の端点が乗る場合含む）で線分を分割 → 平面アレンジメント → 面のトレース。
 * 2線の交差だけでなく、端同士・端と線分の途中・3本以上が1点で接する場合も考慮する。
 */

import type { PartitionLine } from "./panelTypes";

const EPS = 1e-10;
const MIN_POLYGON_POINTS = 3;
/** 交差が「内側」とみなす範囲（端点ぎりぎりでも分割するためやや緩め） */
const INTERIOR_EPS = 1e-8;
/** 点が線分の上にあるとみなす距離（接点・T字の検出を確実に） */
const POINT_ON_SEGMENT_EPS = 1e-3;
/** 線分の端点とみなさないためのマージン（ここより内側なら分割する） */
const ENDPOINT_MARGIN = 1e-6;
/** 頂点を同一とみなす距離（別の交点を潰さないよう控えめに） */
const VERTEX_SNAP_DIST = 1e-5;

/** 0–100 座標の多角形 */
export type Polygon100 = { x: number; y: number }[];

type Point = { x: number; y: number };

function eq(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS;
}

function pointEqual(a: Point, b: Point): boolean {
  return eq(a.x, b.x) && eq(a.y, b.y);
}

/** 線分 seg 上の点をパラメータ t (0<=t<=1) で返す */
function pointAt(seg: PartitionLine, t: number): Point {
  return {
    x: seg.x1 + t * (seg.x2 - seg.x1),
    y: seg.y1 + t * (seg.y2 - seg.y1),
  };
}

/** 点 P が線分 seg の内側（端点除く）にあるときパラメータ t を返す。そうでなければ null（接点・T字用） */
function pointOnSegmentParameter(seg: PartitionLine, p: Point): number | null {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= EPS * EPS) return null;
  const t = ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
  const tClamp = Math.max(0, Math.min(1, t));
  const proj = pointAt(seg, tClamp);
  const distSq = (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2;
  if (distSq > POINT_ON_SEGMENT_EPS * POINT_ON_SEGMENT_EPS) return null;
  if (tClamp <= ENDPOINT_MARGIN || tClamp >= 1 - ENDPOINT_MARGIN) return null; // 端点は分割不要
  return tClamp;
}

/** 交差の t,u が線分上とみなす許容（浮動小数点誤差で端点を外さないため） */
const SEGMENT_EXTEND_EPS = 1e-9;

/**
 * 2線分の交差を求める。交差点が両方の線分の内側なら { t, u } を返す。
 * 共線・端点のみの接触は null。
 */
function segmentIntersection(
  a: PartitionLine,
  b: PartitionLine
): { t: number; u: number } | null {
  const dxa = a.x2 - a.x1;
  const dya = a.y2 - a.y1;
  const dxb = b.x2 - b.x1;
  const dyb = b.y2 - b.y1;
  const denom = dxa * dyb - dya * dxb;
  if (Math.abs(denom) <= EPS) return null; // 平行または共線
  const dx = b.x1 - a.x1;
  const dy = b.y1 - a.y1;
  const t = (dx * dyb - dy * dxb) / denom;
  const u = (dx * dya - dy * dxa) / denom;
  if (t < -SEGMENT_EXTEND_EPS || t > 1 + SEGMENT_EXTEND_EPS || u < -SEGMENT_EXTEND_EPS || u > 1 + SEGMENT_EXTEND_EPS) return null;
  const tClamp = Math.max(0, Math.min(1, t));
  const uClamp = Math.max(0, Math.min(1, u));
  return { t: tClamp, u: uClamp };
}

/** 1本の線分を、交差・接点（他線分の端点が乗る場合含む）で分割し、小線分の配列を返す */
function splitSegmentAtIntersections(
  seg: PartitionLine,
  allSegments: PartitionLine[],
  excludeSelfIndex: number
): PartitionLine[] {
  const ts = new Set<number>();
  ts.add(0);
  ts.add(1);
  // 2線の交差（内側で交わる点。端点ぎりぎりも分割するため INTERIOR_EPS で判定）
  for (let i = 0; i < allSegments.length; i++) {
    if (i === excludeSelfIndex) continue;
    const other = allSegments[i];
    if (!other) continue;
    const hit = segmentIntersection(seg, other);
    if (hit && hit.t > INTERIOR_EPS && hit.t < 1 - INTERIOR_EPS) ts.add(hit.t);
  }
  // 他線分の端点がこの線分の内側に乗る場合（接点・T字・3本以上が1点で接する場合）
  for (let i = 0; i < allSegments.length; i++) {
    if (i === excludeSelfIndex) continue;
    const other = allSegments[i];
    if (!other) continue;
    for (const p of [
      { x: other.x1, y: other.y1 },
      { x: other.x2, y: other.y2 },
    ] as Point[]) {
      const t = pointOnSegmentParameter(seg, p);
      if (t !== null) ts.add(t);
    }
  }
  const arr = Array.from(ts).sort((a, b) => a - b);
  const out: PartitionLine[] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    const t0 = arr[i]!;
    const t1 = arr[i + 1]!;
    if (t1 - t0 <= EPS) continue;
    const p0 = pointAt(seg, t0);
    const p1 = pointAt(seg, t1);
    out.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y });
  }
  return out;
}

/** 全線分を交差点で分割した辺のリスト */
function buildSplitSegments(lines: PartitionLine[]): PartitionLine[] {
  const out: PartitionLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const seg = lines[i];
    if (!seg) continue;
    const sub = splitSegmentAtIntersections(seg, lines, i);
    out.push(...sub);
  }
  return out;
}

function distSq(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/** 頂点一覧を重複除いてソートし、インデックスを付与。辺は (fromIdx, toIdx) に変換。近い点は1頂点にマージ。 */
function normalizeVerticesAndEdges(
  segments: PartitionLine[]
): { vertices: Point[]; edges: [number, number][] } {
  const vertices: Point[] = [];
  const snapDistSq = VERTEX_SNAP_DIST * VERTEX_SNAP_DIST;

  function addPoint(p: Point): number {
    for (let i = 0; i < vertices.length; i++) {
      if (distSq(p, vertices[i]!) <= snapDistSq) return i;
    }
    const idx = vertices.length;
    vertices.push({ x: p.x, y: p.y });
    return idx;
  }

  const edges: [number, number][] = [];
  for (const seg of segments) {
    const p1 = { x: seg.x1, y: seg.y1 };
    const p2 = { x: seg.x2, y: seg.y2 };
    if (pointEqual(p1, p2)) continue;
    const i1 = addPoint(p1);
    const i2 = addPoint(p2);
    edges.push([i1, i2], [i2, i1]);
  }

  return { vertices, edges };
}

/** 各頂点から出る辺を、進行方向の角度でソートしたリスト */
function buildOutgoingByAngle(
  vertices: Point[],
  edges: [number, number][]
): number[][] {
  const n = vertices.length;
  const byVertex: [number, number][][] = [];
  for (let i = 0; i < n; i++) byVertex.push([]);
  edges.forEach(([from, to], ei) => {
    const arr = byVertex[from];
    if (arr) arr.push([to, ei]);
  });
  const result: number[][] = [];
  for (let v = 0; v < n; v++) {
    const list = byVertex[v]!;
    const p = vertices[v]!;
    list.sort((a, b) => {
      const pa = vertices[a[0]]!;
      const pb = vertices[b[0]]!;
      const angleA = Math.atan2(pa.y - p.y, pa.x - p.x);
      const angleB = Math.atan2(pb.y - p.y, pb.x - p.x);
      return angleA - angleB;
    });
    result[v] = list.map(([, ei]) => ei);
  }
  return result;
}

/** 辺 ei の終点から、反時計回りで「次の辺」のインデックスを返す。cycleStartEdge を渡すと、その辺を選べるときだけ優先して閉路を閉じる（他頂点への cycleCloseTo による早期クローズで degenerate になるのを防ぐ） */
function nextEdgeCCW(
  ei: number,
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][],
  cycleStartEdge?: number
): number {
  const edge = edges[ei];
  if (!edge) return -1;
  const [from, to] = edge;
  const list = outgoingByVertex[to];
  if (!list || list.length === 0) return -1;
  if (cycleStartEdge !== undefined && list.includes(cycleStartEdge)) return cycleStartEdge;
  const fromPoint = vertices[from]!;
  const toPoint = vertices[to]!;
  const inAngle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
  let bestEi = list[0]!;
  let bestDelta = 1e9;
  for (const nextEi of list) {
    const nextEdge = edges[nextEi];
    if (!nextEdge) continue;
    const [, nextTo] = nextEdge;
    if (nextTo === from) continue;
    const nextPoint = vertices[nextTo]!;
    const outAngle = Math.atan2(nextPoint.y - toPoint.y, nextPoint.x - toPoint.x);
    let delta = outAngle - inAngle;
    while (delta <= 0) delta += 2 * Math.PI;
    while (delta > 2 * Math.PI) delta -= 2 * Math.PI;
    if (delta < bestDelta && delta >= 0) {
      bestDelta = delta;
      bestEi = nextEi;
    }
  }
  if (bestDelta > 1e8) return list[0] ?? -1;
  return bestEi;
}

/** 有向辺 ei の逆方向の辺のインデックスを返す */
function findReverseEdgeIndex(ei: number, edges: [number, number][]): number {
  const e = edges[ei];
  if (!e) return -1;
  const [from, to] = e;
  for (let i = 0; i < edges.length; i++) {
    const o = edges[i];
    if (o && o[0] === to && o[1] === from) return i;
  }
  return -1;
}

/** 有向辺の閉路を面として列挙（反時計回りでトレース）。同一面を逆方向からトレースして重複しないよう、面に含まれた辺の逆も used に載せる */
function traceFaces(
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][]
): number[][] {
  const used = new Set<number>();
  const faces: number[][] = [];
  for (let start = 0; start < edges.length; start++) {
    if (used.has(start)) continue;
    const cycle: number[] = [];
    let ei = start;
    do {
      cycle.push(ei);
      used.add(ei);
      const rev = findReverseEdgeIndex(ei, edges);
      if (rev >= 0) used.add(rev);
      const next = nextEdgeCCW(ei, edges, vertices, outgoingByVertex, start);
      ei = next >= 0 ? next : -1;
      if (ei < 0) break;
    } while (ei !== start && cycle.length <= edges.length + 1);
    if (ei === start && cycle.length >= MIN_POLYGON_POINTS) {
      faces.push(cycle);
    }
  }
  return faces;
}

/** 多角形の符号付き面積（CCW で正） */
function signedArea(vertices: Point[], face: number[], edges: [number, number][]): number {
  const pts = face.map((ei) => {
    const e = edges[ei];
    const to = e ? e[1] : 0;
    return vertices[to]!;
  });
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const pi = pts[i]!;
    const pj = pts[j]!;
    area += pi.x * pj.y - pj.x * pi.y;
  }
  return area * 0.5;
}

/** 面（閉路）を Polygon100 に変換 */
function faceToPolygon(vertices: Point[], face: number[], edges: [number, number][]): Polygon100 {
  return face.map((ei) => {
    const e = edges[ei];
    const to = e ? e[1] : 0;
    const p = vertices[to]!;
    return { x: p.x, y: p.y };
  });
}

/** 画像の外枠（0–100% の矩形）を表す4本の線 */
const IMAGE_FRAME_LINES: PartitionLine[] = [
  { x1: 0, y1: 0, x2: 100, y2: 0 },
  { x1: 100, y1: 0, x2: 100, y2: 100 },
  { x1: 100, y1: 100, x2: 0, y2: 100 },
  { x1: 0, y1: 100, x2: 0, y2: 0 },
];

/** 外枠の角とみなす距離（頂点スナップでずれても外枠と判定するためやや広め） */
const OUTER_FRAME_CORNER_EPS = 1e-2;

/** 多角形が画像外枠（0–100 の矩形）と一致するか（頂点スナップ後のずれを許容） */
function isOuterFramePolygon(poly: Polygon100): boolean {
  if (poly.length !== 4) return false;
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const snapDistSq = OUTER_FRAME_CORNER_EPS * OUTER_FRAME_CORNER_EPS;
  for (const c of corners) {
    const found = poly.some((p) => distSq(p, c) <= snapDistSq);
    if (!found) return false;
  }
  return true;
}

const BOX_MIN = 0;
const BOX_MAX = 100;

/** 枠の端にスナップする距離（%）。この範囲内の端点は外枠上に寄せる */
const FRAME_SNAP_EPS = 1.5;

/** 点が外枠（0–100）に十分近いとき、枠上にスナップする。端まで引いたつもりの線が確実に枠に接するようにする */
function snapPointToFrame(p: Point): Point {
  let x = p.x;
  let y = p.y;
  if (x <= FRAME_SNAP_EPS) x = BOX_MIN;
  else if (x >= BOX_MAX - FRAME_SNAP_EPS) x = BOX_MAX;
  if (y <= FRAME_SNAP_EPS) y = BOX_MIN;
  else if (y >= BOX_MAX - FRAME_SNAP_EPS) y = BOX_MAX;
  return { x, y };
}

/** 線分を 0–100 の矩形でクリップし、内側の部分だけ返す。完全に外なら null */
function clipSegmentToBox(seg: PartitionLine): PartitionLine | null {
  let t0 = 0;
  let t1 = 1;
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const dirs = [
    { p: -seg.x1 + BOX_MIN, q: -dx },
    { p: seg.x1 - BOX_MAX, q: dx },
    { p: -seg.y1 + BOX_MIN, q: dy },
    { p: seg.y1 - BOX_MAX, q: -dy },
  ];
  for (const { p, q } of dirs) {
    if (Math.abs(q) <= EPS) {
      if (p < 0) return null;
      continue;
    }
    const t = p / q;
    if (q > 0) {
      if (t > t1) return null;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return null;
      t1 = Math.min(t1, t);
    }
  }
  if (t0 >= t1 - EPS) return null;
  const p0 = pointAt(seg, t0);
  const p1 = pointAt(seg, t1);
  return { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
}

/**
 * 線の配列から、線で囲まれた各領域を多角形（0–100 座標）の配列として返す。
 * 仕様: ユーザーが引いた線をそのまま多角形の辺として使い、閉じた輪になっている部分だけを領域として出力する。
 * 輪になっていない線（端まで届かない単体の線など）は、いずれの領域の辺にも含まれない。
 * 端点が外枠に十分近い（約 1.5% 以内）場合は枠上にスナップし、端まで引いたつもりの線が確実に枠に接するようにする。
 * 幾何ベース: 交差で線分を分割し、面を列挙。外側面（負の符号付き面積）は除外する。
 * ユーザー線は 0–100 の外枠でクリップし、外側は領域にならない。
 */
const LOG_PREFIX = "[panel-region]";

export function getRegionsFromLines(lines: PartitionLine[]): Polygon100[] {
  if (lines.length === 0) {
    console.log(LOG_PREFIX, "入力線 0 本 → 画像全体 1 領域を返す");
    return [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]];
  }

  console.log(LOG_PREFIX, "入力線", lines.length, "本:", lines.map((s) => `(${s.x1.toFixed(2)},${s.y1.toFixed(2)})-(${s.x2.toFixed(2)},${s.y2.toFixed(2)})`));

  const clipped = lines.map((seg) => clipSegmentToBox(seg)).filter((s): s is PartitionLine => s !== null);
  console.log(LOG_PREFIX, "クリップ後", clipped.length, "本:", clipped.length ? clipped.map((s) => `(${s.x1.toFixed(2)},${s.y1.toFixed(2)})-(${s.x2.toFixed(2)},${s.y2.toFixed(2)})`) : "(なし)");

  const snapped = clipped
    .map((seg) => {
      const p1 = snapPointToFrame({ x: seg.x1, y: seg.y1 });
      const p2 = snapPointToFrame({ x: seg.x2, y: seg.y2 });
      return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    })
    .filter((seg) => {
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      return dx * dx + dy * dy > EPS * EPS;
    });
  console.log(LOG_PREFIX, "スナップ後", snapped.length, "本:", snapped.length ? snapped.map((s) => `(${s.x1},${s.y1})-(${s.x2},${s.y2})`) : "(なし・ degenerate で除外)");

  const allLines = [...IMAGE_FRAME_LINES, ...snapped];
  const segments = buildSplitSegments(allLines);
  console.log(LOG_PREFIX, "外枠+ユーザー線を交差で分割した辺", segments.length, "本");

  const { vertices, edges } = normalizeVerticesAndEdges(segments);
  console.log(LOG_PREFIX, "頂点数", vertices.length, "辺数", edges.length / 2, "頂点一覧:", vertices.map((p, i) => `${i}:(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" "));

  if (edges.length === 0) {
    console.log(LOG_PREFIX, "辺が 0 のため領域なし");
    return [];
  }

  const outgoingByVertex = buildOutgoingByAngle(vertices, edges);
  const faces = traceFaces(edges, vertices, outgoingByVertex);
  console.log(LOG_PREFIX, "トレースした面の数", faces.length);

  const polygons: Polygon100[] = [];
  for (let fi = 0; fi < faces.length; fi++) {
    const face = faces[fi]!;
    const area = signedArea(vertices, face, edges);
    const poly = faceToPolygon(vertices, face, edges);
    const areaAbs = Math.abs(area);
    const isOuter = snapped.length > 0 && isOuterFramePolygon(poly);
    if (area < -EPS) {
      console.log(LOG_PREFIX, `面${fi}`, "面積", area.toFixed(2), "(CW・外側) → スキップ");
      continue;
    }
    if (face.length < MIN_POLYGON_POINTS) {
      console.log(LOG_PREFIX, `面${fi}`, "頂点数不足 → スキップ");
      continue;
    }
    if (areaAbs <= EPS) {
      console.log(LOG_PREFIX, `面${fi}`, "面積ほぼ0（degenerate） → スキップ");
      continue;
    }
    if (isOuter) {
      console.log(LOG_PREFIX, `面${fi}`, "外枠全体と判定(面積", areaAbs.toFixed(2), "bbox 等) → スキップ");
      continue;
    }
    console.log(LOG_PREFIX, `面${fi}`, "→ 領域として出力", poly.length, "頂点", "面積", areaAbs.toFixed(2), poly.map((p) => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" "));
    polygons.push(poly);
  }
  console.log(LOG_PREFIX, "出力領域数", polygons.length);
  return polygons;
}
