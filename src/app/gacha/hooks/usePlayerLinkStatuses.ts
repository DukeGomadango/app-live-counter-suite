"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player, GachaPool, IntegrationConfig } from "@/lib/gacha";
import {
  buildGachaPlayerExternalTransactionId,
  fetchRecipientSlotStatus,
  type RecipientSlotLinkStatus,
} from "@/lib/gachaDistribution";

/**
 * 連携キャンペーン向け: 各プレイヤーのだんごシェアリンク上の Claim 有無を確認する。
 */
export function usePlayerLinkStatuses(
  players: Player[],
  pool: GachaPool,
  integrationConfig: IntegrationConfig
): Record<string, RecipientSlotLinkStatus> {
  const [statuses, setStatuses] = useState<Record<string, RecipientSlotLinkStatus>>({});

  const campaignId = pool.linkedCampaignId?.trim();
  const token = integrationConfig.integrationToken?.trim();
  const shouldFetch = !!(campaignId && token && players.length > 0);

  useEffect(() => {
    if (!shouldFetch) return;

    let cancelled = false;

    void (async () => {
      const next: Record<string, RecipientSlotLinkStatus> = {};
      await Promise.all(
        players.map(async (player) => {
          if (player.issuedCampaignId && player.issuedCampaignId !== campaignId) {
            next[player.id] = "none";
            return;
          }
          if (!player.issuedSlotId && !player.issuedClaimUrl) {
            next[player.id] = "none";
            return;
          }
          const txId = buildGachaPlayerExternalTransactionId(pool.id, player.id);
          const res = await fetchRecipientSlotStatus(campaignId, txId, integrationConfig);
          if (cancelled) return;
          next[player.id] = res.linked ? "linked" : "missing";
        })
      );
      if (!cancelled) setStatuses(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [players, pool.id, campaignId, token, integrationConfig, shouldFetch]);

  return useMemo(
    () => (shouldFetch ? statuses : {}),
    [shouldFetch, statuses]
  );
}
