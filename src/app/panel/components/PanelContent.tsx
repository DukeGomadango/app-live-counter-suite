"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { 
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Types & Libs
import { 
  type PanelOverlay, 
  type PartitionStroke, 
  type FilterType,
  OverlayShape,
  createImageOverlay,
  defaultPanelState
} from "../lib/panelTypes";
import { 
  saveImage
} from "../lib/panelImageStore";
import { 
  getImageBoundsPct
} from "../lib/panelUtils";

// Hooks
import { usePanelState } from "../hooks/usePanelState";
import { useOverlayInteraction } from "../hooks/useOverlayInteraction";
import { usePanelDrawing } from "../hooks/usePanelDrawing";
import { usePanelActions } from "../hooks/usePanelActions";
import { useToast } from "@/components/Toast";
import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { useTheme } from "@/context/ThemeContext";

// Components
import { PanelHeader } from "./sub/PanelHeader";
import { PanelMenu } from "./sub/PanelMenu";
import { PanelCanvas } from "./sub/PanelCanvas";
import PanelEditSidebar from "./PanelEditSidebar";
import { useConfirm } from "@/context/ConfirmContext";
import ImageCropModal from "@/components/ImageCropModal";
import CustomShapeEditorModal from "@/components/CustomShapeEditorModal";
import ShareModal from "@/components/ShareModal";

interface PanelContentProps {
  isSplitMode?: boolean;
}

