/**
 * 2次ベジェ曲線の演算。0–100 座標系。
 * B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
 */

import type { PartitionCurve } from "./panelTypes";
import type { BoundarySegment } from "./panelTypes";

const EPS = 1e-10;

export interface Point {
  x: number;
  y: number;
}

/** 2次ベジェ上の点。t ∈ [0, 1] */
export function bezierPointAt(
  x1: number,
  y1: number,
  cpx: number,
  cpy: number,
  x2: number,
  y2: number,
  t: number
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * x1 + 2 * mt * t * cpx + t2 * x2,
    y: mt2 * y1 + 2 * mt * t * cpy + t2 * y2,
  };
}

/** 2次ベジェの接線方向（微分）。t ∈ [0, 1] */
export function bezierTangentAt(
  x1: number,
  y1: number,
  cpx: number,
  cpy: number,
  x2: number,
  y2: number,
  t: number
): Point {
  const mt = 1 - t;
  return {
    x: 2 * mt * (cpx - x1) + 2 * t * (x2 - cpx),
    y: 2 * mt * (cpy - y1) + 2 * t * (y2 - cpy),
  };
}

/** PartitionCurve を t で分割（de Casteljau）。[0..t] と [t..1] の2本を返す。 */
export function splitQuadraticAt(
  curve: PartitionCurve,
  t: number
): [PartitionCurve, PartitionCurve] {
  const { x1, y1, x2, y2, cpx, cpy } = curve;
  const t1 = Math.max(0, Math.min(1, t));
  const p0 = bezierPointAt(x1, y1, cpx, cpy, x2, y2, 0);
  const p1 = bezierPointAt(x1, y1, cpx, cpy, x2, y2, t1);
  const p2 = bezierPointAt(x1, y1, cpx, cpy, x2, y2, 1);
  const q0 = {
    x: x1 + t1 * (cpx - x1),
    y: y1 + t1 * (cpy - y1),
  };
  const q1 = {
    x: cpx + t1 * (x2 - cpx),
    y: cpy + t1 * (y2 - cpy),
  };
  const mid = {
    x: q0.x + t1 * (q1.x - q0.x),
    y: q0.y + t1 * (q1.y - q0.y),
  };
  return [
    { type: "curve", x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, cpx: q0.x, cpy: q0.y },
    { type: "curve", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, cpx: q1.x, cpy: q1.y },
  ];
}

/** 直線 (x1,y1)-(x2,y2) と 2次ベジェの交差。線分・曲線ともに内側のみ。戻り値は曲線の t の配列（昇順）。 */
export function lineQuadraticIntersection(
  lx1: number,
  ly1: number,
  lx2: number,
  ly2: number,
  qx1: number,
  qy1: number,
  qcpx: number,
  qcpy: number,
  qx2: number,
  qy2: number
): number[] {
  const dx = lx2 - lx1;
  const dy = ly2 - ly1;
  const ax = qx1 - lx1;
  const ay = qy1 - ly1;
  const bx = 2 * (qcpx - qx1);
  const by = 2 * (qcpy - qy1);
  const cx = qx2 - 2 * qcpx + qx1;
  const cy = qy2 - 2 * qcpy + qy1;
  const f0 = dx * ay - dy * ax;
  const f1 = dx * by - dy * bx;
  const f2 = dx * cy - dy * cx;
  const roots: number[] = [];
  if (Math.abs(f2) < EPS) {
    if (Math.abs(f1) >= EPS) {
      const t = -f0 / f1;
      if (t >= -1e-9 && t <= 1 + 1e-9) roots.push(Math.max(0, Math.min(1, t)));
    }
    return roots;
  }
  const disc = f1 * f1 - 4 * f2 * f0;
  if (disc < -EPS) return roots;
  const sqrtD = disc <= 0 ? 0 : Math.sqrt(disc);
  const twoA = 2 * f2;
  const t1 = (-f1 - sqrtD) / twoA;
  const t2 = (-f1 + sqrtD) / twoA;
  if (t1 >= -1e-9 && t1 <= 1 + 1e-9) roots.push(Math.max(0, Math.min(1, t1)));
  if (Math.abs(t1 - t2) > 1e-9 && t2 >= -1e-9 && t2 <= 1 + 1e-9) roots.push(Math.max(0, Math.min(1, t2)));
  roots.sort((a, b) => a - b);
  return roots;
}

/** 点が曲線上にあるか。tol 以内なら t を返す。 */
export function pointOnQuadratic(
  qx1: number,
  qy1: number,
  qcpx: number,
  qcpy: number,
  qx2: number,
  qy2: number,
  px: number,
  py: number,
  tol: number
): number | null {
  const tolSq = tol * tol;
  let bestT: number | null = null;
  let bestDistSq = tolSq + 1;
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = bezierPointAt(qx1, qy1, qcpx, qcpy, qx2, qy2, t);
    const d = (p.x - px) ** 2 + (p.y - py) ** 2;
    if (d < bestDistSq) {
      bestDistSq = d;
      bestT = t;
    }
  }
  if (bestT === null || bestDistSq > tolSq) return null;
  return bestT;
}

