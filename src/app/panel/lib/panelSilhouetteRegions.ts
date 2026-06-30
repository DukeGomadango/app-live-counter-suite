/**
 * 立ち絵マスクを使った覆い（オーバーレイ）生成。
 */

import type { CurvedRegion, PanelOverlay } from "./panelTypes";
import {
  createFreeOverlayFromPolygon,
  curvedRegionToPolygon,
  type PartitionSegment,
} from "./panelTypes";
import { getRegionsFromSegments } from "./panelRegionDetection";
import {
  clipPolygonToMask,
  extractSilhouettePolygons,
  getOrBuildMask,
  rasterizePolygonInMask,
  type Point100,
  type SilhouetteMask,
  polygonAreaAbs,
  DEFAULT_MIN_AREA_RATIO,
  SILHOUETTE_ALPHA_THRESHOLD,
} from "./panelSilhouetteMask";

const CURVE_SAMPLES = 12;

/** 2次ベジェをサンプリング */
function sampleQuadratic(
  x1: number,
  y1: number,
  cpx: number,
  cpy: number,
  x2: number,
  y2: number,
  samples: number
): Point100[] {
  const pts: Point100[] = [];
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    pts.push({
      x: u * u * x1 + 2 * u * t * cpx + t * t * x2,
      y: u * u * y1 + 2 * u * t * cpy + t * t * y2,
    });
  }
  return pts;
}

/** CurvedRegion をクリップ用の密な多角形に変換 */
export function curvedRegionToDensePolygon(region: CurvedRegion): Point100[] {
  const points: Point100[] = [];
  for (const seg of region) {
    if (seg.type === "L") {
      if (points.length === 0) points.push({ x: seg.x1, y: seg.y1 });
      points.push({ x: seg.x2, y: seg.y2 });
    } else {
      if (points.length === 0) points.push({ x: seg.x1, y: seg.y1 });
      points.push(
        ...sampleQuadratic(seg.x1, seg.y1, seg.cpx, seg.cpy, seg.x2, seg.y2, CURVE_SAMPLES)
      );
    }
  }
  if (points.length > 2) {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (Math.hypot(first.x - last.x, first.y - last.y) > 0.01) {
      points.push({ ...first });
    }
  }
  return points;
}

/** PartitionSegment 列から領域を検出し、マスクでクリップしたポリゴン配列を返す */
export function computeMaskedRegionPolygons(
  segments: PartitionSegment[],
  mask: SilhouetteMask,
  minAreaRatio = DEFAULT_MIN_AREA_RATIO
): Point100[][] {
  const regions = getRegionsFromSegments(segments);
  const allPolygons: Point100[][] = [];

  for (const region of regions) {
    const hasCurves = region.some((s) => s.type === "Q");
    const poly = hasCurves ? curvedRegionToDensePolygon(region) : curvedRegionToPolygon(region);
    if (poly.length < 3) continue;
    allPolygons.push(...clipPolygonToMask(poly, mask, minAreaRatio));
  }

  return dedupePolygonsByArea(allPolygons, minAreaRatio, mask);
}

/** プレビュー用ラスター（領域ごとの OR 合成で隙間が出ないよう点判定で塗る） */
export function computeMaskedPreviewRaster(
  segments: PartitionSegment[],
  mask: SilhouetteMask
): Uint8Array {
  const regions = getRegionsFromSegments(segments);
  const merged = new Uint8Array(mask.gridW * mask.gridH);
  for (const region of regions) {
    const hasCurves = region.some((s) => s.type === "Q");
    const poly = hasCurves ? curvedRegionToDensePolygon(region) : curvedRegionToPolygon(region);
    if (poly.length < 3) continue;
    const clipped = rasterizePolygonInMask(poly, mask);
    for (let i = 0; i < merged.length; i++) {
      if (clipped[i]) merged[i] = 1;
    }
  }
  return merged;
}

/** 立ち絵全体のシルエットポリゴン */
export async function computeWholeSilhouettePolygons(
  imageUrl: string,
  minAreaRatio = DEFAULT_MIN_AREA_RATIO,
  alphaThreshold = SILHOUETTE_ALPHA_THRESHOLD
): Promise<Point100[][]> {
  const mask = await getOrBuildMask(imageUrl, alphaThreshold);
  return extractSilhouettePolygons(mask, minAreaRatio);
}

export async function loadSilhouetteMask(
  imageUrl: string,
  alphaThreshold = SILHOUETTE_ALPHA_THRESHOLD
): Promise<SilhouetteMask> {
  return getOrBuildMask(imageUrl, alphaThreshold);
}

/** 覆いに使えるポリゴンだけ残す（プレビュー・確定で共通） */
export function filterValidSilhouettePolygons(polygons: Point100[][]): Point100[][] {
  return polygons.filter((p) => p.length >= 3 && polygonAreaAbs(p) > 0.01);
}

/** ポリゴン列から free オーバーレイを生成 */
export function overlaysFromPolygons(polygons: Point100[][]): PanelOverlay[] {
  return filterValidSilhouettePolygons(polygons).map((p) => createFreeOverlayFromPolygon(p));
}

/** 面積・重心が近い重複を除去 */
function dedupePolygonsByArea(
  polygons: Point100[][],
  minAreaRatio: number,
  mask: SilhouetteMask
): Point100[][] {
  const minArea = (mask.opaqueCellCount / (mask.gridW * mask.gridH)) * 100 * 100 * minAreaRatio * 0.5;
  const result: Point100[][] = [];
  for (const poly of polygons) {
    const area = polygonAreaAbs(poly);
    if (area < minArea) continue;
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    const dup = result.some((existing) => {
      const ex = existing.reduce((s, p) => s + p.x, 0) / existing.length;
      const ey = existing.reduce((s, p) => s + p.y, 0) / existing.length;
      const ea = polygonAreaAbs(existing);
      return Math.abs(ea - area) / Math.max(ea, area) < 0.05 &&
        Math.hypot(cx - ex, cy - ey) < 2;
    });
    if (!dup) result.push(poly);
  }
  return result;
}

/** セグメントが空のときは全体シルエットのみ */
export function computeMaskedPolygonsFromSegmentsOrWhole(
  segments: PartitionSegment[],
  mask: SilhouetteMask,
  minAreaRatio = DEFAULT_MIN_AREA_RATIO
): Point100[][] {
  const hasUserLines = segments.length > 0;
  if (!hasUserLines) {
    return extractSilhouettePolygons(mask, minAreaRatio);
  }
  return computeMaskedRegionPolygons(segments, mask, minAreaRatio);
}
