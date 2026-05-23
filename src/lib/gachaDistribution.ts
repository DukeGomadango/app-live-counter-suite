/**
 * ガチャ × ファイル配布連携：API呼び出しロジック。
 *
 * file-share-app の外部API を利用して、プレイヤーの受取人スロット
 * （Recipient Slot）を作成し、Claim URL を取得する。
 */

import type { Player, GachaPool, IntegrationConfig } from "./gacha";
import { FOCUS_EXTERNAL_TX_QUERY } from "./integrationConstants";

// ========== 型定義 ==========

/** file-share-app の外部API から返却されるキャンペーン情報 */
export interface ExternalCampaign {
    id: string;
    name: string;
    status: string;
}

/** キャンペーン内のアセット情報 */
export interface ExternalAsset {
    id: string;
    label: string | null;
    /** 連携 API が解決済みで返す表示名（label / ライブラリ名のフォールバック後） */
    displayName?: string | null;
    asset_url: string | null;
    gachaRarityId?: string | null;
}

const EXTERNAL_ASSET_UNTITLED = "無題のアイテム";

/** 外部アセットの表示名（displayName 優先、後方互換で label） */
export function resolveExternalAssetDisplayName(
    asset: Pick<ExternalAsset, "displayName" | "label">
): string {
    const dn = asset.displayName?.trim();
    if (dn) return dn;
    const lb = asset.label?.trim();
    if (lb) return lb;
    return EXTERNAL_ASSET_UNTITLED;
}

/** gacha-config items の表示名 */
export function resolveExternalGachaItemDisplayName(item: {
    displayName?: string | null;
    label?: string | null;
}): string {
    const dn = item.displayName?.trim();
    if (dn) return dn;
    const lb = item.label?.trim();
    if (lb) return lb;
    return EXTERNAL_ASSET_UNTITLED;
}

/** ガチャ構成情報のレスポンス */
export interface ExternalGachaRarity {
    id: string;
    name: string;
    probability: number;
    color: string;
}

export interface ExternalGachaConfigResponse {
    gachaConfig: {
        rarities: ExternalGachaRarity[];
    } | null;
    items: {
        id: string;
        label: string | null;
        displayName?: string | null;
        rarityId: string | null;
    }[];
}

/** recipient-slots API のレスポンス */
export interface RecipientSlotResult {
    ok: boolean;
    claim_url?: string;
    reception_url?: string;
    delivery_mode?: "reception" | "per_link";
    claim_id?: string;
    slot_id?: string;
    recipient_id?: string | null;
    external_transaction_id?: string;
    linked_asset_count?: number;
    slot_status?: "ready" | "unlinked";
    resolved_existing?: boolean;
    error?: string;
    message?: string;
}

export type PoolMappingStats = {
    itemCount: number;
    mappedCount: number;
    unmappedCount: number;
};

export type PlayerDistributionStats = {
    /** POST する campaign_asset_ids の件数 */
    assetCount: number;
    /** 当選品目の合計個数（inventory） */
    totalWinCount: number;
    /** ファイルマッピング済み品目の当選個数 */
    mappedWinCount: number;
};

export interface ExternalRegistryRecipient {
    id: string;
    name: string;
}

export type RecipientSlotLinkStatus = "linked" | "missing" | "none";

export type SuccessfulRecipientSlotResult = RecipientSlotResult & {
    ok: true;
    slot_id: string;
};

/** issueClaimForPlayer 成功時の結果を Player に反映する */
export function mergePlayerWithRecipientSlotResult(
    player: Player,
    result: SuccessfulRecipientSlotResult,
    campaignId: string | undefined
): Player {
    return {
        ...player,
        issuedSlotId: result.slot_id,
        ...(result.claim_url ? { issuedClaimUrl: result.claim_url } : {}),
        issuedCampaignId: campaignId ?? player.issuedCampaignId,
        ...(result.recipient_id ? { linkedRecipientId: result.recipient_id } : {}),
    };
}

