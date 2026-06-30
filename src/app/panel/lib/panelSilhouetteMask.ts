/**
 * 透過立ち絵の α マスク抽出・ラスタークリップ・輪郭ポリゴン化。
 * 座標系は画像表示領域の 0–100%（線で切り分けと同じ）。
 */

/** 透過検出用（緩い） */
export const DEFAULT_ALPHA_THRESHOLD = 10;
/** 立ち絵シルエット用（アンチエイリアス縁を除外して輪郭を締める） */
export const SILHOUETTE_ALPHA_THRESHOLD = 160;
export const DEFAULT_MIN_AREA_RATIO = 0.004;
export const MAX_MASK_GRID = 640;

export type Point100 = { x: number; y: number };

export interface SilhouetteMask {
  gridW: number;
  gridH: number;
  /** gridW * gridH、1 = 不透明 */
  opaque: Uint8Array;
  opaqueCellCount: number;
}

const maskCache = new Map<string, SilhouetteMask>();

function cacheKey(url: string, threshold: number): string {
  return `${url}|${threshold}`;
}

/** 画像 URL から ImageData を取得（ブラウザのみ） */
export async function loadImageDataFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h);
      resolve(data);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

/** 透過ピクセルがあるか（JPEG 等は false） */
export function imageDataHasTransparency(imageData: ImageData, threshold = DEFAULT_ALPHA_THRESHOLD): boolean {
  const d = imageData.data;
  for (let i = 3; i < d.length; i += 4) {
    if ((d[i] ?? 255) < 255 - threshold) return true;
  }
  return false;
}

export async function imageUrlHasTransparency(url: string): Promise<boolean> {
  const imageData = await loadImageDataFromUrl(url);
  return imageDataHasTransparency(imageData);
}

/** ImageData からダウンサンプルした α マスクを構築 */
export function buildMaskFromImageData(
  imageData: ImageData,
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
  maxGrid = MAX_MASK_GRID
): SilhouetteMask {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const scale = maxGrid / Math.max(srcW, srcH);
  const gridW = Math.max(1, Math.round(srcW * scale));
  const gridH = Math.max(1, Math.round(srcH * scale));
  const opaque = new Uint8Array(gridW * gridH);
  let opaqueCellCount = 0;
  const d = imageData.data;

  for (let gy = 0; gy < gridH; gy++) {
    const sy0 = Math.floor((gy * srcH) / gridH);
    const sy1 = Math.min(srcH, Math.floor(((gy + 1) * srcH) / gridH));
    for (let gx = 0; gx < gridW; gx++) {
      const sx0 = Math.floor((gx * srcW) / gridW);
      const sx1 = Math.min(srcW, Math.floor(((gx + 1) * srcW) / gridW));
      let maxAlpha = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const a = d[(sy * srcW + sx) * 4 + 3] ?? 255;
          if (a > maxAlpha) maxAlpha = a;
        }
      }
      if (maxAlpha > alphaThreshold) {
        opaque[gy * gridW + gx] = 1;
        opaqueCellCount++;
      }
    }
  }

  return { gridW, gridH, opaque, opaqueCellCount };
}

export async function getOrBuildMask(
  imageUrl: string,
  alphaThreshold = SILHOUETTE_ALPHA_THRESHOLD
): Promise<SilhouetteMask> {
  const key = cacheKey(imageUrl, alphaThreshold);
  const cached = maskCache.get(key);
  if (cached) return cached;
  const imageData = await loadImageDataFromUrl(imageUrl);
  const mask = buildMaskFromImageData(imageData, alphaThreshold);
  maskCache.set(key, mask);
  return mask;
}

export function clearMaskCache(): void {
  maskCache.clear();
}

export function gridToPct(gx: number, gy: number, gridW: number, gridH: number): Point100 {
  return {
    x: ((gx + 0.5) / gridW) * 100,
    y: ((gy + 0.5) / gridH) * 100,
  };
}

export function pctToGrid(x: number, y: number, gridW: number, gridH: number): { gx: number; gy: number } {
  return {
    gx: Math.max(0, Math.min(gridW - 1, Math.floor((x / 100) * gridW))),
    gy: Math.max(0, Math.min(gridH - 1, Math.floor((y / 100) * gridH))),
  };
}

