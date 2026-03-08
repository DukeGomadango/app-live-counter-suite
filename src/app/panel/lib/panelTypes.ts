/**
 * Panel 機能の型定義。
 */

export type OverlayShape = "circle" | "triangle" | "rect" | "free" | "image" | "custom";

/** カスタム図形を構成する1パーツ。座標・サイズは親カスタムオーバーレイ内の 0–100% 相対。 */
export type CustomPartShape = "rect" | "circle" | "triangle";
export type TriangleKind =
  | "iso" | "isoLeft" | "isoRight" | "rightTop" | "rightBottom"
  | "diagDownUpper" | "diagDownLower" | "diagUpUpper" | "diagUpLower";
export interface CustomPart {
  id: string;
  shape: CustomPartShape;
  x: number;
  y: number;
  width: number;
  height: number;
  /** パーツ内での回転（度） */
  rotation?: number;
  triangleKind?: TriangleKind;
  /** 未指定時は親オーバーレイの color を使用 */
  color?: string;
}

/** 保存したカスタム図形テンプレート（名前付きで再利用可能） */
export interface SavedCustomShape {
  id: string;
  name: string;
  savedAt: number;
  parts: CustomPart[];
}

export type TargetType = "number" | "text";

/** 数値目標: タップでカウント加算、count >= target で達成。日本語目標: タップで即達成モーダル */
export interface PanelOverlay {
  id: string;
  shape: OverlayShape;
  /** 三角テンプレート用の形状タイプ。通常の編集では未使用で、テンプレ生成時にのみ付与される想定。 */
  triangleKind?: TriangleKind;
  /** 左右反転（true のとき水平方向に反転して描画） */
  flipX?: boolean;
  targetType: TargetType;
  /** 数値目標の場合の目標値。0 は目標なし */
  target: number;
  /** 数値目標の場合の現在値 */
  count: number;
  /** 日本語目標の場合の表示テキスト */
  targetText: string;
  /** 位置・サイズ（形状ごとに解釈が異なる） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 自由描画の path データ（shape === "free" のとき） */
  points?: { x: number; y: number }[];
  color: string;
  label?: string;
  /** 回転（度）。0 が無回転 */
  rotation?: number;
  /** shape === "image" のときの画像 Data URL */
  imageDataUrl?: string;
  /** 透明度 0〜100。未指定時は 100（完全不透明） */
  opacity?: number;
  /** shape === "custom" のとき。複数パーツで1つの図形を構成。 */
  parts?: CustomPart[];
}

export type FilterType = "noise" | "mosaic" | "grid" | "blur" | "noiseStrong";

/** 画像を切り分ける線（0–100% 相対座標） */
export interface PartitionLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 編集ステップ: 線で切り分け → 領域生成 → 図形編集 → パネルあけ */
export type PanelEditStep = "lines" | "overlays";

export interface PanelState {
  imageDataUrl: string | null;
  /** パネル画像のアスペクト比（幅/高さ）。枠を画像に合わせて余白を消す用。未指定時は 16:9 */
  imageAspectRatio?: number | null;
  activeFilters: FilterType[];
  /** フィルター強度 0〜100。ぼかし・ノイズの強さに反映 */
  filterIntensity: number;
  filterShowLabel: boolean;
  overlays: PanelOverlay[];
  isEditMode: boolean;
  /** 線で切り分け: 画像上に引いた線（0–100%）。未指定時は [] */
  partitionLines?: PartitionLine[];
  /** 編集ステップ。未指定時は "overlays"（従来どおり） */
  panelEditStep?: PanelEditStep;
}

export interface SavedPanel {
  id: string;
  name: string;
  savedAt: number;
  state: PanelState;
}

