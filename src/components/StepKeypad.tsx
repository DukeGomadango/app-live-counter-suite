"use client";

import type { CardSize } from "@/components/SettingsModal";

/** ±5/±10 キーパッドのセル（ゴースト調・1パネル内グリッド） */
const KEYPAD_CELL_CLASS: Record<CardSize, string> = {
    S: "min-h-[22px] py-0.5 px-0.5 text-[10px]",
    M: "min-h-[22px] py-0.5 px-0.5 text-[10px]",
    L: "min-h-[26px] py-0.5 px-1 text-xs",
    XL: "min-h-[30px] py-1 px-1 text-sm",
};

/** 768px 以上で aspect-square 内に収めるためのコンパクトセル */
const KEYPAD_CELL_COMPACT: Record<CardSize, string> = {
    S: "min-h-[17px] py-0 px-0.5 text-[9px] leading-none",
    M: "min-h-[17px] py-0 px-0.5 text-[9px] leading-none",
    L: "min-h-[19px] py-0 px-0.5 text-[10px] leading-none",
    XL: "min-h-[21px] py-0 px-0.5 text-[10px] leading-none",
};

export type StepKeypadColumn = {
    plusLabel: string;
    minusLabel: string;
    plus: number;
    minus: number;
    disabledMinus: boolean;
};

/** ゴースト・キーパッド: 二重ガラスをやめカードのグラデを透かし、極細線で区切り。字は普段沈め、hover/active でだけ明るく */
export function StepKeypad({
    id,
    columns,
    onAdjustBy,
    isLightMode,
    cardSize,
    fullWidth,
    compact = false,
}: {
    id: string;
    columns: StepKeypadColumn[];
    onAdjustBy: (itemId: string, delta: number) => void;
    isLightMode: boolean;
    cardSize: CardSize;
    fullWidth: boolean;
    /** 正方形カード内用にセルを詰める（768px 以上） */
    compact?: boolean;
}) {
    const n = columns.length;
    if (n === 0) return null;

    const sizeTable = compact ? KEYPAD_CELL_COMPACT : KEYPAD_CELL_CLASS;
    const cellClass = sizeTable[cardSize] ?? sizeTable.M;
    const lineColor = isLightMode
        ? compact
            ? "rgba(0,0,0,0.09)"
            : "rgba(0,0,0,0.06)"
        : compact
          ? "rgba(255,255,255,0.09)"
          : "rgba(255,255,255,0.06)";

    const cellFont = compact ? "font-semibold" : "font-medium";
    const cellBase =
        `${cellClass} ${cellFont} tabular-nums flex items-center justify-center bg-transparent select-none touch-manipulation ` +
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500/40";

    const rowPlus = isLightMode
        ? "text-neutral-600/50 hover:text-neutral-800 hover:bg-black/[0.05] active:bg-black/[0.08] active:text-neutral-900"
        : "text-white/40 hover:text-white/90 hover:bg-white/10 active:bg-white/[0.14] active:text-white";

    const rowMinusDisabled = isLightMode
        ? "disabled:text-neutral-500/40 disabled:hover:bg-transparent disabled:hover:text-neutral-500/40 disabled:active:bg-transparent"
        : "disabled:text-white/20 disabled:hover:bg-transparent disabled:hover:text-white/20 disabled:active:bg-transparent";

    return (
        <div
            role="group"
            aria-label="まとめて増減（±5・±10 など）"
            className={`shrink-0 rounded-lg border-t bg-transparent ${isLightMode ? (compact ? "border-black/14" : "border-black/10") : compact ? "border-white/14" : "border-white/10"} ${fullWidth ? "w-full" : "w-auto"}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="grid overflow-hidden rounded-b-md"
                style={{
                    gridTemplateColumns: `repeat(${n}, minmax(${fullWidth ? "0" : compact ? "1.65rem" : "2rem"}, 1fr))`,
                }}
            >
                {columns.map((col, i) => (
                    <button
                        key={`plus-${col.plus}-${i}`}
                        type="button"
                        aria-label={`${col.plusLabel}する`}
                        className={`${cellBase} ${rowPlus}`}
                        style={{
                            borderRight: i < n - 1 ? `1px solid ${lineColor}` : undefined,
                            borderBottom: `1px solid ${lineColor}`,
                        }}
                        onClick={() => onAdjustBy(id, col.plus)}
                    >
                        {col.plusLabel}
                    </button>
                ))}
                {columns.map((col, i) => (
                    <button
                        key={`minus-${col.plus}-${i}`}
                        type="button"
                        aria-label={`${col.minusLabel}する`}
                        disabled={col.disabledMinus}
                        className={`${cellBase} ${rowPlus} ${rowMinusDisabled} disabled:cursor-not-allowed`}
                        style={{
                            borderRight: i < n - 1 ? `1px solid ${lineColor}` : undefined,
                        }}
                        onClick={() => onAdjustBy(id, col.minus)}
                    >
                        {col.minusLabel}
                    </button>
                ))}
            </div>
        </div>
    );
}
