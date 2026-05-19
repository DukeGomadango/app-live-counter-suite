"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, Settings, ImageDown, X, Zap, RotateCw, Play, Plus, Minus } from "lucide-react";
import ModeSelector from "@/components/ModeSelector";
import ShareModal from "@/components/ShareModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTheme } from "@/context/ThemeContext";
import { Z_INDEX } from "@/lib/layoutConstants";

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
  const [customAutoCount, setCustomAutoCount] = useState<number>(30);
  const [showStatsBreakdown, setShowStatsBreakdown] = useState(false);
  const autoSpinModalRef = useRef<HTMLDivElement>(null);

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
    const el = document.querySelector(".slot-reel-container") as HTMLElement;
    if (!el) return;

    try {
      const dataUrl = await toPng(el, { 
        backgroundColor: "transparent",
        pixelRatio: 2,
        skipFonts: true
      });
      
      const text = `🎰 ${activePlayer?.name ?? "ゲスト"}の結果: ${engine.lastWin ? (engine.lastWin.label || "WIN!") : "ハズレ..."}\n#だんごツール`;
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

  const handleShareAutoSpinResult = useCallback(async () => {
    if (!autoSpinModalRef.current || !engine.autoSpinStats) return;

    try {
      const dataUrl = await toPng(autoSpinModalRef.current, { 
        backgroundColor: displayLight ? "#ffffff" : "#111827",
        pixelRatio: 2,
        skipFonts: true
      });
      
      const text = `🎰 ${engine.currentPlayer.name}のオートプレイ結果（${engine.autoSpinStats.spins}回転）\n純増: ${engine.autoSpinStats.net > 0 ? "+" : ""}${engine.autoSpinStats.net}枚\n#だんごツール`;
      const filename = `slot-autospin-${getTimestampForFilename()}.png`;
      
      const isMobile = !isDesktop || isSplitMode;

      if (isMobile) {
        const shared = await shareImageWithText(dataUrl, text, filename);
        if (shared) return;
      }

      setCapturedDataUrl(dataUrl);
      setShareText(text);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error("Failed to export slot autospin image:", err);
    }
  }, [engine.currentPlayer, engine.autoSpinStats, isDesktop, isSplitMode, displayLight]);

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
            isTurboMode={engine.isTurboMode}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <div className={`flex items-center p-1.5 rounded-[2rem] border shadow-2xl backdrop-blur-xl ${displayLight ? "bg-white/80 border-gray-200" : "bg-black/40 border-white/10"}`}>
          
          {/* Share Button (Fixed left) */}
          <motion.button 
            onClick={handleShare} 
            disabled={engine.isSpinning || !engine.allStopped}
            className={`p-4 rounded-full transition-all ${
              (!engine.isSpinning && engine.allStopped)
                ? displayLight ? "text-blue-600 hover:bg-blue-50" : "text-blue-400 hover:bg-blue-500/20 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                : "opacity-30 cursor-not-allowed grayscale"
            }`}
            title="結果を共有"
          >
            <ImageDown size={22} />
          </motion.button>

          {/* Main SPIN / STOP Button (Center) */}
          <div className="mx-1">
            {engine.autoSpinRemaining > 0 ? (
              <motion.button
                onClick={engine.stopAutoSpin}
                className="px-8 py-4 rounded-full font-black text-lg tracking-wider shadow-lg bg-red-500 text-white hover:bg-red-600 min-w-[140px]"
                style={{ "--btn-glow-color": "#ef4444" } as React.CSSProperties}
              >
                STOP ({engine.autoSpinRemaining === Infinity ? "∞" : engine.autoSpinRemaining})
              </motion.button>
            ) : (
              <motion.button
                onClick={engine.handleSpin}
                disabled={engine.isSpinning || (!engine.replayFreeSpin && engine.bonusGamesRemaining <= 0 && engine.currentPlayer.balance < (engine.currentPlayer.defaultBet ?? 1))}
                className={`px-8 py-4 rounded-full font-black text-lg tracking-wider shadow-lg dango-btn-tier1 min-w-[140px] ${engine.isSpinning ? "opacity-50 grayscale scale-[0.98]" : ""}`}
                style={{ 
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, 
                  color: "white",
                  "--btn-glow-color": accentColor
                } as React.CSSProperties}
              >
                {engine.replayFreeSpin ? "REPLAY!" : engine.bonusGamesRemaining > 0 ? `BONUS (${engine.bonusGamesRemaining})` : "SPIN"}
              </motion.button>
            )}
          </div>

          {/* Power Play Config Hub (Fixed right) */}
          <div className="relative group flex items-center">
            <motion.button
              disabled={engine.autoSpinRemaining > 0 || engine.isSpinning}
              className={`p-4 rounded-full transition-all ${
                engine.autoSpinRemaining > 0 
                  ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                  : displayLight ? "text-gray-400 hover:bg-amber-50 hover:text-amber-500" : "text-white/40 hover:bg-white/10 hover:text-amber-400"
              } ${engine.isSpinning && engine.autoSpinRemaining <= 0 ? "opacity-30 cursor-not-allowed grayscale" : ""}`}
              title="パワープレイ設定（ターボ＆オート）"
            >
              <Zap size={22} className={engine.autoSpinRemaining > 0 || engine.isTurboMode ? "fill-current" : ""} />
            </motion.button>
            
            {/* Unified Config Popover (With invisible bridge to prevent hover loss) */}
            {!engine.isSpinning && engine.autoSpinRemaining <= 0 && (
              <div className="absolute bottom-full right-0 pb-2 hidden group-hover:flex group-focus-within:flex flex-col" style={{ zIndex: 50 }}>
                {/* Visual Card */}
                <div className={`flex flex-col p-3 rounded-2xl backdrop-blur-2xl shadow-2xl border ${displayLight ? "bg-white/95 border-gray-200" : "bg-gray-900/95 border-white/10"}`} style={{ minWidth: "220px" }}>
                  
                  {/* Speed Selection */}
                  <div className="mb-3">
                    <div className={`text-[10px] font-black tracking-widest mb-1.5 px-1 ${displayLight ? "text-gray-400" : "text-gray-500"}`}>SPEED (速度)</div>
                    <div className={`flex rounded-lg p-1 ${displayLight ? "bg-gray-100" : "bg-black/40"}`}>
                      <button
                        onClick={() => engine.setIsTurboMode(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!engine.isTurboMode ? displayLight ? "bg-white text-gray-800 shadow-sm" : "bg-white/20 text-white shadow-sm" : displayLight ? "text-gray-400 hover:text-gray-600" : "text-white/40 hover:text-white/70"}`}
                      >
                        通常
                      </button>
                      <button
                        onClick={() => engine.setIsTurboMode(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${engine.isTurboMode ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : displayLight ? "text-gray-400 hover:text-gray-600" : "text-white/40 hover:text-white/70"}`}
                      >
                        <Zap size={12} className={engine.isTurboMode ? "fill-current" : ""} />
                        高速
                      </button>
                    </div>
                  </div>

                  {/* Auto Spin Count */}
                  <div className="mb-3">
                    <div className={`text-[10px] font-black tracking-widest mb-1.5 px-1 ${displayLight ? "text-gray-400" : "text-gray-500"}`}>AUTO SPIN (自動回転)</div>
                    <div className="flex flex-col gap-1">
                      {[10, 50, 100, Infinity].map(count => (
                        <button
                          key={count}
                          onClick={() => engine.startAutoSpin(count)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-bold transition flex justify-between items-center ${displayLight ? "hover:bg-amber-100 text-amber-700" : "hover:bg-amber-500/20 text-amber-300"}`}
                        >
                          <span>{count === Infinity ? "無限 (INFINITE)" : `${count} 回`}</span>
                          <RotateCw size={14} className="opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Auto Spin */}
                  <div>
                    <div className={`text-[10px] font-black tracking-widest mb-1.5 px-1 ${displayLight ? "text-gray-400" : "text-gray-500"}`}>CUSTOM (カスタム指定)</div>
                    <div className={`flex items-center rounded-xl p-1 ${displayLight ? "bg-gray-100" : "bg-black/40"}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCustomAutoCount(prev => Math.max(1, prev - 10)); }}
                        className={`p-2 rounded-lg transition-all ${displayLight ? "hover:bg-white text-gray-500 hover:shadow-sm" : "hover:bg-white/10 text-gray-400"}`}
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number" 
                        min="1" 
                        max="9999" 
                        value={customAutoCount} 
                        onChange={(e) => setCustomAutoCount(Math.max(1, Math.min(9999, parseInt(e.target.value) || 1)))}
                        className={`flex-1 w-12 text-center font-black text-sm bg-transparent outline-none border-none [&::-webkit-inner-spin-button]:appearance-none ${displayLight ? "text-gray-800" : "text-white"}`}
                        style={{ MozAppearance: 'textfield' }}
                      />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCustomAutoCount(prev => Math.min(9999, prev + 10)); }}
                        className={`p-2 rounded-lg transition-all ${displayLight ? "hover:bg-white text-gray-500 hover:shadow-sm" : "hover:bg-white/10 text-gray-400"}`}
                      >
                        <Plus size={14} />
                      </button>
                      <div className={`w-px h-6 mx-1 ${displayLight ? "bg-gray-300" : "bg-white/10"}`}></div>
                      <button 
                        onClick={() => engine.startAutoSpin(customAutoCount)}
                        className="p-2 ml-1 rounded-lg bg-amber-500 text-white shadow-md shadow-amber-500/30 hover:bg-amber-400 transition-all flex items-center justify-center"
                      >
                        <Play size={14} className="fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            id="quick-auto-stop"
            type="checkbox"
            checked={settings.autoStopEnabled ?? false}
            onChange={(e) => setSettings({ ...settings, autoStopEnabled: e.target.checked })}
            className="rounded cursor-pointer"
            style={{ accentColor }}
          />
          <label 
            htmlFor="quick-auto-stop" 
            className={`text-sm font-bold cursor-pointer select-none tracking-wide transition-colors ${
              displayLight ? "text-gray-500 hover:text-gray-800" : "text-white/60 hover:text-white"
            }`}
          >
            オートストップ (自動停止)
          </label>
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
        className={`${isSplitMode ? "relative" : "relative"} h-14 shrink-0 flex items-center justify-between px-4 bg-bg-header backdrop-blur-md border-b border-border-subtle`}
        style={{ zIndex: Z_INDEX.HEADER }}
      >
        <div className="flex items-center gap-3">
          {(isSplitMode || !isDesktop) && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-xl dango-btn-tier3"
              style={{ "--btn-glow-color": accentColor } as React.CSSProperties}
            >
              <Menu size={20} />
            </button>
          )}
          {!isSplitMode && <ModeSelector isLightMode={isLightMode} accentColor={accentColor} />}
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          <h1 className="text-sm font-bold tracking-tight opacity-80">スロット</h1>
          {!activePlayer && (
            <div 
              className="ml-2 px-2.5 py-1 rounded-full text-[10px] font-black border tracking-wider" 
              style={{ 
                color: accentColor, 
                borderColor: `${accentColor}40`, 
                backgroundColor: `${accentColor}10`,
                boxShadow: `0 0 10px ${accentColor}20`
              }}
            >
              ゲストプレイ中
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-xl dango-btn-tier3"
            style={{ "--btn-glow-color": accentColor } as React.CSSProperties}
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            onClick={() => setShowSettingsPanel(true)} 
            className="p-2 rounded-xl dango-btn-tier3"
            style={{ "--btn-glow-color": accentColor } as React.CSSProperties}
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: Z_INDEX.SIDEBAR_BACKDROP }} />
              )}
              <motion.aside
                initial={isDesktop && !isSplitMode ? false : { x: -sidebarWidthPx }} animate={{ x: 0 }} exit={{ x: -sidebarWidthPx }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`flex flex-col bg-bg-sidebar backdrop-blur-xl border-r border-border-subtle ${isDesktop && !isSplitMode ? "relative" : "absolute inset-y-0 left-0"}`}
                style={{ width: sidebarWidthPx, zIndex: Z_INDEX.SIDEBAR }}
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
                      style={{ "--btn-glow-color": accentColor } as React.CSSProperties}
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
                <div onMouseDown={handleSidebarResizeStart} onTouchStart={handleSidebarResizeTouchStart} className="w-1.5 cursor-col-resize hover:bg-purple-500/30 transition-colors" style={{ zIndex: Z_INDEX.SIDEBAR }} />
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
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.MODAL }}
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPlayerHistoryViewId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" style={{ zIndex: Z_INDEX.MODAL_BACKDROP }} />
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
      <AnimatePresence>
        {engine.autoSpinStats && engine.autoSpinRemaining <= 0 && !engine.isSpinning && engine.autoSpinStats.spins > 0 && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[110]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => engine.setAutoSpinStats(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-sm rounded-3xl shadow-2xl flex flex-col border overflow-hidden z-10 ${displayLight ? "bg-white border-gray-200" : "bg-gray-900 border-white/10"}`}
            >
              <div ref={autoSpinModalRef} className={`p-6 flex flex-col items-center gap-4 relative ${displayLight ? "bg-white" : "bg-gray-900"}`}>
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
                <h3 className={`text-lg font-black text-center ${displayLight ? "text-gray-800" : "text-white"}`}>
                  <span className="opacity-70 text-[11px] block mb-1 tracking-widest">{engine.currentPlayer.name} の</span>
                  オートプレイ結果
                </h3>
                
                <div className="w-full flex flex-col gap-2">
                  <div className={`flex justify-between items-center p-3 rounded-xl ${displayLight ? "bg-gray-50" : "bg-white/5"}`}>
                    <span className={`text-sm font-bold ${displayLight ? "text-gray-500" : "text-gray-400"}`}>回転数</span>
                    <span className={`text-lg font-black ${displayLight ? "text-gray-800" : "text-white"}`}>{engine.autoSpinStats.spins}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl ${displayLight ? "bg-gray-50" : "bg-white/5"}`}>
                    <span className={`text-sm font-bold ${displayLight ? "text-gray-500" : "text-gray-400"}`}>ボーナス回数</span>
                    <span className="text-lg font-black text-amber-500">{engine.autoSpinStats.bonuses}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl ${displayLight ? "bg-gray-50" : "bg-white/5"}`}>
                    <span className={`text-sm font-bold flex items-center gap-1 ${displayLight ? "text-gray-500" : "text-gray-400"}`}><span className="text-xs">✨</span> 惜しい！ (2つ揃い)</span>
                    <span className="text-lg font-black text-amber-400">{engine.autoSpinStats.nearMisses} 回</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl ${displayLight ? "bg-gray-50" : "bg-white/5"}`}>
                    <span className={`text-sm font-bold ${displayLight ? "text-gray-500" : "text-gray-400"}`}>純増（収支）</span>
                    <span className={`text-2xl font-black ${engine.autoSpinStats.net > 0 ? "text-green-500" : engine.autoSpinStats.net < 0 ? "text-red-500" : displayLight ? "text-gray-800" : "text-white"}`}>
                      {engine.autoSpinStats.net > 0 ? `+${engine.autoSpinStats.net}` : engine.autoSpinStats.net}
                    </span>
                  </div>

                  {Object.keys(engine.autoSpinStats.hitSymbols).length > 0 && (
                    <div className="mt-1 w-full">
                      <button 
                        onClick={() => setShowStatsBreakdown(!showStatsBreakdown)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-colors ${displayLight ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-white/5 hover:bg-white/10 text-gray-300"}`}
                      >
                        <span className="flex items-center gap-1">
                          <span className={`transition-transform duration-200 inline-block ${showStatsBreakdown ? "rotate-180" : ""}`}>▼</span> 獲得役の内訳
                        </span>
                        <span>{Object.keys(engine.autoSpinStats.hitSymbols).length} 種類</span>
                      </button>
                      <AnimatePresence>
                        {showStatsBreakdown && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: "auto", opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`mt-2 flex flex-col gap-1 p-2 rounded-xl max-h-[160px] overflow-y-auto custom-scrollbar ${displayLight ? "bg-gray-50" : "bg-black/30"}`}>
                              {Object.values(engine.autoSpinStats.hitSymbols)
                                .sort((a, b) => b.totalPayout - a.totalPayout)
                                .map((hit, idx) => (
                                <div key={idx} className="flex justify-between items-center py-2 px-2 border-b last:border-0 border-gray-200 dark:border-white/5">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${displayLight ? "text-gray-700" : "text-gray-300"}`}>{hit.symbol.label}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black ${displayLight ? "text-gray-500" : "text-gray-400"}`}>x {hit.count}</span>
                                    <span className={`text-xs font-bold w-12 text-right ${hit.totalPayout > 0 ? "text-yellow-500 drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]" : displayLight ? "text-gray-400" : "text-gray-500"}`}>
                                      +{hit.totalPayout}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Branding for Export */}
                <div className="w-full text-center mt-2 opacity-50">
                  <span className={`text-[10px] font-bold tracking-widest ${displayLight ? "text-gray-400" : "text-gray-500"}`}>だんごツール 🎰</span>
                </div>
              </div>

              {/* Action Buttons (Not included in the image capture) */}
              <div className={`px-6 pb-6 pt-0 flex gap-2 ${displayLight ? "bg-white" : "bg-gray-900"}`}>
                <button 
                  onClick={handleShareAutoSpinResult}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border ${displayLight ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-50" : "bg-black/30 text-gray-300 border-white/10 hover:bg-white/10"}`}
                >
                  <ImageDown size={18} />
                  <span>シェア</span>
                </button>
                <button 
                  onClick={() => { engine.setAutoSpinStats(null); setShowStatsBreakdown(false); }}
                  className="flex-1 py-3 rounded-xl font-bold text-white transition hover:opacity-90 shadow-lg"
                  style={{ background: accentColor, boxShadow: `0 8px 20px -8px ${accentColor}` }}
                >
                  確認
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
