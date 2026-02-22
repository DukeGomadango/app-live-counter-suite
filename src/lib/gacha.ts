import { DEFAULT_ACCENT_COLOR } from "./constants";
import { DEFAULT_EXTRA_HASHTAG } from "./site";

// ========== 型定義 ==========

export interface RarityTier {
    id: string;
    name: string;
    color: string;       // テキスト/ボーダー色
    glowColor: string;   // 発光エフェクト色
    bgColor: string;     // 背景色
    sortOrder: number;   // 低い = 低レア
}

export interface GachaItem {
    id: string;
    name: string;
    rarityId: string;
    weight: number; // 排出重み（確率 = weight / 全weightの合計）
}

export interface GachaPool {
    id: string;
    conceptName: string;
    rarities: RarityTier[];
    items: GachaItem[];
    pullCount: number;          // 1回あたりの排出数
    pityEnabled: boolean;
    pityThreshold: number;      // 天井到達回数
    pityGuaranteedRarityId: string; // 天井で確定するレア度ID
}

/** 保存したガチャ設定（プリセット） */
export interface GachaPoolPreset {
    id: string;
    name: string;
    pool: GachaPool;
    savedAt: number;
}

export interface GachaResult {
    resultId: string;  // 一意のID（キー重複防止）
    itemId: string;
    itemName: string;
    rarityId: string;
    timestamp: number;
}

// ========== 設定 ==========

export interface GachaSettings {
    bgColor: string;          // 背景配色
    /** 背景の濃さ 0=薄い 100=そのまま（ダークは黒、ライトは白でオーバーレイ） */
    bgIntensity?: number;
    accentColor: string;      // ガチャUI配色
    showTitle: boolean;       // コンセプト名表示
    enableAnimation: boolean; // 演出ON/OFF
    /** 共有ツイートに付与する追加ハッシュタグ（スペース区切り）。#だんごツールは常に付与される */
    shareHashtags: string;
}

export const GACHA_BG_COLORS = [
    { value: "default", label: "デフォルト", bg: "linear-gradient(135deg, #0a051e 0%, #1a0a3e 50%, #0a051e 100%)" },
    { value: "midnight", label: "ミッドナイト", bg: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)" },
    { value: "ocean", label: "オーシャン", bg: "linear-gradient(135deg, #042f2e 0%, #0c4a6e 50%, #042f2e 100%)" },
    { value: "forest", label: "フォレスト", bg: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)" },
    { value: "wine", label: "ワイン", bg: "linear-gradient(135deg, #2d0a0a 0%, #4c0519 50%, #2d0a0a 100%)" },
    { value: "sunset", label: "サンセット", bg: "linear-gradient(135deg, #1c0a05 0%, #431407 50%, #1c0a05 100%)" },
    { value: "sakura", label: "サクラ", bg: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)" },
    { value: "snow", label: "スノー", bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)" },
];

export const GACHA_ACCENT_COLORS = [
    { value: "#a855f7", label: "パープル" },
    { value: "#8b5cf6", label: "バイオレット" },
    { value: "#6366f1", label: "インディゴ" },
    { value: "#3b82f6", label: "ブルー" },
    { value: "#06b6d4", label: "シアン" },
    { value: "#14b8a6", label: "ティール" },
    { value: "#22c55e", label: "グリーン" },
    { value: "#eab308", label: "イエロー" },
    { value: "#f97316", label: "オレンジ" },
    { value: "#ef4444", label: "レッド" },
    { value: "#ec4899", label: "ピンク" },
    { value: "#f43f5e", label: "ローズ" },
];

export function createDefaultSettings(): GachaSettings {
    return {
        bgColor: "default",
        bgIntensity: 100,
        accentColor: DEFAULT_ACCENT_COLOR,
        showTitle: true,
        enableAnimation: true,
        shareHashtags: DEFAULT_EXTRA_HASHTAG,
    };
}

export interface InventoryItem {
    count: number;
    name: string;
    rarityId: string;
}

