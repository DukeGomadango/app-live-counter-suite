/**
 * 自由描画ストローク用: 点列のスムージングと2次ベジェ連鎖への変換。
 */

import type { PartitionSegment } from "./panelTypes";

export interface Point {
  x: number;
  y: number;
}

const CLAMP_MIN = 0;
const CLAMP_MAX = 100;

function clamp(v: number): number {
  return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, v));
}

/** 移動平均でスムージング。窓は境界で短くなる。 */
export function smoothPoints(points: Point[], windowSize = 5): Point[] {
  if (points.length <= 2) return points.map((p) => ({ x: p.x, y: p.y }));
  const half = Math.floor(windowSize / 2);
  return points.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(points.length - 1, i + half);
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let j = from; j <= to; j++) {
      const p = points[j]!;
      sx += p.x;
      sy += p.y;
      n += 1;
    }
    return { x: sx / n, y: sy / n };
  });
}

/**
 * 滑らか化した点列を2次ベジェ連鎖に変換（Catmull–Rom 風の制御点）。
 * 隣接3点 P_{i-1}, P_i, P_{i+1} から P_i → P_{i+1} の区間の制御点を決める。
 */
export function pointsToBezierChain(points: Point[], alpha = 1 / 4): PartitionSegment[] {
  const out: PartitionSegment[] = [];
  const n = points.length;
  if (n < 2) return out;
  if (n === 2) {
    const a = points[0]!;
    const b = points[1]!;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    out.push({
      type: "curve",
      x1: clamp(a.x),
      y1: clamp(a.y),
      x2: clamp(b.x),
      y2: clamp(b.y),
      cpx: clamp(mx),
      cpy: clamp(my),
    });
    return out;
  }
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const pPrev = points[Math.max(0, i - 1)]!;
    const pNext = points[Math.min(n - 1, i + 2)]!;
    const dx = (pNext.x - pPrev.x) * alpha;
    const dy = (pNext.y - pPrev.y) * alpha;
    const cpx = clamp(p0.x + dx);
    const cpy = clamp(p0.y + dy);
    out.push({
      type: "curve",
      x1: clamp(p0.x),
      y1: clamp(p0.y),
      x2: clamp(p1.x),
      y2: clamp(p1.y),
      cpx,
      cpy,
    });
  }
  return out;
}
