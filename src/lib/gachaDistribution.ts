/**
 * ガチャ × ファイル配布連携：API呼び出しロジック。
 *
 * file-share-app の外部API を利用して、プレイヤーの受取人スロット
 * （Recipient Slot）を作成し、Claim URL を取得する。
 */

import type { Player, GachaPool, IntegrationConfig } from "./gacha";

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
    asset_url: string | null;
    gachaRarityId?: string | null;
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
        label: string;
        rarityId: string | null;
    }[];
}

/** recipient-slots API のレスポンス */
export interface RecipientSlotResult {
    ok: boolean;
    claim_url?: string;
    claim_id?: string;
    slot_id?: string;
    external_transaction_id?: string;
    error?: string;
    message?: string;
}

// ========== API ヘルパー ==========

/** 認証ヘッダーを構築する共通ヘルパー */
function authHeaders(config: IntegrationConfig): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.integrationToken}`,
    };
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
    if (!res.ok) {
        throw new Error(`キャンペーン取得に失敗しました (HTTP ${res.status})`);
    }
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
    if (!res.ok) {
        throw new Error(`アセット取得に失敗しました (HTTP ${res.status})`);
    }
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
    if (!res.ok) {
        throw new Error(`ガチャ設定の取得に失敗しました (HTTP ${res.status})`);
    }
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
    if (!res.ok) throw new Error("アップロードURLの取得に失敗しました");
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
    if (!res.ok) throw new Error("アセットの登録に失敗しました");
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

/**
 * プレイヤーの配布URLを発行する。
 *
 * file-share-app の `POST /api/v1/external/campaigns/[id]/recipient-slots`
 * を呼び出し、キャンペーンの全アセットが紐づいた Claim URL を取得する。
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

    // 冪等性キー: 同じプレイヤー×同じガチャプールなら同じURLを返す
    const externalTxId = `gacha-${pool.id}-player-${player.id}`;

    // 当選アイテム（インベントリ）から配布対象のアセットIDを抽出（重複排除）
    const hasAnyMapping = pool.items.some(it => !!it.linkedAssetId);
    let assetIds: string[] | undefined = undefined;

    if (hasAnyMapping) {
        const ids = new Set<string>();
        
        // 1. 全所持品（inventory）から抽出
        if (player.inventory) {
            Object.keys(player.inventory).forEach(itemId => {
                const item = pool.items.find(it => it.id === itemId);
                if (item?.linkedAssetId) {
                    ids.add(item.linkedAssetId);
                }
            });
        }
        
        // 2. 直近の結果（results）からも抽出（念のため）
        if (player.results && player.results.length > 0) {
            player.results.forEach(r => {
                const item = pool.items.find(it => it.id === r.itemId);
                if (item?.linkedAssetId) {
                    ids.add(item.linkedAssetId);
                }
            });
        }

        assetIds = Array.from(ids);
    }

    try {
        // デバッグ用: 何件のアセットを送ろうとしているかコンソールに出力
        console.log(`[GachaSync] Sending ${assetIds?.length ?? "ALL"} assets for player ${player.name}`);

        const res = await fetch(
            `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/recipient-slots`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.integrationToken}`,
                    // 所持品が変わった時にキャッシュを無効化するため、IDのリストをキーに含める
                    "Idempotency-Key": `idem-${externalTxId}-${assetIds?.length ?? 0}`,
                },
                body: JSON.stringify({
                    listener_display_name: player.name,
                    external_transaction_id: externalTxId,
                    campaign_asset_ids: assetIds,
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

        return {
            ok: true,
            claim_url: data.claim_url,
            claim_id: data.claim_id,
            slot_id: data.slot_id,
            external_transaction_id: data.external_transaction_id,
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

    const externalTxId = `gacha-${pool.id}-player-${playerId}`;

    try {
        const res = await fetch(
            `${config.apiBaseUrl}/api/v1/external/campaigns/${encodeURIComponent(campaignId)}/recipient-slots?external_transaction_id=${encodeURIComponent(externalTxId)}`,
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
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `キャンペーン作成に失敗しました (HTTP ${res.status})`);
    }
    return res.json() as Promise<ExternalCampaign>;
}