/** 1回のガチャの要約（品目と数だけ。履歴用のコンパクト保存） */
export interface RunSummary {
    runIndex: number;
    timestamp: number;
    pullCount: number;
    items: { itemId: string; itemName: string; rarityId: string; count: number }[];
}

export interface Player {
    id: string;
    name: string;
    results: GachaResult[];
    /** 過去のガチャ回ごとの要約（直近1回の生結果は results に保持） */
    runHistory?: RunSummary[];
    inventory?: Record<string, InventoryItem>;
    totalPulls: number;
    pityCounter: number; // 天井カウント (最高レア出たらリセット)
    /** 天井に到達した回数（天井発動のたびに+1） */
    pityReachCount?: number;
}

export type SortMode = "rarity-asc" | "rarity-desc" | "name" | "count";
export type FilterMode = "all" | string; // "all" or rarityId

// ========== デフォルトレア度 ==========

export const DEFAULT_RARITIES: RarityTier[] = [
    { id: "c", name: "C", color: "#9ca3af", glowColor: "rgba(156,163,175,0.3)", bgColor: "rgba(156,163,175,0.1)", sortOrder: 1 },
    { id: "uc", name: "UC", color: "#22c55e", glowColor: "rgba(34,197,94,0.3)", bgColor: "rgba(34,197,94,0.1)", sortOrder: 2 },
    { id: "r", name: "R", color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", bgColor: "rgba(59,130,246,0.1)", sortOrder: 3 },
    { id: "sr", name: "SR", color: "#a855f7", glowColor: "rgba(168,85,247,0.4)", bgColor: "rgba(168,85,247,0.15)", sortOrder: 4 },
    { id: "ssr", name: "SSR", color: "#f59e0b", glowColor: "rgba(245,158,11,0.5)", bgColor: "rgba(245,158,11,0.15)", sortOrder: 5 },
    { id: "ur", name: "UR", color: "#ef4444", glowColor: "rgba(239,68,68,0.6)", bgColor: "rgba(239,68,68,0.2)", sortOrder: 6 },
];

// ========== デフォルトプール ==========

export function createDefaultPool(): GachaPool {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `pool-${Date.now()}`,
        conceptName: "",
        rarities: DEFAULT_RARITIES.map(r => ({ ...r })),
        items: [],
        pullCount: 10,
        pityEnabled: false,
        pityThreshold: 100,
        pityGuaranteedRarityId: "ur",
    };
}

/** サンプルテンプレート（保存・読み込みタブで選択可能） */
export interface SampleTemplate {
    id: string;
    name: string;
    pool: GachaPool;
}