/** 点が多角形の内側にあるか（レイキャスト、0–100 座標） */
export function pointInPolygon(x: number, y: number, polygon: Point100[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    if ((yi > y) !== (yj > y)) {
      const xIntersect = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xIntersect) inside = !inside;
    }
  }
  return inside;
}

/**
 * 多角形 ∩ マスクをグリッドセル中心の点判定でラスタライズ。
 * 領域ごとの scanline 塗りつぶしを OR 合成すると斜め境界に 1px の隙間（横線状）が出るため、こちらを使う。
 */
export function rasterizePolygonInMask(
  polygon: Point100[],
  mask: SilhouetteMask
): Uint8Array {
  const { gridW, gridH, opaque } = mask;
  const out = new Uint8Array(gridW * gridH);
  if (polygon.length < 3) return out;
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (!opaque[idx]) continue;
      const p = gridToPct(gx, gy, gridW, gridH);
      if (pointInPolygon(p.x, p.y, polygon)) out[idx] = 1;
    }
  }
  return out;
}

/** 多角形をグリッドにラスタライズ（scanline fill） */
export function rasterizePolygon(
  polygon: Point100[],
  gridW: number,
  gridH: number
): Uint8Array {
  const out = new Uint8Array(gridW * gridH);
  if (polygon.length < 3) return out;

  const xs = polygon.map((p) => pctToGrid(p.x, p.y, gridW, gridH).gx);
  const ys = polygon.map((p) => pctToGrid(p.x, p.y, gridW, gridH).gy);

  let minY = gridH;
  let maxY = 0;
  for (const y of ys) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  minY = Math.max(0, minY);
  maxY = Math.min(gridH - 1, maxY);

  for (let y = minY; y <= maxY; y++) {
    const intersections: number[] = [];
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const y0 = ys[i]!;
      const y1 = ys[j]!;
      const x0 = xs[i]!;
      const x1 = xs[j]!;
      if (y0 === y1) continue;
      if ((y < y0 && y < y1) || (y > y0 && y > y1)) continue;
      const t = (y - y0) / (y1 - y0);
      intersections.push(x0 + t * (x1 - x0));
    }
    intersections.sort((a, b) => a - b);
    for (let k = 0; k + 1 < intersections.length; k += 2) {
      const xStart = Math.max(0, Math.ceil(intersections[k]!));
      const xEnd = Math.min(gridW - 1, Math.floor(intersections[k + 1]!));
      for (let x = xStart; x <= xEnd; x++) {
        out[y * gridW + x] = 1;
      }
    }
  }
  return out;
}

/** 2 つのラスターの AND */
export function rasterAnd(a: Uint8Array, b: Uint8Array): Uint8Array {
  const len = Math.min(a.length, b.length);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = a[i]! && b[i]! ? 1 : 0;
  }
  return out;
}

function labelComponents(raster: Uint8Array, w: number, h: number): Int32Array {
  const labels = new Int32Array(w * h);
  let nextLabel = 1;
  const parent: number[] = [0];

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!raster[idx]) continue;
      const left = x > 0 ? labels[idx - 1]! : 0;
      const up = y > 0 ? labels[idx - w]! : 0;
      if (left === 0 && up === 0) {
        labels[idx] = nextLabel;
        parent.push(nextLabel);
        nextLabel++;
      } else if (left !== 0 && up === 0) {
        labels[idx] = left;
      } else if (left === 0 && up !== 0) {
        labels[idx] = up;
      } else {
        labels[idx] = left;
        union(left, up);
      }
    }
  }

  const rootMap = new Map<number, number>();
  let compact = 1;
  for (let i = 0; i < labels.length; i++) {
    if (!labels[i]) continue;
    const root = find(labels[i]!);
    if (!rootMap.has(root)) rootMap.set(root, compact++);
    labels[i] = rootMap.get(root)!;
  }
  return labels;
}

