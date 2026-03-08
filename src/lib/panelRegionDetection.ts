/**
 * パネル: 線で切り分けた画像から領域（多角形）を検出する。
 * 幾何ベース: 交差・接点（他線分の端点が乗る場合含む）で線分を分割 → 平面アレンジメント → 面のトレース。
 * 2線の交差だけでなく、端同士・端と線分の途中・3本以上が1点で接する場合も考慮する。
 */

import type { PartitionLine } from "./panelTypes";
import { polygonCentroid } from "./panelTypes";

const EPS = 1e-10;
const MIN_POLYGON_POINTS = 3;
/** 交差が「内側」とみなす範囲（端点ぎりぎりでも分割するためやや緩め） */
const INTERIOR_EPS = 1e-8;
/** 点が線分の上にあるとみなす距離（接点・T字の検出を確実に） */
const POINT_ON_SEGMENT_EPS = 1e-3;
/** 線分の端点とみなさないためのマージン（ここより内側なら分割する） */
const ENDPOINT_MARGIN = 1e-6;
/** 頂点を同一とみなす距離（%）。交差計算の誤差で生じる近接頂点を1つにまとめ、他頂点を内側と誤判定するのを防ぐ */
const VERTEX_SNAP_DIST = 0.35;
/** 頂点を線分上にスナップする距離（%）。この範囲内で線分上に投影し、辺のつながりを安定させる */
const SNAP_VERTEX_TO_LINE_EPS = 0.5;

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

/** 線分 seg 上の点への投影のパラメータ t (0–1 が線分上)。戻りは { t, proj }。 */
function projectPointToSegment(p: Point, seg: PartitionLine): { t: number; proj: Point; distSq: number } {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= EPS * EPS) {
    const proj = { x: seg.x1, y: seg.y1 };
    return { t: 0, proj, distSq: (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2 };
  }
  const t = Math.max(0, Math.min(1, ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq));
  const proj = { x: seg.x1 + t * dx, y: seg.y1 + t * dy };
  const distSq = (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2;
  return { t, proj, distSq };
}

/** 頂点を、十分近い線分上にスナップする。交点のずれで degenerate な面が減る。 */
function snapVerticesToSegmentLines(vertices: Point[], segments: PartitionLine[]): void {
  const epsSq = SNAP_VERTEX_TO_LINE_EPS * SNAP_VERTEX_TO_LINE_EPS;
  const endpointTolSq = (SNAP_VERTEX_TO_LINE_EPS * 2) ** 2;
  for (const v of vertices) {
    let bestDistSq = epsSq + 1;
    let bestProj: Point | null = null;
    for (const seg of segments) {
      const { t, proj, distSq } = projectPointToSegment(v, seg);
      if (distSq >= epsSq) continue;
      const atEnd1 = (v.x - seg.x1) ** 2 + (v.y - seg.y1) ** 2 <= endpointTolSq;
      const atEnd2 = (v.x - seg.x2) ** 2 + (v.y - seg.y2) ** 2 <= endpointTolSq;
      if (atEnd1 || atEnd2) continue;
      if (t <= 0 || t >= 1) continue;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestProj = proj;
      }
    }
    if (bestProj) {
      v.x = bestProj.x;
      v.y = bestProj.y;
    }
  }
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

/** 辺 ei の終点から、反時計回りで「次の辺」のインデックスを返す。used=外側面で使った辺のみ。今の辺の逆向き（nextTo===from）と used だけスキップし、同一閉路内で既に通った辺はスキップしない（頂点を2回通る経路でも閉じられるようにする）。 */
function nextEdgeCCW(
  ei: number,
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][],
  used: Set<number>,
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
  let bestEi = -1;
  let bestDelta = 1e9;
  for (const nextEi of list) {
    if (used.has(nextEi)) continue;
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
  if (bestEi >= 0) return bestEi;
  return list.find((e) => !used.has(e)) ?? -1;
}

/** 辺 ei の終点から、時計回りで「次の辺」を返す。各有向辺の「右側の面」をトレースするために使う。 */
function nextEdgeCW(
  ei: number,
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][],
  used: Set<number>,
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
  let bestEi = -1;
  let bestDelta = -1e9;
  for (const nextEi of list) {
    if (used.has(nextEi)) continue;
    const nextEdge = edges[nextEi];
    if (!nextEdge) continue;
    const [, nextTo] = nextEdge;
    if (nextTo === from) continue;
    const nextPoint = vertices[nextTo]!;
    const outAngle = Math.atan2(nextPoint.y - toPoint.y, nextPoint.x - toPoint.x);
    let delta = outAngle - inAngle;
    while (delta > 0) delta -= 2 * Math.PI;
    while (delta <= -2 * Math.PI) delta += 2 * Math.PI;
    if (delta < 0 && delta > bestDelta) {
      bestDelta = delta;
      bestEi = nextEi;
    }
  }
  if (bestEi >= 0) return bestEi;
  return list.find((e) => !used.has(e)) ?? -1;
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

/** 閉路に含まれる無向辺のインデックス集合（同一面の重複判定用）。各辺は min(ei, rev(ei)) で正規化。 */
function cycleToUndirectedEdgeSet(cycle: number[], edges: [number, number][]): string {
  const ids = new Set<number>();
  for (const ei of cycle) {
    const rev = findReverseEdgeIndex(ei, edges);
    ids.add(rev >= 0 ? Math.min(ei, rev) : ei);
  }
  return [...ids].sort((a, b) => a - b).join(",");
}

type NextEdgeFn = (
  ei: number,
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][],
  used: Set<number>,
  cycleStartEdge?: number
) => number;

