/**
 * 一部未紐づけのまま抽選するときの確認ダイアログ用ロジック。
 */

import type { GachaPool } from "./gacha";
import { getPoolMappingStats } from "./gachaDistribution";

const DISMISS_KEY_PREFIX = "gacha-dismiss-partial-unmapped-pull:";

export function getPartialUnmappedPullDismissKey(poolId: string): string {
    return `${DISMISS_KEY_PREFIX}${poolId}`;
}

export function isPartialUnmappedPullDismissed(poolId: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(getPartialUnmappedPullDismissKey(poolId)) === "1";
}

export function setPartialUnmappedPullDismissed(poolId: string, dismissed: boolean): void {
    if (typeof window === "undefined") return;
    const key = getPartialUnmappedPullDismissKey(poolId);
    if (dismissed) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
}

/** 未紐づけ品目がなくなったら「次回から表示しない」をリセット */
export function clearPartialUnmappedPullDismissIfResolved(pool: GachaPool): void {
    const { unmappedCount } = getPoolMappingStats(pool);
    if (unmappedCount === 0) {
        setPartialUnmappedPullDismissed(pool.id, false);
    }
}

export type PartialUnmappedPullConfirmInfo = {
    show: boolean;
    unmappedCount: number;
    mappedCount: number;
    itemCount: number;
};

/**
 * 連携中かつ「一部だけ未紐づけ」のとき、抽選前確認を出すか。
 * 全件未紐づけは配布タブの常時バナーに任せ、ダイアログは出さない。
 */
export function getPartialUnmappedPullConfirmInfo(
    pool: GachaPool,
    integrationActive: boolean
): PartialUnmappedPullConfirmInfo {
    const stats = getPoolMappingStats(pool);
    const base = {
        show: false,
        unmappedCount: stats.unmappedCount,
        mappedCount: stats.mappedCount,
        itemCount: stats.itemCount,
    };

    if (!integrationActive || !pool.linkedCampaignId) return base;
    if (stats.itemCount === 0) return base;
    if (stats.mappedCount === 0 || stats.unmappedCount === 0) return base;
    if (isPartialUnmappedPullDismissed(pool.id)) return base;

    return { ...base, show: true };
}
