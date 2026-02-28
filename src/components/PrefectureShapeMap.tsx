"use client";

import { useEffect, useRef, useState } from "react";
import type { CounterItem } from "@/lib/templates";

const PREFECTURE_MAP_SVG = "/images/japan-prefectures.svg";

interface PrefectureShapeMapProps {
  items: CounterItem[];
  onIncrement: (index: number) => void;
  isLightMode: boolean;
  accentColor?: string;
}

/** data-code は JIS 都道府県コード（01〜47）。index = code - 1 */
function codeToIndex(code: string): number {
  const n = parseInt(code, 10);
  return Number.isNaN(n) ? -1 : n - 1;
}

/** #rrggbb に alpha（0〜1）を付けて rgba または #rrggbbaa に */
function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  const aa = a.toString(16).padStart(2, "0");
  if (hex.length === 7 && hex.startsWith("#")) {
    return `${hex}${aa}`;
  }
  return hex;
}

/** 島が多い県で「本土」のラベル位置に使う子要素の index（0-based）。data-code → index の 0-based 県 index */
const PREFECTURE_MAINLAND_SHAPE_INDEX: Record<number, number> = {
  46: 3,  // 鹿児島: 九州本土部分
  47: 4,  // 沖縄: 沖縄本島
};

/** 子が1つの path で複数島を含む県など、bbox 中心からオフセットしてラベルを寄せる。dx/dy は 0〜1 の割合（dy 負で上、dx 負で左） */
const PREFECTURE_LABEL_OFFSET: Record<number, { dx: number; dy: number }> = {
  1: { dx: -0.12, dy: 0 },   // 北海道: 少し左へ
  13: { dx: 0.12, dy: -0.44 },  // 東京: 関東本土側に寄せる（-0.40 と -0.48 の間）
};

type NumberPosition = { index: number; x: number; y: number };

/** 県の「代表」となる矩形を取得。島などで分かれる場合は指定 index またはオフセットで本土に寄せる */
function getMainRect(prefectureEl: HTMLElement, prefectureIndex: number): DOMRect | null {
  const shapes = prefectureEl.querySelectorAll("polygon, path");
  const groupRect = prefectureEl.getBoundingClientRect();

  const shapeIndexOverride = PREFECTURE_MAINLAND_SHAPE_INDEX[prefectureIndex];
  if (shapeIndexOverride != null && shapeIndexOverride < shapes.length) {
    const shape = shapes[shapeIndexOverride];
    const rect = (shape as SVGElement).getBoundingClientRect();
    if (rect.width >= 1 && rect.height >= 1) return rect;
  }

  const offsetOverride = PREFECTURE_LABEL_OFFSET[prefectureIndex];
  if (offsetOverride) {
    const cx = groupRect.left + groupRect.width * (0.5 + offsetOverride.dx);
    const cy = groupRect.top + groupRect.height * (0.5 + offsetOverride.dy);
    return new DOMRect(cx - 1, cy - 1, 2, 2);
  }

  if (shapes.length === 0) return groupRect;
  const items: { rect: DOMRect; cx: number; cy: number; area: number }[] = [];
  shapes.forEach((shape) => {
    const rect = (shape as SVGElement).getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area < 1) return;
    items.push({
      rect,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      area,
    });
  });
  if (items.length === 0) return groupRect;
  const centroidX = items.reduce((s, i) => s + i.cx, 0) / items.length;
  const centroidY = items.reduce((s, i) => s + i.cy, 0) / items.length;
  items.sort((a, b) => b.area - a.area);
  const topByArea = items.slice(0, Math.max(3, Math.ceil(items.length * 0.3)));
  let best = topByArea[0];
  let bestDist = (best.cx - centroidX) ** 2 + (best.cy - centroidY) ** 2;
  topByArea.forEach((it) => {
    const d = (it.cx - centroidX) ** 2 + (it.cy - centroidY) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = it;
    }
  });
  return best.rect;
}

function measurePositions(
  container: HTMLDivElement,
  itemsLength: number
): NumberPosition[] {
  const prefectures = container.querySelectorAll<HTMLElement>(".prefecture");
  const containerRect = container.getBoundingClientRect();
  const positions: NumberPosition[] = [];
  prefectures.forEach((el) => {
    const code = el.getAttribute("data-code");
    const index = code != null ? codeToIndex(code) : -1;
    if (index < 0 || index >= itemsLength) return;
    const rect = getMainRect(el, index + 1);
    if (!rect) return;
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    positions.push({ index, x, y });
  });
  return positions;
}

