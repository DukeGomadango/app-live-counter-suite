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
    /** 新規品目追加時のデフォルト確率（%）。未設定時は1とみなす */
    defaultWeight?: number;
}

export interface GachaItem {
    id: string;
    name: string;
    rarityId: string;
    weight: number; // 排出重み（確率 = weight / 全weightの合計）
    /** ファイル配布連携: file-share-app 側のキャンペーンアセット ID */
    linkedAssetId?: string;
    imageUrl?: string;
    audioUrl?: string;
    costPrice?: number;
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
    /** ファイル配布連携: file-share-app のキャンペーン ID */
    linkedCampaignId?: string;
    pullPrice?: number;
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
    accentColor: string;      // ガチャUI配色（ボタン・演出・バッジなど）
    orbColor: string;         // 背景オーブの色
    orbIntensity: number;     // 背景オーブの濃さ 0-100
    showTitle: boolean;       // コンセプト名表示
    enableAnimation: boolean; // 演出ON/OFF
    /** 共有ツイートに付与する追加ハッシュタグ（スペース区切り）。#だんごツールは常に付与される */
    shareHashtags: string;
}

/** ファイル配布連携（dango link share）の接続情報。OAuth Consent で取得する。 */
export interface IntegrationConfig {
    /** 連携先の API ベースURL（例: "https://share.dango.tools"） */
    apiBaseUrl: string;
    /** OAuth Consent で取得した Integration Token */
    integrationToken: string;
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
        accentColor: DEFAULT_ACCENT_COLOR,
        orbColor: DEFAULT_ACCENT_COLOR,
        orbIntensity: 50,
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

/** ガチャ（プール）ごとの進行状況 */
export interface PlayerPoolState {
    totalPulls: number;
    pityCounter: number;
    pityReachCount: number;
    inventory?: Record<string, InventoryItem>;
}

/** 1回のガチャの要約（品目と数だけ。履歴用のコンパクト保存） */
export interface RunSummary {
    runIndex: number;
    timestamp: number;
    pullCount: number;
    items: { itemId: string; itemName: string; rarityId: string; count: number }[];
    /** どのガチャ（プール）の結果か。ガチャごとに履歴を分けるために使用 */
    poolId?: string;
    /** ガチャ名。削除されたガチャの履歴でも名称を表示するために保持 */
    poolName?: string;
}

export interface Player {
    id: string;
    name: string;
    results: GachaResult[];
    /** 過去のガチャ回ごとの要約（直近1回の生結果は results に保持） */
    runHistory?: RunSummary[];
    /** ガチャごとの進行状況（累計、天井など） */
    poolStates: Record<string, PlayerPoolState>;
    
    /** @deprecated use poolStates[poolId].inventory */
    inventory?: Record<string, InventoryItem>;
    /** @deprecated use poolStates[poolId].totalPulls */
    totalPulls: number;
    /** @deprecated use poolStates[poolId].pityCounter */
    pityCounter: number; 
    /** @deprecated use poolStates[poolId].pityReachCount */
    pityReachCount?: number;