/** 閉路を faces に追加（面積・向きをチェックし、重複しなければ追加） */
function pushCycleIfValid(
  cycle: number[],
  edges: [number, number][],
  vertices: Point[],
  faces: number[][],
  pushedKeys: Set<string>
): void {
  if (cycle.length < MIN_POLYGON_POINTS) return;
  const key = cycleToUndirectedEdgeSet(cycle, edges);
  if (pushedKeys.has(key)) return;
  const area = signedArea(vertices, cycle, edges);
  const areaAbs = Math.abs(area);
  if (area < -EPS) {
    if (areaAbs > EPS && areaAbs < OUTER_FACE_AREA_HALF) {
      pushedKeys.add(key);
      faces.push([...cycle].reverse());
    }
    return;
  }
  if (areaAbs <= EPS) return;
  pushedKeys.add(key);
  faces.push(cycle);
}

/** 開始辺から「次に進める辺」をすべて試すDFS。右台形など単一方向トレースで拾えない閉路を列挙。 */
function traceCyclesDFS(
  startEi: number,
  cycle: number[],
  currentEi: number,
  visited: Set<number>,
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][],
  faces: number[][],
  pushedKeys: Set<string>
): void {
  const e = edges[currentEi];
  if (!e) return;
  const [, to] = e;
  const startFrom = edges[startEi]?.[0] ?? -1;
  const list = outgoingByVertex[to];
  if (!list || cycle.length > edges.length + 1) return;
  for (const nextEi of list) {
    const nextE = edges[nextEi];
    if (!nextE) continue;
    const [, nextTo] = nextE;
    const [curFrom] = e;
    if (nextTo === curFrom) continue;
    if (nextTo === startFrom) {
      const closed = [...cycle, nextEi];
      pushCycleIfValid(closed, edges, vertices, faces, pushedKeys);
      continue;
    }
    if (visited.has(nextTo)) continue;
    const nextVisited = new Set(visited);
    nextVisited.add(nextTo);
    traceCyclesDFS(startEi, [...cycle, nextEi], nextEi, nextVisited, edges, vertices, outgoingByVertex, faces, pushedKeys);
  }
}