const _sampleRarities3: RarityTier[] = [
    { id: "n", name: "N", color: "#9ca3af", glowColor: "rgba(156,163,175,0.3)", bgColor: "rgba(156,163,175,0.1)", sortOrder: 1 },
    { id: "r", name: "R", color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", bgColor: "rgba(59,130,246,0.1)", sortOrder: 2 },
    { id: "sr", name: "SR", color: "#a855f7", glowColor: "rgba(168,85,247,0.4)", bgColor: "rgba(168,85,247,0.15)", sortOrder: 3 },
];

/** プリセット・サンプル読み込み用に pool をクローンし、id を新規発行する */
export function clonePoolWithNewIds(pool: GachaPool): GachaPool {
    const newId = () => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newRarities = pool.rarities.map((r, i) => ({ ...r, id: newId() }));
    const oldToNewRarity = new Map(pool.rarities.map((r, i) => [r.id, newRarities[i]!.id]));
    const newItems = pool.items.map(it => ({
        ...it,
        id: newId(),
        rarityId: oldToNewRarity.get(it.rarityId) ?? newRarities[0]?.id ?? it.rarityId,
    }));
    return {
        ...pool,
        id: newId(),
        rarities: newRarities,
        items: newItems,
        pityGuaranteedRarityId: oldToNewRarity.get(pool.pityGuaranteedRarityId) ?? newRarities[newRarities.length - 1]?.id ?? pool.pityGuaranteedRarityId,
    };
}

export function getSampleTemplates(): SampleTemplate[] {
    const r1 = [..._sampleRarities3];
    const pool1: GachaPool = {
        id: "sample-1",
        conceptName: "初回10万",
        rarities: r1,
        items: [{ id: "sample-1-item", name: "景品", rarityId: r1[0]!.id, weight: 1 }],
        pullCount: 100000,
        pityEnabled: false,
        pityThreshold: 100,
        pityGuaranteedRarityId: r1[r1.length - 1]!.id,
    };
    const r2 = [..._sampleRarities3];
    const pool2: GachaPool = {
        id: "sample-2",
        conceptName: "シンプル N/R/SR",
        rarities: r2,
        items: [
            { id: "s2-1", name: "ノーマル景品", rarityId: r2[0]!.id, weight: 70 },
            { id: "s2-2", name: "レア景品", rarityId: r2[1]!.id, weight: 25 },
            { id: "s2-3", name: "SR景品", rarityId: r2[2]!.id, weight: 5 },
        ],
        pullCount: 10,
        pityEnabled: false,
        pityThreshold: 100,
        pityGuaranteedRarityId: r2[2]!.id,
    };
    const r3 = DEFAULT_RARITIES.map(r => ({ ...r }));
    const pool3: GachaPool = {
        id: "sample-3",
        conceptName: "フルレア度",
        rarities: r3,
        items: r3.map((rar, i) => ({ id: `s3-${i}`, name: `${rar.name}景品`, rarityId: rar.id, weight: Math.max(1, 10 - i) })),
        pullCount: 10,
        pityEnabled: true,
        pityThreshold: 100,
        pityGuaranteedRarityId: "ur",
    };
    return [
        { id: "tpl-1", name: "初回10万", pool: pool1 },
        { id: "tpl-2", name: "シンプル（N/R/SR）", pool: pool2 },
        { id: "tpl-3", name: "フルレア度＋天井", pool: pool3 },
    ];
}

export function createDefaultPlayer(name: string): Player {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        results: [],
        runHistory: [],
        totalPulls: 0,
        pityCounter: 0,
        pityReachCount: 0,
    };
}

// ========== 確率計算 ==========

export function calculateProbabilities(items: GachaItem[]): Map<string, number> {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const probabilities = new Map<string, number>();
    if (totalWeight === 0) return probabilities;
    for (const item of items) {
        probabilities.set(item.id, (item.weight / totalWeight) * 100);
    }
    return probabilities;
}

export function getRarityProbabilities(items: GachaItem[], rarities: RarityTier[]): Map<string, number> {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const rarityWeights = new Map<string, number>();
    if (totalWeight === 0) return rarityWeights;
    for (const item of items) {
        rarityWeights.set(item.rarityId, (rarityWeights.get(item.rarityId) || 0) + item.weight);
    }
    const result = new Map<string, number>();
    for (const r of rarities) {
        const w = rarityWeights.get(r.id) || 0;
        result.set(r.id, (w / totalWeight) * 100);
    }
    return result;
}

// ========== ガチャ抽選 ==========

function pickOne(items: GachaItem[], totalWeight: number): GachaItem {
    let rand = Math.random() * totalWeight;
    for (const item of items) {
        rand -= item.weight;
        if (rand <= 0) return item;
    }
    return items[items.length - 1]!; // fallback
}