export interface RecipientSlotStatusResult {
    ok: boolean;
    linked: boolean;
    claim_url?: string;
    reception_url?: string;
    delivery_mode?: "reception" | "per_link";
    recipient_id?: string | null;
}

// ========== API ヘルパー ==========

/** 外部連携 API のエラー（HTTP ステータス・error コード付き） */
export class IntegrationApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "IntegrationApiError";
        this.status = status;
        this.code = code;
    }
}

/** UI 向けに連携 API エラーを平易化 */
export function formatIntegrationApiErrorMessage(err: unknown): string {
    if (err instanceof IntegrationApiError) {
        if (err.status === 401 || err.code === "unauthorized") {
            return "だんごシェアリンクとの接続が無効です。配布タブから再連携してください。";
        }
        if (err.code === "integration_paused") {
            return err.message;
        }
        if (err.status === 403) {
            return err.message || "権限がありません。だんごシェアリンクで再連携してください。";
        }
        if (err.status === 429 || err.code === "rate_limited") {
            return "リクエストが多すぎます。しばらく待ってから再試行してください。";
        }
        return err.message;
    }
    if (err instanceof Error) return err.message;
    return "だんごシェアリンクでエラーが発生しました";
}

async function assertIntegrationOk(res: Response): Promise<void> {
    if (res.ok) return;
    const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
    };
    throw new IntegrationApiError(
        res.status,
        data.error ?? "api_error",
        data.message ?? `HTTP ${res.status}`
    );
}

/** 認証ヘッダーを構築する共通ヘルパー */
function authHeaders(config: IntegrationConfig): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.integrationToken}`,
    };
}

/** だんごシェアリンクのキャンペーン管理画面 URL（マージ確認用フォーカス付き可） */
export function buildLinkShareCampaignUrl(
    config: IntegrationConfig,
    campaignId: string,
    opts?: { focusExternalTx?: string }
): string {
    const base = config.apiBaseUrl.replace(/\/$/, "");
    const u = new URL(`${base}/campaigns/${campaignId}`);
    if (opts?.focusExternalTx?.trim()) {
        u.searchParams.set(FOCUS_EXTERNAL_TX_QUERY, opts.focusExternalTx.trim());
    }
    return u.toString();
}

// ========== 受取人名簿 ==========

/** ワークスペースの受取人名簿（最小フィールド） */
export async function fetchExternalRecipients(
    config: IntegrationConfig
): Promise<ExternalRegistryRecipient[]> {
    if (!config.integrationToken) return [];
    try {
        const res = await fetch(`${config.apiBaseUrl}/api/v1/external/recipients`, {
            headers: authHeaders(config),
        });
        await assertIntegrationOk(res);
        const data = (await res.json()) as { recipients?: ExternalRegistryRecipient[] };
        return data.recipients ?? [];
    } catch (e) {
        if (e instanceof IntegrationApiError) throw e;
        return [];
    }
}

/** 冪等キーでだんごシェアリンク側の Claim がまだあるか確認 */
export async function fetchRecipientSlotStatus(
    campaignId: string,
    externalTransactionId: string,
    config: IntegrationConfig
): Promise<RecipientSlotStatusResult> {
    if (!config.integrationToken) {
        return { ok: false, linked: false };
    }
    try {
        const url = new URL(
            `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/recipient-slots`
        );
        url.searchParams.set("external_transaction_id", externalTransactionId);
        const res = await fetch(url.toString(), { headers: authHeaders(config) });
        const data = (await res.json().catch(() => ({}))) as RecipientSlotStatusResult & {
            error?: string;
        };
        if (!res.ok) {
            return { ok: false, linked: false };
        }
        return {
            ok: true,
            linked: !!data.linked,
            claim_url: data.claim_url,
            reception_url: data.reception_url,
            delivery_mode: data.delivery_mode,
            recipient_id: data.recipient_id,
        };
    } catch {
        return { ok: false, linked: false };
    }
}

// ========== 連携テスト ==========

/**
 * Integration Token の有効性を確認する。
 * キャンペーン一覧の取得を試行し、成功すれば true を返す。
 */
export async function testConnection(
    config: IntegrationConfig
): Promise<boolean> {
    try {
        const res = await fetch(
            `${config.apiBaseUrl}/api/v1/external/campaigns`,
            { headers: authHeaders(config) }
        );
        return res.ok;
    } catch {
        return false;
    }
}

// ========== キャンペーン一覧 ==========

/**
 * 連携先ワークスペースのキャンペーン一覧を取得する。
 */
export async function fetchExternalCampaigns(
    config: IntegrationConfig
): Promise<ExternalCampaign[]> {
    const res = await fetch(
        `${config.apiBaseUrl}/api/v1/external/campaigns`,
        { headers: authHeaders(config) }
    );
    await assertIntegrationOk(res);
    return res.json() as Promise<ExternalCampaign[]>;
}

// ========== キャンペーン内アセット一覧 ==========

/**
 * 連携先キャンペーン内のアセット一覧を取得する。
 */
export async function fetchExternalAssets(
    campaignId: string,
    config: IntegrationConfig
): Promise<ExternalAsset[]> {
    const res = await fetch(
        `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/assets`,
        { headers: authHeaders(config) }
    );
    await assertIntegrationOk(res);
    const data = await res.json();
    return data.assets as ExternalAsset[];
}

/** キャンペーンに紐付いているアセット一覧を取得 */
export async function fetchCampaignAssets(campaignId: string, config: IntegrationConfig): Promise<ExternalAsset[]> {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/external/campaigns/${campaignId}/assets`, {
        headers: authHeaders(config),
    });
    if (!res.ok) throw new Error("アセットの取得に失敗しました");
    const data = await res.json();
    return data.assets;
}

