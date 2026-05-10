"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings, ImageDown, X } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import ShareModal from "@/components/ShareModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTheme } from "@/context/ThemeContext";

import SlotReel from "@/components/slot/SlotReel";
import SlotSettingsPanel from "@/components/slot/SlotSettingsPanel";
import SlotPlayerManager from "@/components/slot/SlotPlayerManager";
import SlotStatsPanel from "@/components/slot/SlotStatsPanel";
import SlotTemplatePanel from "@/components/slot/SlotTemplatePanel";
import SlotReelSymbolPanel from "@/components/slot/SlotReelSymbolPanel";
import SlotPlayerHistoryCard from "@/components/slot/SlotPlayerHistoryCard";
import RouletteHitEffect from "@/components/roulette/RouletteHitEffect";

import { useSlotState } from "./hooks/useSlotState";
import { useSlotEngine } from "./hooks/useSlotEngine";
import { useSlotSidebar } from "./hooks/useSlotSidebar";
import { SlotOrbsBackground } from "./components/SlotOrbsBackground";
import { resolveReelStrips, SlotPlayer } from "@/lib/slot";
import { toPng } from "html-to-image";
import { 
  getTimestampForFilename, 
  shareImageWithText 
} from "@/lib/share";
import { 
  handleApplyNumbers17Preset,
  handleApplyDefaultSymbolsPreset,
  handleLoadSlotTemplate,
  handleSaveSlotTemplate,
  handleDeleteSlotTemplate,
  handleOverwriteSlotTemplate
} from "./lib/slotActions";