/** 有向辺の閉路を面として列挙。CCW/CWの単一方向トレースに加え、各開始辺からDFSで全閉路を試す。同一面の重複は無向辺集合で判定。 */
function traceFaces(
  edges: [number, number][],
  vertices: Point[],
  outgoingByVertex: number[][]
): number[][] {
  const used = new Set<number>();
  const faces: number[][] = [];
  const pushedKeys = new Set<string>();

  const traceWith = (nextEdge: NextEdgeFn) => {
    for (let start = 0; start < edges.length; start++) {
      if (used.has(start)) continue;
      const cycle: number[] = [];
      let ei = start;
      do {
        cycle.push(ei);
        const next = nextEdge(ei, edges, vertices, outgoingByVertex, used, start);
        ei = next >= 0 ? next : -1;
        if (ei < 0) break;
      } while (ei !== start && cycle.length <= edges.length + 1);
      if (ei !== start || cycle.length < MIN_POLYGON_POINTS) continue;
      pushCycleIfValid(cycle, edges, vertices, faces, pushedKeys);
    }
  };

  traceWith(nextEdgeCCW);
  traceWith(nextEdgeCW);
  for (let start = 0; start < edges.length; start++) {
    const e = edges[start];
    if (!e) continue;
    const [from, to] = e;
    traceCyclesDFS(start, [start], start, new Set([from, to]), edges, vertices, outgoingByVertex, faces, pushedKeys);
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
/** 外枠に接する「外側面」とみなす面積の下限（0–100 座標で 100*100=10000 の大部分） */
const OUTER_FACE_AREA_MIN = 3500;
/** 画像の半分以上の面積は外側とみなして除外する */
const OUTER_FACE_AREA_HALF = 5000;
/** 同一領域とみなす面積比の許容（重複除去用） */
const DEDUP_AREA_RATIO = 0.02;
/** 同一領域とみなす重心距離（%）。頂点数が違う同じ形の重複を拾うためやや広め */
const DEDUP_CENTROID_DIST = 8;

/** 多角形の重心（0–100） */
function polygonCenter(poly: Polygon100): Point {
  if (poly.length === 0) return { x: 50, y: 50 };
  const sx = poly.reduce((s, p) => s + p.x, 0);
  const sy = poly.reduce((s, p) => s + p.y, 0);
  return { x: sx / poly.length, y: sy / poly.length };
}

function polygonAreaAbs(poly: Polygon100): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i]!.x * poly[j]!.y - poly[j]!.x * poly[i]!.y;
  }
  return Math.abs(area) * 0.5;
}

/** 点が多角形の辺または頂点上にあるか（距離 tol 以内） */
function pointOnPolygonBoundary(p: Point, poly: Polygon100, tol: number): boolean {
  const tolSq = tol * tol;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if (Math.hypot(p.x - a.x, p.y - a.y) ** 2 <= tolSq) return true;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy + EPS)));
    const proj = { x: a.x + t * dx, y: a.y + t * dy };
    if ((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2 <= tolSq) return true;
  }
  return false;
}

/** 点が多角形の strictly 内側にあるか（レイキャスト）。境界上は false。 */
function pointInPolygonStrict(p: Point, poly: Polygon100): boolean {
  if (pointOnPolygonBoundary(p, poly, 1e-6)) return false;
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + EPS) + xi) inside = !inside;
  }
  return inside;
}

/** 多角形が他の頂点を strictly 内側に含むか。含む場合は「複数セルをまとめた面」なので出力しない。 */
function polygonContainsAnyVertexStrictly(poly: Polygon100, allVertices: Point[]): boolean {
  for (const v of allVertices) {
    if (pointInPolygonStrict(v, poly)) return true;
  }
  return false;
}

/** 既に出力したより小さい領域の重心を内側に含むか。含む場合は「正しいセルを複数融合した面」なので出力しない。 */
function polygonContainsSmallerOutputCentroid(poly: Polygon100, areaAbs: number, existing: Polygon100[]): boolean {
  for (const e of existing) {
    const ea = polygonAreaAbs(e);
    if (ea >= areaAbs) continue;
    const ec = polygonCentroid(e);
    if (pointInPolygonStrict(ec, poly)) return true;
  }
  return false;
}