/**
 * 連携先キャンペーンのガチャ構成（レア度設定とアイテム紐付け）を取得する。
 */
export async function fetchExternalGachaConfig(
    campaignId: string,
    config: IntegrationConfig
): Promise<ExternalGachaConfigResponse> {
    const res = await fetch(
        `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/gacha-config`,
        { headers: authHeaders(config) }
    );
    await assertIntegrationOk(res);
    return res.json() as Promise<ExternalGachaConfigResponse>;
}

/** アップロードURLを取得 */
export async function getAssetUploadUrl(campaignId: string, filename: string, size: number, mimeType: string, config: IntegrationConfig) {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/external/campaigns/${campaignId}/assets/upload-url`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.integrationToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename, size, contentType: mimeType }),
    });
    await assertIntegrationOk(res);
    return await res.json();
}

/** アップロード後の登録処理 */
export async function registerCampaignAsset(campaignId: string, payload: {
    asset_id: string;
    object_key: string;
    filename: string;
    size: number;
    mime_type: string;
}, config: IntegrationConfig) {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/external/campaigns/${campaignId}/assets/register`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.integrationToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    await assertIntegrationOk(res);
    return await res.json();
}

/**
 * ファイルを外部配布システムにアップロードし、登録する一連の処理。
 */
