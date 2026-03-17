"use client";

import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
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
import { toPng } from "html-to-image";
import { ImageDown, ListOrdered } from "lucide-react";
import CounterPanel from "@/components/CounterPanel";
import AddItemPanel from "@/components/AddItemPanel";
import HamburgerMenu from "@/components/HamburgerMenu";
import PrefectureShapeMap from "@/components/PrefectureShapeMap";
import PrefectureRankingPanel from "@/components/PrefectureRankingPanel";
import EditItemModal from "@/components/EditItemModal";
import SettingsModal, { type AppSettings, type CardSize } from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TEMPLATES, createCounterItems, type CounterItem, type Template } from "@/lib/templates";
import {
  getPrefecturePosition,
  minSpacingPercent,
} from "@/lib/prefecture-blocks";
import { generateShareUrl, getTimestampForFilename, shareImageWithText } from "@/lib/share";
import { DEFAULT_SHARE_HASHTAG } from "@/lib/site";

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
  const [isPrefectureRankingOpen, setIsPrefectureRankingOpen] = useState(false);
  const [showPrefectureCountLabels, setShowPrefectureCountLabels] = useLocalStorage<boolean>(
    "counter-prefecture-show-labels",
    true
  );
  const [showPrefectureNames, setShowPrefectureNames] = useLocalStorage<boolean>(
    "counter-prefecture-show-names",
    false
  );
  const positionedContainerRef = useRef<HTMLDivElement>(null);
  const [positionedContainerSize, setPositionedContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings>(
    "counter-app-settings",
    {
      cardSize: "L" as CardSize,
      cardScale: 100,
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
      showCardEditDelete: true,
      showAchieveTargetButtonOnCard: true,
    }
  );
  const windowWidth = useWindowWidth();
  const [winH, setWinH] = useState(800);
  useEffect(() => {
    const id = setTimeout(() => setWinH(window.innerHeight), 0);
    return () => clearTimeout(id);
  }, []);
  const shareAreaRef = useRef<HTMLDivElement>(null);
  const captureDimsRef = useRef<{ w: number; h: number } | null>(null);
  const [isCapturingShareImage, setIsCapturingShareImage] = useState(false);

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
        showAchieveTargetButtonOnCard: prev.showAchieveTargetButtonOnCard ?? true,
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

  const handleIncrementByIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) handleIncrement(item.id);
    },
    [items, handleIncrement]
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

  const handleDecrementByIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) handleDecrement(item.id);
    },
    [items, handleDecrement]
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

  const [itemIdToAchieveTarget, setItemIdToAchieveTarget] = useState<string | null>(null);
  const [allTargetsConfirmOpen, setAllTargetsConfirmOpen] = useState(false);

  const handleRequestAchieveTarget = useCallback((id: string) => {
    setItemIdToAchieveTarget(id);
  }, []);

  const handleConfirmAchieveTarget = useCallback(() => {
    if (!itemIdToAchieveTarget) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemIdToAchieveTarget && item.target > 0
          ? { ...item, count: Math.max(item.count, item.target) }
          : item
      )
    );
    setItemIdToAchieveTarget(null);
  }, [itemIdToAchieveTarget, setItems]);

  const handleCancelAchieveTarget = useCallback(() => {
    setItemIdToAchieveTarget(null);
  }, []);

  const handleRequestAchieveAllTargets = useCallback(() => {
    setAllTargetsConfirmOpen(true);
  }, []);

  const handleConfirmAchieveAllTargets = useCallback(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.target > 0 ? { ...item, count: Math.max(item.count, item.target) } : item
      )
    );
    setAllTargetsConfirmOpen(false);
  }, [setItems]);

  const handleCancelAchieveAllTargets = useCallback(() => {
    setAllTargetsConfirmOpen(false);
  }, []);

  const handleShareAsImage = useCallback(() => {
    captureDimsRef.current = { w: window.innerWidth, h: window.innerHeight };
    setIsCapturingShareImage(true);
  }, []);

  // キャプチャ用の portal（高さ制限なしで全カードを描画）が表示されたあとに toPng
  // 47都道府県の県形マップは SVG を非同期読み込みするため、キャプチャ遅延を長めにする
  const captureDelayMs = currentTemplateId === "prefectures" ? 500 : 80;
  useEffect(() => {
    if (!isCapturingShareImage) return;
    const id = setTimeout(async () => {
      const el = shareAreaRef.current;
      if (!el) {
        setIsCapturingShareImage(false);
        return;
      }
      try {
        const backgroundColor = isLightMode ? "#f5f3ff" : "#0f0a1e";
        const dataUrl = await toPng(el, { backgroundColor, pixelRatio: 3 });
        const tweetText = `進捗状況\n\n${DEFAULT_SHARE_HASHTAG}`;
        const filename = `counter-progress-${getTimestampForFilename()}.png`;
        const shared = await shareImageWithText(dataUrl, tweetText, filename);
        if (shared) return;
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
        window.open(generateShareUrl(tweetText, { toolId: "counter" }), "_blank", "noopener,noreferrer");
      } catch (err) {
        console.warn("Image export failed:", err);
      } finally {
        setIsCapturingShareImage(false);
      }
    }, captureDelayMs);
    return () => clearTimeout(id);
  }, [isCapturingShareImage, isLightMode, captureDelayMs]);

  const handleSelectTemplate = useCallback(
    (template: Template) => {
      setCurrentTemplateId(template.id);
      setItems(createCounterItems(template));
      // 47都道府県テンプレートはデフォルトでスケール50%、サイズS
      if (template.id === "prefectures") {
        setAppSettings((prev) => ({
          ...prev,
          cardSize: "S",
          cardScale: 50,
        }));
      }
    },
    [setItems, setCurrentTemplateId, setAppSettings]
  );

  const currentTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === currentTemplateId) ?? customTemplates.find((t) => t.id === currentTemplateId) ?? null,
    [currentTemplateId, customTemplates]
  );
  const isPositionedLayout = Boolean(
    currentTemplate?.layout === "positioned" && currentTemplate?.backgroundImage
  );

  // 地図レイアウトのコンテナ寸法（47都道府県の動的間隔用）
  useEffect(() => {
    if (!isPositionedLayout || !positionedContainerRef.current) return;
    const el = positionedContainerRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setPositionedContainerSize({ w: r.width, h: r.height });
      }
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      setPositionedContainerSize({ w: r.width, h: r.height });
    }
    return () => ro.disconnect();
  }, [isPositionedLayout]);

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
        ...(currentTemplate?.layout === "positioned" ? { x: 50, y: 50 } : {}),
      };
      setItems((prev) => [...prev, newItem]);
      setCurrentTemplateId("custom");
    },
    [setItems, setCurrentTemplateId, currentTemplate?.layout]
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

  const _handleDeleteItem = useCallback(
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
        items: items.map(({ count: _count, target: _target, ...rest }) => rest),
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

  // Responsive max width per column（表示用）
  const sizeConfig = cardSizeMap[appSettings.cardSize] || cardSizeMap.L;
  const colMaxPx = windowWidth <= 480 ? sizeConfig.mobile : windowWidth <= 768 ? sizeConfig.tablet : sizeConfig.desktop;
  const cardScale = (appSettings.cardScale ?? 100) / 100;
  const effectiveColMaxPx = colMaxPx * cardScale;
  // Limit columns to actual item count to prevent empty columns (centering fix)
  // Always count one extra slot for the add panel placeholder to prevent layout shift
  const totalSlots = items.length + 1;
  const effectiveCols = Math.min(gridCols, totalSlots || 1);
  const gridMaxWidth = effectiveCols * effectiveColMaxPx;

  // キャプチャ時はクリック直後の window サイズを使い、リサイズ直後の余白ずれを防ぐ
  const captureW = isCapturingShareImage && captureDimsRef.current ? captureDimsRef.current.w : windowWidth;
  const captureH = isCapturingShareImage && captureDimsRef.current ? captureDimsRef.current.h : winH;
  const captureColMaxPxBase = captureW <= 480 ? sizeConfig.mobile : captureW <= 768 ? sizeConfig.tablet : sizeConfig.desktop;
  const captureColMaxPx = captureColMaxPxBase * cardScale;
  const captureGridMaxWidth = effectiveCols * captureColMaxPx;
  const captureRows = Math.ceil(totalSlots / effectiveCols);
  const captureGap = 10;
  const captureEstimatedGridHeight = captureRows * captureColMaxPx + (captureRows - 1) * captureGap + 20;
  const captureScale = Math.min(
    captureW / captureGridMaxWidth,
    captureH / captureEstimatedGridHeight,
    1
  );
  const captureWidth = captureGridMaxWidth * captureScale;
  const captureHeight = captureEstimatedGridHeight * captureScale;
  const capturePadding = 32;
  const captureOuterWidth = captureWidth + capturePadding * 2;
  const captureOuterHeight = captureHeight + capturePadding * 2;

  // 47都道府県のキャプチャ: スマホでは画面幅に合わせて小さく（幅広くなりすぎないように）
  const capturePositionedSize =
    captureW < 768 ? Math.min(640, Math.max(280, captureW - 64)) : 960;
  const capturePositionedOuter = capturePositionedSize + capturePadding * 2;

  const captureBaseBg = isLightMode
    ? "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)"
    : "linear-gradient(135deg, #0a0118 0%, #1a0a2e 40%, #0d1b3e 70%, #0a0118 100%)";
  const orbOpacity = (appSettings.orbIntensity ?? 50) / 100;
  const accentHex = appSettings.accentColor;
  const captureOrbBg = isLightMode
    ? `radial-gradient(ellipse at 15% 25%, ${accentHex}66 0%, transparent 50%), radial-gradient(ellipse at 75% 20%, rgba(59, 130, 246, 0.25) 0%, transparent 45%), radial-gradient(ellipse at 85% 75%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, ${accentHex}4D 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, ${accentHex}40 0%, transparent 50%)`
    : `radial-gradient(ellipse at 20% 20%, ${accentHex}59 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, ${accentHex}33 0%, transparent 50%)`;

  const splitLightBg = "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";
  return (
    <div
      className="h-full w-full flex flex-col relative z-10"
      style={{ "--accent-color": appSettings.accentColor } as React.CSSProperties}
    >
      {/* 画像共有用：スケールダウンしてビューポートに収め、背景オーブ＋余白付きで toPng */}
      {typeof document !== "undefined" &&
        isCapturingShareImage &&
        createPortal(
          <div
            ref={shareAreaRef}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: `${isPositionedLayout ? capturePositionedOuter : captureOuterWidth}px`,
              height: `${isPositionedLayout ? capturePositionedOuter : captureOuterHeight}px`,
              overflow: "hidden",
              zIndex: -1,
              pointerEvents: "none",
              background: captureBaseBg,
            }}
            aria-hidden
          >
            {/* 背景オーブ（body::before 相当） */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                background: captureOrbBg,
                opacity: orbOpacity,
                pointerEvents: "none",
              }}
            />
            {/* 余白付きコンテンツ領域 */}
            <div
              style={{
                position: "absolute",
                left: `${capturePadding}px`,
                top: `${capturePadding}px`,
                width: `${isPositionedLayout ? capturePositionedSize : captureWidth}px`,
                height: `${isPositionedLayout ? capturePositionedSize : captureHeight}px`,
                overflow: "hidden",
                zIndex: 1,
              }}
            >
              {currentTemplateId === "prefectures" ? (
                <div
                  className="relative w-full h-full flex items-center justify-center"
                  style={{ width: capturePositionedSize, height: capturePositionedSize }}
                >
                  <div
                    style={{
                      width: Math.min(capturePositionedSize, 640),
                      height: Math.min(capturePositionedSize, 640),
                      flexShrink: 0,
                    }}
                  >
                    <PrefectureShapeMap
                      items={items}
                      onIncrement={() => {}}
                      onDecrement={undefined}
                      isLightMode={isLightMode}
                      accentColor={appSettings.accentColor}
                      showCountLabels={showPrefectureCountLabels}
                      showPrefectureNames={showPrefectureNames}
                    />
                  </div>
                </div>
              ) : isPositionedLayout && currentTemplate?.backgroundImage ? (
                <div
                  className="relative w-full h-full"
                  style={{
                    backgroundImage: `url(${currentTemplate.backgroundImage})`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    color: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)",
                  }}
                >
                  {items.map((item, _index) => {
                    const pos = { x: item.x ?? 50, y: item.y ?? 50 };
                    return (
                    <div
                      key={item.id}
                      className="absolute"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: captureColMaxPxBase,
                        height: captureColMaxPxBase,
                        transform: `translate(-50%, -50%) scale(${cardScale})`,
                      }}
                    >
                      <CounterPanel
                        id={item.id}
                        label={item.label}
                        emoji={item.emoji}
                        color={item.color}
                        count={item.count}
                        target={item.target}
                        onIncrement={() => {}}
                        onDecrement={() => {}}
                        onSetCount={undefined}
                        onAdjustBy={undefined}
                        showStep5={appSettings.showStep5 ?? true}
                        showStep10={appSettings.showStep10 ?? true}
                        showStepFree={appSettings.showStepFree ?? false}
                        stepFreeValue={appSettings.stepFreeValue ?? 1}
                        onDeleteItem={() => {}}
                        onEditItem={() => {}}
                        isLightMode={isLightMode}
                        showEditDeleteOnCard={false}
                        onRequestAchieveTarget={undefined}
                        showAchieveTargetButton={false}
                        cardSize={appSettings.cardSize}
                      />
                    </div>
                    );
                  })}
                </div>
              ) : (
              <div
                className="grid gap-2 sm:gap-2.5 w-full"
                style={{
                  gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
                  maxWidth: `${captureGridMaxWidth}px`,
                  width: `${captureGridMaxWidth}px`,
                  padding: 0,
                  margin: 0,
                  transform: `scale(${captureScale})`,
                  transformOrigin: "top left",
                }}
              >
              {items.map((item) => (
                <div key={item.id} style={{ width: captureColMaxPx, minHeight: 0 }}>
                  <div style={{ width: captureColMaxPxBase, transform: `scale(${cardScale})`, transformOrigin: "top left" }}>
                    <CounterPanel
                      id={item.id}
                      label={item.label}
                      emoji={item.emoji}
                      color={item.color}
                      count={item.count}
                      target={item.target}
                      onIncrement={() => {}}
                      onDecrement={() => {}}
                      onSetCount={undefined}
                      onAdjustBy={undefined}
                      showStep5={appSettings.showStep5 ?? true}
                      showStep10={appSettings.showStep10 ?? true}
                      showStepFree={appSettings.showStepFree ?? false}
                      stepFreeValue={appSettings.stepFreeValue ?? 1}
                      onDeleteItem={() => {}}
                      onEditItem={() => {}}
                      isLightMode={isLightMode}
                      showEditDeleteOnCard={false}
                      cardSize={appSettings.cardSize}
                    />
                  </div>
                </div>
              ))}
              <div className="list-none rounded-2xl" style={{ touchAction: "none" }}>
                <AddItemPanel
                  isLightMode={isLightMode}
                  onAddItem={() => {}}
                  onExpand={() => {}}
                  onCollapse={() => {}}
                />
              </div>
            </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Split時ライト: body.light-mode 相当のベース背景（通常版と同じ見た目） */}
      {isSplitMode && isLightMode && (
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />
      )}
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
        onRequestAchieveTarget={handleRequestAchieveTarget}
        onRequestAchieveAllTargets={handleRequestAchieveAllTargets}
        currentTemplateId={currentTemplateId}
        onSaveCustomTemplate={handleSaveCustomTemplate}
        customTemplates={customTemplates}
        onDeleteCustomTemplate={handleDeleteCustomTemplate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        accentColor={appSettings.accentColor}
        hideThemeToggle={false}
        hideModeSelector={isSplitMode}
      />

      <main className="flex-1 overflow-auto scroll-touch" style={{ paddingTop: "56px" }}>
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
          {currentTemplateId === "prefectures" ? (
            <>
              <PrefectureShapeMap
                items={items}
                onIncrement={handleIncrementByIndex}
                onDecrement={handleDecrementByIndex}
                isLightMode={isLightMode}
                accentColor={appSettings.accentColor}
                showCountLabels={showPrefectureCountLabels}
                showPrefectureNames={showPrefectureNames}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full" style={{ maxWidth: "min(95vw, 640px)" }}>
                <label className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer transition opacity-90 hover:opacity-100" style={{ border: `1px solid ${appSettings.accentColor}40`, color: appSettings.accentColor }}>
                  <input
                    type="checkbox"
                    checked={showPrefectureNames}
                    onChange={(e) => setShowPrefectureNames(e.target.checked)}
                    className="rounded"
                  />
                  県名表示
                </label>
                <label className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer transition opacity-90 hover:opacity-100" style={{ border: `1px solid ${appSettings.accentColor}40`, color: appSettings.accentColor }}>
                  <input
                    type="checkbox"
                    checked={showPrefectureCountLabels}
                    onChange={(e) => setShowPrefectureCountLabels(e.target.checked)}
                    className="rounded"
                  />
                  件数表示
                </label>
                <button
                  type="button"
                  onClick={() => setIsPrefectureRankingOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition opacity-90 hover:opacity-100"
                  style={{
                    background: `${appSettings.accentColor}20`,
                    color: appSettings.accentColor,
                    border: `1px solid ${appSettings.accentColor}40`,
                  }}
                >
                  <ListOrdered size={18} />
                  一覧・ランキング
                </button>
              </div>
              <PrefectureRankingPanel
                isOpen={isPrefectureRankingOpen}
                onClose={() => setIsPrefectureRankingOpen(false)}
                items={items}
                isLightMode={isLightMode}
                onIncrement={handleIncrementByIndex}
                onDecrement={handleDecrementByIndex}
                accentColor={appSettings.accentColor}
              />
            </>
          ) : isPositionedLayout && windowWidth >= 768 ? (
            <>
                <div
                  ref={positionedContainerRef}
                  className="relative flex-shrink-0"
                  style={{
                    width: windowWidth >= 960 ? 960 : "min(95vw, 960px)",
                    maxWidth: "min(95vw, 960px)",
                    aspectRatio: "1",
                  }}
                >
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${currentTemplate!.backgroundImage})`,
                    color: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)",
                  }}
                  aria-hidden
                />
                {items.map((item, index) => {
                  const isPrefectures = currentTemplateId === "prefectures";
                  const fallbackSize = 960;
                  const containerW = positionedContainerSize?.w ?? fallbackSize;
                  const containerH = positionedContainerSize?.h ?? fallbackSize;
                  const spacing = isPrefectures
                    ? minSpacingPercent(effectiveColMaxPx, containerW, containerH, cardScale)
                    : null;
                  const pos =
                    isPrefectures && spacing
                      ? getPrefecturePosition(index, spacing.x, spacing.y)
                      : { x: item.x ?? 50, y: item.y ?? 50 };
                  return (
                  <div
                    key={item.id}
                    className="absolute z-10"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: colMaxPx,
                      height: colMaxPx,
                      transform: `translate(-50%, -50%) scale(${cardScale})`,
                    }}
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
                      onRequestAchieveTarget={handleRequestAchieveTarget}
                      showAchieveTargetButton={appSettings.showAchieveTargetButtonOnCard ?? true}
                      cardSize={appSettings.cardSize}
                    />
                  </div>
                  );
                })}
                </div>
              <div className={`mt-4 list-none rounded-2xl ${addPanelExpanded ? "z-50 shadow-2xl" : ""}`} style={{ touchAction: "none", maxWidth: `${gridMaxWidth}px`, width: "100%" }}>
                <AddItemPanel
                  isLightMode={isLightMode}
                  onAddItem={handleAddItem}
                  onExpand={() => setAddPanelExpanded(true)}
                  onCollapse={() => setAddPanelExpanded(false)}
                />
              </div>
            </>
          ) : (
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
                  <div key={item.id} style={{ width: effectiveColMaxPx, minHeight: 0 }}>
                    <div style={{ width: colMaxPx, transform: `scale(${cardScale})`, transformOrigin: "top left" }}>
                      <CounterPanel
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
                      onRequestAchieveTarget={handleRequestAchieveTarget}
                      showAchieveTargetButton={appSettings.showAchieveTargetButtonOnCard ?? true}
                        cardSize={appSettings.cardSize}
                      />
                    </div>
                  </div>
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
                <div style={{ transform: `scale(${cardScale * 1.05})`, cursor: "grabbing" }}>
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
                    cardSize={appSettings.cardSize}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          )}
        </div>
      </main>

      {/* 画像で共有ボタン（ヘッダー右下・ヘルプの左） */}
      <button
        type="button"
        onClick={handleShareAsImage}
        className="fixed z-[100] w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          top: "70px",
          right: "64px",
          background: isLightMode ? "rgba(255, 255, 255, 0.4)" : "rgba(20, 10, 40, 0.4)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
        }}
        title="画像で共有"
      >
        <ImageDown
          size={20}
          className={isLightMode ? "text-gray-500" : "text-white/40"}
        />
      </button>

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
      <ConfirmDialog
        open={itemIdToAchieveTarget !== null}
        message="目標を達成しますか？"
        confirmLabel="はい"
        cancelLabel="いいえ"
        onConfirm={handleConfirmAchieveTarget}
        onCancel={handleCancelAchieveTarget}
      />
      <ConfirmDialog
        open={allTargetsConfirmOpen}
        title="全目標達成"
        message="すべての項目を目標値まで進めますか？"
        confirmLabel="はい"
        cancelLabel="いいえ"
        onConfirm={handleConfirmAchieveAllTargets}
        onCancel={handleCancelAchieveAllTargets}
        danger={false}
      />
    </div>
  );
}
