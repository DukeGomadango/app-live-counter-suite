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
  const [guestBalance, setGuestBalance] = useState(1000);
  
  const currentPlayer = useMemo(() => {
    return activePlayer || {
      id: "guest",
      name: "ゲストプレイ",
      balance: guestBalance,
      defaultBet: 1,
    } as SlotPlayer;
  }, [activePlayer, guestBalance]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [reelResults, setReelResults] = useState<(number | null)[]>([]);
  const [ceilingCount, setCeilingCount] = useState(0);
  const [ceilingReached, setCeilingReached] = useState(false);
  const [replayFreeSpin, setReplayFreeSpin] = useState(false);
  const [bonusGamesRemaining, setBonusGamesRemaining] = useState(0);
  const [lastWin, setLastWin] = useState<{ label: string; payout: number; isReplay: boolean } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showHitEffect, setShowHitEffect] = useState(false);

  const [autoSpinRemaining, setAutoSpinRemaining] = useState(0);
  const [autoSpinStats, setAutoSpinStats] = useState<{ spins: number; bet: number; payout: number; bonuses: number; net: number; nearMisses: number; hitSymbols: Record<string, { symbol: SlotSymbol; count: number; totalPayout: number }> } | null>(null);
  const [isTurboMode, setIsTurboMode] = useState(false);
  const autoSpinTimerRef = useRef<number | null>(null);
  const isFirstAutoSpinRef = useRef(false);

  const startAutoSpin = useCallback((count: number) => {
    setAutoSpinRemaining(count);
    setAutoSpinStats({ spins: 0, bet: 0, payout: 0, bonuses: 0, net: 0, nearMisses: 0, hitSymbols: {} });
    isFirstAutoSpinRef.current = true;
  }, []);

  const stopAutoSpin = useCallback(() => {
    setAutoSpinRemaining(0);
    if (autoSpinTimerRef.current) {
      clearTimeout(autoSpinTimerRef.current);
      autoSpinTimerRef.current = null;
    }
  }, []);

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
    const player = currentPlayer;
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
        
        if (player.id === "guest") {
          setGuestBalance(prev => prev - deduct + payout);
        } else {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === player.id ? { ...p, balance: p.balance - deduct + payout } : p
            )
          );
        }
        
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
        
        if (player.id !== "guest") {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === player.id
                ? { ...p, spinHistory: appendSpinRecord(p.spinHistory ?? [], ceilingRecord) }
                : p
            )
          );
        }
      }
      return;
    }

    if (!replayFreeSpin && !inBonus) {
      if (player.id === "guest") {
        setGuestBalance(prev => prev - bet);
      } else {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, balance: p.balance - bet } : p
          )
        );
      }
    } else {
      setReplayFreeSpin(false);
    }

    const actualReelCount = Math.min(reelCount, strips.length);
    const pendingResults = strips.slice(0, actualReelCount).map((strip) => pickSymbolByWeight(strip));
    pendingReelResultsRef.current = pendingResults;
    setReelResults(Array(actualReelCount).fill(null));
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
    currentPlayer,
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

  // Auto-stop effect
  useEffect(() => {
    const shouldAutoStop = settings.autoStopEnabled || autoSpinRemaining > 0;
    if (!shouldAutoStop || !isSpinning) {
      return;
    }
    if (nextStoppableIndex >= reelCount) {
      return;
    }

    let initialDelay = settings.autoStopInitialDelay ?? 1000;
    let interval = settings.autoStopInterval ?? 600;
    if (isTurboMode) {
      initialDelay = 300;
      interval = 150;
    }
    const delay = nextStoppableIndex === 0 ? initialDelay : interval;

    const timer = setTimeout(() => {
      if (canStop(nextStoppableIndex)) {
        handleStop(nextStoppableIndex);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    isSpinning,
    nextStoppableIndex,
    reelCount,
    settings.autoStopEnabled,
    settings.autoStopInitialDelay,
    settings.autoStopInterval,
    autoSpinRemaining,
    isTurboMode,
    canStop,
    handleStop
  ]);

  // Auto-spin chain effect
  useEffect(() => {
    if (isSpinning || autoSpinRemaining <= 0) return;
    if (autoSpinTimerRef.current) clearTimeout(autoSpinTimerRef.current);

    const player = currentPlayer;
    if (!player) {
      setTimeout(stopAutoSpin, 0);
      return;
    }
    const bet = player.defaultBet;
    const inBonus = bonusGamesRemaining > 0;
    
    // Safety stop: out of balance
    if (!replayFreeSpin && !inBonus && player.balance < bet) {
      setTimeout(stopAutoSpin, 0);
      return;
    }
    // Safety stop: Bonus triggered
    if (lastWin && lastWin.label.includes("ボーナス") && !isFirstAutoSpinRef.current) {
      setTimeout(stopAutoSpin, 0);
      return;
    }

    let waitTime = isTurboMode ? (lastWin ? 600 : 150) : (lastWin ? 1800 : 600);
    if (isFirstAutoSpinRef.current) {
      waitTime = 0;
      isFirstAutoSpinRef.current = false;
    }
    
    autoSpinTimerRef.current = window.setTimeout(() => {
      setAutoSpinRemaining(prev => prev === Infinity ? Infinity : prev - 1);
      handleSpin();
    }, waitTime);

    return () => {
      if (autoSpinTimerRef.current) clearTimeout(autoSpinTimerRef.current);
    };
  }, [isSpinning, autoSpinRemaining, isTurboMode, lastWin, currentPlayer, replayFreeSpin, bonusGamesRemaining, stopAutoSpin, handleSpin]);

  // Win calculation effect
  useEffect(() => {
    if (!allStopped || !isSpinning) return;
    if (appliedWinRef.current) return;
    appliedWinRef.current = true;

    if (!currentPlayer) {
      queueMicrotask(() => setIsSpinning(false));
      return;
    }
    const wasInBonus = bonusGamesRemaining > 0;
    const results = reelResults as number[];
    const visibleRows = settings.visibleRows ?? 1;
    const paylines = normalizePaylines(settings.paylines, strips.length, visibleRows);
    const winResult = checkPaylines(results, strips, paylines, visibleRows);
    const bet = currentPlayer.defaultBet;
    let payout = bet * winResult.multiplier;
    if (winResult.isReplay) {
      payout += bet;
    }
    const bonusCount = settings.bonusGamesCount ?? 15;
    const winInfo =
      winResult.win
        ? { label: winResult.symbol?.label ?? "", payout, isReplay: winResult.isReplay }
        : null;

    let isNearMiss = false;
    if (!winResult.win && results.length >= 3) {
      const r0 = results[0];
      const r1 = results[1];
      const r2 = results[2];
      if (r0 != null && r1 != null && r2 != null) {
        const s0 = strips[0]?.[r0]?.id;
        const s1 = strips[1]?.[r1]?.id;
        const s2 = strips[2]?.[r2]?.id;
        if (s0 && s1 && s2) {
          isNearMiss = (s0 === s1) || (s1 === s2) || (s0 === s2);
        }
      }
    }

    const record: Omit<SlotSpinRecord, "id"> = {
      timestamp: Date.now(),
      playerId: currentPlayer.id,
      bet,
      reelResults: results,
      payout,
      isReplay: winResult.isReplay,
      bonusTriggered: !!(winResult.win && winResult.symbol?.role === "bonus"),
      inBonus: wasInBonus,
      ceilingTriggered: false,
      isNearMiss,
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
        if (currentPlayer.id === "guest") {
          setGuestBalance(prev => prev + payout);
        } else {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === currentPlayer.id ? { ...p, balance: p.balance + payout } : p
            )
          );
        }
      }
      setAutoSpinStats(prev => {
        if (!prev) return prev;
        const actualBetPaid = (!winResult.isReplay && !wasInBonus) ? bet : 0;
        
        let isNearMiss = false;
        if (!winResult.win && results.length >= 3) {
          const r0 = results[0];
          const r1 = results[1];
          const r2 = results[2];
          if (r0 != null && r1 != null && r2 != null) {
            const s0 = strips[0]?.[r0]?.id;
            const s1 = strips[1]?.[r1]?.id;
            const s2 = strips[2]?.[r2]?.id;
            if (s0 && s1 && s2) {
              isNearMiss = (s0 === s1) || (s1 === s2) || (s0 === s2);
            }
          }
        }
        
        const newHitSymbols = { ...prev.hitSymbols };
        if (winResult.win && winResult.wins.length > 0) {
          winResult.wins.forEach(w => {
            const sym = w.symbol;
            const existing = newHitSymbols[sym.id] || { symbol: sym, count: 0, totalPayout: 0 };
            
            let linePayout = bet * w.multiplier;
            if (w.isReplay) linePayout += bet; // リプレイの場合はベット額が返る
            
            newHitSymbols[sym.id] = {
              ...existing,
              count: existing.count + 1,
              totalPayout: existing.totalPayout + linePayout
            };
          });
        }
        
        return {
          spins: prev.spins + 1,
          bet: prev.bet + actualBetPaid,
          payout: prev.payout + payout,
          bonuses: prev.bonuses + (winResult.win && winResult.symbol?.role === "bonus" ? 1 : 0),
          net: prev.net + (payout - actualBetPaid),
          nearMisses: prev.nearMisses + (isNearMiss ? 1 : 0),
          hitSymbols: newHitSymbols
        };
      });
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
      if (currentPlayer.id !== "guest") {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === currentPlayer.id
              ? { ...p, spinHistory: appendSpinRecord(p.spinHistory ?? [], record) }
              : p
          )
        );
      }
      pendingReelResultsRef.current = null;
      setIsSpinning(false);
    });
  }, [allStopped, isSpinning, currentPlayer, reelResults, strips, setPlayers, settings, bonusGamesRemaining]);

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
    currentPlayer,
    isSpinning,
    reelResults,
    ceilingCount,
    ceilingReached,
    replayFreeSpin,
    bonusGamesRemaining,
    lastWin,
    showFlash,
    showHitEffect,
    setShowHitEffect,
    autoSpinRemaining,
    autoSpinStats,
    setAutoSpinStats,
    isTurboMode,
    setIsTurboMode,
    startAutoSpin,
    stopAutoSpin,
    handleSpin,
    handleStop,
    canStop,
    nextStoppableIndex,
    allStopped,
    isReach
  };
}