export async function uploadAssetAndRegister(
    campaignId: string,
    file: File,
    config: IntegrationConfig,
    onProgress?: (progress: number) => void
): Promise<ExternalAsset> {
    // 1. アップロード用URLの取得
    const { upload_url, asset_id, object_key } = await getAssetUploadUrl(
        campaignId,
        file.name,
        file.size,
        file.type || "application/octet-stream",
        config
    );

    // 2. 実際のファイルアップロード (S3/GCS等への署名付きURL経由)
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload_url);
        // 署名付きURL(S3)へのPUT時は、Content-Typeを指定しない、あるいは署名時と合わせる必要がある
        // バックエンド(createSignedUploadToStorage)の実装に合わせて設定
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(true);
            else reject(new Error(`アップロード失敗 (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("ネットワークエラー"));
        xhr.send(file);
    });

    // 3. 連携先への登録通知
    const result = await registerCampaignAsset(
        campaignId,
        {
            asset_id,
            object_key,
            filename: file.name,
            size: file.size,
            mime_type: file.type || "application/octet-stream",
        },
        config
    );

    // Backend returns { id (campAssetId), asset_id, label, ok }
    return {
        id: result.id,
        label: result.label,
        asset_url: null, // 配布設定画面ではURLは必須ではない
    };
}

// ========== 受取人スロット（Claim URL）発行 ==========

/** プレイヤー×ガチャプールの冪等キー（だんごシェアリンクの external_transaction_id） */
export function buildGachaPlayerExternalTransactionId(poolId: string, playerId: string): string {
    return `gacha-${poolId}-player-${playerId}`;
}

// ========== 配布マッピング支援 ==========

/** ファイル名・表示名の照合用正規化 */
export function normalizeDistributionLabel(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .replace(/\.[^./\\]+$/, "")
        .replace(/\s+/g, " ");
}

export type AutoMappingSuggestion = {
    itemId: string;
    itemName: string;
    assetId: string;
    assetName: string;
};

/** 未紐づけ品目に対し、表示名一致のアセットを1:1で提案（曖昧・二重は除外） */
export function buildAutoMappingSuggestions(
    pool: GachaPool,
    assets: ExternalAsset[],
    currentMapping: Record<string, string>
): AutoMappingSuggestion[] {
    const usedAssetIds = new Set(Object.values(currentMapping).filter(Boolean));
    const suggestions: AutoMappingSuggestion[] = [];

    for (const item of pool.items) {
        if (currentMapping[item.id]) continue;
        const normItem = normalizeDistributionLabel(item.name);
        if (!normItem) continue;

        let match: ExternalAsset | null = null;
        for (const asset of assets) {
            if (usedAssetIds.has(asset.id)) continue;
            const normAsset = normalizeDistributionLabel(resolveExternalAssetDisplayName(asset));
            if (normItem === normAsset) {
                match = asset;
                break;
            }
        }
        if (match) {
            suggestions.push({
                itemId: item.id,
                itemName: item.name,
                assetId: match.id,
                assetName: resolveExternalAssetDisplayName(match),
            });
            usedAssetIds.add(match.id);
        }
    }
    return suggestions;
}

/** マッピング表からプールの linkedAssetId を更新 */
export function applyItemAssetMapping(
    pool: GachaPool,
    mapping: Record<string, string>
): GachaPool {
    return {
        ...pool,
        items: pool.items.map((it) => ({
            ...it,
            linkedAssetId: mapping[it.id] || undefined,
        })),
    };
}

/** だんごシェアリンク PUT gacha-config 用（現プールのレアリティ＋マッピング済みアセット） */
export function buildGachaConfigSyncPayloadFromPool(pool: GachaPool) {
    return {
        gachaConfig: {
            rarities: pool.rarities.map((r) => ({
                id: r.id,
                name: r.name,
                probability: r.defaultWeight ?? 0,
                color: r.color,
            })),
        },
        assetRarityMappings: pool.items
            .filter((it) => !!it.linkedAssetId)
            .map((it) => ({
                assetId: it.linkedAssetId!,
                gachaRarityId: it.rarityId || null,
            })),
    };
}

/** 配布マッピング変更後、だんごシェアリンク側のガチャ表示を追従 */
export async function syncGachaConfigToExternalFromPool(
    pool: GachaPool,
    config: IntegrationConfig
): Promise<void> {
    if (!pool.linkedCampaignId || !config.integrationToken) return;
    const payload = buildGachaConfigSyncPayloadFromPool(pool);
    await saveExternalGachaConfig(pool.linkedCampaignId, payload, config);
}

/** ファイル名から未紐づけ品目 ID を推定（一括登録用） */
export function matchItemIdForFileName(
    pool: GachaPool,
    fileName: string,
    mapping: Record<string, string>
): string | null {
    const norm = normalizeDistributionLabel(fileName);
    if (!norm) return null;
    for (const item of pool.items) {
        if (mapping[item.id]) continue;
        if (normalizeDistributionLabel(item.name) === norm) return item.id;
    }
    return null;
}

/** 並列数を制限して非同期処理 */
export async function runWithConcurrency<T>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<void>
): Promise<void> {
    if (items.length === 0) return;
    const queue = [...items];
    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item === undefined) break;
            await fn(item);
        }
    });
    await Promise.all(workers);
}

/** 配布タブの品目↔ファイルマッピング状況 */
export function getPoolMappingStats(pool: GachaPool): PoolMappingStats {
    const itemCount = pool.items.length;
    const mappedCount = pool.items.filter((it) => !!it.linkedAssetId).length;
    return {
        itemCount,
        mappedCount,
        unmappedCount: Math.max(0, itemCount - mappedCount),
    };
}

function playerInventoryForPool(player: Player, poolId: string) {
    return player.poolStates?.[poolId]?.inventory ?? player.inventory;
}

/**
 * プレイヤーの当選・所持から、だんごシェアリンクへ送る campaign_asset_ids を集める。
 * 品目に linkedAssetId がない当選は含めない（常に当選ベース・fail closed）。
 */
export function collectDistributionAssetIds(player: Player, pool: GachaPool): string[] {
    const ids = new Set<string>();
    const addFromItemId = (itemId: string) => {
        const item = pool.items.find((it) => it.id === itemId);
        if (item?.linkedAssetId) ids.add(item.linkedAssetId);
    };

    const inventory = playerInventoryForPool(player, pool.id);
    if (inventory) {
        Object.keys(inventory).forEach(addFromItemId);
    }
    if (player.results?.length) {
        player.results.forEach((r) => addFromItemId(r.itemId));
    }
    return Array.from(ids).sort();
}

/** プレイヤー行・配布モーダル用の配布サマリ */
export function getPlayerDistributionStats(player: Player, pool: GachaPool): PlayerDistributionStats {
    const assetIds = collectDistributionAssetIds(player, pool);
    const inventory = playerInventoryForPool(player, pool.id);
    let totalWinCount = 0;
    let mappedWinCount = 0;
    if (inventory) {
        for (const [itemId, entry] of Object.entries(inventory)) {
            const count = entry.count ?? 0;
            totalWinCount += count;
            const item = pool.items.find((it) => it.id === itemId);
            if (item?.linkedAssetId) mappedWinCount += count;
        }
    }
    return {
        assetCount: assetIds.length,
        totalWinCount,
        mappedWinCount,
    };
}

function hashAssetIdsForIdempotency(assetIds: string[]): string {
    let h = 2166136261;
    for (const id of assetIds) {
        for (let i = 0; i < id.length; i++) {
            h ^= id.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h ^= 0x7c;
    }
    return (h >>> 0).toString(36);
}

/** 当選アセット集合が変わったときだけ Idempotency キャッシュが分岐するキー */
export function buildClaimIdempotencyKey(externalTxId: string, assetIds: string[]): string {
    return `idem-${externalTxId}-${hashAssetIdsForIdempotency(assetIds)}`;
}

/**
 * プレイヤーの配布URLを発行する。
 *
 * file-share-app の `POST /api/v1/external/campaigns/[id]/recipient-slots`
 * を呼び出す。campaign_asset_ids は当選かつマッピング済み品目のみ（空配列可）。
 *
 * external_transaction_id で冪等性を保証：同じプレイヤー×同じガチャなら
 * 何度呼んでも同じ URL が返る。
 */
export async function issueClaimForPlayer(
    player: Player,
    pool: GachaPool,
    config: IntegrationConfig
): Promise<RecipientSlotResult> {
    const campaignId = pool.linkedCampaignId;
    if (!campaignId) {
        return { ok: false, error: "キャンペーンが選択されていません" };
    }
    if (!config.integrationToken) {
        return { ok: false, error: "連携が設定されていません" };
    }

    const externalTxId = buildGachaPlayerExternalTransactionId(pool.id, player.id);
    const assetIds = collectDistributionAssetIds(player, pool);

    try {
        const res = await fetch(
            `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/recipient-slots`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.integrationToken}`,
                    "Idempotency-Key": buildClaimIdempotencyKey(externalTxId, assetIds),
                },
                body: JSON.stringify({
                    listener_display_name: player.name,
                    external_transaction_id: externalTxId,
                    campaign_asset_ids: assetIds,
                    ...(player.linkedRecipientId
                        ? { recipient_id: player.linkedRecipientId }
                        : {}),
                }),
            }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            return {
                ok: false,
                error: data.error ?? `HTTP ${res.status}`,
                message: data.message ?? undefined,
            };
        }

        const linkedCount =
            typeof data.linked_asset_count === "number"
                ? data.linked_asset_count
                : assetIds.length;

        return {
            ok: true,
            claim_url: data.claim_url,
            reception_url: data.reception_url,
            delivery_mode: data.delivery_mode,
            claim_id: data.claim_id,
            slot_id: data.slot_id,
            recipient_id: data.recipient_id ?? player.linkedRecipientId,
            external_transaction_id: data.external_transaction_id,
            linked_asset_count: linkedCount,
            slot_status: data.slot_status,
            resolved_existing: data.resolved_existing,
        };
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : "通信エラーが発生しました",
        };
    }
}

