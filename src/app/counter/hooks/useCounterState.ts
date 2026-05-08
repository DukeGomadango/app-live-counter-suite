"use client";

import { useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TEMPLATES, createCounterItems, type CounterItem, type Template } from "@/lib/templates";
import { type AppSettings, type CardSize } from "@/components/SettingsModal";

export function useCounterState() {
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
  const [showPrefectureCountLabels, setShowPrefectureCountLabels] = useLocalStorage<boolean>(
    "counter-prefecture-show-labels",
    true
  );
  const [showPrefectureNames, setShowPrefectureNames] = useLocalStorage<boolean>(
    "counter-prefecture-show-names",
    false
  );
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

  // Migrate old data without target field
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        target: item.target ?? 0,
      }))
    );
  }, [setItems]);

  // Migrate settings for new fields
  useEffect(() => {
    setAppSettings((prev) => {
      const hadLegacy = "showStepButtons" in prev && (prev as Record<string, unknown>).showStepButtons === true;
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
  }, [setAppSettings]);

  // Apply accent color as CSS variable to body
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

  return {
    items, setItems,
    currentTemplateId, setCurrentTemplateId,
    isMenuOpen, setIsMenuOpen,
    isLightMode, setIsLightMode,
    customTemplates, setCustomTemplates,
    showPrefectureCountLabels, setShowPrefectureCountLabels,
    showPrefectureNames, setShowPrefectureNames,
    appSettings, setAppSettings,
  };
}
