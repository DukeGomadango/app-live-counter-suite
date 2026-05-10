"use client";

import { useCallback } from "react";
import { type CounterItem, type Template, createCounterItems } from "@/lib/templates";
import { type AppSettings } from "@/components/SettingsModal";

interface CounterActionsProps {
  items: CounterItem[];
  setItems: (updater: (prev: CounterItem[]) => CounterItem[]) => void;
  setCurrentTemplateId: (id: string) => void;
  setAppSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  customTemplates: Template[];
  setCustomTemplates: (updater: (prev: Template[]) => Template[]) => void;
  currentTemplateLayout?: string;
}

export function useCounterActions({
  items,
  setItems,
  setCurrentTemplateId,
  setAppSettings,
  customTemplates,
  setCustomTemplates,
  currentTemplateLayout
}: CounterActionsProps) {

  const handleIncrement = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, count: item.count + 1 } : item));
  }, [setItems]);

  const handleDecrement = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, count: item.count - 1 } : item));
  }, [setItems]);

  const handleSetCount = useCallback((id: string, value: number) => {
    const next = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, count: next } : item));
  }, [setItems]);

  const handleAdjustBy = useCallback((id: string, delta: number) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const sum = item.count + delta;
      const next = typeof sum === "number" && Number.isFinite(sum) ? Math.trunc(sum) : item.count;
      return { ...item, count: next };
    }));
  }, [setItems]);

  const handleReset = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, count: 0 })));
  }, [setItems]);

  const handleAddItem = useCallback((label: string, emoji: string) => {
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
    const newItem: CounterItem = {
      id: `custom-${Date.now()}`,
      label,
      emoji,
      color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
      count: 0,
      target: 0,
      ...(currentTemplateLayout === "positioned" ? { x: 50, y: 50 } : {}),
    };
    setItems((prev) => [...prev, newItem]);
    setCurrentTemplateId("custom");
  }, [setItems, setCurrentTemplateId, currentTemplateLayout]);

  const handleEditItem = useCallback((id: string, label: string, emoji: string, target?: number, color?: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? {
      ...item,
      label,
      emoji,
      ...(target !== undefined ? { target: Math.max(0, target) } : {}),
      ...(color !== undefined ? { color } : {}),
    } : item));
  }, [setItems]);

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [setItems]);

  const handleSetTarget = useCallback((id: string, target: number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, target: Math.max(0, target) } : item));
  }, [setItems]);

  const handleSetAllTargets = useCallback((target: number) => {
    setItems((prev) => prev.map((item) => ({ ...item, target: Math.max(0, target) })));
  }, [setItems]);

  const handleAchieveTarget = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id || !item.target) return item;
      return { ...item, count: item.target };
    }));
  }, [setItems]);

  const handleSelectTemplate = useCallback((template: Template) => {
    setCurrentTemplateId(template.id);
    setItems(() => createCounterItems(template));
    if (template.id === "prefectures") {
      setAppSettings((prev) => ({ ...prev, cardSize: "S", cardScale: 50 }));
    }
  }, [setItems, setCurrentTemplateId, setAppSettings]);

  const handleSaveCustomTemplate = useCallback((name: string) => {
    const newTemplate: Template = {
      id: `custom-tpl-${Date.now()}`,
      name,
      description: `カスタムテンプレート (${items.length}項目)`,
      items: items.map(({ count: _count, target: _target, ...rest }) => rest),
    };
    setCustomTemplates((prev) => [...prev, newTemplate]);
  }, [items, setCustomTemplates]);

  const handleDeleteCustomTemplate = useCallback((id: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
  }, [setCustomTemplates]);

  const handleOverwriteCustomTemplate = useCallback((id: string) => {
    setCustomTemplates((prev) => prev.map((x) => x.id === id ? {
      ...x,
      description: `カスタムテンプレート (${items.length}項目)`,
      items: items.map(({ count: _count, target: _target, ...rest }) => rest)
    } : x));
  }, [items, setCustomTemplates]);

  const handleAchieveAllTargets = useCallback(() => {
    setItems((prev) => prev.map((item) => {
      if (!item.target) return item;
      return { ...item, count: item.target };
    }));
  }, [setItems]);

  return {
    handleIncrement,
    handleDecrement,
    handleSetCount,
    handleAdjustBy,
    handleReset,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleSetTarget,
    handleSetAllTargets,
    handleAchieveTarget,
    handleAchieveAllTargets,
    handleSelectTemplate,
    handleSaveCustomTemplate,
    handleDeleteCustomTemplate,
    handleOverwriteCustomTemplate
  };
}