/** 1px 収縮（グリッド量子化による外側へのはみ出しを抑える） */
export function erodeBinaryRaster(raster: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(raster.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!raster[idx]) continue;
      if (
        x > 0 && raster[idx - 1] &&
        x < w - 1 && raster[idx + 1] &&
        y > 0 && raster[idx - w] &&
        y < h - 1 && raster[idx + w]
      ) {
        out[idx] = 1;
      }
    }
  }
  return out;
}

function traceContourMoore(
  raster: Uint8Array,
  w: number,
  h: number
): { gx: number; gy: number }[] {
  let startX = -1;
  let startY = -1;
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (raster[y * w + x]) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return [];

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
  ];

  const contour: { gx: number; gy: number }[] = [];
  let x = startX;
  let y = startY;
  let dir = 7;
  const maxSteps = w * h * 8;
  let steps = 0;

  do {
    contour.push({ gx: x, gy: y });
    let moved = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + i) % 8;
      const d = dirs[nd]!;
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && raster[ny * w + nx]) {
        x = nx;
        y = ny;
        dir = (nd + 6) % 8;
        moved = true;
        break;
      }
    }
    if (!moved) break;
    steps++;
  } while ((x !== startX || y !== startY || contour.length < 3) && steps < maxSteps);

  return contour;
}

function componentBinaryMask(
  labels: Int32Array,
  w: number,
  h: number,
  componentId: number
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === componentId) out[i] = 1;
  }
  return out;
}

/** 連結成分の外周を Moore 追跡で取得 */
function traceComponentBoundary(
  raster: Uint8Array,
  labels: Int32Array,
  w: number,
  h: number,
  componentId: number
): { gx: number; gy: number }[] {
  const binary = componentBinaryMask(labels, w, h, componentId);
  return traceContourMoore(binary, w, h);
}

/** マスクからクリップ用の輪郭ポリゴン（0–100、成分ごと） */
export function extractMaskOutlinePolygons(
  mask: SilhouetteMask,
  minAreaRatio = DEFAULT_MIN_AREA_RATIO
): Point100[][] {
  const raster = erodeBinaryRaster(mask.opaque, mask.gridW, mask.gridH);
  const minCells = Math.max(4, Math.floor(mask.opaqueCellCount * minAreaRatio));
  const labels = labelComponents(raster, mask.gridW, mask.gridH);
  const componentAreas = new Map<number, number>();
  for (let i = 0; i < labels.length; i++) {
    const id = labels[i]!;
    if (!id) continue;
    componentAreas.set(id, (componentAreas.get(id) ?? 0) + 1);
  }

  const polygons: Point100[][] = [];
  for (const [id, area] of componentAreas) {
    if (area < minCells) continue;
    const boundary = traceComponentBoundary(raster, labels, mask.gridW, mask.gridH, id);
    const poly = boundaryToPctPolygon(boundary, mask.gridW, mask.gridH, 0.2);
    if (poly.length >= 3 && polygonAreaAbs(poly) > 0.01) polygons.push(poly);
  }
  return polygons;
}

/** Douglas–Peucker 簡略化（0–100 座標） */
export function simplifyPolygon(points: Point100[], epsilon: number): Point100[] {
  if (points.length <= 2) return points.slice();

  function perpDist(p: Point100, a: Point100, b: Point100): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
  }

  function dp(pts: Point100[], eps: number): Point100[] {
    if (pts.length <= 2) return pts;
    let maxD = 0;
    let idx = 0;
    const end = pts.length - 1;
    for (let i = 1; i < end; i++) {
      const d = perpDist(pts[i]!, pts[0]!, pts[end]!);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > eps) {
      const left = dp(pts.slice(0, idx + 1), eps);
      const right = dp(pts.slice(idx), eps);
      return [...left.slice(0, -1), ...right];
    }
    return [pts[0]!, pts[end]!];
  }

  const closed = points[0]!.x === points[points.length - 1]!.x &&
    points[0]!.y === points[points.length - 1]!.y;
  const open = closed ? points.slice(0, -1) : points;
  if (open.length < 3) return points.slice();
  const simplified = dp([...open, open[0]!], epsilon);
  if (simplified.length > 1) {
    const last = simplified[simplified.length - 1]!;
    const first = simplified[0]!;
    if (last.x === first.x && last.y === first.y) simplified.pop();
  }
  return simplified;
}

