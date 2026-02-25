/**
 * Panel 機能の型定義。
 */

export type OverlayShape = "circle" | "triangle" | "rect" | "free" | "image";

export type TargetType = "number" | "text";

/** 数値目標: タップでカウント加算、count >= target で達成。日本語目標: タップで即達成モーダル */
export interface PanelOverlay {
  id: string;
  shape: OverlayShape;
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
}

export type FilterType = "noise" | "mosaic" | "grid" | "blur" | "noiseStrong";

export interface PanelState {
  imageDataUrl: string | null;
  activeFilters: FilterType[];
  /** フィルター強度 0〜100。ぼかし・ノイズの強さに反映 */
  filterIntensity: number;
  filterShowLabel: boolean;
  overlays: PanelOverlay[];
  isEditMode: boolean;
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
  };
}
