"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import SlotReel from "@/components/slot/SlotReel";
import SlotSettingsPanel from "@/components/slot/SlotSettingsPanel";
import SlotPlayerManager from "@/components/slot/SlotPlayerManager";
import SlotReelSymbolPanel from "@/components/slot/SlotReelSymbolPanel";
import SlotTemplatePanel from "@/components/slot/SlotTemplatePanel";
import SlotStatsPanel from "@/components/slot/SlotStatsPanel";
import SlotPlayerHistoryCard from "@/components/slot/SlotPlayerHistoryCard";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";
import { X } from "lucide-react";
import {
  type SlotSymbol,
  type SlotPlayer,
  type SlotSettings,
  type SlotTemplate,
  createDefaultSymbols,
  createDefaultReelStrips,
  createDefaultReelStripIds,
  createDefaultSettings,
  createDefaultPlayers,
  createDefaultPlayer,
  resolveStrip,
  resolveReelStrips,
  isReelStripsLegacyFormat,
  migrateReelStripsToSymbolMasterAndIds,
  pickSymbolByWeight,
  checkPaylines,
  normalizePaylines,
  getBonusSymbolIds,
  pickCeilingBonusIndices,
  calculateTheoreticalPayoutPercent,
  createSlotTemplate,
  normalizeReelStripsForLoad,
  appendSpinRecord,
  getAllPlayersSpinHistory,
  getNumbers17Preset,
  type SlotSpinRecord,
  MIN_REEL_COUNT,
  MAX_REEL_COUNT,
} from "@/lib/slot";

const MAX_SAVED_SLOT_TEMPLATES = 30;

const DEFAULT_SYMBOLS = createDefaultSymbols();
const DEFAULT_STRIPS = createDefaultReelStrips(DEFAULT_SYMBOLS);
const DEFAULT_REEL_STRIP_IDS = createDefaultReelStripIds(DEFAULT_SYMBOLS);

function playSlotSound(slug: "spin" | "stop" | "reach" | "win", enabled: boolean) {
  if (!enabled) return;
  const a = new Audio(`/sounds/slot/${slug}.mp3`);
  a.play().catch(() => {});
}