/**
 * 外部配布システムから受取人スロットを削除する。
 */
export async function deleteExternalSlot(
    playerId: string,
    pool: GachaPool,
    config: IntegrationConfig
): Promise<boolean> {
    const campaignId = pool.linkedCampaignId;
    if (!campaignId || !config.integrationToken) return false;

    const externalTxId = buildGachaPlayerExternalTransactionId(pool.id, playerId);

    try {
        const res = await fetch(
            `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/recipient-slots?external_transaction_id=${encodeURIComponent(externalTxId)}&mode=detach`,
            {
                method: "DELETE",
                headers: authHeaders(config),
            }
        );
        return res.ok;
    } catch (e) {
        console.error("Failed to delete external slot:", e);
        return false;
    }
}

/**
 * 複数プレイヤーに対して一括でClaimを発行する。
 * 各プレイヤーに対して issueClaimForPlayer を逐次実行する。
 */
export async function issueClaimsForPlayers(
    players: Player[],
    pool: GachaPool,
    config: IntegrationConfig,
    onProgress?: (done: number, total: number) => void
): Promise<Map<string, RecipientSlotResult>> {
    const results = new Map<string, RecipientSlotResult>();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (!player) continue;
        const result = await issueClaimForPlayer(player, pool, config);
        results.set(player.id, result);
        onProgress?.(i + 1, players.length);
    }
    return results;
}