export default function SlotContent({ isSplitMode = false, isRightPane: _isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
  const {
    symbolMaster, setSymbolMaster,
    reelStrips: reelStripIds, setReelStrips,
    settings, setSettings,
    players, setPlayers,
    activePlayerId, setActivePlayerId,
    templates, setTemplates
  } = useSlotState();
  const { isLightMode, toggleTheme } = useTheme();
  const {
    sidebarOpen, setSidebarOpen,
    sidebarTab, setSidebarTab,
    sidebarWidthPx,
    handleSidebarResizeStart,
    handleSidebarResizeTouchStart,
    playerHistoryViewId, setPlayerHistoryViewId
  } = useSlotSidebar();

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [shareText, setShareText] = useState("");

  // リール配列をシンボルオブジェクトに解決
  const resolvedStrips = useMemo(() => 
    resolveReelStrips(reelStripIds as string[][], symbolMaster),
    [reelStripIds, symbolMaster]
  );

  const activePlayer = useMemo(() => players.find(p => p.id === activePlayerId) || null, [players, activePlayerId]);

  const engine = useSlotEngine({
    strips: resolvedStrips,
    settings,
    activePlayer,
    setPlayers,
    reelCount: settings.reelCount
  });

  const accentColor = settings.accentColor ?? "#a855f7";
  const orbIntensity = settings.orbIntensity ?? 50;
  const displayLight = isLightMode;

  const handleShare = useCallback(async () => {
    if (!engine.lastWin) return;
    const el = document.querySelector(".slot-reel-container") as HTMLElement;
    if (!el) return;

    try {
      const dataUrl = await toPng(el, { 
        backgroundColor: "transparent",
        pixelRatio: 2,
        skipFonts: true
      });
      
      const text = `🎰 ${activePlayer?.name ?? "ゲスト"}の結果: ${engine.lastWin.label || "WIN!"}\n#だんごツール`;
      const filename = `slot-result-${getTimestampForFilename()}.png`;
      
      const isMobile = !isDesktop || isSplitMode;

      if (isMobile) {
        const shared = await shareImageWithText(dataUrl, text, filename);
        if (shared) return;
      }

      setCapturedDataUrl(dataUrl);
      setShareText(text);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error("Failed to export slot image:", err);
    }
  }, [engine.lastWin, activePlayer, isDesktop, isSplitMode]);

  const addPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, {
      id: crypto.randomUUID(),
      name,
      balance: 1000,
      defaultBet: 1,
      spinHistory: [],
      stats: { totalSpins: 0, totalWon: 0, totalBet: 0, biggestWin: 0 }
    }]);
  }, [setPlayers]);

  const removePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    if (activePlayerId === id) setActivePlayerId(null);
  }, [activePlayerId, setActivePlayerId, setPlayers]);

  const updatePlayer = useCallback((id: string, patch: { name?: string; balance?: number; defaultBet?: number }) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, [setPlayers]);

  const showSidebar = sidebarOpen || (isDesktop && !isSplitMode);

  const gameArea = (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="mb-8 w-full max-w-4xl flex justify-center gap-4 slot-reel-container">
        {resolvedStrips.map((strip, i) => (
          <SlotReel
            key={i}
            symbols={strip}
            isSpinning={engine.isSpinning}
            stoppedIndex={engine.reelResults[i] ?? null}
            onStop={() => engine.handleStop(i)}
            canStop={engine.canStop(i)}
            accentColor={accentColor}
            isLightMode={isLightMode}
            visibleRows={settings.visibleRows}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={engine.handleSpin}
            disabled={engine.isSpinning || (!engine.replayFreeSpin && engine.bonusGamesRemaining <= 0 && (activePlayer?.balance ?? 0) < (activePlayer?.defaultBet ?? 1))}
            className={`px-12 py-4 rounded-2xl font-bold text-lg shadow-xl dango-btn-tier1 ${engine.isSpinning ? "opacity-50 grayscale" : ""}`}
            style={{ 
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, 
              color: "white",
              "--btn-glow-color": accentColor
            } as React.CSSProperties}
          >
            {engine.replayFreeSpin ? "REPLAY!" : engine.bonusGamesRemaining > 0 ? `BONUS (${engine.bonusGamesRemaining})` : "SPIN"}
          </motion.button>
          {!engine.isSpinning && engine.allStopped && (
            <motion.button 
              onClick={handleShare} 
              className={`p-4 rounded-2xl border dango-btn-tier2 ${displayLight ? "bg-white border-gray-200 text-gray-600" : "bg-white/5 border-white/10 text-white/70"}`} 
              style={{ "--btn-glow-color": accentColor } as React.CSSProperties}
              title="結果を共有"
            >
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
    <div className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`} style={{ "--accent-color": accentColor } as React.CSSProperties}>
      <SlotOrbsBackground isLightMode={isLightMode} accentColor={accentColor} orbIntensity={orbIntensity} />
      <header
        className={`${isSplitMode ? "relative" : "relative"} h-14 shrink-0 flex items-center justify-between px-4 z-[60] bg-bg-header backdrop-blur-md border-b border-border-subtle`}
      >
        <div className="flex items-center gap-3">
          {(isSplitMode || !isDesktop) && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-xl dango-btn-tier3"
              style={{ "--btn-glow-color": accentColor } as any}
            >
              <Menu size={20} />
            </button>
          )}
          {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          <h1 className="text-sm font-bold tracking-tight opacity-80">スロット</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-xl dango-btn-tier3"
            style={{ "--btn-glow-color": accentColor } as any}
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            onClick={() => setShowSettingsPanel(true)} 
            className="p-2 rounded-xl dango-btn-tier3"
            style={{ "--btn-glow-color": accentColor } as any}
          >
            <Settings size={18} />
          </button>
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
                className={`flex flex-col bg-bg-sidebar backdrop-blur-xl border-r border-border-subtle z-50 ${isDesktop && !isSplitMode ? "relative" : "absolute inset-y-0 left-0"}`}
                style={{ width: sidebarWidthPx }}
              >
                <div className="flex p-2 gap-1.5 border-b border-border-subtle bg-black/5 dark:bg-white/5">
                  {(["reel", "players", "templates", "stats"] as const).map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setSidebarTab(tab)} 
                      className={`flex-1 py-2 px-1 rounded-xl text-[11px] font-bold transition-all dango-btn-tier3 ${
                        sidebarTab === tab 
                          ? "bg-white dark:bg-white/20 shadow-sm opacity-100" 
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ "--btn-glow-color": accentColor } as any}
                    >
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
                      reelStripIds={reelStripIds as string[][]}
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
                      onSaveTemplate={(name) => handleSaveSlotTemplate(name, symbolMaster, reelStripIds as string[][], settings, setTemplates)}
                      onLoadTemplate={(id) => handleLoadSlotTemplate(id, templates, setSymbolMaster, setReelStrips, setSettings)}
                      onDeleteTemplate={(id) => handleDeleteSlotTemplate(id, setTemplates)}
                      onOverwriteTemplate={(id, name) => handleOverwriteSlotTemplate(id, name, symbolMaster, reelStripIds as string[][], settings, setTemplates)}
                      onApplyNumbers17Preset={() => handleApplyNumbers17Preset(setSymbolMaster, setReelStrips)}
                      onApplyDefaultSymbolsPreset={() => handleApplyDefaultSymbolsPreset(setSymbolMaster, setReelStrips)}
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
          <SlotSettingsPanel 
            settings={settings} 
            onSettingsChange={setSettings} 
            isLightMode={isLightMode} 
            onClose={() => setShowSettingsPanel(false)} 
            onOpenPlayerManager={() => {
              setSidebarTab("players");
              setSidebarOpen(true);
              setShowSettingsPanel(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {playerHistoryViewId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPlayerHistoryViewId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-bg-sidebar backdrop-blur-2xl rounded-3xl shadow-2xl flex flex-col border border-border-subtle">
              <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                <h3 className="font-bold">履歴詳細</h3>
                <button onClick={() => setPlayerHistoryViewId(null)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        dataUrl={capturedDataUrl}
        initialText={shareText}
        toolId="slot"
        isLightMode={isLightMode}
      />
    </div>
  );
}