/** 2次ベジェと2次ベジェの交差（数値）。戻り値は (t1, t2) の配列。 */
export function quadraticQuadraticIntersection(
  a: PartitionCurve,
  b: PartitionCurve
): { t1: number; t2: number }[] {
  const results: { t1: number; t2: number }[] = [];
  const steps = 24;
  const subdiv = 1 / steps;
  for (let i = 0; i < steps; i++) {
    const t1Lo = i * subdiv;
    const t1Hi = (i + 1) * subdiv;
    for (let j = 0; j < steps; j++) {
      const t2Lo = j * subdiv;
      const t2Hi = (j + 1) * subdiv;
      const p1Lo = bezierPointAt(a.x1, a.y1, a.cpx, a.cpy, a.x2, a.y2, t1Lo);
      const p1Hi = bezierPointAt(a.x1, a.y1, a.cpx, a.cpy, a.x2, a.y2, t1Hi);
      const p2Lo = bezierPointAt(b.x1, b.y1, b.cpx, b.cpy, b.x2, b.y2, t2Lo);
      const p2Hi = bezierPointAt(b.x1, b.y1, b.cpx, b.cpy, b.x2, b.y2, t2Hi);
      const d1 = Math.hypot(p1Hi.x - p1Lo.x, p1Hi.y - p1Lo.y);
      const d2 = Math.hypot(p2Hi.x - p2Lo.x, p2Hi.y - p2Lo.y);
      if (d1 < EPS && d2 < EPS) continue;
      const t1Mid = (t1Lo + t1Hi) / 2;
      const t2Mid = (t2Lo + t2Hi) / 2;
      const m1 = bezierPointAt(a.x1, a.y1, a.cpx, a.cpy, a.x2, a.y2, t1Mid);
      const m2 = bezierPointAt(b.x1, b.y1, b.cpx, b.cpy, b.x2, b.y2, t2Mid);
      const distSq = (m1.x - m2.x) ** 2 + (m1.y - m2.y) ** 2;
      if (distSq < 0.5) {
        const refined = refineQuadraticQuadratic(a, b, t1Mid, t2Mid);
        if (refined && refined.t1 >= 0 && refined.t1 <= 1 && refined.t2 >= 0 && refined.t2 <= 1) {
          const dup = results.some(
            (r) => Math.abs(r.t1 - refined.t1) < 0.01 && Math.abs(r.t2 - refined.t2) < 0.01
          );
          if (!dup) results.push(refined);
        }
      }
    }
  }
  return results;
}

function refineQuadraticQuadratic(
  a: PartitionCurve,
  b: PartitionCurve,
  t1: number,
  t2: number
): { t1: number; t2: number } | null {
  for (let iter = 0; iter < 8; iter++) {
    const p1 = bezierPointAt(a.x1, a.y1, a.cpx, a.cpy, a.x2, a.y2, t1);
    const p2 = bezierPointAt(b.x1, b.y1, b.cpx, b.cpy, b.x2, b.y2, t2);
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    if (dx * dx + dy * dy < 1e-12) return { t1, t2 };
    const d1 = bezierTangentAt(a.x1, a.y1, a.cpx, a.cpy, a.x2, a.y2, t1);
    const d2 = bezierTangentAt(b.x1, b.y1, b.cpx, b.cpy, b.x2, b.y2, t2);
    const det = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(det) < 1e-14) break;
    const dt1 = (d2.y * dx - d2.x * dy) / det;
    const dt2 = (d1.y * dx - d1.x * dy) / det;
    t1 = Math.max(0, Math.min(1, t1 - dt1));
    t2 = Math.max(0, Math.min(1, t2 - dt2));
  }
  return null;
}

/** 点から2次ベジェまでの距離の2乗（サンプル近似）。*/
export function distanceSqPointToQuadratic(
  px: number,
  py: number,
  curve: PartitionCurve
): number {
  let best = 1e20;
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = bezierPointAt(curve.x1, curve.y1, curve.cpx, curve.cpy, curve.x2, curve.y2, t);
    const d = (p.x - px) ** 2 + (p.y - py) ** 2;
    if (d < best) best = d;
  }
  return best;
}

/** BoundarySegment の Q を PartitionCurve に変換（座標のみ）。 */
export function boundaryQToPartitionCurve(seg: Extract<BoundarySegment, { type: "Q" }>): PartitionCurve {
  return {
    type: "curve",
    x1: seg.x1,
    y1: seg.y1,
    x2: seg.x2,
    y2: seg.y2,
    cpx: seg.cpx,
    cpy: seg.cpy,
  };
}