// ========== キャンペーン新規作成 ==========

/**
 * 新しいキャンペーンを外部連携先で作成する。
 */
export async function createExternalCampaign(
    name: string,
    config: IntegrationConfig
): Promise<ExternalCampaign> {
    const res = await fetch(
        `${config.apiBaseUrl}/api/v1/external/campaigns`,
        {
            method: "POST",
            headers: authHeaders(config),
            body: JSON.stringify({ name }),
        }
    );
    await assertIntegrationOk(res);
    return res.json() as Promise<ExternalCampaign>;
}

// ========== ガチャ設定の同期保存 ==========

/**
 * 連携先キャンペーンのガチャ構成とアセットのレア度マッピングを一括更新（同期）する。
 */
export async function saveExternalGachaConfig(
    campaignId: string,
    payload: {
        gachaConfig: {
            rarities: { id: string; name: string; probability: number; color: string }[];
        };
        assetRarityMappings: { assetId: string; gachaRarityId: string | null }[];
    },
    config: IntegrationConfig
): Promise<{ ok: boolean }> {
    const res = await fetch(
        `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/gacha-config`,
        {
            method: "PUT",
            headers: authHeaders(config),
            body: JSON.stringify(payload),
        }
    );
    await assertIntegrationOk(res);
    return res.json() as Promise<{ ok: boolean }>;
}

