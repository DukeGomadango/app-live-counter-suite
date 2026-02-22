/**
 * ルーレット用の型・デフォルト値・抽選ロジック
 */

export type RouletteStyle = "needle" | "casino";

export interface RouletteSettings {
    accentColor: string;
    orbIntensity: number; // 0-100
    style: RouletteStyle;
    /** 統計タブでバーチャートを表示する */
    statsShowBarChart?: boolean;
    /** 統計タブで円グラフを表示する */
    statsShowPieChart?: boolean;
}

export interface RouletteSlot {
    id: string;
    label: string;
}

/** 予想者（誰が・何を予想したか） */
export interface RoulettePredictor {
    id: string;
    name: string;
    prediction: string;
}

export function createDefaultPredictors(): RoulettePredictor[] {
    return [{ id: crypto.randomUUID?.() ?? "1", name: "プレイヤー1", prediction: "" }];
}

export const MAX_SLOTS = 1000;
export const DEFAULT_SLOT_COUNT = 13;

export function createDefaultRouletteSettings(): RouletteSettings {
    return {
        accentColor: "#a855f7",
        orbIntensity: 50,
        style: "needle",
        statsShowBarChart: true,
        statsShowPieChart: false,
    };
}

/** 1〜n の数字ラベルでスロット配列を生成 */
export function createDefaultSlots(n: number = DEFAULT_SLOT_COUNT): string[] {
    const cap = Math.min(Math.max(1, n), MAX_SLOTS);
    return Array.from({ length: cap }, (_, i) => String(i + 1));
}

/** string[] を RouletteSlot[] に変換（id は index ベース） */
export function slotsToItems(labels: string[]): RouletteSlot[] {
    return labels.map((label, i) => ({ id: `slot-${i}`, label }));
}

/** 0 〜 length-1 の一様乱数でインデックスを返す（抽選結果） */
export function pickRandomIndex(length: number): number {
    if (length <= 0) return 0;
    return Math.floor(Math.random() * length);
}

/** 保存したルーレットテンプレート */
export interface RouletteTemplate {
    id: string;
    name: string;
    slots: string[];
    settings?: Partial<RouletteSettings>;
    savedAt: number;
}

export function createRouletteTemplate(name: string, slots: string[], settings: RouletteSettings): RouletteTemplate {
    return {
        id: crypto.randomUUID?.() ?? `t-${Date.now()}`,
        name,
        slots: [...slots],
        settings: { ...settings },
        savedAt: Date.now(),
    };
}

/** 抽選結果の履歴（スロットインデックスの配列・新しい順で保持） */
export const ROULETTE_HISTORY_MAX = 500;

export function trimRouletteHistory(history: number[]): number[] {
    return history.length > ROULETTE_HISTORY_MAX ? history.slice(0, ROULETTE_HISTORY_MAX) : history;
}
