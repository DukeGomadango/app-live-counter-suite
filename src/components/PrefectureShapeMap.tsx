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

type NumberPosition = { index: number; x: number; y: number };

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
    const rect = el.getBoundingClientRect();
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
    setError(null);
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
    const strokeColor = isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
    const teardowns: (() => void)[] = [];

    prefectures.forEach((el) => {
      const code = el.getAttribute("data-code");
      const index = code != null ? codeToIndex(code) : -1;
      const item = index >= 0 && index < items.length ? items[index] : undefined;
      if (!item) return;

      el.style.fill = item.color;
      el.style.stroke = strokeColor;
      el.style.cursor = "pointer";
      el.style.transition = "filter 0.15s ease";
      el.setAttribute("role", "button");
      el.setAttribute("tabIndex", "0");
      el.setAttribute("aria-label", `${item.label}（${item.count}件）クリックで増やす`);

      const onPointerEnter = () => {
        el.style.filter = "brightness(1.2)";
      };
      const onPointerLeave = () => {
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
  }, [loaded, items, onIncrement, isLightMode]);

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

  const textColor = isLightMode ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const textShadow = isLightMode
    ? "0 0 2px #fff, 0 1px 2px rgba(0,0,0,0.3)"
    : "0 0 2px #000, 0 1px 2px rgba(0,0,0,0.5)";

  return (
    <div
      className="prefecture-shape-map relative w-full min-h-[280px] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800"
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
                  color: textColor,
                  textShadow,
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