    /** ファイル配布連携: 発行済みの Claim URL（ローカル保持） */
    issuedClaimUrl?: string;
    /** ファイル配布連携: 発行時のキャンペーンID */
    issuedCampaignId?: string;
    /** リンクシェア受取人名簿（recipients.id）。名簿先行運用で二重枠を減らす */
    linkedRecipientId?: string;
}

export type SortMode = "rarity-asc" | "rarity-desc" | "name" | "count";
export type FilterMode = "all" | string; // "all" or rarityId

// ========== デフォルトレア度 ==========

export const DEFAULT_RARITIES: RarityTier[] = [
    { id: "c", name: "C", color: "#9ca3af", glowColor: "rgba(156,163,175,0.3)", bgColor: "rgba(156,163,175,0.1)", sortOrder: 1, defaultWeight: 40 },
    { id: "uc", name: "UC", color: "#22c55e", glowColor: "rgba(34,197,94,0.3)", bgColor: "rgba(34,197,94,0.1)", sortOrder: 2, defaultWeight: 25 },
    { id: "r", name: "R", color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", bgColor: "rgba(59,130,246,0.1)", sortOrder: 3, defaultWeight: 15 },
    { id: "sr", name: "SR", color: "#a855f7", glowColor: "rgba(168,85,247,0.4)", bgColor: "rgba(168,85,247,0.15)", sortOrder: 4, defaultWeight: 10 },
    { id: "ssr", name: "SSR", color: "#f59e0b", glowColor: "rgba(245,158,11,0.5)", bgColor: "rgba(245,158,11,0.15)", sortOrder: 5, defaultWeight: 3 },
    { id: "ur", name: "UR", color: "#ef4444", glowColor: "rgba(239,68,68,0.6)", bgColor: "rgba(239,68,68,0.2)", sortOrder: 6, defaultWeight: 1 },
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
        pullPrice: 300,
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

/** 旧形式の link を削除し、原価・販売価格のデフォルト値をセットする（後方互換）。読み込み後に1回だけ呼ぶ */
export function migratePoolItemsForLink(pool: GachaPool): GachaPool {
    type LegacyItem = GachaItem & { link?: string };
    let changed = false;
    
    // 販売価格が未設定の場合は 300 円をセット
    if (pool.pullPrice === undefined) {
        changed = true;
    }
    const pullPrice = pool.pullPrice ?? 300;

    const items = pool.items.map((item): GachaItem => {
        const it = item as LegacyItem;
        let itemChanged = false;
        let cleanedItem = { ...it };

        if ("link" in it && it.link !== undefined) {
            changed = true;
            itemChanged = true;
            const { link: _dropped, ...rest } = it;
            void _dropped;
            cleanedItem = rest;
        }

        // 原価が未設定の場合は 0 円をセット
        if (cleanedItem.costPrice === undefined) {
            changed = true;
            itemChanged = true;
            cleanedItem.costPrice = 0;
        }

        return itemChanged ? cleanedItem : item;
    });

    return changed ? { ...pool, pullPrice, items } : pool;
}

/** プリセット・サンプル切り替え時用。pool をコピーするが id はそのままにし、同じガチャに戻ったときに履歴が表示されるようにする */
export function clonePoolKeepingIds(pool: GachaPool): GachaPool {
    return {
        ...pool,
        rarities: pool.rarities.map((r) => ({ ...r })),
        items: pool.items.map((it) => ({ ...it })),
    };
}

/** プリセット・サンプル読み込み用に pool をクローンし、id を新規発行する */
export function clonePoolWithNewIds(pool: GachaPool): GachaPool {
    const newId = () => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newRarities = pool.rarities.map((r) => ({ ...r, id: newId() }));
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
        poolStates: {},
        totalPulls: 0,
        pityCounter: 0,
        pityReachCount: 0,
    };
}

/**
 * 連携キャンペーンに紐づくプレイヤーのみ表示する。
 * issuedCampaignId 未設定の旧データは後方互換のため常に含める。
 */
export function playersForLinkedPool(all: Player[], pool: GachaPool): Player[] {
    const campaignId = pool.linkedCampaignId?.trim();
    if (!campaignId) return all;
    return all.filter((p) => !p.issuedCampaignId || p.issuedCampaignId === campaignId);
}

// ========== 確率計算 ==========

/** レア度内での品目確率を返す（各品目の weight / そのレア度の全品目 weight 合計 * 100）*/
export function calculateProbabilities(items: GachaItem[]): Map<string, number> {
    const probabilities = new Map<string, number>();
    if (items.length === 0) return probabilities;

    // レア度ごとに集計
    const rarityWeightSums = new Map<string, number>();
    for (const item of items) {
        rarityWeightSums.set(item.rarityId, (rarityWeightSums.get(item.rarityId) || 0) + item.weight);
    }

    for (const item of items) {
        const totalInRarity = rarityWeightSums.get(item.rarityId) || 0;
        if (totalInRarity === 0) continue;
        probabilities.set(item.id, (item.weight / totalInRarity) * 100);
    }
    return probabilities;
}

/** レア度の排出確率を返す（defaultWeight ベース。品目が存在するレア度のみ） */
export function getRarityProbabilities(items: GachaItem[], rarities: RarityTier[]): Map<string, number> {
    const result = new Map<string, number>();
    if (rarities.length === 0) return result;

    // 品目があるレア度だけ対象
    const raritiesWithItems = new Set<string>();
    for (const item of items) raritiesWithItems.add(item.rarityId);

    let totalWeight = 0;
    for (const r of rarities) {
        if (!raritiesWithItems.has(r.id)) continue;
        totalWeight += (r.defaultWeight ?? 1);
    }
    if (totalWeight === 0) return result;

    for (const r of rarities) {
        if (!raritiesWithItems.has(r.id)) {
            result.set(r.id, 0);
            continue;
        }
        result.set(r.id, ((r.defaultWeight ?? 1) / totalWeight) * 100);
    }
    return result;
}

/** 品目のグローバル排出確率を返す（= レア度確率 × レア度内確率） */
export function getGlobalProbabilities(items: GachaItem[], rarities: RarityTier[]): Map<string, number> {
    const rarityProbs = getRarityProbabilities(items, rarities);
    const withinRarity = calculateProbabilities(items);
    const result = new Map<string, number>();
    for (const item of items) {
        const rp = rarityProbs.get(item.rarityId) || 0;
        const wp = withinRarity.get(item.id) || 0;
        result.set(item.id, (rp / 100) * (wp / 100) * 100);
    }
    return result;
}

// ========== ガチャ抽選（2段階方式: レア度→品目） ==========

/** レア度を抽選 */
function pickRarity(rarities: RarityTier[], raritiesWithItems: Set<string>): RarityTier {
    const candidates = rarities.filter(r => raritiesWithItems.has(r.id));
    const totalWeight = candidates.reduce((sum, r) => sum + (r.defaultWeight ?? 1), 0);
    let rand = Math.random() * totalWeight;
    for (const r of candidates) {
        rand -= (r.defaultWeight ?? 1);
        if (rand <= 0) return r;
    }
    return candidates[candidates.length - 1]!;
}

/** レア度内での品目を抽選 */
function pickItemInRarity(items: GachaItem[], rarityId: string): GachaItem {
    const candidates = items.filter(it => it.rarityId === rarityId);
    const totalWeight = candidates.reduce((sum, it) => sum + it.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const item of candidates) {
        rand -= item.weight;
        if (rand <= 0) return item;
    }
    return candidates[candidates.length - 1]!;
}

export function performGachaPull(
    pool: GachaPool,
    count: number,
    player: Player,
): { results: GachaResult[]; updatedPlayer: Player; pityTriggered: boolean } {
    if (pool.items.length === 0) return { results: [], updatedPlayer: player, pityTriggered: false };

    // 品目があるレア度を列挙
    const raritiesWithItems = new Set<string>();
    for (const item of pool.items) raritiesWithItems.add(item.rarityId);

    if (raritiesWithItems.size === 0) return { results: [], updatedPlayer: player, pityTriggered: false };

    // 最高レア度を決定
    const highestRarity = [...pool.rarities].filter(r => raritiesWithItems.has(r.id)).sort((a, b) => b.sortOrder - a.sortOrder)[0];

    // 天井確定レア度のアイテム
    const pityRarityItems = pool.items.filter(item => item.rarityId === pool.pityGuaranteedRarityId);

    // 現在のプールのステートを取得または初期化
    const poolState: PlayerPoolState = player.poolStates?.[pool.id] || {
        totalPulls: 0,
        pityCounter: 0,
        pityReachCount: 0,
        inventory: {}
    };

    const results: GachaResult[] = [];
    const inventory: Record<string, InventoryItem> = poolState.inventory ? { ...poolState.inventory } : {};
    let pityCounter = poolState.pityCounter;
    let pityTriggered = false;
    const now = Date.now();
    const baseId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    for (let i = 0; i < count; i++) {
        pityCounter++;
        let picked: GachaItem;

        // 天井チェック
        if (pool.pityEnabled && pityCounter >= pool.pityThreshold && pityRarityItems.length > 0) {
            // 天井到達: 確定レア度からランダム
            picked = pickItemInRarity(pool.items, pool.pityGuaranteedRarityId);
            pityCounter = 0;
            pityTriggered = true;
        } else {
            // 2段階抽選: レア度 → 品目
            const rarity = pickRarity(pool.rarities, raritiesWithItems);
            picked = pickItemInRarity(pool.items, rarity.id);
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
        poolId: pool.id,
        poolName: pool.conceptName,
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
        poolStates: {
            ...(player.poolStates || {}),
            [pool.id]: {
                totalPulls: poolState.totalPulls + count,
                pityCounter,
                pityReachCount: (poolState.pityReachCount ?? 0) + (pityTriggered ? 1 : 0),
                inventory,
            }
        },
        // レガシーフィールドも一応更新（古いUIが参照している可能性を考慮）
        totalPulls: player.totalPulls + count,
        pityCounter,
        pityReachCount: (player.pityReachCount ?? 0) + (pityTriggered ? 1 : 0),
        inventory: inventory // 全体のインベントリとしても残す（オプション）
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
    playerName?: string,
): string {
    const organized = organizeResults(results, pool.rarities, "rarity-asc");
    const rarityMap = new Map(pool.rarities.map(r => [r.id, r.name]));

    const lines: string[] = [];
    if (pool.conceptName) {
        lines.push(pool.conceptName);
    }
    const trimmedPlayerName = playerName?.trim();
    if (trimmedPlayerName) {
        lines.push(`🎰 ${trimmedPlayerName} のガチャ結果`);
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

/** 結果本文なしの共有文（画像共有などヘッダ＋ハッシュタグだけ欲しいとき用） */
export function formatResultsHeaderForShare(
    pool: GachaPool,
    extraHashtags: string = DEFAULT_EXTRA_HASHTAG,
    playerName?: string,
): string {
    const lines: string[] = [];
    if (pool.conceptName) {
        lines.push(pool.conceptName);
    }
    const trimmedPlayerName = playerName?.trim();
    if (trimmedPlayerName) {
        lines.push(`🎰 ${trimmedPlayerName} のガチャ結果`);
    } else {
        lines.push("🎰 ガチャ結果");
    }
    const tagLine = ["#だんごツール", extraHashtags.trim()].filter(Boolean).join(" ");
    lines.push("");
    lines.push(tagLine);
    return lines.join("\n");
}

/** RunSummary 1件分を共有するためのテキスト（履歴用） */
export function formatRunSummaryForShare(
    run: RunSummary,
    pool: GachaPool,
    extraHashtags: string = DEFAULT_EXTRA_HASHTAG,
    playerName?: string,
): string {
    const rarityMap = new Map(pool.rarities.map(r => [r.id, r.name]));

    const lines: string[] = [];
    if (pool.conceptName) {
        lines.push(pool.conceptName);
    }
    const trimmedPlayerName = playerName?.trim();
    if (trimmedPlayerName) {
        lines.push(`🎰 ${trimmedPlayerName} のガチャ結果`);
    } else {
        lines.push("🎰 ガチャ結果");
    }
    lines.push(`（${run.pullCount}連 / ${run.runIndex}回目）`);
    lines.push("");

    const sortOrderMap = new Map(pool.rarities.map(r => [r.id, r.sortOrder]));
    const items = [...run.items].sort((a, b) => {
        const sa = sortOrderMap.get(a.rarityId) ?? 0;
        const sb = sortOrderMap.get(b.rarityId) ?? 0;
        if (sa !== sb) return sa - sb;
        return a.itemName.localeCompare(b.itemName);
    });

    for (const item of items) {
        const rarityName = rarityMap.get(item.rarityId) || "?";
        lines.push(`【${rarityName}】${item.itemName} ×${item.count}`);
    }

    const tagLine = ["#だんごツール", extraHashtags.trim()].filter(Boolean).join(" ");
    lines.push("");
    lines.push(tagLine);

    return lines.join("\n");
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
// さらに、レガシーデータを poolStates に移行する。
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

        // poolStates の初期化・移行
        const poolStates = p.poolStates || {};
        
        // もし poolStates が空でレガシーデータがある場合、runHistory を走査して振り分ける
        if (Object.keys(poolStates).length === 0 && runHistory.length > 0) {
            for (const run of runHistory) {
                const pid = run.poolId || "legacy-default";
                if (!poolStates[pid]) {
                    poolStates[pid] = { totalPulls: 0, pityCounter: 0, pityReachCount: 0, inventory: {} };
                }
                const st = poolStates[pid]!;
                st.totalPulls += run.pullCount;
                // 天井カウントの正確な復元は履歴からは難しいため、現在の値を仮に割り当てるか、0にする
                // ここではレガシーの pityCounter を "legacy-default" に割り当てる
                if (pid === "legacy-default" || pid === run.poolId) {
                    st.pityCounter = p.pityCounter || 0;
                    st.pityReachCount = p.pityReachCount || 0;
                }
                
                // インベントリの集計
                for (const it of run.items) {
                    if (!st.inventory) st.inventory = {};
                    if (!st.inventory[it.itemId]) {
                        st.inventory[it.itemId] = { count: 0, name: it.itemName, rarityId: it.rarityId };
                    }
                    st.inventory[it.itemId]!.count += it.count;
                }
            }
        }

        return {
            ...p,
            results,
            runHistory,
            poolStates,
            inventory,
            pityReachCount: p.pityReachCount ?? 0,
        };
    });
}

// ========== 比例配分（Proportional Scale）計算 ==========

export interface RatioItem {
    id: string;
    value: number;
}

/**
 * ロック状態を考慮して、数値を比例配分（Proportional Scale）して合計がちょうど 100 になるように調整する。
 * @param items 調整対象の配列（各要素は id と value を含む。value は百分率(%)）
 * @param lockedIds ロックされている項目の ID のセット
 * @param targetId 今回ユーザーが手動で変更した項目の ID
 * @param targetVal targetId に設定する新しい値
 */
export function distributePercentagesProportionally<T extends RatioItem>(
    items: T[],
    lockedIds: Set<string>,
    targetId?: string,
    targetVal?: number
): T[] {
    if (items.length === 0) return [];

    // 1. コピーを作成し、targetId がある場合はその値を更新・クランプ
    const result = items.map(item => ({ ...item }));
    
    if (targetId && targetVal !== undefined) {
        const clampedVal = Math.max(0, Math.min(100, targetVal));
        const targetItem = result.find(it => it.id === targetId);
        if (targetItem) {
            targetItem.value = clampedVal;
        }
    }

    // 2. ロックされた項目（ユーザーが編集中の targetId も実質的にロック対象）を特定
    const allLocked = new Set(lockedIds);
    if (targetId) {
        allLocked.add(targetId);
    }

    // 3. ロックされた項目の合計値を計算
    const lockedItems = result.filter(it => allLocked.has(it.id));
    const unlockedItems = result.filter(it => !allLocked.has(it.id));

    const totalLockedVal = lockedItems.reduce((sum, it) => sum + it.value, 0);

    // 4. ロック項目だけで 100% を超えている場合の処理
    if (totalLockedVal >= 100) {
        const activeTargetVal = targetId ? (result.find(it => it.id === targetId)?.value ?? 0) : 0;
        const otherLockedSum = totalLockedVal - activeTargetVal;

        if (otherLockedSum > 0) {
            const scale = (100 - activeTargetVal) / otherLockedSum;
            for (const it of result) {
                if (it.id === targetId) {
                    // targetId は保護
                } else if (allLocked.has(it.id)) {
                    it.value = Math.round(it.value * scale * 100000000) / 100000000;
                } else {
                    it.value = 0;
                }
            }
        } else {
            // 他のロック項目がない場合、targetId だけが100%になる
            for (const it of result) {
                if (it.id === targetId) {
                    it.value = 100;
                } else {
                    it.value = 0;
                }
            }
        }
    } else {
        // 5. ロック項目が 100% 未満の場合、残余分を未ロック項目で比例配分
        const remainingVal = 100 - totalLockedVal;
        const unlockedSum = unlockedItems.reduce((sum, it) => sum + it.value, 0);

        if (unlockedItems.length > 0) {
            if (unlockedSum > 0) {
                const scale = remainingVal / unlockedSum;
                for (const it of result) {
                    if (!allLocked.has(it.id)) {
                        it.value = Math.round(it.value * scale * 100000000) / 100000000;
                    }
                }
            } else {
                // 未ロック項目の合計値が 0 だった場合は均等に配分
                const equalShare = remainingVal / unlockedItems.length;
                for (const it of result) {
                    if (!allLocked.has(it.id)) {
                        it.value = Math.round(equalShare * 100000000) / 100000000;
                    }
                }
            }
        }
    }

    // 6. 丸め誤差の調整（合計が正確に 100 になるようにする）
    const currentSum = result.reduce((sum, it) => sum + it.value, 0);
    const diff = 100 - currentSum;
    
    if (Math.abs(diff) > 0.000000001) {
        // 調整可能な項目（できれば未ロックの最初の項目、なければ targetId 以外の最初の項目）を探す
        let adjustItem = result.find(it => !allLocked.has(it.id));
        if (!adjustItem && targetId) {
            adjustItem = result.find(it => it.id !== targetId);
        }
        if (!adjustItem) {
            adjustItem = result[0];
        }

        if (adjustItem) {
            adjustItem.value = Math.round((adjustItem.value + diff) * 100000000) / 100000000;
        }
    }

    // クランプして負の値を排除する
    for (const it of result) {
        it.value = Math.max(0, Math.min(100, it.value));
    }

    return result as T[];
}

