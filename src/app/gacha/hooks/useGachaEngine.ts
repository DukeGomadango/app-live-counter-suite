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
import { issueClaimForPlayer, deleteExternalSlot } from "@/lib/gachaDistribution";

interface GachaEngineProps {
  pool: GachaPool;
  players: Player[];
  setPlayers: (p: Player[]) => void;
  activePlayerId: string | null;
  setActivePlayerId: (id: string | null) => void;
  integrationConfig: IntegrationConfig;
  setLatestResults: (r: GachaResult[] | null) => void;
  gachaSettings: GachaSettings;
  isMobile: boolean;
  setMobileTab: (tab: any) => void;
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

  const syncPlayerWithRemote = useCallback(async (player: Player) => {
    if (!pool.linkedCampaignId || !integrationConfig.integrationToken) return;
    
    try {
      const result = await issueClaimForPlayer(player, pool, integrationConfig);
      if (result.ok && result.claim_url) {
        setPlayers((players || []).map(p => 
          p.id === player.id ? { ...p, issuedClaimUrl: result.claim_url, issuedCampaignId: pool.linkedCampaignId } : p
        ));
      }
    } catch (e) {
      console.error("Failed to sync player with remote:", e);
    }
  }, [pool, integrationConfig, setPlayers, players]);

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
      setPlayers((players || []).map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    } else {
      setPlayers([...(players || []), updatedPlayer]);
      setActivePlayerId(updatedPlayer.id);
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
    const newPlayer = createDefaultPlayer(name);
    setPlayers([...(players || []), newPlayer]);
    setActivePlayerId(newPlayer.id);
    syncPlayerWithRemote(newPlayer);
  }, [players, setPlayers, setActivePlayerId, syncPlayerWithRemote]);

  const removePlayer = useCallback((id: string) => {
    deleteExternalSlot(id, pool, integrationConfig);
    setPlayers((players || []).filter(p => p.id !== id));
    if (activePlayerId === id) {
      setActivePlayerId(null);
    }
  }, [players, setPlayers, activePlayerId, setActivePlayerId, pool, integrationConfig]);

  const resetPlayer = useCallback((id: string) => {
    setPlayers((players || []).map(p => p.id === id ? { ...p, results: [], runHistory: [], inventory: {}, totalPulls: 0, pityCounter: 0, pityReachCount: 0 } : p));
  }, [players, setPlayers]);

  const resetAllPlayers = useCallback(() => {
    setPlayers((players || []).map(p => ({ ...p, results: [], runHistory: [], inventory: {}, totalPulls: 0, pityCounter: 0, pityReachCount: 0 })));
  }, [players, setPlayers]);

  const renamePlayer = useCallback((id: string, newName: string) => {
    setPlayers((players || []).map(p => p.id === id ? { ...p, name: newName } : p));
  }, [players, setPlayers]);

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