export const DEFAULT_OVERLAY_COLOR = "#8b5cf6";
export const OVERLAY_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function createOverlayId(): string {
  return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultOverlay(shape: OverlayShape, x: number, y: number): PanelOverlay {
  return {
    id: createOverlayId(),
    shape,
    targetType: "number",
    target: 0,
    count: 0,
    targetText: "",
    x,
    y,
    width: 80,
    height: shape === "circle" ? 80 : 80,
    points: shape === "free" ? [] : undefined,
    color: DEFAULT_OVERLAY_COLOR,
    rotation: 0,
    opacity: 100,
    flipX: false,
  };
}

/** 画像オーバーレイを1つ作成（中央付近に配置） */
export function createImageOverlay(imageDataUrl: string, x: number, y: number): PanelOverlay {
  return {
    id: createOverlayId(),
    shape: "image",
    targetType: "number",
    target: 0,
    count: 0,
    targetText: "",
    x,
    y,
    width: 15,
    height: 15,
    color: DEFAULT_OVERLAY_COLOR,
    rotation: 0,
    imageDataUrl,
    opacity: 100,
    flipX: false,
  };
}

/** カスタム図形オーバーレイを1つ作成。parts は 0–100 の相対座標。 */
export function createCustomOverlay(
  parts: CustomPart[],
  x: number,
  y: number,
  width = 20,
  height = 20
): PanelOverlay {
  return {
    id: createOverlayId(),
    shape: "custom",
    targetType: "number",
    target: 0,
    count: 0,
    targetText: "",
    x,
    y,
    width,
    height,
    color: DEFAULT_OVERLAY_COLOR,
    rotation: 0,
    opacity: 100,
    flipX: false,
    parts: parts.length ? parts : undefined,
  };
}

/** ハート（上2円＋下に頂点が来る三角）。100x100 枠内。 */
export const CUSTOM_PRESET_HEART: Omit<CustomPart, "id">[] = [
  { shape: "circle", x: 15, y: 18, width: 38, height: 38 },
  { shape: "circle", x: 47, y: 18, width: 38, height: 38 },
  { shape: "triangle", x: 20, y: 42, width: 60, height: 58, rotation: 180 },
];

/** 星（5つの三角を放射状に、先端が外を向く）。100x100 枠内。 */
export const CUSTOM_PRESET_STAR: Omit<CustomPart, "id">[] = (() => {
  const cx = 50;
  const cy = 50;
  const r = 32;
  const w = 22;
  const h = 26;
  const parts: Omit<CustomPart, "id">[] = [];
  for (let i = 0; i < 5; i++) {
    const deg = 90 + i * 72;
    const rad = (deg * Math.PI) / 180;
    const tipX = cx + r * Math.cos(rad);
    const tipY = cy - r * Math.sin(rad);
    parts.push({
      shape: "triangle",
      x: tipX - w / 2,
      y: tipY,
      width: w,
      height: h,
      rotation: 90 - deg,
    });
  }
  return parts;
})();

/** 台形（上底短・下底長。中央の四角＋左右の三角で接続）。100x100 枠内。 */
export const CUSTOM_PRESET_TRAPEZOID: Omit<CustomPart, "id">[] = [
  { shape: "rect", x: 30, y: 18, width: 40, height: 64 },
  { shape: "triangle", x: 0, y: 18, width: 30, height: 64, triangleKind: "isoRight" },
  { shape: "triangle", x: 70, y: 18, width: 30, height: 64, triangleKind: "isoLeft" },
];

/** ひし形（4つの三角で菱形。上下左右の頂点で接続）。100x100 枠内。 */
export const CUSTOM_PRESET_DIAMOND: Omit<CustomPart, "id">[] = [
  { shape: "triangle", x: 25, y: 0, width: 50, height: 50 },
  { shape: "triangle", x: 25, y: 50, width: 50, height: 50, rotation: 180 },
  { shape: "triangle", x: 0, y: 25, width: 50, height: 50, triangleKind: "isoLeft" },
  { shape: "triangle", x: 50, y: 25, width: 50, height: 50, triangleKind: "isoRight" },
];

export function createPresetPartsWithIds(preset: Omit<CustomPart, "id">[]): CustomPart[] {
  return preset.map((p, i) => ({ ...p, id: `part-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` }));
}

/** 多角形の幾何重心（頂点座標はそのままの系で返す）。テキスト配置用。 */
export function polygonCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  const n = points.length;
  if (n < 3) {
    if (n === 1) return { x: points[0]!.x, y: points[0]!.y };
    if (n === 2) return { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 };
    return { x: 50, y: 50 };
  }
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = points[i]!.x;
    const yi = points[i]!.y;
    const xj = points[j]!.x;
    const yj = points[j]!.y;
    const cross = xi * yj - xj * yi;
    area += cross;
    cx += (xi + xj) * cross;
    cy += (yi + yj) * cross;
  }
  area *= 0.5;
  const a6 = 6 * area;
  if (Math.abs(a6) < 1e-20) {
    const minX = Math.min(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxX = Math.max(...points.map((p) => p.x));
    const maxY = Math.max(...points.map((p) => p.y));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
  return { x: cx / a6, y: cy / a6 };
}

/** free オーバーレイの多角形重心（0–100）。points は overlay.x, overlay.y からのオフセットなので、足して絶対座標にしてから計算。 */
export function getFreeOverlayCentroid(overlay: PanelOverlay): { x: number; y: number } | null {
  if (overlay.shape !== "free" || !overlay.points?.length) return null;
  const abs = overlay.points.map((p) => ({ x: overlay.x + p.x, y: overlay.y + p.y }));
  return polygonCentroid(abs);
}

/** カスタム図形の面積重み付き重心（0–100）。テキスト配置用。 */
export function getCustomOverlayCentroid(parts: CustomPart[]): { x: number; y: number } {
  if (!parts.length) return { x: 50, y: 50 };
  let sumAx = 0;
  let sumAy = 0;
  let sumA = 0;
  for (const p of parts) {
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const area = p.shape === "triangle" ? (p.width * p.height) / 2 : p.width * p.height;
    sumAx += cx * area;
    sumAy += cy * area;
    sumA += area;
  }
  if (sumA <= 0) return { x: 50, y: 50 };
  return { x: sumAx / sumA, y: sumAy / sumA };
}

/** 0–100 座標の多角形から free オーバーレイを1つ作成 */
export function createFreeOverlayFromPolygon(points: { x: number; y: number }[]): PanelOverlay {
  if (points.length < 3) {
    return createDefaultOverlay("free", 0, 0);
  }
  let minX = 100, minY = 100, maxX = 0, maxY = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const relativePoints = points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  return {
    id: createOverlayId(),
    shape: "free",
    targetType: "number",
    target: 0,
    count: 0,
    targetText: "",
    x: minX,
    y: minY,
    width,
    height,
    points: relativePoints,
    color: DEFAULT_OVERLAY_COLOR,
    rotation: 0,
    opacity: 100,
    flipX: false,
  };
}

/** パーツの clipPath（三角形用）。CSS に渡す値。 */
export function getPartClipPath(part: CustomPart): string | undefined {
  if (part.shape !== "triangle") return undefined;
  const k = part.triangleKind;
  if (k === "rightTop") return "polygon(0 0, 100% 0, 0 100%)";
  if (k === "rightBottom") return "polygon(0 0, 100% 100%, 0 100%)";
  if (k === "isoLeft") return "polygon(0 50%, 100% 0, 100% 100%)";
  if (k === "isoRight") return "polygon(100% 50%, 0 0, 0 100%)";
  if (k === "diagDownUpper") return "polygon(0 0, 100% 0, 0 100%)";
  if (k === "diagDownLower") return "polygon(100% 0, 100% 100%, 0 100%)";
  if (k === "diagUpUpper") return "polygon(0 0, 100% 0, 100% 100%)";
  if (k === "diagUpLower") return "polygon(0 0, 100% 100%, 0 100%)";
  return "polygon(50% 0%, 100% 100%, 0% 100%)";
}