export default function PanelContent({ isSplitMode = false }: PanelContentProps) {
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();
  const { isLightMode } = useTheme();
  
  // -- Hooks --
  const state = usePanelState();
  const {
    panelState, setPanelState,
    overlays, setOverlays,
    pushOverlayHistory,
    imageDataUrl, imageAspectRatio,
    resolvedBgUrl, resolvedOverlayUrls,
    savedPanels, setSavedPanels,
    setSavedCustomShapes,
    isEditMode, panelEditStep,
    activeFilters, filterIntensity, filterShowLabel,
    editSidebarWidthPx, setEditSidebarWidthPx,
    undoOverlays
  } = state;

  // -- Refs --
  const captureRef = useRef<HTMLDivElement>(null);
  const captureWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageOverlayInputRef = useRef<HTMLInputElement>(null);
  const editSidebarRef = useRef<HTMLDivElement>(null);

  // -- UI States --
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [panelSidebarTab, setPanelSidebarTab] = useState<"image" | "lines" | "overlay" | "layer" | "shapes">("image");
  const [editSidebarOverlayOpen, setEditSidebarOverlayOpen] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [targetNumberDraft, setTargetNumberDraft] = useState<{ overlayId: string; value: string } | null>(null);
  const [pendingCropDataUrl, setPendingCropDataUrl] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const [renamePanelId, setRenamePanelId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [customShapeModalOpen, setCustomShapeModalOpen] = useState(false);
  const [customShapeEditingId, setCustomShapeEditingId] = useState<string | null>(null);

  const [addShape, setAddShape] = useState<OverlayShape | null>(null);
  const [lineToolMode, setLineToolMode] = useState<"pen" | "hand">("pen");
  const [lineSegmentMode, setLineSegmentMode] = useState<"line" | "curve">("line");
  const partitionStrokes = panelState.partitionStrokes ?? [];
  const setPartitionStrokes = useCallback((value: React.SetStateAction<PartitionStroke[]>) => {
    setPanelState(s => {
      const current = s.partitionStrokes ?? [];
      const next = typeof value === "function" ? value(current) : value;
      return { ...s, partitionStrokes: next };
    });
  }, [setPanelState]);

  // -- Derived --
  const isLineStep = isEditMode && panelEditStep === "lines";
  const isEditSidebarNarrow = !isDesktop || (typeof window !== "undefined" && window.innerWidth < 1024);

  const [imageBoundsPct, setImageBoundsPct] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!captureRef.current) return;
    const rect = captureRef.current.getBoundingClientRect();
    setImageBoundsPct(getImageBoundsPct(rect, imageAspectRatio ?? undefined));
  }, [imageAspectRatio]);

  const setSelectedOverlayIdAndClearDraft = useCallback((id: string | null) => {
    setSelectedOverlayId(id);
    setTargetNumberDraft(null);
  }, []);

  // -- Interactions Hook --
  const interaction = useOverlayInteraction({
    overlays, setOverlays, pushOverlayHistory,
    selectedOverlayId, setSelectedOverlayIdAndClearDraft,
    isEditMode, getRect: () => captureRef.current?.getBoundingClientRect()
  });

  // -- Drawing Hook --
  const drawing = usePanelDrawing({
    isLineStep, lineToolMode, lineSegmentMode,
    partitionStrokes, setPartitionStrokes,
    addShape, setAddShape,
    setOverlays, pushOverlayHistory,
    clientToPctForLine: (cx, cy) => {
      const rect = captureRef.current?.getBoundingClientRect();
      if (!rect) return { x: 50, y: 50 };
      const bounds = imageBoundsPct ?? getImageBoundsPct(rect, imageAspectRatio ?? undefined);
      const imgLeft = rect.left + (rect.width * bounds.x) / 100;
      const imgTop = rect.top + (rect.height * bounds.y) / 100;
      const imgWidth = (rect.width * bounds.width) / 100;
      const imgHeight = (rect.height * bounds.height) / 100;
      if (imgWidth <= 0 || imgHeight <= 0) return { x: 50, y: 50 };
      return { x: ((cx - imgLeft) / imgWidth) * 100, y: ((cy - imgTop) / imgHeight) * 100 };
    },
    clientToPct: (cx, cy) => {
      const rect = captureRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: ((cx - rect.left) / rect.width) * 100, y: ((cy - rect.top) / rect.height) * 100 };
    }
  });

  // -- Actions Hook --
  const actions = usePanelActions({
    panelState, setPanelState, overlays, setOverlays, pushOverlayHistory,
    setSelectedOverlayIdAndClearDraft, imageDataUrl, imageAspectRatio,
    captureRef, isLightMode, isDesktop, resolvedBgUrl, resolvedOverlayUrls,
    savedPanels, setSavedPanels, setSavedCustomShapes, showToast
  });

  // -- Handlers --
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const idbRef = await saveImage(file);
    setPanelState(s => ({ ...s, imageDataUrl: idbRef, imageAspectRatio: undefined }));
    e.target.value = "";
  }, [setPanelState]);

  const handleImageDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const idbRef = await saveImage(file);
    setPanelState(s => ({ ...s, imageDataUrl: idbRef, imageAspectRatio: undefined }));
  }, [setPanelState]);

  const handleOverlayTap = useCallback(async (overlay: PanelOverlay) => {
    if (overlay.targetType === "text" || overlay.count >= overlay.target) {
      if (await confirm({ message: "達成しますか？" })) {
        setOverlays(prev => prev.filter(o => o.id === overlay.id));
      }
    } else {
      setOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, count: o.count + 1 } : o));
    }
  }, [setOverlays, confirm]);

  const handlePointerUpWithTap = useCallback((overlay: PanelOverlay, e: React.PointerEvent) => {
    interaction.handleOverlayPointerUp();
    const el = e.target as HTMLElement;
    if (el.closest("button") || el.closest("input")) return;
    if (interaction.tapPendingRef.current) {
      interaction.resetTapPending();
      if (!isEditMode) handleOverlayTap(overlay);
    }
  }, [interaction, isEditMode, handleOverlayTap]);

  const handleCropConfirm = useCallback((result: { dataUrl: string; aspectRatio: number }) => {
    setPanelState(s => ({ ...s, imageDataUrl: result.dataUrl, imageAspectRatio: result.aspectRatio }));
    setPendingCropDataUrl(null);
  }, [setPanelState]);



  const handleRenameSubmit = useCallback(() => {
    if (!renamePanelId || !renameValue.trim()) { setRenamePanelId(null); return; }
    setSavedPanels(savedPanels.map(p => p.id === renamePanelId ? { ...p, name: renameValue.trim() } : p));
    setRenamePanelId(null);
  }, [renamePanelId, renameValue, savedPanels, setSavedPanels]);

  const handleSidebarResize = useCallback((e: MouseEvent | TouchEvent) => {
    const cx = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    setEditSidebarWidthPx(Math.max(200, Math.min(600, cx)));
  }, [setEditSidebarWidthPx]);

  const handleResizeEndRef = useRef<() => void>(() => {});
  
  const handleResizeEnd = useCallback(() => {
    window.removeEventListener("mousemove", handleSidebarResize);
    window.removeEventListener("mouseup", handleResizeEndRef.current);
    window.removeEventListener("touchmove", handleSidebarResize);
    window.removeEventListener("touchend", handleResizeEndRef.current);
  }, [handleSidebarResize]);

  useEffect(() => {
    handleResizeEndRef.current = handleResizeEnd;
  }, [handleResizeEnd]);

  const handleResizeStart = useCallback(() => {
    window.addEventListener("mousemove", handleSidebarResize);
    window.addEventListener("mouseup", handleResizeEnd);
    window.addEventListener("touchmove", handleSidebarResize);
    window.addEventListener("touchend", handleResizeEnd);
  }, [handleSidebarResize, handleResizeEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無効
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Ctrl+Z / Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (isLineStep) {
          // 線で切り分けモード中の Undo: 最後に引いた線を削除
          setPartitionStrokes(prev => prev.slice(0, -1));
          drawing.setSelectedLineIndex(null);
        } else {
          // 図形編集モード中の Undo
          undoOverlays();
        }
        return;
      }

      // Delete / Backspace: 削除
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isLineStep && drawing.selectedLineIndex !== null) {
          e.preventDefault();
          setPartitionStrokes(prev => prev.filter((_, i) => i !== drawing.selectedLineIndex));
          drawing.setSelectedLineIndex(null);
        } else if (selectedOverlayId) {
          e.preventDefault();
          pushOverlayHistory(overlays);
          setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId));
          setSelectedOverlayIdAndClearDraft(null);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isLineStep, partitionStrokes, setPartitionStrokes, 
    drawing, selectedOverlayId, overlays, setOverlays, 
    pushOverlayHistory, undoOverlays, setSelectedOverlayIdAndClearDraft
  ]);

  // -- Render Helpers --
  const selectedOverlay = useMemo(() => 
    selectedOverlayId ? overlays.find(o => o.id === selectedOverlayId) ?? null : null
  , [selectedOverlayId, overlays]);

  const sidebarProps = {
    tab: panelSidebarTab, setTab: setPanelSidebarTab,
    isLightMode, editSidebarRef, effectiveSidebarWidth: editSidebarWidthPx,
    fileInputRef, imageOverlayInputRef, imageDataUrl,
    setPendingCropDataUrl, setPanelState,
    isLineStep, lineToolMode, setLineToolMode, lineSegmentMode, setLineSegmentMode,
    partitionStrokes, setPartitionStrokes,
    selectedLineIndex: drawing.selectedLineIndex, setSelectedLineIndex: drawing.setSelectedLineIndex,
    onGenerateRegions: actions.handleGenerateRegions,
    selectedOverlay, overlays, setOverlays,
    targetNumberDraft, setTargetNumberDraft,
    favoriteColors: state.favoriteColors, setFavoriteColors: state.setFavoriteColors,
    pushOverlayHistory, setSelectedOverlayId,
    setCustomShapeEditingId, setCustomShapeModalOpen,
    addShape, setAddShape, setIsDrawingFree: drawing.setIsDrawingFree,
    captureRef,
    onAddOverlayAtPoint: (shape: OverlayShape, x: number, y: number) => actions.handleAddOverlayAtPoint(shape, x, y),
    onAddRectGrid: actions.handleAddRectGrid,
    onAddTriangleStripes: actions.handleAddTriangleStripes,
    activeFilters, toggleFilter: (f: FilterType) => setPanelState(s => ({ ...s, activeFilters: s.activeFilters.includes(f) ? s.activeFilters.filter(x => x !== f) : [...s.activeFilters, f] })),
    filterShowLabel, filterIntensity,
    setCustomShapeModalOpenForNew: () => { setCustomShapeEditingId(null); setCustomShapeModalOpen(true); }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}
      style={{ background: isSplitMode && !isLightMode ? "#0a051e" : undefined }}
    >
      {isSplitMode && isLightMode && (
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)" }} />
      )}

      <PanelHeader
        isEditMode={isEditMode} setIsEditMode={v => setPanelState(s => ({ ...s, isEditMode: v }))}
        isSplitMode={isSplitMode} isEditSidebarNarrow={isEditSidebarNarrow}
        setEditSidebarOverlayOpen={setEditSidebarOverlayOpen}
        setAllAchieveConfirmOpen={async (open) => {
          if (open) {
            if (await confirm({ message: "すべての覆いを開けますか？" })) {
              setOverlays(() => []);
            }
          }
        }}
        handleShare={actions.handleShare} isSharing={actions.isSharing}
        setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen}
      />

      <PanelMenu
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} isLightMode={isLightMode}
        handleSavePanel={actions.handleSavePanel} handleShare={actions.handleShare} isSharing={actions.isSharing}
        savedPanels={savedPanels} renamePanelId={renamePanelId} setRenamePanelId={setRenamePanelId}
        renameValue={renameValue} setRenameValue={setRenameValue}
        handleRenameSubmit={handleRenameSubmit} handleRenameSavedPanel={s => { setRenamePanelId(s.id); setRenameValue(s.name); }}
        handleLoadPanel={async (s) => { 
          if (await confirm({
            title: "パネルの読み込み",
            message: "保存されたパネルを読み込むと、現在の編集内容が上書きされます。よろしいですか？",
            danger: true
          })) {
            const newState = { ...defaultPanelState, ...s.state };
            setPanelState(newState); 
            setSelectedOverlayIdAndClearDraft(null); 
            setIsMenuOpen(false); 
          }
        }}
        setPanelToDeleteId={async (id) => {
          if (id) {
            if (await confirm({ message: "本当に削除しますか？", danger: true })) {
              const next = savedPanels.filter(p => p.id !== id);
              setSavedPanels(next);
            }
          }
        }}
      />

      <main className={`relative z-10 flex-1 flex flex-col min-h-0 overflow-auto scroll-touch p-0`}>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <input ref={imageOverlayInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const idbRef = await saveImage(file);
          const newO = createImageOverlay(idbRef, 42.5, 42.5);
          pushOverlayHistory(overlays);
          setOverlays(prev => [...prev, newO]);
          setSelectedOverlayIdAndClearDraft(newO.id);
          e.target.value = "";
        }} />

        <AnimatePresence>
          {isEditMode && isEditSidebarNarrow && editSidebarOverlayOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed left-0 top-14 bottom-0 right-0 z-[60] bg-black/40" onClick={() => setEditSidebarOverlayOpen(false)} />
              <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.2 }} className="fixed left-0 top-14 bottom-0 z-[61] flex flex-col overflow-hidden shadow-xl" style={{ width: 300, background: isLightMode ? "rgba(248,250,252,0.98)" : "rgba(10,5,30,0.98)", backdropFilter: "blur(12px)" }}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <span className="text-sm font-medium">編集パネル</span>
                  <button onClick={() => setEditSidebarOverlayOpen(false)}><X size={18} /></button>
                </div>
                <PanelEditSidebar {...sidebarProps} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div ref={captureWrapperRef} className={`flex-1 flex min-h-0 ${isEditMode ? "flex-row" : "flex-col"}`}>
          {isEditMode && !isEditSidebarNarrow && (
            <>
              <PanelEditSidebar {...sidebarProps} />
              <div role="separator" onMouseDown={handleResizeStart} onTouchStart={handleResizeStart} className="shrink-0 w-4 h-full cursor-col-resize flex items-center justify-center group">
                <span className="w-0.5 h-8 bg-white/20 group-hover:bg-white/40 rounded-full" />
              </div>
            </>
          )}
          <div className={`flex-1 flex items-center justify-center ${isEditMode ? "p-4" : "p-8"}`}>
            <PanelCanvas
              captureRef={captureRef}
              imageDataUrl={imageDataUrl} resolvedBgUrl={resolvedBgUrl} imageAspectRatio={imageAspectRatio ?? undefined}
              isLightMode={isLightMode} isEditMode={isEditMode} isLineStep={isLineStep}
              activeFilters={activeFilters} filterIntensity={filterIntensity} filterShowLabel={filterShowLabel}
              overlays={overlays} selectedOverlayId={selectedOverlayId} resolvedOverlayUrls={resolvedOverlayUrls}
              imageBoundsPct={imageBoundsPct}
              onPointerDownCapture={interaction.handleCapturePointerDown}
              onPointerMoveCapture={interaction.handleCapturePointerMove}
              onPointerUpCapture={interaction.handleCapturePointerUp}
              onPointerLeaveCapture={interaction.handleCapturePointerLeaveOrCancel}
              partitionStrokes={partitionStrokes} selectedLineIndex={drawing.selectedLineIndex}
              lineDrawStart={drawing.lineDrawStart} lineDrawEnd={drawing.lineDrawEnd}
              lineSegmentMode={lineSegmentMode} lineToolMode={lineToolMode} strokePreviewPoints={drawing.strokePreviewPoints}
              onLineDrawPointerDown={drawing.handleLineDrawPointerDown}
              onLineDrawPointerMove={drawing.handleLineDrawPointerMove}
              onLineDrawPointerUp={drawing.handleLineDrawPointerUp}
              isDrawingFree={drawing.isDrawingFree} freeDrawPreviewPoints={drawing.freeDrawPreviewPoints}
              onFreeDrawStart={drawing.handleFreeDrawStart} onFreeDrawMove={drawing.handleFreeDrawMove} onFreeDrawEnd={drawing.handleFreeDrawEnd}
              onImageUploadClick={() => fileInputRef.current?.click()}
              onImageDrop={handleImageDrop}
              onAddOverlayClick={(e) => {
                if (!addShape || !captureRef.current) return;
                const rect = captureRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                actions.handleAddOverlayAtPoint(addShape, x, y);
                setAddShape(null);
              }}
              onOverlayPointerDown={interaction.handlePointerDown}
              onOverlayPointerMove={interaction.handleOverlayPointerMove}
              onOverlayPointerUp={handlePointerUpWithTap}
              onOverlayPointerLeave={() => { interaction.handleOverlayPointerUp(); }}
              onOverlayClick={(id, e) => { e.stopPropagation(); if (isEditMode) setSelectedOverlayIdAndClearDraft(selectedOverlayId === id ? null : id); }}
              onOverlayDelete={(id, e) => { e.stopPropagation(); pushOverlayHistory(overlays); setOverlays(prev => prev.filter(o => o.id !== id)); setSelectedOverlayIdAndClearDraft(null); }}
              pushOverlayHistory={pushOverlayHistory} addShape={addShape}
            />
          </div>
        </div>
      </main>


      <ImageCropModal open={pendingCropDataUrl !== null} imageDataUrl={pendingCropDataUrl!} onConfirm={handleCropConfirm} onCancel={() => setPendingCropDataUrl(null)} isLightMode={isLightMode} />
      <CustomShapeEditorModal open={customShapeModalOpen} initialParts={customShapeEditingId ? (overlays.find(o => o.id === customShapeEditingId)?.parts ?? []) : []} savedTemplates={state.savedCustomShapes} onConfirm={actions.handleCustomShapeConfirm} onCancel={() => { setCustomShapeModalOpen(false); setCustomShapeEditingId(null); }} onSaveTemplate={actions.handleSaveCustomTemplate} isLightMode={isLightMode} />
      <ShareModal 
        isOpen={actions.isShareModalOpen} 
        onClose={() => actions.setIsShareModalOpen(false)} 
        dataUrl={actions.capturedDataUrl} 
        initialText="パネル開け進捗" 
        toolId="panel" 
        isLightMode={isLightMode} 
      />
    </div>
  );
}
