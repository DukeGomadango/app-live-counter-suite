import { describe, it, expect } from "vitest";
import {
  clipPolygonToMask,
  extractSilhouettePolygons,
  polygonAreaAbs,
  rasterizePolygon,
  rasterizePolygonInMask,
  simplifyPolygon,
  type SilhouetteMask,
} from "@/app/panel/lib/panelSilhouetteMask";

function makeRectMask(
  gridW: number,
  gridH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): SilhouetteMask {
  const opaque = new Uint8Array(gridW * gridH);
  let opaqueCellCount = 0;
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      opaque[gy * gridW + gx] = 1;
      opaqueCellCount++;
    }
  }
  return { gridW, gridH, opaque, opaqueCellCount };
}

describe("panelSilhouetteMask", () => {
  it("矩形マスクは不透明セルを持つ", () => {
    const mask = makeRectMask(32, 32, 8, 8, 24, 24);
    expect(mask.opaqueCellCount).toBeGreaterThan(0);
    expect(mask.opaqueCellCount).toBeLessThan(mask.gridW * mask.gridH);
  });

  it("extractSilhouettePolygons は矩形シルエットからポリゴンを返す", () => {
    const mask = makeRectMask(40, 40, 10, 8, 30, 32);
    const polys = extractSilhouettePolygons(mask, 0.001);
    expect(polys.length).toBeGreaterThanOrEqual(1);
    expect(polys[0]!.length).toBeGreaterThanOrEqual(3);
    expect(polygonAreaAbs(polys[0]!)).toBeGreaterThan(1);
  });

  it("clipPolygonToMask は領域とマスクの交差だけを残す", () => {
    const mask = makeRectMask(40, 40, 0, 0, 19, 39);
    const region = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const clipped = clipPolygonToMask(region, mask, 0.001);
    expect(clipped.length).toBeGreaterThanOrEqual(1);
    for (const p of clipped) {
      const cx = p.reduce((s, pt) => s + pt.x, 0) / p.length;
      expect(cx).toBeLessThan(60);
    }
  });

  it("simplifyPolygon は頂点を減らす", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const simplified = simplifyPolygon(square, 5);
    expect(simplified.length).toBeLessThanOrEqual(4);
    expect(simplified.length).toBeGreaterThanOrEqual(3);
  });

  it("立ち絵風の縦長シルエットから十分な面積のポリゴンを返す", () => {
    const mask: SilhouetteMask = {
      gridW: 48,
      gridH: 80,
      opaque: new Uint8Array(48 * 80),
      opaqueCellCount: 0,
    };
    for (let gy = 10; gy <= 70; gy++) {
      const halfW = gy < 25 ? 6 : gy < 55 ? 14 : 10;
      const cx = 24;
      for (let gx = cx - halfW; gx <= cx + halfW; gx++) {
        mask.opaque[gy * mask.gridW + gx] = 1;
        mask.opaqueCellCount++;
      }
    }
    const polys = extractSilhouettePolygons(mask, 0.001);
    expect(polys.length).toBeGreaterThanOrEqual(1);
    expect(polygonAreaAbs(polys[0]!)).toBeGreaterThan(50);
  });

  it("隣接領域を OR 合成しても横方向の隙間ができない", () => {
    const mask = makeRectMask(40, 40, 5, 5, 34, 34);
    const left = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 0, y: 100 },
    ];
    const right = [
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 50, y: 100 },
    ];
    const a = rasterizePolygonInMask(left, mask);
    const b = rasterizePolygonInMask(right, mask);
    const merged = new Uint8Array(mask.gridW * mask.gridH);
    for (let i = 0; i < merged.length; i++) {
      if (a[i] || b[i]) merged[i] = 1;
    }
    for (let gy = 8; gy < 32; gy++) {
      let gapCount = 0;
      for (let gx = 8; gx < 32; gx++) {
        if (!merged[gy * mask.gridW + gx]) gapCount++;
      }
      expect(gapCount).toBe(0);
    }
  });

  it("rasterizePolygon は三角形をグリッドに塗る", () => {
    const tri = [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 50, y: 90 },
    ];
    const raster = rasterizePolygon(tri, 32, 32);
    let filled = 0;
    for (let i = 0; i < raster.length; i++) if (raster[i]) filled++;
    expect(filled).toBeGreaterThan(0);
  });
});