/** 既存のどれかと同一領域（面積・幾何重心が近い）なら true。頂点数が違う同じ形は幾何重心で判定する。 */
function isDuplicateOfExisting(poly: Polygon100, areaAbs: number, existing: Polygon100[]): boolean {
  const c = polygonCentroid(poly);
  for (const e of existing) {
    const ea = polygonAreaAbs(e);
    if (Math.abs(areaAbs - ea) / Math.max(areaAbs, ea, 1) > DEDUP_AREA_RATIO) continue;
    const ec = polygonCentroid(e);
    if (Math.hypot(c.x - ec.x, c.y - ec.y) <= DEDUP_CENTROID_DIST) return true;
  }
  return false;
}

/** 多角形が画像外枠（0–100 の矩形）と一致するか、または外枠に沿った外側面（凹多角形）か */
function isOuterFramePolygon(poly: Polygon100): boolean {
  if (poly.length < 3) return false;
  const snapDistSq = OUTER_FRAME_CORNER_EPS * OUTER_FRAME_CORNER_EPS;
  const onLeft = poly.some((p) => p.x <= OUTER_FRAME_CORNER_EPS);
  const onRight = poly.some((p) => p.x >= 100 - OUTER_FRAME_CORNER_EPS);
  const onTop = poly.some((p) => p.y <= OUTER_FRAME_CORNER_EPS);
  const onBottom = poly.some((p) => p.y >= 100 - OUTER_FRAME_CORNER_EPS);
  const touchesAllSides = onLeft && onRight && onTop && onBottom;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i]!.x * poly[j]!.y - poly[j]!.x * poly[i]!.y;
  }
  const areaAbs = Math.abs(area) * 0.5;
  if (poly.length === 4 && touchesAllSides) {
    const corners: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const allCorners = corners.every((c) => poly.some((p) => distSq(p, c) <= snapDistSq));
    if (allCorners) return true;
  }
  if (touchesAllSides && areaAbs >= OUTER_FACE_AREA_MIN) return true;
  return false;
}

const BOX_MIN = 0;
const BOX_MAX = 100;

/** 枠の端にスナップする距離（%）。この範囲内の端点は外枠上に寄せる */
const FRAME_SNAP_EPS = 1.5;
/** 他線分の上に端点をスナップする距離（%）。斜め線の端が水平線に乗るようにする */
const SNAP_ENDPOINT_TO_LINE_EPS = 2.5;

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

/** 各線の端点が他線分に十分近いとき、その線分上に最も近い点へスナップする。斜め線の端が水平線に乗り、頂点の重複が減る。 */
function snapEndpointsToOtherLines(lines: PartitionLine[]): PartitionLine[] {
  const epsSq = SNAP_ENDPOINT_TO_LINE_EPS * SNAP_ENDPOINT_TO_LINE_EPS;
  return lines.map((seg, i) => {
    const p1 = { x: seg.x1, y: seg.y1 };
    const p2 = { x: seg.x2, y: seg.y2 };
    let best1: { distSq: number; proj: Point } = { distSq: epsSq + 1, proj: p1 };
    let best2: { distSq: number; proj: Point } = { distSq: epsSq + 1, proj: p2 };
    for (let j = 0; j < lines.length; j++) {
      if (j === i) continue;
      const other = lines[j]!;
      const a = projectPointToSegment(p1, other);
      if (a.t >= 0 && a.t <= 1 && a.distSq < best1.distSq) best1 = { distSq: a.distSq, proj: a.proj };
      const b = projectPointToSegment(p2, other);
      if (b.t >= 0 && b.t <= 1 && b.distSq < best2.distSq) best2 = { distSq: b.distSq, proj: b.proj };
    }
    const q1 = best1.distSq <= epsSq ? best1.proj : p1;
    const q2 = best2.distSq <= epsSq ? best2.proj : p2;
    return { x1: q1.x, y1: q1.y, x2: q2.x, y2: q2.y };
  });
}

