"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  consumeOAuthReturnFromUrl,
  type OAuthCallbackNotice,
} from "@/lib/integrationAuthRedirect";
import {
  normalizeShareLinkApiBaseUrl,
  resolveShareLinkApiBaseUrl,
} from "@/lib/integrationConstants";
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
    apiBaseUrl:
      typeof window !== "undefined"
        ? resolveShareLinkApiBaseUrl(window.location.hostname)
        : "https://dango-share-link.vercel.app",
    integrationToken: "",
  });
  const [latestResults, setLatestResults] = useState<GachaResult[] | null>(null);
  const [gachaSettings, setGachaSettings] = useLocalStorage<GachaSettings>("gacha-settings", DEFAULT_SETTINGS);
  const [hasMigrated, setHasMigrated] = useState(false);
  const [oauthCallbackNotice, setOauthCallbackNotice] =
    useState<OAuthCallbackNotice | null>(null);

  // 旧品目形式（link）を imageUrl に移すマイグレーション（初回のみ）
  useEffect(() => {
    setPool(prev => migratePoolItemsForLink(prev));
  }, [setPool]);

  // 旧デフォルト share.dango.tools（DNS 未設定）を本番 Vercel URL に置き換え
  useEffect(() => {
    const next = normalizeShareLinkApiBaseUrl(integrationConfig.apiBaseUrl);
    if (next !== integrationConfig.apiBaseUrl) {
      setIntegrationConfig((prev) => ({ ...prev, apiBaseUrl: next }));
    }
  }, [integrationConfig.apiBaseUrl, setIntegrationConfig]);

  // 動的オリジン注入 & OAuth コールバック（token / access_denied）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const hasOAuthParams =
      u.searchParams.has("integration_token") ||
      u.searchParams.get("error") === "access_denied" ||
      u.searchParams.has("api_base_url");
    if (!hasOAuthParams) return;

    const { apiBaseUrl, integrationToken, notice, cleanedPath } =
      consumeOAuthReturnFromUrl(u);

    let currentConfig: IntegrationConfig = {
      apiBaseUrl: resolveShareLinkApiBaseUrl(window.location.hostname),
      integrationToken: "",
    };

    try {
      const raw = window.localStorage.getItem("gacha-integration-config");
      if (raw) {
        const parsed = JSON.parse(raw) as IntegrationConfig;
        if (parsed) {
          currentConfig = { ...currentConfig, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Failed to parse integration config from localStorage:", e);
    }

    const updatedConfig = { ...currentConfig };
    if (apiBaseUrl) {
      updatedConfig.apiBaseUrl = normalizeShareLinkApiBaseUrl(apiBaseUrl);
    } else {
      updatedConfig.apiBaseUrl = normalizeShareLinkApiBaseUrl(updatedConfig.apiBaseUrl);
    }
    if (integrationToken) {
      updatedConfig.integrationToken = integrationToken;
    }

    try {
      window.localStorage.setItem(
        "gacha-integration-config",
        JSON.stringify(updatedConfig)
      );
    } catch (e) {
      console.warn("Failed to save integration config to localStorage:", e);
    }
    setIntegrationConfig(updatedConfig);

    if (notice) {
      setOauthCallbackNotice(notice);
    }

    window.history.replaceState({}, "", cleanedPath);
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
    hasMigrated, setHasMigrated,
    oauthCallbackNotice,
    clearOauthCallbackNotice: () => setOauthCallbackNotice(null),
  };
}
