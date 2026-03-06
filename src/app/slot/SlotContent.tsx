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
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";
import { X } from "lucide-react";
import {
  type SlotSymbol,
  type SlotPlayer,
  type SlotSettings,
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
  checkWin,
  getBonusSymbolIds,
  pickCeilingBonusIndices,
  calculateTheoreticalPayoutPercent,
  MIN_REEL_COUNT,
  MAX_REEL_COUNT,
} from "@/lib/slot";

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
  const [showPlayerManager, setShowPlayerManager] = useState(false);

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

  const handleSpin = useCallback(() => {
    if (strips.some((s) => s.length === 0)) return;
    const player = activePlayer;
    if (!player) return;
    const bet = player.defaultBet;
    if (!replayFreeSpin && player.balance < bet) return;

    if (ceilingReached) {
      const bonusIds = getBonusSymbolIds(strips);
      if (bonusIds.length > 0) {
        const forced = pickCeilingBonusIndices(strips, bonusIds);
        setReelResults(forced);
        setCeilingReached(false);
        setCeilingCount(0);
        const winResult = checkWin(forced, strips);
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
      }
      return;
    }

    if (!replayFreeSpin) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, balance: p.balance - bet } : p
        )
      );
    } else {
      setReplayFreeSpin(false);
    }

    setReelResults(Array(reelCount).fill(null));
    setIsSpinning(true);
    setLastWin(null);
    playSlotSound("spin", settings.soundEnabled);
    setCeilingCount((c) => {
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
    ceilingReached,
    reelCount,
    settings.ceilingSpins,
    setPlayers,
  ]);

  const handleStop = useCallback(
    (reelIndex: number) => {
      if (!canStop(reelIndex)) return;
      const strip = strips[reelIndex];
      if (!strip || strip.length === 0) return;
      playSlotSound("stop", settings.soundEnabled);
      const idx = pickSymbolByWeight(strip);
      setReelResults((prev) => {
        const next = [...prev];
        next[reelIndex] = idx;
        return next;
      });
    },
    [canStop, strips, settings.soundEnabled]
  );

  const appliedWinRef = useRef(false);
  const reachSoundPlayedRef = useRef(false);

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

  useEffect(() => {
    if (!allStopped || !isSpinning || !activePlayer) return;
    if (appliedWinRef.current) return;
    appliedWinRef.current = true;
    const results = reelResults as number[];
    const winResult = checkWin(results, strips);
    const bet = activePlayer.defaultBet;
    let payout = bet * winResult.multiplier;
    if (winResult.isReplay) {
      payout += bet;
      setReplayFreeSpin(true);
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
    setIsSpinning(false);
  }, [allStopped, isSpinning, activePlayer, reelResults, strips, setPlayers, settings.soundEnabled]);

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
        {showFlash && (
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
            symbolMaster={symbolMaster}
            onSymbolMasterChange={setSymbolMaster}
            reelStripIds={!isLegacyStrips ? (reelStrips as string[][]) : undefined}
            onReelStripIdsChange={setReelStrips as (v: string[][]) => void}
            reelCount={reelCount}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPlayerManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowPlayerManager(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-md max-h-[85vh] rounded-2xl overflow-hidden"
              style={{
                background: displayLight ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.95)",
                border: `1px solid ${glassBorder}`,
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: glassBorder }}
              >
                <h2
                  className={`font-semibold ${
                    displayLight ? "text-gray-800" : "text-white/95"
                  }`}
                >
                  プレイヤー管理
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPlayerManager(false)}
                  className={`p-1.5 rounded-lg ${
                    displayLight
                      ? "hover:bg-gray-200 text-gray-600"
                      : "hover:bg-white/10 text-white/80"
                  }`}
                  aria-label="閉じる"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <SlotPlayerManager
                  players={players}
                  activePlayerId={activePlayer?.id ?? null}
                  onSelectPlayer={(id) => setActivePlayerId(id)}
                  onAddPlayer={addPlayer}
                  onRemovePlayer={removePlayer}
                  onUpdatePlayer={updatePlayer}
                  isLightMode={displayLight}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <RouletteHitEffect
        show={showHitEffect}
        onComplete={() => setShowHitEffect(false)}
        accentColor={accentColor}
        hitNames={lastWin ? [lastWin.isReplay ? "REPLAY!" : `${lastWin.label} ${lastWin.payout}枚`] : []}
        effectLevel="low"
      />

      {/* メイン */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 gap-6 relative z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <select
              value={activePlayer?.id ?? ""}
              onChange={(e) => setActivePlayerId(e.target.value || null)}
              className={`text-sm rounded-lg px-3 py-1.5 border ${
                displayLight ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"
              }`}
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（残高 {p.balance} 枚 · BET {p.defaultBet} 枚）
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowPlayerManager(true)}
              className={`text-sm rounded-lg px-3 py-1.5 border transition ${
                displayLight
                  ? "border-gray-200 text-gray-700 hover:bg-gray-100"
                  : "border-white/20 text-white/90 hover:bg-white/10"
              }`}
            >
              プレイヤー管理
            </button>
          </div>
        </div>
        {settings.ceilingSpins > 0 && (
          <p className={`text-xs ${displayLight ? "text-gray-500" : "text-white/60"}`}>
            天井まで {Math.max(0, settings.ceilingSpins - ceilingCount)} 回
          </p>
        )}
        {activePlayer && (
          <p className={`text-xs ${displayLight ? "text-gray-500" : "text-white/50"}`}>
            理論機械割 {calculateTheoreticalPayoutPercent(strips, activePlayer.defaultBet).toFixed(1)}%
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
              />
            );
          })}
        </div>

        <p className={`text-xs ${displayLight ? "text-gray-500" : "text-white/50"}`}>
          左→中→右の順に止めてください
        </p>

        <button
          type="button"
          onClick={handleSpin}
          disabled={
            isSpinning ||
            strips.some((s) => s.length === 0) ||
            !activePlayer ||
            (!replayFreeSpin && (activePlayer?.balance ?? 0) < (activePlayer?.defaultBet ?? 0))
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
          <p className={`text-sm font-medium ${displayLight ? "text-green-700" : "text-green-400"}`}>
            {lastWin.isReplay ? "REPLAY!" : `${lastWin.label} ${lastWin.payout} 枚`}
          </p>
        )}
      </main>
    </div>
  );
}
