/**
 * ルーレット用の型・デフォルト値・抽選ロジック
 */

export type RouletteStyle = "minimal" | "casino" | "classic" | "orbit";

export interface RouletteSettings {
    accentColor: string;
    orbIntensity: number; // 0-100
    style: RouletteStyle;
    /** 背景色レイヤーを表示する */
    backgroundEnabled?: boolean;
    /** 背景色（backgroundEnabled 時）。例: #1a1a2e */
    backgroundColor?: string;
    /** 背景の不透明度 0–100 */
    backgroundOpacity?: number;
    /** 画面上に企画名（ルーレット名）を表示する */
    showProjectName?: boolean;
    /** 企画名（ルーレット名） */
    projectName?: string;
    /** 企画名の位置（盤左上基準の px）。D&Dで変更可能 */
    projectNamePosition?: { x: number; y: number };
    /** 盤の一番下（6時方向）に表示するスロットの0-basedインデックス。未設定時は0（1番目） */
    wheelOffsetIndex?: number;
    /** この数より多いスロットで簡易表示（ラベル非表示）。未設定時は 80 */
    maxVisibleLabels?: number;
    /** 統計タブでバーチャートを表示する */
    statsShowBarChart?: boolean;
    /** 統計タブで円グラフを表示する */
    statsShowPieChart?: boolean;
    /** 演出量: high=回転長め・当たり演出派手 / low=回転短め・当たり演出控えめ */
    effectLevel?: "high" | "low";
    /** 予想入力: default=スロット選択 / highLow=ハイ・ロー・中心（真ん中=中心） */
    predictorMode?: "default" | "highLow";
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
    /** 抽選に参加するか。未指定時は true */
    participating?: boolean;
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
        style: "minimal",
        maxVisibleLabels: 80,
        showProjectName: false,
        projectName: "",
        statsShowBarChart: true,
        statsShowPieChart: false,
        effectLevel: "low",
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

/** ハイアンドロー: 真ん中=中心、前半=ロー、後半=ハイ（スロット数は任意） */
export type HighLowZone = "high" | "low" | "6pin";

export function getHighLowZone(resultIndex: number, slotCount: number): HighLowZone | null {
    if (slotCount < 1 || resultIndex < 0 || resultIndex >= slotCount) return null;
    const N = slotCount;
    if (N % 2 === 1) {
        const center = (N - 1) / 2;
        if (resultIndex < center) return "low";
        if (resultIndex === center) return "6pin";
        return "high";
    }
    const center0 = N / 2 - 1;
    const center1 = N / 2;
    if (resultIndex < center0) return "low";
    if (resultIndex === center0 || resultIndex === center1) return "6pin";
    return "high";
}

/** ハイアンドローモードで予想として有効な値 */
export const HIGH_LOW_PREDICTIONS: HighLowZone[] = ["low", "6pin", "high"];

/** サンプルテンプレート（読み込み専用・コード上で固定） */
export function getSampleRouletteTemplates(): RouletteTemplate[] {
    return [
        {
            id: "sample-hilo",
            name: "1〜13 ハイアンドロー",
            slots: Array.from({ length: 13 }, (_, i) => String(i + 1)),
            settings: { predictorMode: "highLow" },
            savedAt: 0,
        },
        {
            id: "sample-omikuji",
            name: "今日の運勢",
            slots: Array.from({ length: 15 }, (_, i) => ["大吉", "吉", "中吉", "小吉", "凶"][i % 5]!),
            savedAt: 0,
        },
        {
            id: "sample-janken",
            name: "じゃんけん",
            slots: Array.from({ length: 15 }, (_, i) => ["グー", "チョキ", "パー"][i % 3]!),
            savedAt: 0,
        },
        {
            id: "sample-directions",
            name: "東西南北",
            slots: ["東", "西", "南", "北"],
            savedAt: 0,
        },
        {
            id: "sample-atarihazure",
            name: "当たりはずれ",
            slots: ["あたり", "はずれ", "あたり", "はずれ", "あたり", "はずれ", "あたり", "はずれ"],
            savedAt: 0,
        },
    ];
}

/** 抽選結果の履歴（スロットインデックスの配列・新しい順で保持） */
export const ROULETTE_HISTORY_MAX = 500;

export function trimRouletteHistory(history: number[]): number[] {
    return history.length > ROULETTE_HISTORY_MAX ? history.slice(0, ROULETTE_HISTORY_MAX) : history;
}

/** 1回の抽選で「誰が当たったか」の記録（新しい順） */
export interface RouletteHitHistoryEntry {
    resultLabel: string;
    hitPredictorIds: string[];
}

export const ROULETTE_HIT_HISTORY_MAX = 500;

export function trimRouletteHitHistory(entries: RouletteHitHistoryEntry[]): RouletteHitHistoryEntry[] {
    return entries.length > ROULETTE_HIT_HISTORY_MAX ? entries.slice(0, ROULETTE_HIT_HISTORY_MAX) : entries;
}
