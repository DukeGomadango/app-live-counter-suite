"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings, ImageDown, X } from "lucide-react";
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
import SlotShareSummary from "@/components/slot/SlotShareSummary";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";

import {
  type SlotSymbol,
  type SlotTemplate,
  createDefaultSymbols,
  createDefaultReelStrips,
  resolveStrip,
  resolveReelStrips,
  isReelStripsLegacyFormat,
  createSlotTemplate,
  normalizeReelStripsForLoad,
  getNumbers17Preset,
  getDefaultSymbolsPreset,
  createDefaultPlayer,
  MIN_REEL_COUNT,
  MAX_REEL_COUNT,
} from "@/lib/slot";

// Hooks
import { useSlotState } from "./hooks/useSlotState";
import { useSlotEngine } from "./hooks/useSlotEngine";
import { useSlotSidebar } from "./hooks/useSlotSidebar";
import { useSlotShare } from "./hooks/useSlotShare";

// Components
import { SlotOrbsBackground } from "./components/SlotOrbsBackground";

const MAX_SAVED_SLOT_TEMPLATES = 30;
const DEFAULT_SYMBOLS = createDefaultSymbols();
const DEFAULT_STRIPS = createDefaultReelStrips(DEFAULT_SYMBOLS);

export default function SlotContent({
  isSplitMode = false,
  isRightPane: _isRightPane = false,
}: {
  isSplitMode?: boolean;
  isRightPane?: boolean;
} = {}) {
  // -- Hooks --
  const {
    symbolMaster, setSymbolMaster,
    reelStrips, setReelStrips,
    settings, setSettings,
    players, setPlayers,
    activePlayerId, setActivePlayerId,
    isLightMode, setIsLightMode,
    templates, setTemplates
  } = useSlotState();
  const {
    sidebarOpen, setSidebarOpen,
    sidebarTab, setSidebarTab,
    playerHistoryViewId, setPlayerHistoryViewId,
    sidebarWidthPx,
    handleSidebarResizeStart,
    handleSidebarResizeTouchStart
  } = useSlotSidebar();

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const reelCount = Math.min(
    MAX_REEL_COUNT,
    Math.max(MIN_REEL_COUNT, settings.reelCount)
  );

  const isLegacyStrips = useMemo(() => isReelStripsLegacyFormat(reelStrips), [reelStrips]);

  // Derived strips
  const strips = useMemo((): SlotSymbol[][] => {
    if (isLegacyStrips) {
      const base = (reelStrips as SlotSymbol[][]).length >= reelCount
          ? (reelStrips as SlotSymbol[][])
          : DEFAULT_STRIPS;
      return base.slice(0, reelCount).map((strip, i) =>
          strip.length > 0 ? strip : (reelStrips as SlotSymbol[][])[i] ?? DEFAULT_STRIPS[i] ?? DEFAULT_STRIPS[0]!
        );
    }
    const ids = reelStrips as string[][];
    const resolved = resolveReelStrips(ids, symbolMaster);
    const padStrip = symbolMaster.length > 0 ? symbolMaster.map((s) => s.id) : [];
    const resolvedPadded = resolved.length >= reelCount ? resolved : [
            ...resolved,
            ...Array.from({ length: reelCount - resolved.length }, () => resolveStrip(padStrip, symbolMaster)),
          ];
    const base = resolvedPadded.slice(0, reelCount);
    const fallback = symbolMaster.length > 0 ? symbolMaster : DEFAULT_SYMBOLS;
    return base.map((strip) => strip.length > 0 ? strip : fallback);
  }, [reelCount, reelStrips, symbolMaster, isLegacyStrips]);

  const activePlayer = useMemo(() => {
    const id = activePlayerId ?? players[0]?.id ?? null;
    return players.find((p) => p.id === id) ?? players[0] ?? null;
  }, [activePlayerId, players]);

  const engine = useSlotEngine({
    strips,
    settings: settings,
    activePlayer,
    setPlayers: setPlayers,
    reelCount
  });

  const slotSharePayload = useMemo(() => {
    const labels = strips.slice(0, reelCount).map((strip, i) => {
      const idx = engine.reelResults[i];
      if (idx == null) return "?";
      const sym = strip[idx % strip.length];
      return sym?.label ?? "?";
    });
    const line = engine.lastWin
      ? engine.lastWin.isReplay ? "REPLAY!" : `${engine.lastWin.label} ${engine.lastWin.payout}枚`
      : "はずれ";
    return { reelLabels: labels, resultLine: line };
  }, [strips, reelCount, engine.reelResults, engine.lastWin]);

  const { handleShare, isCapturing, shareAreaRef } = useSlotShare({
    activePlayerName: activePlayer?.name,
    reelLabels: slotSharePayload.reelLabels,
    resultLine: slotSharePayload.resultLine,
    isLightMode: isLightMode
  });

  // Additional Handlers
  const addPlayer = useCallback((name: string) => {
    setPlayers((prev) => [...prev, createDefaultPlayer(name)]);
  }, [setPlayers]);

  const removePlayer = useCallback((id: string) => {
    const next = players.filter((p) => p.id !== id);
    if (next.length === 0) return;
    setPlayers(next);
    if (activePlayerId === id) setActivePlayerId(next[0]?.id ?? null);
  }, [players, activePlayerId, setPlayers, setActivePlayerId]);

  const updatePlayer = useCallback((id: string, patch: { name?: string; balance?: number; defaultBet?: number }) => {
    setPlayers((prev) => prev.map((p) => p.id !== id ? p : {
      ...p,
      ...(patch.name !== undefined && { name: patch.name || p.name }),
      ...(patch.balance !== undefined && { balance: Math.max(0, patch.balance) }),
      ...(patch.defaultBet !== undefined && { defaultBet: Math.max(1, patch.defaultBet) }),
    }));
  }, [setPlayers]);

  const handleSaveSlotTemplate = useCallback((name: string) => {
    const reelStripIds = strips.map((strip) => strip.map((s) => s.id));
    const t = createSlotTemplate(name, reelCount, settings.ceilingSpins, symbolMaster, reelStripIds);
    setTemplates((prev) => [...prev.filter((x) => x.id !== t.id), t].slice(-MAX_SAVED_SLOT_TEMPLATES));
  }, [strips, reelCount, settings.ceilingSpins, symbolMaster, setTemplates]);

  const handleLoadSlotTemplate = useCallback((templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setSettings((prev) => ({ ...prev, reelCount: t.reelCount, ceilingSpins: t.ceilingSpins }));
    setSymbolMaster(t.symbolMaster);
    setReelStrips(normalizeReelStripsForLoad(t.reelStrips, t.reelCount, t.symbolMaster));
  }, [templates, setSettings, setSymbolMaster, setReelStrips]);

  const handleDeleteSlotTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, [setTemplates]);

  const handleOverwriteSlotTemplate = useCallback((id: string, name: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const reelStripIds = strips.map((strip) => strip.map((s) => s.id));
    const next = createSlotTemplate(name, reelCount, settings.ceilingSpins, symbolMaster, reelStripIds);
    setTemplates((prev) => prev.map((x) => x.id === id ? next : x));
  }, [templates, strips, reelCount, settings.ceilingSpins, symbolMaster, setTemplates]);

  const handleApplyNumbers17Preset = useCallback(() => {
    const { symbolMaster: master, reelStrips: strips } = getNumbers17Preset();
    setSymbolMaster(master);
    setReelStrips(strips);
    setSettings((prev) => ({ ...prev, reelCount: 3, ceilingSpins: 0, bonusGamesCount: 0 }));
  }, [setSymbolMaster, setReelStrips, setSettings]);

  const handleApplyDefaultSymbolsPreset = useCallback(() => {
    const { symbolMaster: master, reelStrips: strips } = getDefaultSymbolsPreset();
    setSymbolMaster(master);
    setReelStrips(strips);
    setSettings((prev) => ({ ...prev, reelCount: 3, ceilingSpins: 0, bonusGamesCount: 15 }));
  }, [setSymbolMaster, setReelStrips, setSettings]);

  const { glassBorder } = useGlassStyle(isLightMode);
  const accentColor = settings.accentColor ?? "#a855f7";
  const orbIntensity = settings.orbIntensity ?? 50;
  const displayLight = isLightMode;
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const showSidebar = (!isSplitMode && isDesktop) || sidebarOpen;

  const gameArea = (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 gap-6 relative z-10">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <select
            value={activePlayerId ?? ""}
            onChange={(e) => setActivePlayerId(e.target.value || null)}
            className={`text-sm rounded-lg px-3 py-1.5 border ${displayLight ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"}`}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}（残高 {p.balance} 枚 · BET {p.defaultBet} 枚）</option>
            ))}
          </select>
        </div>
      </div>
      {settings.ceilingSpins > 0 && (
        <p className={`text-xs ${displayLight ? "text-gray-500" : "text-white/60"}`}>天井まで {Math.max(0, settings.ceilingSpins - engine.ceilingCount)} 回</p>
      )}

      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-b from-white/10 to-transparent rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center justify-center gap-3 md:gap-6 p-4 md:p-8 rounded-[2.5rem] bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl">
          {strips.slice(0, reelCount).map((strip, i) => (
            <SlotReel
              key={i}
              symbols={strip}
              isSpinning={engine.isSpinning}
              stoppedIndex={engine.reelResults[i] ?? null}
              visibleRows={settings.visibleRows ?? 1}
              onStop={() => engine.handleStop(i)}
              canStop={engine.canStop(i)}
              isLightMode={isLightMode}
              accentColor={accentColor}
              isReach={engine.isReach && i === 2}
            />
          ))}
          {engine.showFlash && <div className="absolute inset-0 rounded-[2.5rem] bg-white/20 animate-flash pointer-events-none" />}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={engine.handleSpin}
            disabled={engine.isSpinning || (!engine.replayFreeSpin && engine.bonusGamesRemaining <= 0 && (activePlayer?.balance ?? 0) < (activePlayer?.defaultBet ?? 1))}
            className={`px-12 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all ${engine.isSpinning ? "opacity-50 grayscale" : "hover:shadow-purple-500/20"}`}
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, color: "white" }}
          >
            {engine.replayFreeSpin ? "REPLAY!" : engine.bonusGamesRemaining > 0 ? `BONUS (${engine.bonusGamesRemaining})` : "SPIN"}
          </motion.button>
          {!engine.isSpinning && engine.allStopped && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleShare} className={`p-4 rounded-2xl border transition-all ${displayLight ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`} title="結果を共有">
              <ImageDown size={24} />
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {engine.lastWin && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-gradient-x drop-shadow-sm">{engine.lastWin.isReplay ? "REPLAY!" : "WIN!"}</span>
            <span className={`text-xl font-bold ${displayLight ? "text-gray-800" : "text-white"}`}>{engine.lastWin.isReplay ? "" : `${engine.lastWin.label} ${engine.lastWin.payout} 枚`}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {engine.isReach && <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none z-20"><span className="text-6xl font-black italic text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">REACH!</span></div>}
    </div>
  );

  return (
    <div className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}>
      <SlotOrbsBackground isLightMode={isLightMode} accentColor={accentColor} orbIntensity={orbIntensity} />
      <header className="shrink-0 z-50 flex items-center justify-between px-4 py-3 bg-white/70 dark:bg-black/30 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          {(isSplitMode || !isDesktop) && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><Menu size={20} /></button>
          )}
          {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          <h1 className="text-sm font-bold tracking-tight opacity-80">スロット</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsLightMode(!isLightMode)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">{isLightMode ? <Moon size={18} /> : <Sun size={18} />}</button>
          <button onClick={() => setShowSettingsPanel(true)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><Settings size={18} /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {showSidebar && (
            <>
              {(!isDesktop || isSplitMode) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40" />
              )}
              <motion.aside
                initial={isDesktop && !isSplitMode ? false : { x: -sidebarWidthPx }} animate={{ x: 0 }} exit={{ x: -sidebarWidthPx }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`flex flex-col bg-white/80 dark:bg-black/40 backdrop-blur-xl border-r border-black/5 dark:border-white/5 z-50 ${isDesktop && !isSplitMode ? "relative" : "absolute inset-y-0 left-0"}`}
                style={{ width: sidebarWidthPx }}
              >
                <div className="flex p-2 gap-1 border-b border-black/5 dark:border-white/5">
                  {(["reel", "players", "templates", "stats"] as const).map((tab) => (
                    <button key={tab} onClick={() => setSidebarTab(tab)} className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${sidebarTab === tab ? "bg-black/5 dark:bg-white/10" : "opacity-40 hover:opacity-100"}`}>
                      {tab === "reel" ? "リール" : tab === "players" ? "名簿" : tab === "templates" ? "保存" : "統計"}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  {sidebarTab === "reel" && (
                    <SlotReelSymbolPanel
                      settings={settings}
                      onSettingsChange={setSettings}
                      symbolMaster={symbolMaster}
                      onSymbolMasterChange={setSymbolMaster}
                      reelStripIds={reelStrips as string[][]}
                      onReelStripIdsChange={setReelStrips as (ids: string[][]) => void}
                      isLightMode={isLightMode}
                    />
                  )}
                  {sidebarTab === "players" && (
                    <SlotPlayerManager
                      players={players}
                      activePlayerId={activePlayerId}
                      onSelectPlayer={setActivePlayerId}
                      onAddPlayer={addPlayer}
                      onRemovePlayer={removePlayer}
                      onUpdatePlayer={updatePlayer}
                      onViewPlayerHistory={setPlayerHistoryViewId}
                      isLightMode={isLightMode}
                    />
                  )}
                  {sidebarTab === "templates" && (
                    <SlotTemplatePanel
                      symbolMaster={symbolMaster}
                      onSymbolMasterChange={setSymbolMaster}
                      templates={templates}
                      onSaveTemplate={handleSaveSlotTemplate}
                      onLoadTemplate={handleLoadSlotTemplate}
                      onDeleteTemplate={handleDeleteSlotTemplate}
                      onOverwriteTemplate={handleOverwriteSlotTemplate}
                      onApplyNumbers17Preset={handleApplyNumbers17Preset}
                      onApplyDefaultSymbolsPreset={handleApplyDefaultSymbolsPreset}
                      isLightMode={isLightMode}
                    />
                  )}
                  {sidebarTab === "stats" && (
                    <SlotStatsPanel
                      players={players}
                      isLightMode={isLightMode}
                    />
                  )}
                </div>
              </motion.aside>
              {isDesktop && !isSplitMode && (
                <div onMouseDown={handleSidebarResizeStart} onTouchStart={handleSidebarResizeTouchStart} className="w-1.5 cursor-col-resize hover:bg-purple-500/30 transition-colors z-50" />
              )}
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
          {gameArea}
        </main>
      </div>

      <AnimatePresence>
        {showSettingsPanel && (
          <SlotSettingsPanel settings={settings} onSettingsChange={setSettings} isLightMode={isLightMode} onClose={() => setShowSettingsPanel(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {playerHistoryViewId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPlayerHistoryViewId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b dark:border-white/10">
                <h3 className="font-bold">履歴詳細</h3>
                <button onClick={() => setPlayerHistoryViewId(null)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  const p = players.find((x) => x.id === playerHistoryViewId);
                  if (!p) return null;
                  return <SlotPlayerHistoryCard player={p} isLightMode={isLightMode} onClose={() => setPlayerHistoryViewId(null)} />;
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {engine.showHitEffect && <RouletteHitEffect show={engine.showHitEffect} text={engine.lastWin?.isReplay ? "REPLAY!" : engine.lastWin?.label ?? "WIN!"} accentColor={accentColor} onComplete={() => engine.setShowHitEffect(false)} />}
      {isCapturing && createPortal(
        <div className="fixed inset-0 z-[-1] pointer-events-none opacity-0 overflow-hidden"><div ref={shareAreaRef} className="w-[1200px] h-[630px] flex items-center justify-center bg-[#0f0a1e]"><SlotShareSummary playerName={activePlayer?.name} reelLabels={slotSharePayload.reelLabels} resultLine={slotSharePayload.resultLine} isLightMode={isLightMode} /></div></div>,
        document.body
      )}
    </div>
  );
}
