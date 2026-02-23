"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import CounterPanel from "@/components/CounterPanel";
import AddItemPanel from "@/components/AddItemPanel";
import HamburgerMenu from "@/components/HamburgerMenu";
import EditItemModal from "@/components/EditItemModal";
import SettingsModal, { type AppSettings, type CardSize } from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TEMPLATES, createCounterItems, type CounterItem, type Template } from "@/lib/templates";

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}

export default function Home({ isSplitMode = false, isRightPane = false }: { isSplitMode?: boolean; isRightPane?: boolean } = {}) {
  const [items, setItems] = useLocalStorage<CounterItem[]>(
    "counter-items",
    createCounterItems(TEMPLATES[1] ?? TEMPLATES[0]!)
  );
  const [currentTemplateId, setCurrentTemplateId] = useLocalStorage<string>(
    "counter-template",
    "zodiac"
  );
  const [isMenuOpen, setIsMenuOpen] = useLocalStorage<boolean>(
    "counter-menu-open",
    false
  );
  const [isLightMode, setIsLightMode] = useLocalStorage<boolean>(
    "counter-light-mode",
    false
  );
  const [customTemplates, setCustomTemplates] = useLocalStorage<Template[]>(
    "counter-custom-templates",
    []
  );
  const [addPanelExpanded, setAddPanelExpanded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings>(
    "counter-app-settings",
    {
      cardSize: "L" as CardSize,
      showProjectName: false,
      projectName: "",
      projectNameSize: "M" as const,
      projectNameColor: "#a855f7",
      accentColor: "#a855f7",
      orbIntensity: 50,
      showStep5: true,
      showStep10: true,
      showStepFree: false,
      stepFreeValue: 1,
    }
  );
  const windowWidth = useWindowWidth();

  // dnd-kit sensors and state
  const sensors = useSensors(
    // PC用のマウスドラッグ設定（5pxの遊びを持たせる）
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    // スマホ用の長押し設定（250px長押しでドラッグ開始、タップ時は5pxまでブレ許容）
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId),
    [activeId, items]
  );


  // Migrate old data without target field
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        target: item.target ?? 0,
      }))
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Migrate settings for new fields
  useEffect(() => {
    setAppSettings((prev) => {
      const hadLegacy = "showStepButtons" in prev && prev.showStepButtons === true;
      return {
        ...prev,
        projectNameSize: prev.projectNameSize ?? "M",
        projectNameColor: prev.projectNameColor ?? prev.accentColor ?? "#a855f7",
        orbIntensity: prev.orbIntensity ?? 50,
        showStep5: prev.showStep5 ?? (hadLegacy || true),
        showStep10: prev.showStep10 ?? (hadLegacy || true),
        showStepFree: prev.showStepFree ?? hadLegacy ?? false,
        stepFreeValue: prev.stepFreeValue ?? 1,
        showCardEditDelete: prev.showCardEditDelete ?? true,
      };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply accent color as CSS variable to body (for orbs, scrollbar, etc.)
  useEffect(() => {
    document.body.style.setProperty("--accent-color", appSettings.accentColor);
  }, [appSettings.accentColor]);

  // Apply orb opacity
  useEffect(() => {
    document.body.style.setProperty("--orb-opacity", String(appSettings.orbIntensity / 100));
  }, [appSettings.orbIntensity]);

  // Apply theme to body
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  }, [isLightMode]);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items]
  );

  const totalTarget = useMemo(
    () => items.reduce((sum, item) => sum + item.target, 0),
    [items]
  );

  const handleIncrement = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, count: item.count + 1 } : item
        )
      );
    },
    [setItems]
  );

  const handleDecrement = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && item.count > 0
            ? { ...item, count: item.count - 1 }
            : item
        )
      );
    },
    [setItems]
  );

  const handleSetCount = useCallback(
    (id: string, value: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, count: Math.max(0, value) } : item
        )
      );
    },
    [setItems]
  );

  const handleAdjustBy = useCallback(
    (id: string, delta: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, count: Math.max(0, item.count + delta) }
            : item
        )
      );
    },
    [setItems]
  );

  const handleReset = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, count: 0 })));
  }, [setItems]);

  const handleSelectTemplate = useCallback(
    (template: Template) => {
      setCurrentTemplateId(template.id);
      setItems(createCounterItems(template));
    },
    [setItems, setCurrentTemplateId]
  );

  const handleAddItem = useCallback(
    (label: string, emoji: string) => {
      const colors = [
        "#ef4444", "#f97316", "#eab308", "#22c55e",
        "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
      ];
      const newItem: CounterItem = {
        id: `custom-${Date.now()}`,
        label,
        emoji,
        color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
        count: 0,
        target: 0,
      };
      setItems((prev) => [...prev, newItem]);
      setCurrentTemplateId("custom");
    },
    [setItems, setCurrentTemplateId]
  );

  const handleEditItem = useCallback(
    (id: string, label: string, emoji: string, target?: number, color?: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
              ...item,
              label,
              emoji,
              ...(target !== undefined ? { target: Math.max(0, target) } : {}),
              ...(color !== undefined ? { color } : {}),
            }
            : item
        )
      );
    },
    [setItems]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [setItems]
  );

  const handleSetTarget = useCallback(
    (id: string, target: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, target: Math.max(0, target) } : item
        )
      );
    },
    [setItems]
  );

  const handleSetAllTargets = useCallback(
    (target: number) => {
      setItems((prev) =>
        prev.map((item) => ({ ...item, target: Math.max(0, target) }))
      );
    },
    [setItems]
  );

  const handleSaveCustomTemplate = useCallback(
    (name: string) => {
      const newTemplate: Template = {
        id: `custom-tpl-${Date.now()}`,
        name,
        description: `カスタムテンプレート (${items.length}項目)`,
        items: items.map(({ count, target, ...rest }) => rest),
      };
      setCustomTemplates((prev) => [...prev, newTemplate]);
    },
    [items, setCustomTemplates]
  );

  const handleDeleteCustomTemplate = useCallback(
    (id: string) => {
      setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    },
    [setCustomTemplates]
  );

  // Responsive grid columns — factor in cardSize
  const gridCols = useMemo(() => {
    const n = items.length;
    const size = appSettings.cardSize;
    // Mobile: ≤ 480px
    if (windowWidth <= 480) {
      if (size === "XL") return n <= 1 ? 1 : 2;
      if (size === "L") return n <= 2 ? Math.min(n, 2) : 3;
      if (n <= 2) return 2;
      return 3;
    }
    // Tablet: ≤ 768px
    if (windowWidth <= 768) {
      if (size === "XL") return n <= 2 ? Math.min(n, 2) : 3;
      if (n <= 4) return 2;
      if (n <= 9) return 3;
      return 4;
    }
    // Desktop
    if (size === "XL") {
      if (n <= 2) return Math.min(n, 2);
      if (n <= 4) return Math.min(n, 2);
      return 3;
    }
    if (n <= 2) return 2;
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    if (n <= 9) return 3;
    if (n <= 12) return 4;
    if (n <= 16) return 4;
    return 5;
  }, [items.length, windowWidth, appSettings.cardSize]);

  // Card size multiplier based on settings
  const cardSizeMap: Record<CardSize, { mobile: number; tablet: number; desktop: number }> = {
    S: { mobile: 96, tablet: 136, desktop: 168 },
    M: { mobile: 112, tablet: 162, desktop: 205 },
    L: { mobile: 120, tablet: 170, desktop: 220 },
    XL: { mobile: 140, tablet: 200, desktop: 280 },
  };

  // Responsive max width per column
  const sizeConfig = cardSizeMap[appSettings.cardSize] || cardSizeMap.L;
  const colMaxPx = windowWidth <= 480 ? sizeConfig.mobile : windowWidth <= 768 ? sizeConfig.tablet : sizeConfig.desktop;
  // Limit columns to actual item count to prevent empty columns (centering fix)
  // Always count one extra slot for the add panel placeholder to prevent layout shift
  const totalSlots = items.length + 1;
  const effectiveCols = Math.min(gridCols, totalSlots || 1);
  const gridMaxWidth = effectiveCols * colMaxPx;

  return (
    <div
      className="h-full w-full flex flex-col relative z-10"
      style={{ "--accent-color": appSettings.accentColor } as React.CSSProperties}
    >
      {/* Inline Background Orbs for Split mode (body::before is hidden behind split container) */}
      {isSplitMode && (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? 'mix-blend-multiply opacity-20' : 'opacity-80'}`}>
          <motion.div
            animate={{ x: [0, 60, -30, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.85, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full blur-[100px]"
            style={{ background: `radial-gradient(circle, ${appSettings.accentColor} 0%, transparent 70%)`, opacity: (appSettings.orbIntensity / 100) * (isLightMode ? 1.5 : 1) }}
          />
          <motion.div
            animate={{ x: [0, -60, 30, 0], y: [0, 60, -30, 0], scale: [1, 0.85, 1.15, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[120px]"
            style={{ background: `radial-gradient(circle, ${appSettings.accentColor} 0%, transparent 60%)`, opacity: (appSettings.orbIntensity / 100) * 0.8 * (isLightMode ? 1.5 : 1) }}
          />
          <motion.div
            animate={{ x: [0, 40, -50, 0], y: [0, 30, -60, 0], scale: [1, 1.1, 0.9, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute top-[50%] left-[30%] w-[25rem] h-[25rem] rounded-full blur-[80px]"
            style={{ background: `radial-gradient(circle, ${appSettings.accentColor} 0%, transparent 60%)`, opacity: (appSettings.orbIntensity / 100) * 0.6 * (isLightMode ? 1.5 : 1) }}
          />
        </div>
      )}
      <HamburgerMenu
        viewMode="counter"
        isOpen={isMenuOpen}
        onToggle={() => setIsMenuOpen((prev) => !prev)}
        isLightMode={isLightMode}
        onToggleTheme={() => setIsLightMode((prev) => !prev)}
        totalCount={totalCount}
        totalTarget={totalTarget}
        onReset={handleReset}
        items={items}
        onSelectTemplate={handleSelectTemplate}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={(id) => setItemToDelete(id)}
        onSetTarget={handleSetTarget}
        onSetAllTargets={handleSetAllTargets}
        currentTemplateId={currentTemplateId}
        onSaveCustomTemplate={handleSaveCustomTemplate}
        customTemplates={customTemplates}
        onDeleteCustomTemplate={handleDeleteCustomTemplate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        accentColor={appSettings.accentColor}
        hideThemeToggle={isSplitMode && !isRightPane}
        hideModeSelector={isSplitMode}
      />

      <main className="flex-1 overflow-auto" style={{ paddingTop: "56px" }}>
        <div className="min-h-full flex flex-col items-center justify-center py-4 px-3 sm:px-4">
          {/* Project Name (not h1 to keep single h1 for SEO) */}
          {!isSplitMode && appSettings.showProjectName && appSettings.projectName && (
            <motion.div
              drag
              dragMomentum={false}
              className="mb-4 text-center cursor-grab active:cursor-grabbing z-[60] relative pointer-events-auto"
              style={{ maxWidth: `${gridMaxWidth}px`, width: "100%" }}
            >
              <div
                role="presentation"
                className={`${appSettings.projectNameSize === "S" ? "text-sm sm:text-base" :
                  appSettings.projectNameSize === "L" ? "text-xl sm:text-2xl" :
                    appSettings.projectNameSize === "XL" ? "text-4xl sm:text-5xl" :
                      "text-lg sm:text-xl"
                  } font-bold tracking-wide`}
                style={{
                  color: appSettings.projectNameColor || appSettings.accentColor,
                  textShadow: `0 0 20px ${appSettings.projectNameColor || appSettings.accentColor}30`,
                  writingMode: appSettings.projectNameOrientation === "vertical" ? "vertical-rl" : "horizontal-tb",
                  margin: appSettings.projectNameOrientation === "vertical" ? "0 auto" : undefined,
                }}
              >
                {appSettings.projectName}
              </div>
            </motion.div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div
                className="grid gap-2 sm:gap-2.5 w-full"
                style={{
                  gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
                  maxWidth: `${gridMaxWidth}px`,
                  padding: 0,
                  margin: 0,
                }}
              >
                {items.map((item) => (
                  <CounterPanel
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    emoji={item.emoji}
                    color={item.color}
                    count={item.count}
                    target={item.target}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onSetCount={handleSetCount}
                    onAdjustBy={handleAdjustBy}
                    showStep5={appSettings.showStep5 ?? true}
                    showStep10={appSettings.showStep10 ?? true}
                    showStepFree={appSettings.showStepFree ?? false}
                    stepFreeValue={appSettings.stepFreeValue ?? 1}
                    onDeleteItem={(id) => setItemToDelete(id)}
                    onEditItem={(id) => setEditingItemId(id)}
                    isLightMode={isLightMode}
                    showEditDeleteOnCard={appSettings.showCardEditDelete ?? true}
                  />
                ))}
                {/* Add Panel Slot */}
                <div className={`list-none rounded-2xl ${addPanelExpanded ? "z-50 shadow-2xl" : ""}`} style={{ touchAction: "none" }}>
                  <AddItemPanel
                    isLightMode={isLightMode}
                    onAddItem={handleAddItem}
                    onExpand={() => setAddPanelExpanded(true)}
                    onCollapse={() => setAddPanelExpanded(false)}
                  />
                </div>
              </div>
            </SortableContext>
            <DragOverlay
              dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
              }}
            >
              {activeItem ? (
                <div style={{ transform: "scale(1.05)", cursor: "grabbing" }}>
                  <CounterPanel
                    id={activeItem.id}
                    label={activeItem.label}
                    emoji={activeItem.emoji}
                    color={activeItem.color}
                    count={activeItem.count}
                    target={activeItem.target}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onSetCount={handleSetCount}
                    onAdjustBy={handleAdjustBy}
                    showStep5={appSettings.showStep5 ?? true}
                    showStep10={appSettings.showStep10 ?? true}
                    showStepFree={appSettings.showStepFree ?? false}
                    stepFreeValue={appSettings.stepFreeValue ?? 1}
                    onDeleteItem={(id) => setItemToDelete(id)}
                    onEditItem={(id) => setEditingItemId(id)}
                    isLightMode={isLightMode}
                    isOverlay
                    showEditDeleteOnCard={appSettings.showCardEditDelete ?? true}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </main>

      {/* Edit Item Modal */}
      {editingItemId && (() => {
        const editingItem = items.find((i) => i.id === editingItemId);
        if (!editingItem) return null;
        return (
          <EditItemModal
            id={editingItem.id}
            label={editingItem.label}
            emoji={editingItem.emoji}
            color={editingItem.color}
            target={editingItem.target}
            isLightMode={isLightMode}
            onSave={(id, label, emoji, target, color) => {
              handleEditItem(id, label, emoji, target, color);
              setEditingItemId(null);
            }}
            onClose={() => setEditingItemId(null)}
          />
        );
      })()}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={appSettings}
          isLightMode={isLightMode}
          onSave={setAppSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <ConfirmDialog
        open={itemToDelete !== null}
        message="本当に削除しますか？"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={() => {
          if (itemToDelete) {
            setItems((prev) => prev.filter((item) => item.id !== itemToDelete));
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
