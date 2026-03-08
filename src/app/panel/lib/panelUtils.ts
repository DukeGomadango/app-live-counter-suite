/**
 * パネル機能用の純粋ユーティリティ（色・座標・線ヒットなど）。
 */

import type { PartitionLine } from "./panelTypes";

/** グリッドスナップの刻み（%） */
export const GRID_SNAP_PERCENT = 2;

export function snapToGrid(v: number): number {
  return Math.round(v / GRID_SNAP_PERCENT) * GRID_SNAP_PERCENT;
}

/** #rgb / #rrggbb を 0–255 の R,G,B に変換 */
export function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  let s = hex.replace(/^#/, "").trim();
  if (s.length === 3) s = s[0]! + s[0] + s[1]! + s[1] + s[2]! + s[2];
  const n = parseInt(s, 16);
  if (Number.isNaN(n) || s.length !== 6) return { r: 139, g: 92, b: 246 };
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const R = Math.max(0, Math.min(255, Math.round(r)));
  const G = Math.max(0, Math.min(255, Math.round(g)));
  const B = Math.max(0, Math.min(255, Math.round(b)));
  return "#" + [R, G, B].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** RGB (0–255) を HSL に変換。h: 0–360, s: 0–100, l: 0–100 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
    else if (max === G) h = ((B - R) / d + 2) / 6;
    else h = ((R - G) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** HSL (h: 0–360, s: 0–100, l: 0–100) を RGB (0–255) に変換 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const H = ((h % 360) + 360) % 360 / 360;
  const S = Math.max(0, Math.min(100, s)) / 100;
  const L = Math.max(0, Math.min(100, l)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (S === 0) {
    r = g = b = L;
  } else {
    const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
    const p = 2 * L - q;
    r = hueToRgb(p, q, H + 1 / 3);
    g = hueToRgb(p, q, H);
    b = hueToRgb(p, q, H - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function hueToRgb(p: number, q: number, t: number): number {
  let T = t;
  if (T < 0) T += 1;
  if (T > 1) T -= 1;
  if (T < 1 / 6) return p + (q - p) * 6 * T;
  if (T < 1 / 2) return q;
  if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6;
  return p;
}

/** お気に入り登録用に #rgb / #rrggbb を #rrggbb 小文字に正規化 */
export function normalizeHex(hex: string): string {
  let s = hex.replace(/^#/, "").trim().toLowerCase();
  if (s.length === 3) s = s[0]! + s[0] + s[1]! + s[1] + s[2]! + s[2];
  if (s.length !== 6 || !/^[0-9a-f]+$/.test(s)) return "";
  return "#" + s;
}

export function snapToNearestGuide(v: number, guides: number[], threshold = 2): number {
  if (!guides.length) return v;
  let snapped = v;
  let bestDiff = threshold + 0.001;
  for (const g of guides) {
    const d = Math.abs(v - g);
    if (d < bestDiff) {
      bestDiff = d;
      snapped = g;
    }
  }
  return snapped;
}

/** 三角形オーバーレイの種類ごとに、見た目の重心（バウンディングボックス内 0–100%）を返す。ラベル・数字を幅広い位置に置く用 */
export function getTriangleTextAnchor(
  kind: "rightTop" | "rightBottom" | "isoLeft" | "isoRight" | "diagDownUpper" | "diagDownLower" | "diagUpUpper" | "diagUpLower" | "iso" | undefined
): { x: number; y: number } {
  switch (kind) {
    case "rightTop":
      return { x: 100 / 3, y: 100 / 3 };
    case "rightBottom":
      return { x: 100 / 3, y: 200 / 3 };
    case "isoLeft":
      return { x: 200 / 3, y: 50 };
    case "isoRight":
      return { x: 100 / 3, y: 50 };
    case "diagDownUpper":
      return { x: 100 / 3, y: 100 / 3 };
    case "diagDownLower":
      return { x: 200 / 3, y: 200 / 3 };
    case "diagUpUpper":
      return { x: 200 / 3, y: 100 / 3 };
    case "diagUpLower":
      return { x: 100 / 3, y: 200 / 3 };
    default:
      return { x: 50, y: 200 / 3 };
  }
}

/** object-contain と同様のロジックで、画像の実表示領域を 0〜100% 座標で返す */
export function getImageBoundsPct(
  frameRect: DOMRect,
  imageAspectRatio?: number | null
): { x: number; y: number; width: number; height: number } {
  const frameAR = frameRect.width / frameRect.height;
  const imgAR = imageAspectRatio && imageAspectRatio > 0 ? imageAspectRatio : 16 / 9;
  if (imgAR > frameAR) {
    const width = 100;
    const height = (frameAR / imgAR) * 100;
    const y = (100 - height) / 2;
    return { x: 0, y, width, height };
  } else {
    const height = 100;
    const width = (imgAR / frameAR) * 100;
    const x = (100 - width) / 2;
    return { x, y: 0, width, height };
  }
}

/** 点 (px,py) から線分 (x1,y1)-(x2,y2) までの距離（0–100座標）。 */
export function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = wx * vx + wy * vy;
  const c2 = vx * vx + vy * vy;
  let t = 0;
  if (c2 > 1e-10) {
    t = Math.max(0, Math.min(1, c1 / c2));
  }
  const qx = x1 + t * vx;
  const qy = y1 + t * vy;
  return Math.hypot(px - qx, py - qy);
}

/** 点 (px,py) に最も近い線のインデックス。threshold 以内ならその index、なければ null。 */
export function findLineIndexAt(
  lines: PartitionLine[],
  px: number,
  py: number,
  threshold: number
): number | null {
  let bestIdx: number | null = null;
  let bestDist = threshold;
  lines.forEach((line, i) => {
    const d = distancePointToSegment(px, py, line.x1, line.y1, line.x2, line.y2);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  });
  return bestIdx;
}
