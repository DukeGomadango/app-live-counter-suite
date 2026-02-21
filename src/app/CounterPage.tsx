"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import CounterPanel from "@/components/CounterPanel";
import AddItemPanel from "@/components/AddItemPanel";
import HamburgerMenu from "@/components/HamburgerMenu";
import EditItemModal from "@/components/EditItemModal";
import SettingsModal, { type AppSettings, type CardSize } from "@/components/SettingsModal";
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

export default function Home() {
  const [items, setItems] = useLocalStorage<CounterItem[]>(
    "counter-items",
    createCounterItems(TEMPLATES[1])
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
    }
  );
  const windowWidth = useWindowWidth();

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
    setAppSettings((prev) => ({
      ...prev,
      projectNameSize: prev.projectNameSize ?? "M",
      projectNameColor: prev.projectNameColor ?? prev.accentColor ?? "#a855f7",
      orbIntensity: prev.orbIntensity ?? 50,
    }));
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
        color: colors[Math.floor(Math.random() * colors.length)],
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
    S: { mobile: 80, tablet: 120, desktop: 150 },
    M: { mobile: 100, tablet: 150, desktop: 190 },
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
      className="h-screen w-screen flex flex-col overflow-hidden relative z-10"
      style={{ "--accent-color": appSettings.accentColor } as React.CSSProperties}
    >
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
        onDeleteItem={handleDeleteItem}
        onSetTarget={handleSetTarget}
        onSetAllTargets={handleSetAllTargets}
        currentTemplateId={currentTemplateId}
        onSaveCustomTemplate={handleSaveCustomTemplate}
        customTemplates={customTemplates}
        onDeleteCustomTemplate={handleDeleteCustomTemplate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        accentColor={appSettings.accentColor}
      />

      <main className="flex-1 overflow-auto" style={{ paddingTop: "56px" }}>
        <div className="min-h-full flex flex-col items-center justify-center py-4 px-3 sm:px-4">
          {/* Project Name */}
          {appSettings.showProjectName && appSettings.projectName && (
            <motion.div
              drag
              dragMomentum={false}
              className="mb-4 text-center cursor-grab active:cursor-grabbing z-[60] relative pointer-events-auto"
              style={{ maxWidth: `${gridMaxWidth}px`, width: "100%" }}
            >
              <h1
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
              </h1>
            </motion.div>
          )}
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={setItems}
            className="grid gap-2 sm:gap-2.5 w-full"
            style={{
              gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
              maxWidth: `${gridMaxWidth}px`,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {items.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                className="list-none relative z-0"
                whileDrag={{
                  scale: 1.05,
                  zIndex: 50,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  cursor: "grabbing",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <CounterPanel
                  id={item.id}
                  label={item.label}
                  emoji={item.emoji}
                  color={item.color}
                  count={item.count}
                  target={item.target}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onDeleteItem={handleDeleteItem}
                  onEditItem={(id) => setEditingItemId(id)}
                  isLightMode={isLightMode}
                />
              </Reorder.Item>
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
          </Reorder.Group>
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
    </div>
  );
}