export default function PrefectureShapeMap({
  items,
  onIncrement,
  isLightMode,
  accentColor = "#a855f7",
}: PrefectureShapeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberPositions, setNumberPositions] = useState<NumberPosition[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    queueMicrotask(() => setError(null));
    fetch(PREFECTURE_MAP_SVG)
      .then((res) => {
        if (!res.ok) throw new Error("地図の読み込みに失敗しました");
        return res.text();
      })
      .then((svgText) => {
        if (cancelled) return;
        el.innerHTML = svgText;
        const svg = el.querySelector("svg");
        if (svg) {
          svg.setAttribute("aria-label", "47都道府県マップ（クリックでカウント）");
          svg.style.width = "100%";
          svg.style.height = "100%";
          svg.style.display = "block";
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込みエラー");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 都道府県の色・クリック・ホバーを適用
  useEffect(() => {
    if (!loaded || !containerRef.current) return;

    const prefectures = containerRef.current.querySelectorAll<HTMLElement>(".prefecture");
    const strokeColor = hexWithAlpha(accentColor, 0.55);
    const teardowns: (() => void)[] = [];

    prefectures.forEach((el) => {
      const code = el.getAttribute("data-code");
      const index = code != null ? codeToIndex(code) : -1;
      const item = index >= 0 && index < items.length ? items[index] : undefined;
      if (!item) return;

      // グラス風: 県の色を半透明に
      el.style.fill = hexWithAlpha(item.color, 0.42);
      el.style.stroke = strokeColor;
      el.style.strokeWidth = "1";
      el.style.cursor = "pointer";
      el.style.transition = "filter 0.2s ease, stroke 0.2s ease";
      el.setAttribute("role", "button");
      el.setAttribute("tabIndex", "0");
      el.setAttribute("aria-label", `${item.label}（${item.count}件）クリックで増やす`);

      const onPointerEnter = () => {
        el.style.stroke = accentColor;
        el.style.filter = `drop-shadow(0 0 8px ${hexWithAlpha(accentColor, 0.7)})`;
      };
      const onPointerLeave = () => {
        el.style.stroke = strokeColor;
        el.style.filter = "";
      };
      const onClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        onIncrement(index);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onIncrement(index);
        }
      };

      el.addEventListener("pointerenter", onPointerEnter);
      el.addEventListener("pointerleave", onPointerLeave);
      el.addEventListener("click", onClick);
      el.addEventListener("keydown", onKeyDown);

      teardowns.push(() => {
        el.removeEventListener("pointerenter", onPointerEnter);
        el.removeEventListener("pointerleave", onPointerLeave);
        el.removeEventListener("click", onClick);
        el.removeEventListener("keydown", onKeyDown);
      });
    });

    return () => {
      teardowns.forEach((fn) => fn());
    };
  }, [loaded, items, onIncrement, isLightMode, accentColor]);

  // 県の中心位置を計測し、数字オーバーレイ用の座標を更新（ロード後・リサイズ時）
  useEffect(() => {
    if (!loaded || !containerRef.current) return;

    const updatePositions = () => {
      const container = containerRef.current;
      if (!container) return;
      const next = measurePositions(container, items.length);
      setNumberPositions(next);
    };

    const container = containerRef.current;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updatePositions);
    });
    const ro = new ResizeObserver(updatePositions);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [loaded, items.length]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500" role="alert">
        {error}
      </div>
    );
  }

  // 数字ラベルを他コンポーネント（プロジェクト名など）と揃えたアクセントのグロー
  const labelColor = isLightMode ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";
  const labelShadow = `0 0 16px ${hexWithAlpha(accentColor, 0.55)}, 0 0 4px ${hexWithAlpha(accentColor, 0.4)}`;

  return (
    <div
      className="prefecture-shape-map relative w-full min-h-[280px] rounded-xl overflow-hidden bg-transparent"
      style={{ aspectRatio: "1", maxWidth: "min(95vw, 640px)" }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
      />
      {loaded && numberPositions.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
        >
          {numberPositions.map(({ index, x, y }) => {
            const item = items[index];
            const count = item?.count ?? 0;
            return (
              <div
                key={index}
                className="flex items-center justify-center font-bold tabular-nums"
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                  minWidth: "1.25em",
                  fontSize: "clamp(10px, 2.2vw, 14px)",
                  color: labelColor,
                  textShadow: labelShadow,
                }}
              >
                {count}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
