import type { GachaPool, IntegrationConfig } from "@/lib/gacha";

/** ガチャ × リンクシェア連携の準備状態（接続・紐づけの三層のうち UI で使う分類） */
export type GachaIntegrationReadiness =
    | "disabled"
    | "needs_oauth"
    | "needs_reconnect"
    | "needs_campaign"
    | "ready";

export function getGachaIntegrationReadiness(
    integrationEnabled: boolean,
    config?: IntegrationConfig | null,
    pool?: Pick<GachaPool, "linkedCampaignId"> | null
): GachaIntegrationReadiness {
    if (!integrationEnabled) return "disabled";
    const hasToken = !!config?.integrationToken?.trim();
    const hasCampaign = !!pool?.linkedCampaignId?.trim();
    if (hasToken && hasCampaign) return "ready";
    if (!hasToken && hasCampaign) return "needs_reconnect";
    if (!hasToken) return "needs_oauth";
    return "needs_campaign";
}

export function isGachaDistributionReady(
    integrationEnabled: boolean,
    config?: IntegrationConfig | null,
    pool?: Pick<GachaPool, "linkedCampaignId"> | null
): boolean {
    return getGachaIntegrationReadiness(integrationEnabled, config, pool) === "ready";
}

/**
 * 履歴で過去の poolId を表示するとき、表示用 pool に linkedCampaignId が無くても
 * 現在のガチャがキャンペーン連携中なら配布 API 用にキャンペーン ID を引き継ぐ。
 * external_transaction_id の poolId は displayPool.id のまま。
 */
export function mergeDistributionPool(activePool: GachaPool, displayPool: GachaPool): GachaPool {
    if (displayPool.linkedCampaignId?.trim()) return displayPool;
    const campaignId = activePool.linkedCampaignId?.trim();
    if (campaignId) return { ...displayPool, linkedCampaignId: campaignId };
    return displayPool;
}

export function getLinkCollectionButtonTitle(readiness: GachaIntegrationReadiness): string {
    switch (readiness) {
        case "ready":
            return "配布・リンク集";
        case "needs_reconnect":
        case "needs_oauth":
            return "配布タブで連携が必要";
        case "needs_campaign":
            return "配布タブでキャンペーン選択が必要";
        default:
            return "リンク集";
    }
}

export type IntegrationSetupPrompt = {
    title: string;
    body: string;
    actionLabel?: string;
};

export function getIntegrationSetupPrompt(
    readiness: GachaIntegrationReadiness
): IntegrationSetupPrompt | null {
    switch (readiness) {
        case "needs_oauth":
            return {
                title: "リンクシェアとの連携が必要です",
                body: "景品を配布するには、左の「配布」タブから「連携を開始する」でだんごリンクシェアへの許可を完了してください。",
                actionLabel: "配布タブを開く",
            };
        case "needs_reconnect":
            return {
                title: "リンクシェアへの再接続が必要です",
                body: "キャンペーンの紐づけは残っていますが、この端末に連携トークンがありません。配布タブから「連携を開始する」を実行してください（データ連携ではトークンは移りません）。",
                actionLabel: "配布タブを開く",
            };
        case "needs_campaign":
            return {
                title: "キャンペーンが選ばれていません",
                body: "配布タブでリンクシェアのキャンペーンを選ぶと、プレイヤーへの配布とリンク集が使えます。",
                actionLabel: "配布タブを開く",
            };
        default:
            return null;
    }
}
