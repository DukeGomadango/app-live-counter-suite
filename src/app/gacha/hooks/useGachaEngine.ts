"use client";

import { useState, useCallback } from "react";
import { 
  type GachaPool, 
  type Player, 
  type GachaResult, 
  type GachaSettings, 
  type IntegrationConfig,
  performGachaPull,
  createDefaultPlayer
} from "@/lib/gacha";
import {
  issueClaimForPlayer,
  deleteExternalSlot,
  getPlayerDistributionStats,
  getPoolMappingStats,
} from "@/lib/gachaDistribution";
import { useToast } from "@/components/Toast";
import { type MobileTab } from "./useGachaSidebar";

interface GachaEngineProps {
  pool: GachaPool;
  players: Player[];
  setPlayers: (p: Player[] | ((prev: Player[]) => Player[])) => void;
  activePlayerId: string | null;
  setActivePlayerId: (id: string | null) => void;
  integrationConfig: IntegrationConfig;
  setLatestResults: (r: GachaResult[] | null) => void;
  gachaSettings: GachaSettings;
  isMobile: boolean;
  setMobileTab: (tab: MobileTab) => void;
}

export function useGachaEngine({
  pool,
  players,
  setPlayers,
  activePlayerId,
  setActivePlayerId,
  integrationConfig,
  setLatestResults,
  gachaSettings,
  isMobile,
  setMobileTab
}: GachaEngineProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { showToast } = useToast();

  const syncPlayerWithRemote = useCallback(async (player: Player) => {
    if (!pool.linkedCampaignId || !integrationConfig.integrationToken) return;

    try {
      const result = await issueClaimForPlayer(player, pool, integrationConfig);
      if (result.ok && result.claim_url) {
        const campaignId = pool.linkedCampaignId;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? {
                  ...p,
                  issuedClaimUrl: result.claim_url,
                  issuedCampaignId: campaignId ?? p.issuedCampaignId,
                  ...(result.recipient_id
                    ? { linkedRecipientId: result.recipient_id }
                    : {}),
                }
              : p
          )
        );

        const dist = getPlayerDistributionStats(player, pool);
        const mapping = getPoolMappingStats(pool);
        const linkedCount = result.linked_asset_count ?? dist.assetCount;

        if (linkedCount === 0) {
          if (dist.totalWinCount > 0 && dist.mappedWinCount === 0) {
            showToast(
              "当選はありますが配布ファイルが0件です。配布タブで景品とファイルを紐づけてから再同期してください",
              "error"
            );
          } else if (mapping.mappedCount === 0 && pool.items.length > 0) {
            showToast(
              "景品とファイルの紐づけがありません。配布タブで設定してから抽選・再同期してください",
              "error"
            );
          } else if (dist.totalWinCount === 0) {
            showToast(
              "配布リンクは作成しましたが、まだ当選品目がありません",
              "info"
            );
          }
        }
      } else if (!result.ok) {
        showToast(result.message ?? result.error ?? "配布の同期に失敗しました", "error");
      }
    } catch (e) {
      console.error("Failed to sync player with remote:", e);
      showToast("配布の同期に失敗しました", "error");
    }
  }, [pool, integrationConfig, setPlayers, showToast]);

  const handleRoll = useCallback(() => {
    if (pool.items.length === 0) return;

    const currentPlayer = (players || []).find(p => p.id === activePlayerId);

    // プレイヤーがいるのに選択してない場合は実行しない
    if (!currentPlayer && (players || []).length > 0) return;

    let targetPlayer: Player;
    if (currentPlayer) {
      targetPlayer = currentPlayer;
    } else {
      targetPlayer = createDefaultPlayer("ゲスト");
    }

    const { results, updatedPlayer } = performGachaPull(pool, pool.pullCount, targetPlayer);

    setLatestResults(results);

    if (!gachaSettings.enableAnimation) {
      queueMicrotask(() => {
        setIsRolling(false);
        setShowResults(true);
        if (isMobile) setMobileTab("results");
      });
    } else {
      setIsRolling(true);
      setShowResults(false);
    }

    // プレイヤー更新
    if (currentPlayer) {
      setPlayers((prev) => prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p)));
    } else {
      const guest = pool.linkedCampaignId
        ? { ...updatedPlayer, issuedCampaignId: pool.linkedCampaignId }
        : updatedPlayer;
      setPlayers((prev) => [...prev, guest]);
      setActivePlayerId(guest.id);
      syncPlayerWithRemote(guest);
      return;
    }

    syncPlayerWithRemote(updatedPlayer);
  }, [pool, players, activePlayerId, setLatestResults, setPlayers, setActivePlayerId, gachaSettings.enableAnimation, isMobile, setMobileTab, syncPlayerWithRemote]);

  const handleAnimationComplete = useCallback(() => {
    queueMicrotask(() => {
      setIsRolling(false);
      setShowResults(true);
      if (isMobile) setMobileTab("results");
    });
  }, [isMobile, setMobileTab]);

  const addPlayer = useCallback((name: string) => {
    const newPlayer = {
      ...createDefaultPlayer(name),
      ...(pool.linkedCampaignId ? { issuedCampaignId: pool.linkedCampaignId } : {}),
    };
    setPlayers((prev) => [...prev, newPlayer]);
    setActivePlayerId(newPlayer.id);
    syncPlayerWithRemote(newPlayer);
  }, [pool.linkedCampaignId, setPlayers, setActivePlayerId, syncPlayerWithRemote]);

  const removePlayer = useCallback((id: string) => {
    deleteExternalSlot(id, pool, integrationConfig);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    if (activePlayerId === id) {
      setActivePlayerId(null);
    }
  }, [activePlayerId, setPlayers, setActivePlayerId, pool, integrationConfig]);

  const resetPlayer = useCallback((id: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          results: [],
          runHistory: (p.runHistory || []).filter((r) => r.poolId !== pool.id),
          poolStates: {
            ...(p.poolStates || {}),
            [pool.id]: { totalPulls: 0, pityCounter: 0, pityReachCount: 0, inventory: {} },
          },
        };
      })
    );
  }, [setPlayers, pool.id]);

  const resetAllPlayers = useCallback(() => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        results: [],
        runHistory: (p.runHistory || []).filter((r) => r.poolId !== pool.id),
        poolStates: {
          ...(p.poolStates || {}),
          [pool.id]: { totalPulls: 0, pityCounter: 0, pityReachCount: 0, inventory: {} },
        },
      }))
    );
  }, [setPlayers, pool.id]);

  const renamePlayer = useCallback(
    (id: string, newName: string) => {
      setPlayers((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, name: newName } : p));
        const updated = next.find((p) => p.id === id);
        if (updated) {
          queueMicrotask(() => {
            void syncPlayerWithRemote(updated);
          });
        }
        return next;
      });
    },
    [setPlayers, syncPlayerWithRemote]
  );

  return {
    isRolling,
    showResults,
    setShowResults,
    handleRoll,
    handleAnimationComplete,
    addPlayer,
    removePlayer,
    resetPlayer,
    resetAllPlayers,
    renamePlayer,
    syncPlayerWithRemote
  };
}
