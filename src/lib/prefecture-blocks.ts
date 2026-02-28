/**
 * 47都道府県テンプレート用：地方ブロック配置。
 * 地図対応は緩く、ブロックをグリッド状に並べ、ブロック内でカードを整列。
 * カードサイズ・スケールに応じて間隔を動的にし、重ならないようにする。
 */

export interface BlockDef {
  /** テンプレート items の開始 index（0-based） */
  startIndex: number;
  /** このブロックのカード数 */
  count: number;
  /** ブロック内の列数（rowCounts がないとき） */
  columns: number;
  /** 行ごとの枚数（例: [1,3,3]）。あるときは columns の代わりに使用 */
  rowCounts?: number[];
  /** ブロック中心の x（％）。0–100。右ほど大 */
  anchorX: number;
  /** ブロック中心の y（％）。0–100。下ほど大 */
  anchorY: number;
}

/** 北海道 → 東北 → 関東 → 中部(日本海/太平洋) → 近畿 → 中国 → 四国 → 九州・沖縄 */
export const PREFECTURE_BLOCKS: BlockDef[] = [
  { startIndex: 0, count: 1, columns: 1, anchorX: 74, anchorY: 15 },   // 北海道（1段階左下）
  { startIndex: 1, count: 6, columns: 2, anchorX: 73, anchorY: 36 },   // 東北（2段階下）
  { startIndex: 7, count: 7, columns: 4, anchorX: 68, anchorY: 61 },   // 関東
  { startIndex: 14, count: 4, columns: 2, anchorX: 52, anchorY: 42 },  // 中部・日本海側
  { startIndex: 18, count: 5, columns: 3, anchorX: 54, anchorY: 80 },  // 中部・太平洋側
  { startIndex: 23, count: 7, columns: 3, rowCounts: [1, 3, 3], anchorX: 36, anchorY: 57 },   // 近畿（1+3+3）
  { startIndex: 30, count: 5, columns: 3, anchorX: 14, anchorY: 50 },  // 中国（3+2）
  { startIndex: 35, count: 4, columns: 2, anchorX: 30, anchorY: 81 },   // 四国（2×2）
  { startIndex: 39, count: 8, columns: 2, anchorX: 11, anchorY: 84 },   // 九州・沖縄（縦長・2列×4行）
];

/**
 * カード幅（px）とコンテナ幅（px）から、重ならない最小間隔（％）を求める。
 * cardScale が 0.5 以下のときは余裕 1.02 倍（隙間なく）、それ以外は 1.1 倍。
 */
export function minSpacingPercent(
  cardSizePx: number,
  containerWidthPx: number,
  containerHeightPx: number,
  cardScale?: number
): { x: number; y: number } {
  const margin = cardScale !== undefined && cardScale <= 0.5 ? 1.02 : 1.1;
  const x = (cardSizePx / containerWidthPx) * 100 * margin;
  const y = (cardSizePx / containerHeightPx) * 100 * margin;
  return { x, y };
}

/**
 * ブロック内の (col, row) から、ブロック中心を基準にしたオフセット（％）を返す。
 * ブロックは anchor を中心に配置する。
 * colsInRow: この行の列数（rowCounts のとき行ごとに異なる）
 */
function offsetInBlock(
  col: number,
  row: number,
  colsInRow: number,
  rows: number,
  spacingX: number,
  spacingY: number
): { dx: number; dy: number } {
  const dx = (col - (colsInRow - 1) / 2) * spacingX;
  const dy = (row - (rows - 1) / 2) * spacingY;
  return { dx, dy };
}

/**
 * 47都道府県テンプレートの item 索引に対応する位置（％）を返す。
 * @param index 0–46
 * @param spacingX ブロック内の横間隔（％）
 * @param spacingY ブロック内の縦間隔（％）
 */
export function getPrefecturePosition(
  index: number,
  spacingX: number,
  spacingY: number
): { x: number; y: number } {
  for (const block of PREFECTURE_BLOCKS) {
    if (index >= block.startIndex && index < block.startIndex + block.count) {
      const localIndex = index - block.startIndex;
      let col: number;
      let row: number;
      let colsInRow: number;
      const rows = block.rowCounts?.length ?? Math.ceil(block.count / block.columns);

      if (block.rowCounts) {
        let remaining = localIndex;
        row = 0;
        for (; row < block.rowCounts.length; row++) {
          const n = block.rowCounts[row]!;
          if (remaining < n) break;
          remaining -= n;
        }
        col = remaining;
        colsInRow = block.rowCounts[row] ?? 1;
      } else {
        const columns = block.columns;
        col = localIndex % columns;
        row = Math.floor(localIndex / columns);
        colsInRow = columns;
      }

      const { dx, dy } = offsetInBlock(col, row, colsInRow, rows, spacingX, spacingY);
      return {
        x: block.anchorX + dx,
        y: block.anchorY + dy,
      };
    }
  }
  return { x: 50, y: 50 };
}
