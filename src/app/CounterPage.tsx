"use client";

import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { ImageDown, ListOrdered } from "lucide-react";
import CounterPanel from "@/components/CounterPanel";
import AddItemPanel from "@/components/AddItemPanel";
import HamburgerMenu from "@/components/HamburgerMenu";
import PrefectureShapeMap from "@/components/PrefectureShapeMap";
import PrefectureRankingPanel from "@/components/PrefectureRankingPanel";
import EditItemModal from "@/components/EditItemModal";
import SettingsModal, { type CardSize } from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModeSelector from "@/components/ModeSelector";
import { TEMPLATES, type Template } from "@/lib/templates";

// Hooks
import { useCounterState } from "./counter/hooks/useCounterState";
import { useCounterActions } from "./counter/hooks/useCounterActions";
import { useCounterDrag } from "./counter/hooks/useCounterDrag";
import { useCounterShare } from "./counter/hooks/useCounterShare";

import { useTheme } from "@/context/ThemeContext";

// Components
import { CounterOrbsBackground } from "./counter/components/CounterOrbsBackground";

function useWindowWidth() {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const id = setTimeout(() => setWidth(window.innerWidth), 0);
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return width;
}

export default function Home({ isSplitMode = false, isRightPane: _isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
  const state = useCounterState();
  const actions = useCounterActions({
    items: state.items,
    setItems: state.setItems,
    setCurrentTemplateId: state.setCurrentTemplateId,
    setAppSettings: state.setAppSettings,
    customTemplates: state.customTemplates,
    setCustomTemplates: state.setCustomTemplates,
    currentTemplateLayout: TEMPLATES.find(t => t.id === state.currentTemplateId)?.layout
  });
  const drag = useCounterDrag(state.items, state.setItems);
  const { isLightMode, toggleTheme } = useTheme();
  const { handleShareAsImage, isCapturingShareImage, shareAreaRef, captureDims } = useCounterShare(isLightMode, state.currentTemplateId);

  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrefectureRankingOpen, setIsPrefectureRankingOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editingDesc, setEditingDesc] = useState("");

  const currentTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === state.currentTemplateId) ?? state.customTemplates.find((t) => t.id === state.currentTemplateId) ?? null,
    [state.currentTemplateId, state.customTemplates]
  );

  const totalCount = useMemo(() => state.items.reduce((sum, item) => sum + item.count, 0), [state.items]);
  const totalTarget = useMemo(() => state.items.reduce((sum, item) => sum + item.target, 0), [state.items]);

  const handleStartEditName = useCallback(() => {
    setEditingName(currentTemplate?.name ?? "");
    setIsEditingName(true);
  }, [currentTemplate?.name]);

  const handleStartEditDesc = useCallback(() => {
    setEditingDesc(currentTemplate?.description ?? "");
    setIsEditingDesc(true);
  }, [currentTemplate?.description]);

  const saveTemplateChanges = useCallback((changes: Partial<Template>) => {
    const isCustom = state.customTemplates.some(t => t.id === state.currentTemplateId);
    
    if (isCustom) {
      state.setCustomTemplates(prev => prev.map(t => 
        t.id === state.currentTemplateId ? { ...t, ...changes } : t
      ));
    } else {
      const newId = `custom-${Date.now()}`;
      const newTemplate: Template = {
        ...currentTemplate!,
        id: newId,
        ...changes,
        items: state.items.map(({ count, target, ...rest }) => rest),
      };
      state.setCustomTemplates(prev => [...prev, newTemplate]);
      state.setCurrentTemplateId(newId);
    }
  }, [state, currentTemplate]);

  const handleSaveName = useCallback(() => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === currentTemplate?.name) {
      setIsEditingName(false);
      return;
    }
    saveTemplateChanges({ name: trimmed });
    setIsEditingName(false);
  }, [editingName, currentTemplate?.name, saveTemplateChanges]);

  const handleSaveDesc = useCallback(() => {
    const trimmed = editingDesc.trim();
    if (trimmed === currentTemplate?.description) {
      setIsEditingDesc(false);
      return;
    }
    saveTemplateChanges({ description: trimmed });
    setIsEditingDesc(false);
  }, [editingDesc, currentTemplate?.description, saveTemplateChanges]);
  const positionedContainerRef = useRef<HTMLDivElement>(null);
  const [positionedContainerSize, setPositionedContainerSize] = useState<{ w: number; h: number } | null>(null);
  
  const windowWidth = useWindowWidth();
  const [winH, setWinH] = useState(800);
  useEffect(() => {
    const id = setTimeout(() => setWinH(window.innerHeight), 0);
    return () => clearTimeout(id);
  }, []);

  const isPositionedLayout = Boolean(currentTemplate?.layout === "positioned" && currentTemplate?.backgroundImage);

  useEffect(() => {
    if (!isPositionedLayout || !positionedContainerRef.current) return;
    const el = positionedContainerRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setPositionedContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) setPositionedContainerSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, [isPositionedLayout]);

  const cardSizeMap: Record<CardSize, { mobile: number; tablet: number; desktop: number }> = {
    S: { mobile: 96, tablet: 136, desktop: 168 },
    M: { mobile: 112, tablet: 162, desktop: 205 },
    L: { mobile: 120, tablet: 170, desktop: 220 },
    XL: { mobile: 140, tablet: 200, desktop: 280 },
  };

  const sizeConfig = cardSizeMap[state.appSettings.cardSize] || cardSizeMap.L;
  const colMaxPx = windowWidth <= 480 ? sizeConfig.mobile : windowWidth <= 768 ? sizeConfig.tablet : sizeConfig.desktop;
  const cardScale = (state.appSettings.cardScale ?? 100) / 100;
  const effectiveColMaxPx = colMaxPx * cardScale;
  const gridGapPx = windowWidth >= 640 ? 10 : 8;
  const totalSlots = state.items.length + 1;

  const gridCols = useMemo(() => {
    const paddingX = windowWidth >= 640 ? 32 : 24;
    const availableW = Math.max(0, windowWidth - paddingX);
    const denom = effectiveColMaxPx + gridGapPx;
    const colsByWidth = denom > 0 ? Math.floor((availableW + gridGapPx) / denom) : 1;
    const maxCols = Math.max(1, Math.min(colsByWidth || 1, totalSlots || 1));
    let bestCols = 1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let cols = 1; cols <= maxCols; cols += 1) {
      const rows = Math.ceil(totalSlots / cols);
      const emptySlots = rows * cols - totalSlots;
      const shapeDiff = Math.abs(rows - cols);
      const score = shapeDiff * 100 + emptySlots;
      if (score < bestScore) {
        bestScore = score;
        bestCols = cols;
      }
    }
    return bestCols;
  }, [windowWidth, effectiveColMaxPx, gridGapPx, totalSlots]);

  const effectiveCols = Math.min(gridCols, totalSlots || 1);
  const gridMaxWidth = effectiveCols * effectiveColMaxPx + (effectiveCols - 1) * gridGapPx;

  // Capture variables
  const captureW = captureDims ? captureDims.w : windowWidth;
  const captureH = captureDims ? captureDims.h : winH;
  const captureColMaxPxBase = captureW <= 480 ? sizeConfig.mobile : captureW <= 768 ? sizeConfig.tablet : sizeConfig.desktop;
  const captureColMaxPx = captureColMaxPxBase * cardScale;
  const captureRows = Math.ceil(totalSlots / effectiveCols);
  const captureGap = 10;
  const captureGridMaxWidth = effectiveCols * captureColMaxPx + (effectiveCols - 1) * captureGap;
  const captureRowHeightPx = captureW >= 768 ? captureColMaxPx : captureColMaxPx + 52;
  const captureEstimatedGridHeight = captureRows * captureRowHeightPx + (captureRows - 1) * captureGap + 20;
  const captureScale = Math.min(captureW / captureGridMaxWidth, captureH / captureEstimatedGridHeight, 1);
  const captureWidth = captureGridMaxWidth * captureScale;
  const captureHeight = captureEstimatedGridHeight * captureScale;
  const capturePadding = 32;
  const captureOuterWidth = captureWidth + capturePadding * 2;
  const captureOuterHeight = captureHeight + capturePadding * 2;
  const capturePositionedSize = captureW < 768 ? Math.min(640, Math.max(280, captureW - 64)) : 960;
  const capturePositionedOuter = capturePositionedSize + capturePadding * 2;
  const captureBaseBg = isLightMode ? "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)" : "linear-gradient(135deg, #0a0118 0%, #1a0a2e 40%, #0d1b3e 70%, #0a0118 100%)";
  const orbOpacity = (state.appSettings.orbIntensity ?? 50) / 100;
  const accentHex = state.appSettings.accentColor;
  const captureOrbBg = isLightMode
    ? `radial-gradient(ellipse at 15% 25%, ${accentHex}66 0%, transparent 50%), radial-gradient(ellipse at 75% 20%, rgba(59, 130, 246, 0.25) 0%, transparent 45%), radial-gradient(ellipse at 85% 75%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, ${accentHex}4D 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, ${accentHex}40 0%, transparent 50%)`
    : `radial-gradient(ellipse at 20% 20%, ${accentHex}59 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, ${accentHex}33 0%, transparent 50%)`;

  const splitLightBg = "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";

  return (
    <div className="h-full min-h-0 w-full flex flex-col relative z-10" style={{ "--accent-color": state.appSettings.accentColor } as React.CSSProperties}>
      {typeof document !== "undefined" && isCapturingShareImage && createPortal(
        <div ref={shareAreaRef} style={{ position: "fixed", left: 0, top: 0, width: `${isPositionedLayout ? capturePositionedOuter : captureOuterWidth}px`, height: `${isPositionedLayout ? capturePositionedOuter : captureOuterHeight}px`, overflow: "hidden", zIndex: -1, pointerEvents: "none", background: captureBaseBg }} aria-hidden>
          <div style={{ position: "absolute", inset: 0, zIndex: 0, background: captureOrbBg, opacity: orbOpacity, pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: `${capturePadding}px`, top: `${capturePadding}px`, width: `${isPositionedLayout ? capturePositionedSize : captureWidth}px`, height: `${isPositionedLayout ? capturePositionedSize : captureHeight}px`, overflow: "hidden", zIndex: 1 }}>
            {state.currentTemplateId === "prefectures" ? (
              <div className="relative w-full h-full flex items-center justify-center" style={{ width: capturePositionedSize, height: capturePositionedSize }}><div style={{ width: Math.min(capturePositionedSize, 640), height: Math.min(capturePositionedSize, 640), flexShrink: 0 }}><PrefectureShapeMap items={state.items} onIncrement={() => {}} onDecrement={undefined} isLightMode={isLightMode} accentColor={state.appSettings.accentColor} showCountLabels={state.showPrefectureCountLabels} showPrefectureNames={state.showPrefectureNames} /></div></div>
            ) : isPositionedLayout && currentTemplate?.backgroundImage ? (
              <div className="relative w-full h-full" style={{ backgroundImage: `url(${currentTemplate.backgroundImage})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", color: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)" }}>
                {state.items.map((item) => (
                  <div key={item.id} className="absolute" style={{ left: `${item.x ?? 50}%`, top: `${item.y ?? 50}%`, width: captureColMaxPx, height: captureColMaxPx, transform: "translate(-50%, -50%)" }}>
                    <CounterPanel id={item.id} label={item.label} emoji={item.emoji} color={item.color} count={item.count} target={item.target} onIncrement={() => {}} onDecrement={() => {}} showStep5={state.appSettings.showStep5} showStep10={state.appSettings.showStep10} showStepFree={state.appSettings.showStepFree} stepFreeValue={state.appSettings.stepFreeValue} onDeleteItem={() => {}} onEditItem={() => {}} isLightMode={isLightMode} showEditDeleteOnCard={false} showAchieveTargetButton={false} cardSize={state.appSettings.cardSize} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid items-stretch gap-2 sm:gap-2.5 w-full" style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(${captureColMaxPx}px, ${captureColMaxPx}px))`, maxWidth: `${captureGridMaxWidth}px`, width: `${captureGridMaxWidth}px`, padding: 0, margin: 0, transform: `scale(${captureScale})`, transformOrigin: "top left", justifyContent: "center" }}>
                {state.items.map((item) => (
                  <div key={item.id} style={{ minHeight: 0 }}><div style={{ width: captureColMaxPx, transformOrigin: "top left" }}><CounterPanel id={item.id} label={item.label} emoji={item.emoji} color={item.color} count={item.count} target={item.target} onIncrement={() => {}} onDecrement={() => {}} showStep5={state.appSettings.showStep5} showStep10={state.appSettings.showStep10} showStepFree={state.appSettings.showStepFree} stepFreeValue={state.appSettings.stepFreeValue} onDeleteItem={() => {}} onEditItem={() => {}} isLightMode={isLightMode} showEditDeleteOnCard={false} cardSize={state.appSettings.cardSize} /></div></div>
                ))}
                <div className="list-none rounded-2xl" style={{ touchAction: "none" }}><AddItemPanel isLightMode={isLightMode} onAddItem={() => {}} onExpand={() => {}} onCollapse={() => {}} /></div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {isSplitMode && isLightMode && <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />}
      {isSplitMode && <CounterOrbsBackground isLightMode={isLightMode} />}

      <HamburgerMenu
        isOpen={state.isMenuOpen}
        onToggle={() => state.setIsMenuOpen(!state.isMenuOpen)}
        customTemplates={state.customTemplates}
        currentTemplateId={state.currentTemplateId}
        onSelectTemplate={actions.handleSelectTemplate}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        onReset={actions.handleReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSaveCustomTemplate={actions.handleSaveCustomTemplate}
        onDeleteCustomTemplate={actions.handleDeleteCustomTemplate}
        onOverwriteCustomTemplate={actions.handleOverwriteCustomTemplate}
        viewMode="counter"
        accentColor={state.appSettings.accentColor}
        leftContent={
          <div className="flex flex-col ml-1 min-w-0">
            <div className="flex items-center">
              {isEditingName ? (
                <input
                  autoFocus
                  maxLength={20}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className={`text-sm sm:text-lg font-bold bg-transparent border-b-2 outline-none px-0 py-0 ${
                    isLightMode ? "border-purple-500 text-gray-800" : "border-purple-400 text-white"
                  }`}
                  style={{ width: `${editingName.length + 1.5}em`, minWidth: "80px", maxWidth: "250px" }}
                />
              ) : (
                <h1 
                  onClick={handleStartEditName}
                  className={`text-sm sm:text-lg font-bold tracking-tight truncate max-w-[150px] sm:max-w-[250px] cursor-pointer hover:opacity-70 transition-opacity ${
                    isLightMode ? "text-gray-800" : "text-white/90"
                  }`}
                >
                  {currentTemplate?.name ?? "カウンター"}
                </h1>
              )}
            </div>
            <div className="flex items-center leading-none mt-0.5">
              {isEditingDesc ? (
                <input
                  autoFocus
                  maxLength={40}
                  type="text"
                  value={editingDesc}
                  onChange={(e) => setEditingDesc(e.target.value)}
                  onBlur={handleSaveDesc}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveDesc()}
                  className={`text-[10px] sm:text-xs bg-transparent border-b outline-none px-0 py-0 ${
                    isLightMode ? "border-purple-300 text-gray-500" : "border-purple-400/50 text-white/50"
                  }`}
                  style={{ width: `${editingDesc.length + 1.5}em`, minWidth: "120px", maxWidth: "300px" }}
                />
              ) : (
                <p 
                  onClick={handleStartEditDesc}
                  className={`text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-[250px] cursor-pointer hover:opacity-70 transition-opacity ${
                    isLightMode ? "text-gray-500 font-medium" : "text-white/40 font-medium"
                  }`}
                >
                  {currentTemplate?.description || "説明を追加..."}
                </p>
              )}
            </div>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {state.currentTemplateId === "prefectures" && (
              <button 
                onClick={() => setIsPrefectureRankingOpen(true)} 
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all border ${
                  isLightMode 
                    ? "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100" 
                    : "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                }`}
              >
                <span className="text-[10px] sm:text-xs font-bold">ランキング</span>
              </button>
            )}
            <button 
              onClick={handleShareAsImage} 
              className={`p-2 sm:p-2.5 rounded-xl transition-all border backdrop-blur-md ${
                isLightMode 
                  ? "bg-black/5 hover:bg-black/10 border-black/5 text-gray-600" 
                  : "bg-white/10 hover:bg-white/20 border-white/10 text-white/80"
              }`}
              title="画像を保存"
            >
              <ImageDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        }
      />



      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 custom-scrollbar relative z-10 flex flex-col" style={{ paddingTop: '80px', paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto flex-1 flex flex-col items-center justify-center gap-6 w-full" style={{ maxWidth: isPositionedLayout ? "none" : `${gridMaxWidth}px` }}>
          {state.appSettings.showProjectName && (state.appSettings.projectName || "").trim() && (
            <div className="w-full flex justify-center mb-2"><h2 className={`font-black tracking-tighter ${state.appSettings.projectNameSize === "S" ? "text-xl" : state.appSettings.projectNameSize === "L" ? "text-4xl" : "text-2xl"}`} style={{ color: state.appSettings.projectNameColor }}>{state.appSettings.projectName}</h2></div>
          )}
          {state.currentTemplateId === "prefectures" ? (
            <div className="w-full max-w-4xl aspect-square sm:aspect-video flex flex-col gap-4">
              <div className="flex-1 min-h-0"><PrefectureShapeMap items={state.items} onIncrement={(idx) => { const id = state.items[idx]?.id; if (id) actions.handleIncrement(id); }} onDecrement={(idx) => { const id = state.items[idx]?.id; if (id) actions.handleDecrement(id); }} isLightMode={isLightMode} accentColor={state.appSettings.accentColor} showCountLabels={state.showPrefectureCountLabels} showPrefectureNames={state.showPrefectureNames} /></div>
              <div className="flex items-center justify-center gap-4 py-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={state.showPrefectureCountLabels} onChange={(e) => state.setShowPrefectureCountLabels(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5" /><span className="text-xs opacity-70">数字を表示</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={state.showPrefectureNames} onChange={(e) => state.setShowPrefectureNames(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/5" /><span className="text-xs opacity-70">県名を表示</span></label></div>
            </div>
          ) : isPositionedLayout ? (
            <div ref={positionedContainerRef} className="relative w-full aspect-square sm:aspect-video rounded-3xl overflow-hidden border border-white/10" style={{ backgroundImage: `url(${currentTemplate?.backgroundImage})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
              {state.items.map((item) => (
                <div key={item.id} className="absolute" style={{ left: `${item.x ?? 50}%`, top: `${item.y ?? 50}%`, width: effectiveColMaxPx, height: effectiveColMaxPx, transform: "translate(-50%, -50%)" }}>
                  <CounterPanel id={item.id} label={item.label} emoji={item.emoji} color={item.color} count={item.count} target={item.target} onIncrement={actions.handleIncrement} onDecrement={actions.handleDecrement} onSetCount={actions.handleSetCount} onAdjustBy={actions.handleAdjustBy} showStep5={state.appSettings.showStep5} showStep10={state.appSettings.showStep10} showStepFree={state.appSettings.showStepFree} stepFreeValue={state.appSettings.stepFreeValue} onDeleteItem={actions.handleDeleteItem} onEditItem={(id) => setEditingItemId(id)} isLightMode={isLightMode} showEditDeleteOnCard={state.appSettings.showCardEditDelete} onRequestAchieveTarget={actions.handleAchieveTarget} showAchieveTargetButton={state.appSettings.showAchieveTargetButtonOnCard} cardSize={state.appSettings.cardSize} />
                </div>
              ))}
            </div>
          ) : (
            <DndContext sensors={drag.sensors} collisionDetection={closestCenter} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd}>
              <div className="grid items-stretch gap-2 sm:gap-2.5 w-full" style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(${effectiveColMaxPx}px, ${effectiveColMaxPx}px))` }}>
                <SortableContext items={state.items.map(i => i.id)} strategy={rectSortingStrategy}>
                  {state.items.map((item) => (
                    <CounterPanel key={item.id} id={item.id} label={item.label} emoji={item.emoji} color={item.color} count={item.count} target={item.target} onIncrement={actions.handleIncrement} onDecrement={actions.handleDecrement} onSetCount={actions.handleSetCount} onAdjustBy={actions.handleAdjustBy} showStep5={state.appSettings.showStep5} showStep10={state.appSettings.showStep10} showStepFree={state.appSettings.showStepFree} stepFreeValue={state.appSettings.stepFreeValue} onDeleteItem={setItemToDelete} onEditItem={(id) => setEditingItemId(id)} isLightMode={isLightMode} showEditDeleteOnCard={state.appSettings.showCardEditDelete} onRequestAchieveTarget={actions.handleAchieveTarget} showAchieveTargetButton={state.appSettings.showAchieveTargetButtonOnCard} cardSize={state.appSettings.cardSize} />
                  ))}
                </SortableContext>
                <div className="list-none rounded-2xl" style={{ touchAction: "none" }}><AddItemPanel isLightMode={isLightMode} onAddItem={actions.handleAddItem} onExpand={() => setAddPanelExpanded(true)} onCollapse={() => setAddPanelExpanded(false)} /></div>
              </div>
              {typeof document !== "undefined" && createPortal(<DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>{drag.activeItem ? <div style={{ width: effectiveColMaxPx }}><CounterPanel id={drag.activeItem.id} label={drag.activeItem.label} emoji={drag.activeItem.emoji} color={drag.activeItem.color} count={drag.activeItem.count} target={drag.activeItem.target} onIncrement={() => {}} onDecrement={() => {}} onDeleteItem={() => {}} onEditItem={() => {}} isLightMode={isLightMode} isOverlay cardSize={state.appSettings.cardSize} /></div> : null}</DragOverlay>, document.body)}
            </DndContext>
          )}
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          settings={state.appSettings} 
          onSave={state.setAppSettings} 
          onClose={() => setIsSettingsOpen(false)} 
          isLightMode={isLightMode} 
        />
      )}
      
      {(() => {
        const editingItem = state.items.find(i => i.id === editingItemId);
        return editingItem && (
          <EditItemModal 
            id={editingItem.id}
            label={editingItem.label}
            emoji={editingItem.emoji}
            color={editingItem.color}
            target={editingItem.target}
            onSave={actions.handleEditItem}
            onClose={() => setEditingItemId(null)}
            isLightMode={isLightMode}
          />
        );
      })()}

      <PrefectureRankingPanel 
        isOpen={isPrefectureRankingOpen} 
        onClose={() => setIsPrefectureRankingOpen(false)} 
        items={state.items} 
        isLightMode={isLightMode} 
        accentColor={state.appSettings.accentColor}
        onIncrement={(idx) => { const id = state.items[idx]?.id; if (id) actions.handleIncrement(id); }}
        onDecrement={(idx) => { const id = state.items[idx]?.id; if (id) actions.handleDecrement(id); }}
      />
      
      <ConfirmDialog open={!!itemToDelete} title="削除の確認" message="この項目を削除してもよろしいですか？" confirmLabel="削除する" cancelLabel="キャンセル" onConfirm={() => { if (itemToDelete) actions.handleDeleteItem(itemToDelete); setItemToDelete(null); }} onCancel={() => setItemToDelete(null)} danger />
    </div>
  );
}
