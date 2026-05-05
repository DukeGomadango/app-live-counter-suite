"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  type SlotSymbol,
  type SlotPlayer,
  type SlotSettings,
  type SlotSpinRecord,
  pickSymbolByWeight,
  checkPaylines,
  normalizePaylines,
  getBonusSymbolIds,
  pickCeilingBonusIndices,
  appendSpinRecord,
  createDefaultPlayer,
} from "@/lib/slot";

interface SlotEngineProps {
  strips: SlotSymbol[][];
  settings: SlotSettings;
  activePlayer: SlotPlayer | null;
  setPlayers: (updater: (prev: SlotPlayer[]) => SlotPlayer[]) => void;
  reelCount: number;
}

function playSlotSound(slug: "spin" | "stop" | "reach" | "win", enabled: boolean) {
  if (!enabled) return;
  const a = new Audio(`/sounds/slot/${slug}.mp3`);
  a.play().catch(() => {});
}

export function useSlotEngine({
  strips,
  settings,
  activePlayer,
  setPlayers,
  reelCount
}: SlotEngineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelResults, setReelResults] = useState<(number | null)[]>([]);
  const [ceilingCount, setCeilingCount] = useState(0);
  const [ceilingReached, setCeilingReached] = useState(false);
  const [replayFreeSpin, setReplayFreeSpin] = useState(false);
  const [bonusGamesRemaining, setBonusGamesRemaining] = useState(0);
  const [lastWin, setLastWin] = useState<{ label: string; payout: number; isReplay: boolean } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showHitEffect, setShowHitEffect] = useState(false);

  const appliedWinRef = useRef(false);
  const reachSoundPlayedRef = useRef(false);
  const pendingReelResultsRef = useRef<number[] | null>(null);

  const nextStoppableIndex = useMemo(() => {
    const idx = reelResults.findIndex((r) => r === null);
    return idx >= 0 ? idx : reelCount;
  }, [reelResults, reelCount]);

  const allStopped = useMemo(
    () => reelResults.length === reelCount && reelResults.every((r) => r !== null),
    [reelResults, reelCount]
  );

  const canStop = useCallback(
    (reelIndex: number) =>
      isSpinning &&
      reelResults[reelIndex] === null &&
      nextStoppableIndex === reelIndex,
    [isSpinning, reelResults, nextStoppableIndex]
  );

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
    settings,
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
    [canStop, settings.soundEnabled]
  );

  // Win calculation effect
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
    }
    const bonusCount = settings.bonusGamesCount ?? 15;
    const winInfo =
      winResult.win
        ? { label: winResult.symbol?.label ?? "", payout, isReplay: winResult.isReplay }
        : null;
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
    queueMicrotask(() => {
      if (winResult.isReplay) setReplayFreeSpin(true);
      if (winResult.win && winResult.symbol?.role === "bonus" && bonusCount > 0) {
        setBonusGamesRemaining(bonusCount);
      }
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
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === activePlayer.id
            ? { ...p, spinHistory: appendSpinRecord(p.spinHistory ?? [], record) }
            : p
        )
      );
      pendingReelResultsRef.current = null;
      setIsSpinning(false);
    });
  }, [allStopped, isSpinning, activePlayer, reelResults, strips, setPlayers, settings, bonusGamesRemaining]);

  useEffect(() => {
    if (!isSpinning) {
      appliedWinRef.current = false;
      reachSoundPlayedRef.current = false;
    }
  }, [isSpinning]);

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

  return {
    isSpinning,
    reelResults,
    ceilingCount,
    ceilingReached,
    replayFreeSpin,
    bonusGamesRemaining,
    lastWin,
    showFlash,
    showHitEffect,
    handleSpin,
    handleStop,
    nextStoppableIndex,
    allStopped,
    isReach
  };
}
