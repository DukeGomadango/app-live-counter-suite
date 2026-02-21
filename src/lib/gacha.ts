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

export interface GachaResult {
    itemId: string;
    itemName: string;
    rarityId: string;
    timestamp: number;
}

export interface Player {
    id: string;
    name: string;
    results: GachaResult[];
    totalPulls: number;
    pityCounter: number; // 天井カウント (最高レア出たらリセット)
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

export function createDefaultPlayer(name: string): Player {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        results: [],
        totalPulls: 0,
        pityCounter: 0,
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
    return items[items.length - 1]; // fallback
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
    let pityCounter = player.pityCounter;
    let pityTriggered = false;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        pityCounter++;
        let picked: GachaItem;

        // 天井チェック
        if (pool.pityEnabled && pityCounter >= pool.pityThreshold && pityRarityItems.length > 0) {
            // 天井到達: 確定レア度からランダム
            picked = pityRarityItems[Math.floor(Math.random() * pityRarityItems.length)];
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
            itemId: picked.id,
            itemName: picked.name,
            rarityId: picked.rarityId,
            timestamp: now + i, // 順序保持用
        });
    }

    const updatedPlayer: Player = {
        ...player,
        results: [...player.results, ...results],
        totalPulls: player.totalPulls + count,
        pityCounter,
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
    return results.some(r => r.rarityId === highest.id);
}

// ========== SNS共有 ==========

export function formatResultsForShare(
    results: GachaResult[],
    pool: GachaPool,
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

    lines.push("");
    lines.push("#ライブカウンター #ガチャ");

    return lines.join("\n");
}

export function generateShareUrl(text: string): string {
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// ========== ID生成 ==========

export function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
