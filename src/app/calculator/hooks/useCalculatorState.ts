"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createDefaultCalculatorSettings, type CalculatorSettings } from "@/lib/calculator";

export type CalcTab = "four" | "fraction" | "probability";

export function useCalculatorState(_isSplitMode: boolean) {
  const [settings, setSettings] = useLocalStorage<CalculatorSettings>(
    "calculator-settings",
    createDefaultCalculatorSettings()
  );
  const [tab, setTab] = useState<CalcTab>("four");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  return {
    settings, setSettings,
    tab, setTab,
    showSettingsPanel, setShowSettingsPanel
  };
}
