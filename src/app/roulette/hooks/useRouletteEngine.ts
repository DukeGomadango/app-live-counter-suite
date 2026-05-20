"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    pickRandomIndex,
    trimRouletteHistory,
    trimRouletteHitHistory,
    getHighLowZone,
    type RouletteSettings,
    type RoulettePredictor,
    type RouletteHitHistoryEntry,
    type RouletteAutoSpinStats,
} from "@/lib/roulette";
import { createWheelSound, createBallSound } from "@/lib/rouletteSpinSound";

interface RouletteEngineProps {
    slots: string[];
    settings: RouletteSettings;
    predictors: RoulettePredictor[];
    setHistory: (updater: (prev: number[]) => number[]) => void;
    setHitHistory: (updater: (prev: RouletteHitHistoryEntry[]) => RouletteHitHistoryEntry[]) => void;
}

export function useRouletteEngine({
    slots,
    settings,
    predictors,
    setHistory,
    setHitHistory,
}: RouletteEngineProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [skipRequested, setSkipRequested] = useState(false);
    const [spinTargetIndex, setSpinTargetIndex] = useState<number | null>(null);
    const [spinKey, setSpinKey] = useState(0);
    const [resultIndex, setResultIndex] = useState<number | null>(null);
    const [showHitEffect, setShowHitEffect] = useState(false);
    const [hitNames, setHitNames] = useState<string[]>([]);

    // オートスピン状態管理の追加
    const [autoSpinRemaining, setAutoSpinRemaining] = useState(0);
    const [autoSpinStats, setAutoSpinStats] = useState<RouletteAutoSpinStats | null>(null);
    const [isTurboMode, setIsTurboMode] = useState(false);

    const spinLoopHandleRef = useRef<{ stop: () => void } | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const autoSpinTimerRef = useRef<number | null>(null);
    const isFirstAutoSpinRef = useRef(false);
    const isAutoSpinActiveRef = useRef(false);

    // オートスピン統計がクリアされたら、アクティブフラグも下ろす
    useEffect(() => {
        if (!autoSpinStats) {
            isAutoSpinActiveRef.current = false;
        }
    }, [autoSpinStats]);

    const stopSpinLoop = useCallback(() => {
        spinLoopHandleRef.current?.stop();
        spinLoopHandleRef.current = null;
    }, []);

    const playSpinLoop = useCallback(
        (kind: "wheel" | "ball") => {
            if (settings.soundEnabled === false || isTurboMode) return;
            stopSpinLoop();
            const ctx = audioContextRef.current ?? new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            audioContextRef.current = ctx;
            if (ctx.state === "suspended") {
                ctx.resume().catch(() => {});
            }
            const handle = kind === "wheel" ? createWheelSound(ctx) : createBallSound(ctx);
            spinLoopHandleRef.current = handle;
        },
        [settings.soundEnabled, isTurboMode, stopSpinLoop]
    );

    const playFanfare = useCallback(() => {
        if (settings.soundEnabled === false) return;
        const audio = new Audio("/sounds/roulette/fanfare.mp3");
        audio.play().catch(() => {});
    }, [settings.soundEnabled]);

    const handleSpin = useCallback(() => {
        if (slots.length === 0 || isSpinning) return;
        const target = pickRandomIndex(slots.length);
        setResultIndex(null);
        setSkipRequested(false);
        setSpinKey((k) => k + 1);
        setSpinTargetIndex(target);
        setIsSpinning(true);
    }, [slots.length, isSpinning]);

    const startAutoSpin = useCallback((count: number) => {
        setAutoSpinRemaining(count);
        setAutoSpinStats({ spins: 0, hitSlots: {}, hitPredictors: {} });
        isFirstAutoSpinRef.current = true;
        isAutoSpinActiveRef.current = true;
    }, []);

    const stopAutoSpin = useCallback(() => {
        setAutoSpinRemaining(0);
        if (autoSpinTimerRef.current) {
            clearTimeout(autoSpinTimerRef.current);
            autoSpinTimerRef.current = null;
        }
    }, []);

    const handleSpinEnd = useCallback((index: number) => {
        stopSpinLoop();
        setResultIndex(index);
        setIsSpinning(false);
        setSkipRequested(false);
        setSpinTargetIndex(null);
        
        setHistory((prev) => trimRouletteHistory([index, ...prev]));
        
        const resultLabel = slots[index] ?? "";
        const isHighLow = settings.predictorMode === "highLow";
        const resultZone = getHighLowZone(index, slots.length);
        
        const hitPredictors = isHighLow && resultZone != null
            ? predictors.filter((p) => p.participating !== false && p.prediction === resultZone)
            : predictors.filter((p) => p.participating !== false && p.prediction.trim() === resultLabel);
        
        const whoHit = hitPredictors.map((p) => p.name.trim() || "名前なし");
        const hitPredictorIds = hitPredictors.map((p) => p.id);
        
        setHitHistory((prev) => trimRouletteHitHistory([{ resultLabel, hitPredictorIds }, ...prev]));

        // オートスピン統計の集計
        setAutoSpinStats((prev) => {
            if (!prev) return null;
            const newHitSlots = { ...prev.hitSlots };
            newHitSlots[index] = (newHitSlots[index] ?? 0) + 1;

            const newHitPredictors = { ...prev.hitPredictors };
            hitPredictors.forEach((p) => {
                newHitPredictors[p.id] = (newHitPredictors[p.id] ?? 0) + 1;
            });

            return {
                spins: prev.spins + 1,
                hitSlots: newHitSlots,
                hitPredictors: newHitPredictors,
            };
        });
        
        // オートプレイ中以外の時のみ、的中時のファンファーレや紙吹雪エフェクトを発生させる
        if (whoHit.length > 0 && !isAutoSpinActiveRef.current) {
            setHitNames(whoHit);
            setShowHitEffect(true);
            playFanfare();
        }
    }, [slots, settings.predictorMode, predictors, setHistory, setHitHistory, stopSpinLoop, playFanfare]);

    useEffect(() => {
        if (skipRequested && isSpinning) {
            stopSpinLoop();
        }
    }, [skipRequested, isSpinning, stopSpinLoop]);

    // オートスピン連鎖の自動化効果
    useEffect(() => {
        if (isSpinning || autoSpinRemaining <= 0) return;
        if (autoSpinTimerRef.current) clearTimeout(autoSpinTimerRef.current);

        let waitTime = isTurboMode ? 150 : 1000;
        if (isFirstAutoSpinRef.current) {
            waitTime = 0;
            isFirstAutoSpinRef.current = false;
        }

        autoSpinTimerRef.current = window.setTimeout(() => {
            setAutoSpinRemaining((prev) => (prev === Infinity ? Infinity : prev - 1));
            handleSpin();
        }, waitTime);

        return () => {
            if (autoSpinTimerRef.current) clearTimeout(autoSpinTimerRef.current);
        };
    }, [isSpinning, autoSpinRemaining, isTurboMode, handleSpin]);

    return {
        isSpinning,
        skipRequested,
        setSkipRequested,
        spinTargetIndex,
        spinKey,
        resultIndex,
        showHitEffect,
        setShowHitEffect,
        hitNames,
        handleSpin,
        handleSpinEnd,
        playSpinLoop,
        
        // 追加されたオートスピン用メンバー
        autoSpinRemaining,
        autoSpinStats,
        setAutoSpinStats,
        isTurboMode,
        setIsTurboMode,
        startAutoSpin,
        stopAutoSpin,
    };
}