export default function SlotContent({
  isSplitMode = false,
  isRightPane = false,
}: {
  isSplitMode?: boolean;
  isRightPane?: boolean;
} = {}) {
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
  const [isLightMode, setIsLightMode] = useLocalStorage<boolean>(
    "slot-light-mode",
    false
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"reel" | "players" | "templates" | "stats">("reel");
  const [sidebarWidthPx, setSidebarWidthPx] = useLocalStorage<number>(
    "slot-sidebar-width",
    320
  );
  const [templates, setTemplates] = useLocalStorage<SlotTemplate[]>(
    "slot-templates",
    []
  );
  /** 旧形式のグローバル履歴（マイグレーション用。移行後に空にする） */
  const [legacySpinHistory, setLegacySpinHistory] = useLocalStorage<SlotSpinRecord[]>(
    "slot-spin-history",
    []
  );
  const [playerHistoryViewId, setPlayerHistoryViewId] = useState<string | null>(null);
  const slotMigratedRef = useRef(false);

  const reelCount = Math.min(
    MAX_REEL_COUNT,
    Math.max(MIN_REEL_COUNT, settings.reelCount)
  );

  const isLegacyStrips = isReelStripsLegacyFormat(reelStrips);

  useEffect(() => {
    if (!isLegacyStrips) return;
    const legacy = reelStrips as SlotSymbol[][];
    const { symbolMaster: master, reelStrips: ids } =
      migrateReelStripsToSymbolMasterAndIds(legacy);
    setSymbolMaster(master);
    setReelStrips(ids);
  }, [isLegacyStrips, reelStrips, setSymbolMaster, setReelStrips]);

  useEffect(() => {
    if (isLegacyStrips) return;
    const ids = reelStrips as string[][];
    if (ids.length >= reelCount) return;
    const pad = symbolMaster.map((s) => s.id);
    setReelStrips([
      ...ids,
      ...Array.from({ length: reelCount - ids.length }, () => [...pad]),
    ]);
  }, [isLegacyStrips, reelStrips, reelCount, symbolMaster, setReelStrips]);

  const strips = useMemo((): SlotSymbol[][] => {
    if (isLegacyStrips) {
      const base =
        (reelStrips as SlotSymbol[][]).length >= reelCount
          ? (reelStrips as SlotSymbol[][])
          : DEFAULT_STRIPS;
      return base
        .slice(0, reelCount)
        .map((strip, i) =>
          strip.length > 0
            ? strip
            : (reelStrips as SlotSymbol[][])[i] ??
              DEFAULT_STRIPS[i] ??
              DEFAULT_STRIPS[0]!
        );
    }
    const ids = reelStrips as string[][];
    const resolved = resolveReelStrips(ids, symbolMaster);
    const padStrip = symbolMaster.length > 0 ? symbolMaster.map((s) => s.id) : [];
    const resolvedPadded =
      resolved.length >= reelCount
        ? resolved
        : [
            ...resolved,
            ...Array.from({ length: reelCount - resolved.length }, () =>
              resolveStrip(padStrip, symbolMaster)
            ),
          ];
    const base = resolvedPadded.slice(0, reelCount);
    const fallback = symbolMaster.length > 0 ? symbolMaster : DEFAULT_SYMBOLS;
    return base.map((strip) =>
      strip.length > 0 ? strip : fallback
    );
  }, [
    reelCount,
    reelStrips,
    symbolMaster,
    isLegacyStrips,
  ]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [reelResults, setReelResults] = useState<(number | null)[]>([]);
  const [ceilingCount, setCeilingCount] = useState(0);
  const [ceilingReached, setCeilingReached] = useState(false);
  const [replayFreeSpin, setReplayFreeSpin] = useState(false);
  /** ボーナスゲーム残数（0＝通常時）。ボーナス役成立で設定され、1スピン終了ごとに減る */
  const [bonusGamesRemaining, setBonusGamesRemaining] = useState(0);
  const [lastWin, setLastWin] = useState<{ label: string; payout: number; isReplay: boolean } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showHitEffect, setShowHitEffect] = useState(false);

  const activePlayer = useMemo(() => {
    const id = activePlayerId ?? players[0]?.id ?? null;
    return players.find((p) => p.id === id) ?? players[0] ?? null;
  }, [activePlayerId, players]);

  const nextStoppableIndex = useMemo(() => {
    const idx = reelResults.findIndex((r) => r === null);
    return idx >= 0 ? idx : reelCount;
  }, [reelResults, reelCount]);

  const canStop = useCallback(
    (reelIndex: number) =>
      isSpinning &&
      reelResults[reelIndex] === null &&
      nextStoppableIndex === reelIndex,
    [isSpinning, reelResults, nextStoppableIndex]
  );

  const allStopped = useMemo(
    () => reelResults.length === reelCount && reelResults.every((r) => r !== null),
    [reelResults, reelCount]
  );

  // 旧グローバル履歴をプレイヤー別 spinHistory に移行（1回だけ）
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

  const handleSpin = useCallback(() => {
    if (strips.some((s) => s.length === 0)) return;
    const player = activePlayer;
    if (!player) return;
    const bet = player.defaultBet;
    const inBonus = bonusGamesRemaining > 0;
    if (!replayFreeSpin && !inBonus && player.balance < bet) return;

    if (ceilingReached) {
      const bonusIds = getBonusSymbolIds(strips);
      if (bonusIds.length > 0) {
        const forced = pickCeilingBonusIndices(strips, bonusIds);
        setReelResults(forced);
        setCeilingReached(false);
        setCeilingCount(0);
        const paylines = normalizePaylines(settings.paylines, strips.length, settings.visibleRows ?? 1);
        const winResult = checkPaylines(forced, strips, paylines, settings.visibleRows ?? 1);
        const payout = bet * winResult.multiplier + (winResult.isReplay ? bet : 0);
        const deduct = replayFreeSpin ? 0 : bet;
        setLastWin({
          label: winResult.symbol?.label ?? "ボーナス",
          payout,
          isReplay: winResult.isReplay,
        });
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, balance: p.balance - deduct + payout } : p
          )
        );
        if (replayFreeSpin) setReplayFreeSpin(false);
        if (winResult.isReplay) setReplayFreeSpin(true);
        const bonusCount = settings.bonusGamesCount ?? 15;
        if (bonusCount > 0 && winResult.symbol?.role === "bonus") {
          setBonusGamesRemaining(bonusCount);
        }
        const ceilingRecord: Omit<SlotSpinRecord, "id"> = {
          timestamp: Date.now(),
          playerId: player.id,
          bet,
          reelResults: forced,
          payout,
          isReplay: winResult.isReplay,
          bonusTriggered: winResult.symbol?.role === "bonus",
          inBonus: false,
          ceilingTriggered: true,
          winLabels: winResult.wins.map((w) => w.symbol.label),
        };
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? { ...p, spinHistory: appendSpinRecord(p.spinHistory ?? [], ceilingRecord) }
              : p
          )
        );
      }
      return;
    }

    if (!replayFreeSpin && !inBonus) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, balance: p.balance - bet } : p
        )
      );
    } else {
      setReplayFreeSpin(false);
    }

    const pendingResults = strips.slice(0, reelCount).map((strip) => pickSymbolByWeight(strip));
    pendingReelResultsRef.current = pendingResults;
    setReelResults(Array(reelCount).fill(null));
    setIsSpinning(true);
    setLastWin(null);
    playSlotSound("spin", settings.soundEnabled);
    setCeilingCount((c) => {
      if (inBonus) return c;
      const next = c + 1;
      const ceiling = settings.ceilingSpins;
      if (ceiling > 0 && next >= ceiling) {
        setCeilingReached(true);
        return 0;
      }
      return next;
    });
  }, [
    strips,
    activePlayer,
    replayFreeSpin,
    bonusGamesRemaining,
    ceilingReached,
    reelCount,
    settings.ceilingSpins,
    settings.bonusGamesCount,
    settings.paylines,
    settings.visibleRows,
    setPlayers,
  ]);

  const handleStop = useCallback(
    (reelIndex: number) => {
      if (!canStop(reelIndex)) return;
      const pending = pendingReelResultsRef.current;
      if (!pending || reelIndex >= pending.length) return;
      playSlotSound("stop", settings.soundEnabled);
      const idx = pending[reelIndex];
      setReelResults((prev) => {
        const next = [...prev];
        next[reelIndex] = idx ?? null;
        return next;
      });
    },
    [canStop]
  );

  const appliedWinRef = useRef(false);
  const reachSoundPlayedRef = useRef(false);
  /** ビデオスロット方式: スピン開始時に確定した全リールの止まり位置（ストップで順に表示） */
  const pendingReelResultsRef = useRef<number[] | null>(null);

  const addPlayer = useCallback(
    (name: string) => {
      setPlayers((prev) => [...prev, createDefaultPlayer(name)]);
    },
    [setPlayers]
  );

  const removePlayer = useCallback(
    (id: string) => {
      const next = players.filter((p) => p.id !== id);
      if (next.length === 0) return;
      setPlayers(next);
      if (activePlayerId === id) setActivePlayerId(next[0]?.id ?? null);
    },
    [players, activePlayerId, setPlayers, setActivePlayerId]
  );

  const updatePlayer = useCallback(
    (
      id: string,
      patch: { name?: string; balance?: number; defaultBet?: number }
    ) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id !== id
            ? p
            : {
                ...p,
                ...(patch.name !== undefined && { name: patch.name || p.name }),
                ...(patch.balance !== undefined && { balance: Math.max(0, patch.balance) }),
                ...(patch.defaultBet !== undefined && {
                  defaultBet: Math.max(1, patch.defaultBet),
                }),
              }
        )
      );
    },
    [setPlayers]
  );

  const handleSaveSlotTemplate = useCallback(
    (name: string) => {
      const reelStripIds = strips.map((strip) => strip.map((s) => s.id));
      const t = createSlotTemplate(
        name,
        reelCount,
        settings.ceilingSpins,
        symbolMaster,
        reelStripIds
      );
      setTemplates((prev) =>
        [...prev.filter((x) => x.id !== t.id), t].slice(-MAX_SAVED_SLOT_TEMPLATES)
      );
    },
    [strips, reelCount, settings.ceilingSpins, symbolMaster, setTemplates]
  );

  const handleLoadSlotTemplate = useCallback(
    (templateId: string) => {
      const t = templates.find((x) => x.id === templateId);
      if (!t) return;
      setSettings((prev) => ({
        ...prev,
        reelCount: t.reelCount,
        ceilingSpins: t.ceilingSpins,
      }));
      setSymbolMaster(t.symbolMaster);
      setReelStrips(
        normalizeReelStripsForLoad(
          t.reelStrips,
          t.reelCount,
          t.symbolMaster
        )
      );
    },
    [templates, setSettings, setSymbolMaster, setReelStrips]
  );

  const handleApplyNumbers17Preset = useCallback(() => {
    const { symbolMaster: master, reelStrips: strips } = getNumbers17Preset();
    setSymbolMaster(master);
    setReelStrips(strips);
    setSettings((prev) => ({
      ...prev,
      reelCount: 3,
      ceilingSpins: 0,
      bonusGamesCount: 0,
    }));
  }, [setSymbolMaster, setReelStrips, setSettings]);

  useEffect(() => {
    if (!allStopped || !isSpinning || !activePlayer) return;
    if (appliedWinRef.current) return;
    appliedWinRef.current = true;
    const wasInBonus = bonusGamesRemaining > 0;
    const results = reelResults as number[];
    const visibleRows = settings.visibleRows ?? 1;
    const paylines = normalizePaylines(settings.paylines, strips.length, visibleRows);
    const winResult = checkPaylines(results, strips, paylines, visibleRows);
    const bet = activePlayer.defaultBet;
    let payout = bet * winResult.multiplier;
    if (winResult.isReplay) {
      payout += bet;
      setReplayFreeSpin(true);
    }
    const bonusCount = settings.bonusGamesCount ?? 15;
    if (winResult.win && winResult.symbol?.role === "bonus" && bonusCount > 0) {
      setBonusGamesRemaining(bonusCount);
    }
    const winInfo =
      winResult.win
        ? { label: winResult.symbol?.label ?? "", payout, isReplay: winResult.isReplay }
        : null;
    setLastWin(winInfo);
    setShowFlash(!!winInfo);
    setShowHitEffect(!!(winInfo && (winInfo.isReplay || (winResult.symbol?.role === "bonus") || payout >= 10)));
    if (winResult.win) playSlotSound("win", settings.soundEnabled);
    if (winResult.win && (payout > 0 || winResult.isReplay)) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === activePlayer.id ? { ...p, balance: p.balance + payout } : p
        )
      );
    }
    if (wasInBonus) {
      setBonusGamesRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        const artAdd =
          settings.artEnabled && (settings.artAddGames ?? 0) > 0 && winResult.wins.some((w) => w.symbol.role === "bonus")
            ? settings.artAddGames ?? 0
            : 0;
        return next + artAdd;
      });
    }
    const record: Omit<SlotSpinRecord, "id"> = {
      timestamp: Date.now(),
      playerId: activePlayer.id,
      bet,
      reelResults: results,
      payout,
      isReplay: winResult.isReplay,
      bonusTriggered: !!(winResult.win && winResult.symbol?.role === "bonus"),
      inBonus: wasInBonus,
      ceilingTriggered: false,
      winLabels: winResult.wins.map((w) => w.symbol.label),
    };
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === activePlayer.id
          ? { ...p, spinHistory: appendSpinRecord(p.spinHistory ?? [], record) }
          : p
      )
    );
    pendingReelResultsRef.current = null;
    setIsSpinning(false);
  }, [allStopped, isSpinning, activePlayer, reelResults, strips, setPlayers, settings.soundEnabled, settings.paylines, settings.visibleRows, bonusGamesRemaining, settings.bonusGamesCount]);

  useEffect(() => {
    if (!showFlash) return;
    const t = setTimeout(() => setShowFlash(false), 400);
    return () => clearTimeout(t);
  }, [showFlash]);

  useEffect(() => {
    if (!showHitEffect) return;
    const t = setTimeout(() => setShowHitEffect(false), 2500);
    return () => clearTimeout(t);
  }, [showHitEffect]);

  useEffect(() => {
    if (!isSpinning) appliedWinRef.current = false;
  }, [isSpinning]);

  useEffect(() => {
    if (!isSpinning) reachSoundPlayedRef.current = false;
  }, [isSpinning]);

  useEffect(() => {
    if (playerHistoryViewId && !players.some((p) => p.id === playerHistoryViewId)) {
      setPlayerHistoryViewId(null);
    }
  }, [playerHistoryViewId, players]);

  const isReach = useMemo(() => {
    if (!isSpinning || strips.length < 3) return false;
    const r0 = reelResults[0];
    const r1 = reelResults[1];
    if (r0 == null || r1 == null) return false;
    const s0 = strips[0];
    const s1 = strips[1];
    if (!s0?.[r0] || !s1?.[r1]) return false;
    return s0[r0].id === s1[r1].id && nextStoppableIndex === 2;
  }, [isSpinning, strips, reelResults, nextStoppableIndex]);

  useEffect(() => {
    if (isReach && !reachSoundPlayedRef.current && settings.soundEnabled) {
      reachSoundPlayedRef.current = true;
      playSlotSound("reach", true);
    }
  }, [isReach, settings.soundEnabled]);

  const { glassBorder } = useGlassStyle(isLightMode);
  const accentColor = settings.accentColor ?? "#a855f7";
  const orbIntensity = settings.orbIntensity ?? 50;
  const displayLight = isLightMode;
  const headerBgSolid = displayLight ? "rgb(255,255,255)" : "rgb(20,10,40)";
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const showHamburger = isSplitMode || !isDesktop;
  const showSidebar = (!isSplitMode && isDesktop) || sidebarOpen;

  const sidebarResizeRafRef = useRef<number | null>(null);
  const sidebarResizePendingRef = useRef<number | null>(null);

  const applyResize = useCallback(
    (clientX: number, startX: number, startW: number) => {
      const newW = Math.min(720, Math.max(200, startW + (clientX - startX)));
      sidebarResizePendingRef.current = newW;
      if (sidebarResizeRafRef.current !== null) return;
      sidebarResizeRafRef.current = requestAnimationFrame(() => {
        sidebarResizeRafRef.current = null;
        const w = sidebarResizePendingRef.current;
        if (w !== null) setSidebarWidthPx(w);
      });
    },
    [setSidebarWidthPx]
  );

  const handleSidebarResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startW = sidebarWidthPx;
      const onMove = (moveEvent: MouseEvent) =>
        applyResize(moveEvent.clientX, startX, startW);
      const onUp = () => {
        if (sidebarResizeRafRef.current !== null) {
          cancelAnimationFrame(sidebarResizeRafRef.current);
          sidebarResizeRafRef.current = null;
        }
        const pending = sidebarResizePendingRef.current;
        if (pending !== null) setSidebarWidthPx(pending);
        sidebarResizePendingRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [sidebarWidthPx, setSidebarWidthPx, applyResize]
  );

  const handleSidebarResizeTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const startX = e.changedTouches[0]!.clientX;
      const startW = sidebarWidthPx;
      const onMove = (moveEvent: TouchEvent) => {
        if (moveEvent.changedTouches.length === 0) return;
        moveEvent.preventDefault();
        applyResize(moveEvent.changedTouches[0]!.clientX, startX, startW);
      };
      const onEnd = () => {
        const pending = sidebarResizePendingRef.current;
        if (pending !== null) setSidebarWidthPx(pending);
        sidebarResizePendingRef.current = null;
        document.removeEventListener("touchmove", onMove, { capture: true } as any);
        document.removeEventListener("touchend", onEnd);
        document.removeEventListener("touchcancel", onEnd);
      };
      document.addEventListener("touchmove", onMove, {
        passive: false,
        capture: true,
      } as any);
      document.addEventListener("touchend", onEnd);
      document.addEventListener("touchcancel", onEnd);
    },
    [sidebarWidthPx, setSidebarWidthPx, applyResize]
  );

  const gameArea = (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 gap-6 relative z-10">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <select
            value={activePlayer?.id ?? ""}
            onChange={(e) => setActivePlayerId(e.target.value || null)}
            className={`text-sm rounded-lg px-3 py-1.5 border ${
              displayLight
                ? "bg-white border-gray-200 text-gray-800"
                : "bg-white/10 border-white/20 text白"
            }`}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（残高 {p.balance} 枚 · BET {p.defaultBet} 枚）
              </option>
            ))}
          </select>
        </div>
      </div>
      {settings.ceilingSpins > 0 && (
        <p
          className={`text-xs ${
            displayLight ? "text-gray-500" : "text-white/60"
          }`}
        >
          天井まで {Math.max(0, settings.ceilingSpins - ceilingCount)} 回
        </p>
      )}
      {bonusGamesRemaining > 0 && (
        <p
          className={`text-sm font-bold ${
            displayLight ? "text-amber-600" : "text-amber-400"
          }`}
        >
          BONUS 残り {bonusGamesRemaining} ゲーム
        </p>
      )}
      {activePlayer && (
        <p
          className={`text-xs ${
            displayLight ? "text-gray-500" : "text-white/50"
          }`}
        >
          理論機械割{" "}
          {calculateTheoreticalPayoutPercent(
            strips,
            activePlayer.defaultBet,
            normalizePaylines(settings.paylines, strips.length, settings.visibleRows ?? 1),
            settings.visibleRows ?? 1
          ).toFixed(1)}
          %
        </p>
      )}

      <div className="flex gap-4 flex-wrap justify-center items-end">
        {strips.map((strip, i) => {
          const resultIdx = reelResults[i] ?? null;
          const canStopThis = canStop(i);
          return (
            <SlotReel
              key={i}
              symbols={strip}
              isSpinning={isSpinning && resultIdx === null}
              stoppedIndex={resultIdx}
              onStop={() => handleStop(i)}
              canStop={canStopThis}
              isLightMode={displayLight}
              accentColor={accentColor}
              isReach={i === 2 && isReach}
              visibleRows={settings.visibleRows ?? 1}
            />
          );
        })}
      </div>

      <p
        className={`text-xs ${
          displayLight ? "text-gray-500" : "text-white/50"
        }`}
      >
        左→中→右の順に止めてください
      </p>

      <button
        type="button"
        onClick={handleSpin}
        disabled={
          isSpinning ||
          strips.some((s) => s.length === 0) ||
          !activePlayer ||
          (bonusGamesRemaining === 0 &&
            !replayFreeSpin &&
            (activePlayer?.balance ?? 0) <
              (activePlayer?.defaultBet ?? 0))
        }
        className={`px-6 py-3 rounded-xl font-semibold transition ${
          displayLight
            ? "bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500"
            : "bg-purple-500/80 text-white hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/40"
        }`}
      >
        スピン
      </button>

      {lastWin && (
        <p
          className={`text-sm font-medium ${
            displayLight ? "text-green-700" : "text-green-400"
          }`}
        >
          {lastWin.isReplay
            ? "REPLAY!"
            : `${lastWin.label} ${lastWin.payout} 枚`}
        </p>
      )}
    </div>
  );

  return (
    <div
      className={`flex flex-col overflow-hidden relative z-10 min-w-0 pt-14 ${
        isSplitMode ? "h-full w-full" : "h-screen w-screen"
      }`}
    >
      {/* 背景オーブ */}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${
          displayLight ? "mix-blend-multiply opacity-20" : "opacity-80"
        }`}
      >
        <motion.div
          animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            opacity: (orbIntensity / 100) * (displayLight ? 1.5 : 1),
          }}
        />
        <motion.div
          animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`,
            opacity: (orbIntensity / 100) * 0.8 * (displayLight ? 1.5 : 1),
          }}
        />
      </div>

      {/* ヘッダー */}
      <header
        className={`${
          isSplitMode ? "absolute" : "fixed"
        } top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 min-h-[56px] shrink-0`}
        style={{
          background: headerBgSolid,
          borderBottom: `1px solid ${glassBorder}`,
        }}
      >
        <div className="flex items-center gap-2">
          {showHamburger && (
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 rounded-lg transition-all shrink-0 ${
                displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"
              }`}
              title="メニュー"
              aria-label="メニュー"
            >
              <Menu size={18} />
            </button>
          )}
          {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettingsPanel(true)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${
              displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"
            }`}
            title="設定"
            aria-label="設定"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${
              displayLight ? "text-gray-600 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"
            }`}
            title={isLightMode ? "ダークモード" : "ライトモード"}
            aria-label={isLightMode ? "ダークモード" : "ライトモード"}
          >
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {settings.effectsEnabled !== false && showFlash && (
          <motion.div
            className="fixed inset-0 z-[75] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ background: accentColor }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettingsPanel && (
          <SlotSettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            isLightMode={displayLight}
            onClose={() => setShowSettingsPanel(false)}
          />
        )}
      </AnimatePresence>
      <RouletteHitEffect
        show={settings.effectsEnabled !== false && showHitEffect}
        onComplete={() => setShowHitEffect(false)}
        accentColor={accentColor}
        hitNames={lastWin ? [lastWin.isReplay ? "REPLAY!" : `${lastWin.label} ${lastWin.payout}枚`] : []}
        effectLevel="low"
      />

      {/* メイン */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-0 p-4 overflow-auto scroll-touch relative z-10">
        {!isSplitMode && isDesktop ? (
          <>
            <aside
              className="h-full flex flex-col overflow-hidden shrink-0 pr-3 min-w-0"
              style={{
                width: sidebarWidthPx,
                minWidth: 200,
                maxWidth: 720,
                borderRight: `1px solid ${glassBorder}`,
              }}
            >
              <div
                className="flex border-b shrink-0 flex-wrap gap-2 px-3 pt-3 pb-2"
                style={{ borderColor: glassBorder }}
              >
                {[
                  { id: "reel" as const, label: "リール・図柄" },
                  { id: "players" as const, label: "プレイヤー" },
                  { id: "templates" as const, label: "テンプレート" },
                  { id: "stats" as const, label: "統計" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSidebarTab(tab.id)}
                    className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-lg ${
                      sidebarTab === tab.id
                        ? displayLight
                          ? "bg-white/90 text-gray-800 border border-teal-500"
                          : "bg-white/10 text-white border border-teal-400"
                        : displayLight
                          ? "text-gray-600 hover:bg-gray-100 border border-transparent"
                          : "text-white/60 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col mt-3 px-3 pb-3">
                {sidebarTab === "reel" && (
                  <SlotReelSymbolPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    symbolMaster={symbolMaster}
                    onSymbolMasterChange={setSymbolMaster}
                    reelStripIds={reelStrips as string[][]}
                    onReelStripIdsChange={setReelStrips as (ids: string[][]) => void}
                    isLightMode={displayLight}
                  />
                )}
                {sidebarTab === "templates" && (
                  <SlotTemplatePanel
                    symbolMaster={symbolMaster}
                    onSymbolMasterChange={setSymbolMaster}
                    templates={templates}
                    onSaveTemplate={handleSaveSlotTemplate}
                    onLoadTemplate={handleLoadSlotTemplate}
                    isLightMode={displayLight}
                    onApplyNumbers17Preset={handleApplyNumbers17Preset}
                  />
                )}
                {sidebarTab === "players" &&
                  (playerHistoryViewId ? (
                    (() => {
                      const p = players.find((x) => x.id === playerHistoryViewId);
                      return p ? (
                        <SlotPlayerHistoryCard
                          player={p}
                          isLightMode={displayLight}
                          onClose={() => setPlayerHistoryViewId(null)}
                        />
                      ) : null;
                    })()
                  ) : (
                    <SlotPlayerManager
                      players={players}
                      activePlayerId={activePlayer?.id ?? null}
                      onSelectPlayer={(id) => setActivePlayerId(id)}
                      onAddPlayer={addPlayer}
                      onRemovePlayer={removePlayer}
                      onUpdatePlayer={updatePlayer}
                      isLightMode={displayLight}
                      onViewPlayerHistory={setPlayerHistoryViewId}
                    />
                  ))}
                {sidebarTab === "stats" && (
                  <SlotStatsPanel
                    players={players}
                    isLightMode={displayLight}
                  />
                )}
              </div>
            </aside>
            <div
              role="separator"
              aria-label="サイドバー幅を調節"
              onMouseDown={handleSidebarResizeStart}
              onTouchStart={handleSidebarResizeTouchStart}
              className="shrink-0 w-4 h-full cursor-col-resize select-none flex items-center justify-center group touch-manipulation"
              style={{ minWidth: 16 }}
            >
              <span
                className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: glassBorder }}
              />
            </div>
            {gameArea}
          </>
        ) : (
          <>
            <AnimatePresence>
              {showSidebar && (
                <>
                  {!isDesktop && (
                    <motion.div
                      key="slot-sidebar-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 z-[38] bg-black/50"
                      onClick={() => setSidebarOpen(false)}
                      aria-hidden
                    />
                  )}
                  <motion.aside
                    key="slot-sidebar"
                    initial={isDesktop ? { width: 0, opacity: 0 } : { x: "-100%" }}
                    animate={isDesktop ? { width: "auto", opacity: 1 } : { x: 0 }}
                    exit={isDesktop ? { width: 0, opacity: 0 } : { x: "-100%" }}
                    transition={
                      isDesktop
                        ? undefined
                        : { type: "spring", damping: 25, stiffness: 300 }
                    }
                    className={`shrink-0 flex flex-col min-h-0 overflow-hidden ${
                      isSplitMode
                        ? "absolute top-14 left-0 right-0 bottom-0 max-md:top-14 z-40"
                        : "max-md:fixed max-md:left-0 max-md:top-14 max-md:bottom-0 max-md:z-40 max-md:shadow-2xl md:relative md:w-72"
                    }`}
                    style={
                      !isDesktop && !isSplitMode
                        ? {
                            width: "min(320px, 90vw)",
                            maxWidth: "min(320px, 90vw)",
                            background: headerBgSolid,
                          }
                        : undefined
                    }
                  >
                    <div
                      className={`flex items-center border-b shrink-0 gap-2 px-3 pb-2 ${
                        !isDesktop && !isSplitMode ? "pt-3 mt-1" : "pt-3"
                      }`}
                      style={{
                        borderColor: glassBorder,
                        background:
                          !isDesktop && !isSplitMode ? headerBgSolid : undefined,
                      }}
                    >
                      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                        {[
                          { id: "reel" as const, label: "リール・図柄" },
                          { id: "players" as const, label: "プレイヤー" },
                          { id: "templates" as const, label: "テンプレート" },
                          { id: "stats" as const, label: "統計" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSidebarTab(tab.id)}
                            className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-lg touch-manipulation ${
                              sidebarTab === tab.id
                                ? displayLight
                                  ? "bg-white/90 text-gray-800 border border-teal-500"
                                  : "bg-white/10 text-white border border-teal-400"
                                : displayLight
                                  ? "text-gray-600 hover:bg-gray-100 border border-transparent"
                                  : "text-white/60 hover:bg-white/5 border border-transparent"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      {showHamburger && (
                        <button
                          type="button"
                          onClick={() => setSidebarOpen(false)}
                          className={`shrink-0 p-2 rounded-lg touch-manipulation ${
                            displayLight
                              ? "text-gray-600 hover:bg-gray-100"
                              : "text-white/60 hover:bg-white/10"
                          }`}
                          aria-label="メニューを閉じる"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-3 px-3 pb-4">
                      {sidebarTab === "reel" && (
                        <SlotReelSymbolPanel
                          settings={settings}
                          onSettingsChange={setSettings}
                          symbolMaster={symbolMaster}
                          onSymbolMasterChange={setSymbolMaster}
                          reelStripIds={reelStrips as string[][]}
                          onReelStripIdsChange={
                            setReelStrips as (ids: string[][]) => void
                          }
                          isLightMode={displayLight}
                        />
                      )}
                      {sidebarTab === "templates" && (
                        <SlotTemplatePanel
                          symbolMaster={symbolMaster}
                          onSymbolMasterChange={setSymbolMaster}
                          templates={templates}
                          onSaveTemplate={handleSaveSlotTemplate}
                          onLoadTemplate={handleLoadSlotTemplate}
                          isLightMode={displayLight}
                          onApplyNumbers17Preset={handleApplyNumbers17Preset}
                        />
                      )}
                      {sidebarTab === "players" &&
                        (playerHistoryViewId ? (
                          (() => {
                            const p = players.find((x) => x.id === playerHistoryViewId);
                            return p ? (
                              <SlotPlayerHistoryCard
                                player={p}
                                isLightMode={displayLight}
                                onClose={() => setPlayerHistoryViewId(null)}
                              />
                            ) : null;
                          })()
                        ) : (
                          <SlotPlayerManager
                            players={players}
                            activePlayerId={activePlayer?.id ?? null}
                            onSelectPlayer={(id) => setActivePlayerId(id)}
                            onAddPlayer={addPlayer}
                            onRemovePlayer={removePlayer}
                            onUpdatePlayer={updatePlayer}
                            isLightMode={displayLight}
                            onViewPlayerHistory={setPlayerHistoryViewId}
                          />
                        ))}
                      {sidebarTab === "stats" && (
                        <SlotStatsPanel
                          players={players}
                          isLightMode={displayLight}
                        />
                      )}
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
            {gameArea}
          </>
        )}
      </main>
    </div>
  );
}
