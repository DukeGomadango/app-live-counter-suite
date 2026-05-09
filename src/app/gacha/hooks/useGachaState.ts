"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { 
  type GachaPool, 
  type Player, 
  type GachaResult, 
  type GachaSettings, 
  type IntegrationConfig,
  createDefaultPool,
  createDefaultSettings,
  migratePoolItemsForLink,
  migratePlayerData,
  ensureResultIds
} from "@/lib/gacha";

const DEFAULT_POOL = createDefaultPool();
const DEFAULT_SETTINGS = createDefaultSettings();

export function useGachaState() {
  const [pool, setPool] = useLocalStorage<GachaPool>("gacha-pool", DEFAULT_POOL);
  const [players, setPlayers] = useLocalStorage<Player[]>("gacha-players", []);
  const [activePlayerId, setActivePlayerId] = useLocalStorage<string | null>("gacha-active-player", null);
  const [integrationConfig, setIntegrationConfig] = useLocalStorage<IntegrationConfig>("gacha-integration-config", {
    apiBaseUrl: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://share.dango.tools',
    integrationToken: "",
  });
  const [latestResults, setLatestResults] = useState<GachaResult[] | null>(null);
  const [gachaSettings, setGachaSettings] = useLocalStorage<GachaSettings>("gacha-settings", DEFAULT_SETTINGS);
  const [hasMigrated, setHasMigrated] = useState(false);

  // 旧品目形式（link）を imageUrl に移すマイグレーション（初回のみ）
  useEffect(() => {
    setPool(prev => migratePoolItemsForLink(prev));
  }, [setPool]);

  // OAuth連携のコールバック処理
  useEffect(() => {
    const isIntegrationEnabled = process.env.NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION === 'true';
    if (!isIntegrationEnabled) return;
    if (typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    const token = u.searchParams.get("integration_token");
    if (token) {
      setIntegrationConfig(prev => ({ ...prev, integrationToken: token }));
      u.searchParams.delete("integration_token");
      u.searchParams.delete("state");
      window.history.replaceState({}, "", u.toString());
    }
  }, [setIntegrationConfig]);

  // 設定に orbIntensity / orbColor がない古い保存データにデフォルトを付与
  useEffect(() => {
    const needsOrbIntensity = gachaSettings.orbIntensity === undefined;
    const needsOrbColor = gachaSettings.orbColor === undefined;
    if (needsOrbIntensity || needsOrbColor) {
      setGachaSettings(prev => ({
        ...prev,
        ...(needsOrbIntensity && { orbIntensity: 50 }),
        ...(needsOrbColor && { orbColor: prev.accentColor ?? createDefaultSettings().accentColor }),
      }));
    }
  }, [gachaSettings.orbIntensity, gachaSettings.orbColor, gachaSettings.accentColor, setGachaSettings]);

  // レガシーデータマイグレーション - localStorageから直接読み取り
  useEffect(() => {
    if (hasMigrated) return;
    try {
      if (typeof window === 'undefined') return;
      const rawPlayers = window.localStorage.getItem('gacha-players');
      if (rawPlayers) {
        const parsed: Player[] = JSON.parse(rawPlayers);
        if (parsed && parsed.length > 0) {
          const migrated = migratePlayerData(parsed);
          const uniqueIds = new Set<string>();
          const deduped = migrated.filter(p => {
            if (uniqueIds.has(p.id)) return false;
            uniqueIds.add(p.id);
            return true;
          });
          if (JSON.stringify(parsed) !== JSON.stringify(deduped)) {
            setPlayers(deduped);
          }
        }
      }
      const rawResults = window.localStorage.getItem('gacha-latest-results');
      if (rawResults) {
        try {
          const parsed: GachaResult[] = JSON.parse(rawResults);
          if (parsed && parsed.length > 0) {
             setLatestResults(ensureResultIds(parsed));
          }
        } catch { /* ignore parse errors */ }
        window.localStorage.removeItem('gacha-latest-results');
      }
    } catch { /* ignore parse errors */ }
    setHasMigrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMigrated]);

  return {
    pool, setPool,
    players, setPlayers,
    activePlayerId, setActivePlayerId,
    integrationConfig, setIntegrationConfig,
    latestResults, setLatestResults,
    gachaSettings, setGachaSettings,
    hasMigrated, setHasMigrated
  };
}