export function performGachaPull(
    pool: GachaPool,
    count: number,
    player: Player,
): { results: GachaResult[]; updatedPlayer: Player; pityTriggered: boolean } {
    if (pool.items.length === 0) return { results: [], updatedPlayer: player, pityTriggered: false };

    const totalWeight = pool.items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return { results: [], updatedPlayer: player, pityTriggered: false };

    // 最高レア度を決定
    const highestRarity = [...pool.rarities].sort((a, b) => b.sortOrder - a.sortOrder)[0];
    const highestRarityItems = pool.items.filter(item => item.rarityId === highestRarity?.id);

    // 天井確定レア度のアイテム
    const pityRarityItems = pool.items.filter(item => item.rarityId === pool.pityGuaranteedRarityId);

    const results: GachaResult[] = [];
    const inventory: Record<string, InventoryItem> = player.inventory ? { ...player.inventory } : {};
    let pityCounter = player.pityCounter;
    let pityTriggered = false;
    const now = Date.now();
    const baseId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    for (let i = 0; i < count; i++) {
        pityCounter++;
        let picked: GachaItem;

        // 天井チェック
        if (pool.pityEnabled && pityCounter >= pool.pityThreshold && pityRarityItems.length > 0) {
            // 天井到達: 確定レア度からランダム
            picked = pityRarityItems[Math.floor(Math.random() * pityRarityItems.length)]!;
            pityCounter = 0;
            pityTriggered = true;
        } else {
            picked = pickOne(pool.items, totalWeight);
            // 最高レアが出たらピティカウントリセット
            if (picked.rarityId === highestRarity?.id) {
                pityCounter = 0;
            }
        }

        results.push({
            resultId: `r-${now}-${baseId}-${i}`,
            itemId: picked.id,
            itemName: picked.name,
            rarityId: picked.rarityId,
            timestamp: now + i,
        });

        // インベントリの更新
        if (!inventory[picked.id]) {
            inventory[picked.id] = { count: 0, name: picked.name, rarityId: picked.rarityId };
        }
        inventory[picked.id]!.count += 1;
    }

    const runHistory = player.runHistory ?? [];
    const runIndex = runHistory.length + 1;
    const summaryItems = organizeResults(results, pool.rarities, "rarity-asc");
    const runSummary: RunSummary = {
        runIndex,
        timestamp: now,
        pullCount: count,
        items: summaryItems.map(o => ({ itemId: o.itemId, itemName: o.itemName, rarityId: o.rarityId, count: o.count })),
    };

    // localStorage の容量制限を避けるため、件数が多すぎる場合は生結果を保存しない（runHistory に集計は残る）
    const MAX_RESULTS_TO_STORE = 8000;
    const resultsToStore = results.length > MAX_RESULTS_TO_STORE ? [] : results;
    // 履歴の最大件数（古い run を削除）
    const MAX_RUN_HISTORY = 100;
    const newRunHistory = [...runHistory, runSummary];
    const trimmedRunHistory = newRunHistory.length > MAX_RUN_HISTORY
        ? newRunHistory.slice(-MAX_RUN_HISTORY)
        : newRunHistory;

    const updatedPlayer: Player = {
        ...player,
        results: resultsToStore,
        runHistory: trimmedRunHistory,
        inventory,
        totalPulls: player.totalPulls + count,
        pityCounter,
        pityReachCount: (player.pityReachCount ?? 0) + (pityTriggered ? 1 : 0),
    };

    return { results, updatedPlayer, pityTriggered };
}

// ========== 結果の整頓 ==========

export interface OrganizedResult {
    itemId: string;
    itemName: string;
    rarityId: string;
    count: number;
}

export function organizeResults(
    results: GachaResult[],
    rarities: RarityTier[],
    sortMode: SortMode = "rarity-asc",
    filterRarityId: FilterMode = "all",
): OrganizedResult[] {
    // フィルタ
    let filtered = results;
    if (filterRarityId !== "all") {
        filtered = results.filter(r => r.rarityId === filterRarityId);
    }

    // 集計
    const countMap = new Map<string, OrganizedResult>();
    for (const r of filtered) {
        const key = r.itemId;
        if (countMap.has(key)) {
            countMap.get(key)!.count++;
        } else {
            countMap.set(key, { itemId: r.itemId, itemName: r.itemName, rarityId: r.rarityId, count: 1 });
        }
    }

    const organized = Array.from(countMap.values());

    // ソート順マップ
    const sortOrderMap = new Map(rarities.map(r => [r.id, r.sortOrder]));

    switch (sortMode) {
        case "rarity-asc":
            organized.sort((a, b) => (sortOrderMap.get(a.rarityId) || 0) - (sortOrderMap.get(b.rarityId) || 0) || a.itemName.localeCompare(b.itemName));
            break;
        case "rarity-desc":
            organized.sort((a, b) => (sortOrderMap.get(b.rarityId) || 0) - (sortOrderMap.get(a.rarityId) || 0) || a.itemName.localeCompare(b.itemName));
            break;
        case "name":
            organized.sort((a, b) => a.itemName.localeCompare(b.itemName));
            break;
        case "count":
            organized.sort((a, b) => b.count - a.count || a.itemName.localeCompare(b.itemName));
            break;
    }

    return organized;
}

