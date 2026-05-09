"use client";

import { useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
    createDefaultSlots,
    createDefaultRouletteSettings,
    createDefaultPredictors,
    type RouletteSettings,
    type RoulettePredictor,
    type RouletteTemplate,
    type RouletteHitHistoryEntry,
} from "@/lib/roulette";

export function useRouletteState() {
    const [slots, setSlots] = useLocalStorage<string[]>("roulette-slots", createDefaultSlots(13));
    const [settings, setSettings] = useLocalStorage<RouletteSettings>("roulette-settings", createDefaultRouletteSettings());
    const [predictors, setPredictors] = useLocalStorage<RoulettePredictor[]>("roulette-predictors", createDefaultPredictors());
    const [templates, setTemplates] = useLocalStorage<RouletteTemplate[]>("roulette-templates", []);
    const [history, setHistory] = useLocalStorage<number[]>("roulette-history", []);
    const [hitHistory, setHitHistory] = useLocalStorage<RouletteHitHistoryEntry[]>("roulette-hit-history", []);

    // Migration logic
    useEffect(() => {
        if ((settings.style as string) === "needle") {
            setSettings((prev) => ({ ...prev, style: "minimal" }));
        }
    }, [settings.style, setSettings]);

    return {
        slots, setSlots,
        settings, setSettings,
        predictors, setPredictors,
        templates, setTemplates,
        history, setHistory,
        hitHistory, setHitHistory,
    };
}
