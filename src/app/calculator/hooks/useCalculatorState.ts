"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createDefaultCalculatorSettings, type CalculatorSettings } from "@/lib/calculator";

export type CalcTab = "four" | "fraction" | "probability";

export function useCalculatorState(isSplitMode: boolean) {
  const [settings, setSettings] = useLocalStorage<CalculatorSettings>(
    "calculator-settings",
    createDefaultCalculatorSettings()
  );
  const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("calculator-light-mode", false);
  const [tab, setTab] = useState<CalcTab>("four");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  useEffect(() => {
    if (isSplitMode) return;
    if (isLightMode) document.body.classList.add("light-mode");
    else document.body.classList.remove("light-mode");
    return () => document.body.classList.remove("light-mode");
  }, [isLightMode, isSplitMode]);

  return {
    settings, setSettings,
    isLightMode, setIsLightMode,
    tab, setTab,
    showSettingsPanel, setShowSettingsPanel
  };
}
