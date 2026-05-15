"use client";

import { useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  type SlotSymbol,
  type SlotPlayer,
  type SlotSettings,
  type SlotTemplate,
  type SlotSpinRecord,
  createDefaultSymbols,
  createDefaultReelStripIds,
  createDefaultSettings,
  createDefaultPlayers,
  isReelStripsLegacyFormat,
  migrateReelStripsToSymbolMasterAndIds,
} from "@/lib/slot";

const DEFAULT_SYMBOLS = createDefaultSymbols();
const DEFAULT_REEL_STRIP_IDS = createDefaultReelStripIds(DEFAULT_SYMBOLS);

export function useSlotState() {
  const [symbolMaster, setSymbolMaster] = useLocalStorage<SlotSymbol[]>(
    "slot-symbol-master",
    DEFAULT_SYMBOLS
  );
  const [reelStrips, setReelStrips] = useLocalStorage<string[][] | SlotSymbol[][]>(
    "slot-reel-strips",
    DEFAULT_REEL_STRIP_IDS
  );
  const [settings, setSettings] = useLocalStorage<SlotSettings>(
    "slot-settings",
    createDefaultSettings()
  );
  const [players, setPlayers] = useLocalStorage<SlotPlayer[]>(
    "slot-players",
    createDefaultPlayers()
  );
  const [activePlayerId, setActivePlayerId] = useLocalStorage<string | null>(
    "slot-active-player",
    null
  );
  const [templates, setTemplates] = useLocalStorage<SlotTemplate[]>(
    "slot-templates",
    []
  );
  const [legacySpinHistory, setLegacySpinHistory] = useLocalStorage<SlotSpinRecord[]>(
    "slot-spin-history",
    []
  );

  const slotMigratedRef = useRef(false);
  const lastReelCountRef = useRef(settings.reelCount);

  // プレイヤーの自動選択（未選択時）
  useEffect(() => {
    if (!activePlayerId && players.length > 0) {
      setActivePlayerId(players[0]!.id);
    }
  }, [activePlayerId, players, setActivePlayerId]);

  // リール数とリール配列の同期
  useEffect(() => {
    if (lastReelCountRef.current === settings.reelCount) return;
    lastReelCountRef.current = settings.reelCount;

    const currentCount = reelStrips.length;
    const targetCount = settings.reelCount;

    if (currentCount < targetCount) {
      // 不足分をシンボルマスタの全IDで埋める
      const ids = symbolMaster.map((s) => s.id);
      const next = [...reelStrips];
      while (next.length < targetCount) {
        next.push([...ids]);
      }
      setReelStrips(next as string[][] | SlotSymbol[][]);
    } else if (currentCount > targetCount) {
      // 過剰分をカット（データは保持したい気もするが、現状のロジックに合わせる）
      setReelStrips(reelStrips.slice(0, targetCount));
    }
  }, [settings.reelCount, reelStrips, symbolMaster, setReelStrips]);

  // Migration effects
  useEffect(() => {
    const isLegacyStrips = isReelStripsLegacyFormat(reelStrips);
    if (!isLegacyStrips) return;
    const legacy = reelStrips as SlotSymbol[][];
    const { symbolMaster: master, reelStrips: ids } =
      migrateReelStripsToSymbolMasterAndIds(legacy);
    setSymbolMaster(master);
    setReelStrips(ids);
  }, [reelStrips, setSymbolMaster, setReelStrips]);

  useEffect(() => {
    if (slotMigratedRef.current || legacySpinHistory.length === 0) return;
    slotMigratedRef.current = true;
    const byPlayer = new Map<string, SlotSpinRecord[]>();
    for (const r of legacySpinHistory) {
      const arr = byPlayer.get(r.playerId) ?? [];
      arr.push(r);
      byPlayer.set(r.playerId, arr);
    }
    setPlayers((prev) =>
      prev.map((p) => {
        const legacy = byPlayer.get(p.id) ?? [];
        const merged = [...(p.spinHistory ?? []), ...legacy]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-100);
        return { ...p, spinHistory: merged };
      })
    );
    setLegacySpinHistory([]);
  }, [legacySpinHistory, setPlayers, setLegacySpinHistory]);

  return {
    symbolMaster, setSymbolMaster,
    reelStrips, setReelStrips,
    settings, setSettings,
    players, setPlayers,
    activePlayerId, setActivePlayerId,
    templates, setTemplates
  };
}