function boundaryToPctPolygon(
  boundary: { gx: number; gy: number }[],
  gridW: number,
  gridH: number,
  simplifyEpsilon = 0.35
): Point100[] {
  if (boundary.length < 3) return [];
  const pts = boundary.map((b) => gridToPct(b.gx, b.gy, gridW, gridH));
  const simplified = simplifyPolygon(pts, simplifyEpsilon);
  return simplified.length >= 3 ? simplified : pts;
}

/** ラスターから面積しきい値以上の輪郭ポリゴン（0–100）を抽出 */
export function extractPolygonsFromRaster(
  raster: Uint8Array,
  gridW: number,
  gridH: number,
  minCells: number
): Point100[][] {
  const labels = labelComponents(raster, gridW, gridH);
  const componentAreas = new Map<number, number>();
  for (let i = 0; i < labels.length; i++) {
    const id = labels[i]!;
    if (!id) continue;
    componentAreas.set(id, (componentAreas.get(id) ?? 0) + 1);
  }

  const polygons: Point100[][] = [];
  for (const [id, area] of componentAreas) {
    if (area < minCells) continue;
    const boundary = traceComponentBoundary(raster, labels, gridW, gridH, id);
    const poly = boundaryToPctPolygon(boundary, gridW, gridH);
    if (poly.length >= 3) polygons.push(poly);
  }
  return polygons;
}

/** マスク全体のシルエットポリゴン（連結成分ごと） */
export function extractSilhouettePolygons(
  mask: SilhouetteMask,
  minAreaRatio = DEFAULT_MIN_AREA_RATIO
): Point100[][] {
  const minCells = Math.max(4, Math.floor(mask.opaqueCellCount * minAreaRatio));
  const raster = erodeBinaryRaster(mask.opaque, mask.gridW, mask.gridH);
  return extractPolygonsFromRaster(raster, mask.gridW, mask.gridH, minCells);
}

/** 領域ポリゴンをマスクでクリップし、残ったポリゴン列を返す */
export function clipPolygonToMask(
  regionPolygon: Point100[],
  mask: SilhouetteMask,
  minAreaRatio = DEFAULT_MIN_AREA_RATIO
): Point100[][] {
  const clipped = rasterizePolygonInMask(regionPolygon, mask);
  const minCells = Math.max(4, Math.floor(mask.opaqueCellCount * minAreaRatio));
  return extractPolygonsFromRaster(clipped, mask.gridW, mask.gridH, minCells);
}

/** ラスターをプレビュー用 PNG Data URL に（最近傍拡大でピクセル境界をくっきり表示） */
export function rasterToPreviewDataUrl(
  raster: Uint8Array,
  gridW: number,
  gridH: number,
  scale = 2
): string {
  const w = gridW * scale;
  const h = gridH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  const imgData = ctx.createImageData(w, h);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (!raster[gy * gridW + gx]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = (gy * scale + dy) * w + (gx * scale + dx);
          const i = px * 4;
          imgData.data[i] = 139;
          imgData.data[i + 1] = 92;
          imgData.data[i + 2] = 246;
          imgData.data[i + 3] = 210;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** ポリゴン列をマージしてラスタープレビューを生成 */
export function polygonsToPreviewDataUrl(
  polygons: Point100[][],
  gridW: number,
  gridH: number
): string {
  const merged = new Uint8Array(gridW * gridH);
  for (const poly of polygons) {
    const r = rasterizePolygon(poly, gridW, gridH);
    for (let i = 0; i < merged.length; i++) {
      if (r[i]) merged[i] = 1;
    }
  }
  return rasterToPreviewDataUrl(merged, gridW, gridH);
}

/** 多角形の符号付き面積（0–100 座標） */
export function polygonAreaAbs(points: Point100[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i]!.x * points[j]!.y - points[j]!.x * points[i]!.y;
  }
  return Math.abs(area) / 2;
}