// 演出用: 低レア→高レアの順にソート
export function sortResultsForPresentation(
    results: GachaResult[],
    rarities: RarityTier[],
): GachaResult[] {
    const sortOrderMap = new Map(rarities.map(r => [r.id, r.sortOrder]));
    return [...results].sort((a, b) => (sortOrderMap.get(a.rarityId) || 0) - (sortOrderMap.get(b.rarityId) || 0));
}

// 最高レア度が結果に含まれるか
export function containsHighestRarity(
    results: GachaResult[],
    rarities: RarityTier[],
): boolean {
    if (rarities.length === 0) return false;
    const highest = [...rarities].sort((a, b) => b.sortOrder - a.sortOrder)[0];
    return results.some(r => r.rarityId === highest?.id);
}

// ========== SNS共有 ==========

/** 追加ハッシュタグ（スペース区切り）。#だんごツールは常に先頭で付与される */
export function formatResultsForShare(
    results: GachaResult[],
    pool: GachaPool,
    extraHashtags: string = DEFAULT_EXTRA_HASHTAG,
): string {
    const organized = organizeResults(results, pool.rarities, "rarity-asc");
    const rarityMap = new Map(pool.rarities.map(r => [r.id, r.name]));

    const lines: string[] = [];
    if (pool.conceptName) {
        lines.push(`🎰 ${pool.conceptName} ガチャ結果`);
    } else {
        lines.push("🎰 ガチャ結果");
    }
    lines.push(`（${results.length}連）`);
    lines.push("");

    for (const item of organized) {
        const rarityName = rarityMap.get(item.rarityId) || "?";
        lines.push(`【${rarityName}】${item.itemName} ×${item.count}`);
    }

    const tagLine = ["#だんごツール", extraHashtags.trim()].filter(Boolean).join(" ");
    lines.push("");
    lines.push(tagLine);

    return lines.join("\n");
}

export function generateShareUrl(text: string): string {
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// ========== ID生成 ==========

export function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ========== レガシーデータ互換 ==========

// resultIdがない古いGachaResultデータに対してresultIdを付与する
export function ensureResultIds(results: GachaResult[]): GachaResult[] {
    return results.map((r, i) => {
        if (r.resultId) return r;
        return { ...r, resultId: `legacy-${r.timestamp || Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` };
    });
}

// Playerのresultsに対してresultIdを付与し、inventoryを初期化する。runHistoryがない既存データは1回分のRunSummaryにまとめる。
export function migratePlayerData(players: Player[]): Player[] {
    return players.map(p => {
        const inventory: Record<string, InventoryItem> = p.inventory ? { ...p.inventory } : {};
        if (!p.inventory && p.results) {
            for (const r of p.results) {
                if (!inventory[r.itemId]) {
                    inventory[r.itemId] = { count: 0, name: r.itemName, rarityId: r.rarityId };
                }
                inventory[r.itemId]!.count += 1;
            }
        }
        const results = ensureResultIds(p.results);
        let runHistory = p.runHistory;
        if (!runHistory || runHistory.length === 0) {
            if (results.length > 0) {
                const organized = organizeResults(results, [], "rarity-asc");
                runHistory = [{
                    runIndex: 1,
                    timestamp: results[0]?.timestamp ?? Date.now(),
                    pullCount: results.length,
                    items: organized.map(o => ({ itemId: o.itemId, itemName: o.itemName, rarityId: o.rarityId, count: o.count })),
                }];
            } else {
                runHistory = [];
            }
        }
        return {
            ...p,
            results,
            runHistory,
            inventory,
            pityReachCount: p.pityReachCount ?? 0,
        };
    });
}