/** 線分を 0–100 の矩形でクリップし、内側の部分だけ返す。完全に外なら null（Liang–Barsky） */
function clipSegmentToBox(seg: PartitionLine): PartitionLine | null {
  let t0 = 0;
  let t1 = 1;
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const dirs = [
    { p: -dx, q: seg.x1 - BOX_MIN },
    { p: dx, q: BOX_MAX - seg.x1 },
    { p: -dy, q: seg.y1 - BOX_MIN },
    { p: dy, q: BOX_MAX - seg.y1 },
  ];
  for (const { p, q } of dirs) {
    if (Math.abs(p) <= EPS) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p > 0) {
      if (t < t0) return null;
      t1 = Math.min(t1, t);
    } else {
      if (t > t1) return null;
      t0 = Math.max(t0, t);
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

  let snapped = clipped
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
  console.log(LOG_PREFIX, "スナップ後(枠)", snapped.length, "本:", snapped.length ? snapped.map((s) => `(${s.x1},${s.y1})-(${s.x2},${s.y2})`) : "(なし・ degenerate で除外)");

  snapped = snapEndpointsToOtherLines(snapped);
  console.log(LOG_PREFIX, "スナップ後(他線)", snapped.length, "本:", snapped.length ? snapped.map((s) => `(${s.x1.toFixed(2)},${s.y1.toFixed(2)})-(${s.x2.toFixed(2)},${s.y2.toFixed(2)})`) : "(なし)");

  const allLines = [...IMAGE_FRAME_LINES, ...snapped];
  const segments = buildSplitSegments(allLines);
  console.log(LOG_PREFIX, "外枠+ユーザー線を交差で分割した辺", segments.length, "本");

  const { vertices, edges } = normalizeVerticesAndEdges(segments);
  snapVerticesToSegmentLines(vertices, segments);
  console.log(LOG_PREFIX, "頂点数", vertices.length, "辺数", edges.length / 2, "頂点一覧:", vertices.map((p, i) => `${i}:(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" "), "※頂点は「スナップ後」の線を交差で分割した辺の端点＋交差点です");

  if (edges.length === 0) {
    console.log(LOG_PREFIX, "辺が 0 のため領域なし");
    return [];
  }

  const outgoingByVertex = buildOutgoingByAngle(vertices, edges);
  const faces = traceFaces(edges, vertices, outgoingByVertex);
  console.log(LOG_PREFIX, "トレースした面の数", faces.length, "(各有向辺の左・右両側をトレースするため、幾何的な領域数より多くなります)");

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
    if (areaAbs >= OUTER_FACE_AREA_HALF) {
      console.log(LOG_PREFIX, `面${fi}`, "面積が画像の半分以上(外側相当) → スキップ");
      continue;
    }
    if (polygonContainsAnyVertexStrictly(poly, vertices)) {
      console.log(LOG_PREFIX, `面${fi}`, "他頂点を内側に含む(非最小面) → スキップ");
      continue;
    }
    if (polygonContainsSmallerOutputCentroid(poly, areaAbs, polygons)) {
      console.log(LOG_PREFIX, `面${fi}`, "より小さい既出領域の重心を内側に含む(融合面) → スキップ");
      continue;
    }
    if (isDuplicateOfExisting(poly, areaAbs, polygons)) {
      console.log(LOG_PREFIX, `面${fi}`, "既出の領域と重複 → スキップ");
      continue;
    }
    console.log(LOG_PREFIX, `面${fi}`, "→ 領域として出力", poly.length, "頂点", "面積", areaAbs.toFixed(2), poly.map((p) => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" "));
    polygons.push(poly);
  }
  console.log(LOG_PREFIX, "出力領域数", polygons.length);
  return polygons;
}
