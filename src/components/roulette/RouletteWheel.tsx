"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import {
    type RouletteStyle,
    getWheelRotationForNeedle,
    getBallRotationForHole,
    getRestRotation,
} from "@/lib/roulette";

/** 結果表示用の固定回転数（過去スピンの回転数は保持しないため2で統一） */
const REST_DISPLAY_TURNS = 2;
const SPIN_DURATION_NEEDLE_LOW = 7;
const SPIN_DURATION_NEEDLE_HIGH = 12;
const SPIN_DURATION_CASINO_LOW = 7;
const SPIN_DURATION_CASINO_HIGH = 12;

/** 0°=3時なので、12時を基準にするためのオフセット（度） */
const DEG_12_O_CLOCK = -90;
interface RouletteWheelProps {
    slots: string[];
    style: RouletteStyle;
    isSpinning: boolean;
    targetIndex: number | null;
    /** 直近の抽選結果の index。非 null かつ非回転中は盤をこの位置で表示する */
    resultIndex?: number | null;
    spinKey?: number;
    onSpin: () => void;
    onSpinEnd: (index: number) => void;
    /** 回転アニメ開始時に呼ぶ（SE用）。kind: 針スタイル=wheel / カジノ・木目調=ball */
    onSpinStart?: (kind: "wheel" | "ball") => void;
    /** 回転演出をスキップする要求。true のとき即座に結果位置へ飛ばして onSpinEnd を呼ぶ */
    skipRequested?: boolean;
    /** スキップボタン押下時に親が skipRequested を true にするためのコールバック */
    onSkipRequest?: () => void;
    accentColor: string;
    isLightMode: boolean;
    /** この数より多いスロットで簡易表示。未設定時は 80 */
    maxVisibleLabels?: number;
    /** 盤の一番下に表示するスロットの0-basedインデックス。未設定時は0 */
    wheelOffsetIndex?: number;
    /** 演出量: high=回転長め / low=回転短め */
    effectLevel?: "high" | "low";
    /** 「回す」の横に表示する結果用スロット（例: 結果: ○○） */
    resultSlot?: ReactNode;
    /** カスタム表示時のセグメント色配列（未設定時はクラシック同様の2色でフォールバック） */
    segmentColors?: string[];
    /** スロット番号（0-based）ごとの色上書き。全表示方式で共通 */
    slotColorOverrides?: Record<number, string>;
    /** ハイローモードで「中心」としてハイライトするスロットの 0-based インデックス。未設定時はハイライトなし */
    highlightCenterIndex?: number | null;
    /** 高速回転モード（オートスピン時など演出を極めて短縮する） */
    isTurboMode?: boolean;
    /** 操作用のボタン類を非表示にし、親からカスタムUIで操作する */
    hideControls?: boolean;
}

const DEFAULT_CUSTOM_SEGMENT_COLORS = ["#b91c1c", "#1f2937"];

const DEFAULT_MAX_VISIBLE_LABELS = 80;

function getBezelStyle(style: RouletteStyle, isLightMode: boolean) {
    if (style === "classic" || style === "custom") {
        return {
            background: isLightMode
                ? "conic-gradient(from 45deg, #d97706, #fcd34d 15%, #78350f 30%, #fbbf24 45%, #fef3c7 55%, #92400e 70%, #fcd34d 85%, #d97706 100%)"
                : "conic-gradient(from 45deg, #b45309, #fbbf24 15%, #78350f 30%, #f59e0b 45%, #fef3c7 55%, #451a03 70%, #fbbf24 85%, #b45309 100%)",
        };
    } else if (style === "orbit") {
        return {
            background: isLightMode
                ? "conic-gradient(from 45deg, #8b5a2b, #d4b896 20%, #4a2f13 40%, #b8956a 60%, #e8d5c4 80%, #351f0b 100%)"
                : "conic-gradient(from 45deg, #5c3a1a, #a6845e 20%, #2b1808 40%, #805c38 60%, #b8956a 80%, #170d04 100%)",
        };
    } else {
        return {
            background: isLightMode
                ? "conic-gradient(from 45deg, #cbd5e1, #ffffff 15%, #475569 30%, #e2e8f0 45%, #ffffff 55%, #334155 70%, #94a3b8 85%, #cbd5e1 100%)"
                : "conic-gradient(from 45deg, #4b5563, #9ca3af 15%, #111827 30%, #6b7280 45%, #f3f4f6 55%, #030712 70%, #9ca3af 85%, #4b5563 100%)",
        };
    }
}

export default function RouletteWheel({
    slots,
    style,
    isSpinning,
    targetIndex,
    resultIndex = null,
    spinKey = 0,
    onSpin,
    onSpinEnd,
    onSpinStart,
    skipRequested,
    onSkipRequest,
    accentColor,
    isLightMode,
    maxVisibleLabels,
    wheelOffsetIndex,
    effectLevel = "low",
    resultSlot,
    segmentColors,
    slotColorOverrides,
    isTurboMode = false,
    hideControls = false,
}: RouletteWheelProps) {
    const effectiveMaxLabels = maxVisibleLabels ?? DEFAULT_MAX_VISIBLE_LABELS;
    const wheelControls = useAnimationControls();
    const ballControls = useAnimationControls();
    const dropControls = useAnimationControls();
    const shadowControls = useAnimationControls();
    const hasCompletedRef = useRef(false);
    const lastSpinKeyRef = useRef<number | null>(null);
    /** カジノでアニメ開始時に確定した index を保持し、.then() で必ずそれを使う（表示と結果のずれ防止） */
    const resolvedTargetRef = useRef<number | null>(null);
    /** カジノで選んだ holeIndex（スキップ時に同じ位置へ飛ばす用） */
    const resolvedHoleIndexRef = useRef<number | null>(null);
    /** 今回のスピンで使う回転数（2〜3の間でランダム。スキップ時も同じ値を使う） */
    const fullTurnsThisSpinRef = useRef<number>(2);
    /** 針スタイルでスピン終了時に使った回転数（結果表示で同じ角度を維持する用） */
    const lastFullTurnsForDisplayRef = useRef<number>(REST_DISPLAY_TURNS);
    /** 前回の結果位置（針: 盤の角度 / ボール: ボールの角度）。ここから次回スピンを開始する */
    const lastWheelRotationRef = useRef<number | null>(null);
    const lastBallRotationRef = useRef<number | null>(null);
    /** スピンごとのセクター内のランダムな停止位置オフセット（-0.42 〜 +0.42） */
    const randomOffsetThisSpinRef = useRef<number>(0);

    const N = slots.length;
    const isNeedle = style === "minimal" || style === "classic" || style === "custom";

    const wheelSize = 380;

    const holesPerNumber = !isNeedle && N > 0
        ? (N <= 13 ? 3 : N <= 26 ? 2 : 1)
        : 1;
    const H = N * holesPerNumber;
    const segmentAngle = N > 0 ? 360 / N : 0;
    const effectiveOffset = N > 0 ? Math.min(N - 1, Math.max(0, wheelOffsetIndex ?? 0)) : 0;
    const restRotation = N > 0 ? getRestRotation(effectiveOffset, segmentAngle) : 0;
    const holeSegmentAngle = H > 0 ? 360 / H : 0;

    useEffect(() => {
        if (isNeedle && !isSpinning) {
            const rotate =
                resultIndex != null && N > 0
                    ? (lastFullTurnsForDisplayRef.current ?? REST_DISPLAY_TURNS) * 360 +
                      getWheelRotationForNeedle(resultIndex, segmentAngle, randomOffsetThisSpinRef.current)
                    : restRotation;
            wheelControls.set({ rotate });
            lastWheelRotationRef.current = rotate;
        }
        if (!isNeedle && !isSpinning) {
            if (resultIndex == null) {
                wheelControls.set({ rotate: restRotation });
            }
        }
    }, [isNeedle, isSpinning, resultIndex, restRotation, segmentAngle, wheelControls, N]);
    const rOuter = !isNeedle ? wheelSize / 2 - 4 : 0;

    useLayoutEffect(() => {
        if (!isSpinning || targetIndex === null || N === 0) return;
        if (lastSpinKeyRef.current === spinKey) return;
        lastSpinKeyRef.current = spinKey;
        hasCompletedRef.current = false;

        // セクター内（スロット幅内）の停止位置をランダム化 (最大で左右に約42%ずらす)
        randomOffsetThisSpinRef.current = (Math.random() - 0.5) * 0.84;

        onSpinStart?.(isNeedle ? "wheel" : "ball");

        if (isNeedle) {
            const idx = targetIndex;
            const startFrom = lastWheelRotationRef.current ?? restRotation;
            const targetBase = getWheelRotationForNeedle(idx, segmentAngle, randomOffsetThisSpinRef.current);
            fullTurnsThisSpinRef.current = 2 + Math.random();
            const fullTurns = fullTurnsThisSpinRef.current;
            const rawEnd = startFrom + fullTurns * 360;
            const delta = ((targetBase - (rawEnd % 360)) % 360 + 360) % 360;
            const finalDeg = rawEnd + delta;
            resolvedTargetRef.current = idx;
            const duration = isTurboMode ? 0.15 : (effectLevel === "high" ? SPIN_DURATION_NEEDLE_HIGH : SPIN_DURATION_NEEDLE_LOW);

            if (isTurboMode) {
                const transition = { duration, ease: "easeOut" as const };
                wheelControls
                    .start({ rotate: finalDeg, transition })
                    .then(() => {
                        const reported = resolvedTargetRef.current;
                        if (!hasCompletedRef.current && reported !== null) {
                            hasCompletedRef.current = true;
                            lastWheelRotationRef.current = finalDeg;
                            lastFullTurnsForDisplayRef.current = (finalDeg - getWheelRotationForNeedle(reported, segmentAngle, randomOffsetThisSpinRef.current)) / 360;
                            lastSpinKeyRef.current = null;
                            onSpinEnd(reported);
                            resolvedTargetRef.current = null;
                        }
                    });
            } else {
                // 停止直前の「揺り戻し・ばね感 (Elastic Settle)」をキーフレームで演出
                // 目標値 finalDeg を 1.2度オーバーシュートし、0.3度戻って静止する
                const rotateKeyframes = [startFrom, finalDeg + 1.2, finalDeg - 0.3, finalDeg];
                const transition = {
                    duration,
                    times: [0, 0.94, 0.97, 1.0],
                    ease: [[0.1, 0.78, 0.62, 0.98], "easeOut", "easeIn"] as unknown as import("framer-motion").Easing[]
                };
                wheelControls
                    .start({ rotate: rotateKeyframes, transition })
                    .then(() => {
                        const reported = resolvedTargetRef.current;
                        if (!hasCompletedRef.current && reported !== null) {
                            hasCompletedRef.current = true;
                            lastWheelRotationRef.current = finalDeg;
                            lastFullTurnsForDisplayRef.current = (finalDeg - getWheelRotationForNeedle(reported, segmentAngle, randomOffsetThisSpinRef.current)) / 360;
                            lastSpinKeyRef.current = null;
                            onSpinEnd(reported);
                            resolvedTargetRef.current = null;
                        }
                    });
            }
        } else {
            const idx = targetIndex;
            const holeIndex = idx * holesPerNumber + Math.floor(Math.random() * holesPerNumber);
            resolvedHoleIndexRef.current = holeIndex;
            const startFrom = lastBallRotationRef.current ?? 0;
            const targetHole = getBallRotationForHole(holeIndex, holeSegmentAngle, restRotation, randomOffsetThisSpinRef.current);
            const targetBase = ((targetHole % 360) + 360) % 360;
            fullTurnsThisSpinRef.current = 2 + Math.random();
            const fullTurns = fullTurnsThisSpinRef.current;
            const rawEnd = startFrom + fullTurns * 360;
            const delta = ((targetBase - (rawEnd % 360)) % 360 + 360) % 360;
            const finalBallRot = rawEnd + delta;
            resolvedTargetRef.current = idx;
            const duration = isTurboMode ? 0.15 : (effectLevel === "high" ? SPIN_DURATION_CASINO_HIGH : SPIN_DURATION_CASINO_LOW);
            const rO = wheelSize / 2 - 4;
            const rI = wheelSize / 2 - 11;
            const dropDistance = rO - rI;

            if (isTurboMode) {
                dropControls.set({ y: 0, scale: 1 });
                shadowControls.set({ scale: 0.9, opacity: 0.75, filter: "blur(0.8px)" });
                wheelControls.set({ rotate: restRotation });
                ballControls
                    .start({ rotate: finalBallRot, transition: { duration, ease: "easeOut" } })
                    .then(() => {
                        const reported = resolvedTargetRef.current;
                        if (!hasCompletedRef.current && reported !== null) {
                            hasCompletedRef.current = true;
                            lastBallRotationRef.current = finalBallRot;
                            lastSpinKeyRef.current = null;
                            onSpinEnd(reported);
                            resolvedTargetRef.current = null;
                        }
                        dropControls.set({ y: dropDistance, scale: 0.85 });
                        shadowControls.set({ scale: 0.9, opacity: 0.75, filter: "blur(0.8px)" });
                    });
            } else {
                // ボールが隣接ポケットの仕切りにぶつかってバウンドするリアル演出
                dropControls.set({ y: 0, scale: 1 });
                wheelControls.set({ rotate: restRotation });

                // ポケットの仕切り（壁）に衝突して跳ね返るリアルなバウンド演出
                // 進行方向（正回転）の壁にぶつかり、逆方向（マイナス）へスロット幅の約25%だけ跳ね返り、再度落ち着く
                const bounceOffset = holeSegmentAngle * 0.25;
                const bouncePeak = finalBallRot - bounceOffset;

                ballControls
                    .start({
                        rotate: [startFrom, finalBallRot, bouncePeak, finalBallRot],
                        transition: {
                            duration,
                            times: [0, 0.90, 0.95, 1.0],
                            ease: [[0.1, 0.78, 0.62, 0.98], "easeOut", "easeIn"]
                        }
                    })
                    .then(() => {
                        const reported = resolvedTargetRef.current;
                        if (!hasCompletedRef.current && reported !== null) {
                            hasCompletedRef.current = true;
                            lastBallRotationRef.current = finalBallRot;
                            lastSpinKeyRef.current = null;
                            onSpinEnd(reported);
                            resolvedTargetRef.current = null;
                        }
                    });

                // ボールの落下（y軸）と縮小（奥方向への立体感）を、回転と並行して80%時点から開始
                // 落下時のバウンドでポケットの外へ滑り出さないよう、動的なy軸移動（動径方向のブレ）は1.5pxに抑え、
                // 縦方向のバウンド（高さ・スケール）を主役にすることで、極めて自然な3Dバウンド感を実現します。
                dropControls.start({
                    y: [0, 0, dropDistance, dropDistance - 1.5, dropDistance],
                    scale: [1, 1, 0.85, 0.94, 0.85],
                    transition: {
                        duration,
                        times: [0, 0.80, 0.90, 0.95, 1.0],
                        ease: ["linear", "easeOut", "easeIn", "easeOut"]
                    }
                });

                // 影のバウンド同期（ぼかし・不透明度・スケールの逆連動）
                // ボールの高さ（スケール）と逆連動させ、浮き上がった際に影を大きく・薄く・ぼかします。
                shadowControls.start({
                    scale: [1.2, 1.2, 0.9, 1.08, 0.9],
                    opacity: [0.25, 0.25, 0.75, 0.40, 0.75],
                    filter: [
                        "blur(5px)",
                        "blur(5px)",
                        "blur(0.8px)",
                        "blur(3.5px)",
                        "blur(0.8px)"
                    ],
                    transition: {
                        duration,
                        times: [0, 0.80, 0.90, 0.95, 1.0],
                        ease: ["linear", "easeOut", "easeIn", "easeOut"]
                    }
                });
            }
        }
    }, [isSpinning, targetIndex, spinKey, N, segmentAngle, holesPerNumber, holeSegmentAngle, isNeedle, effectLevel, wheelControls, ballControls, dropControls, shadowControls, wheelSize, onSpinEnd, onSpinStart, restRotation, isTurboMode]);

    // 回転演出スキップ: 即座に結果位置へ飛ばして onSpinEnd を呼ぶ（通常スピンと同じ式で角度を算出し set で適用）
    useEffect(() => {
        if (!skipRequested || !isSpinning || targetIndex === null || N === 0) return;
        if (lastSpinKeyRef.current !== spinKey) return; // まだアニメ開始前の場合は何もしない
        hasCompletedRef.current = true;
        lastSpinKeyRef.current = null;
        const idx = targetIndex;

        if (isNeedle) {
            wheelControls.stop();
            const startFrom = lastWheelRotationRef.current ?? restRotation;
            const targetBase = getWheelRotationForNeedle(idx, segmentAngle, randomOffsetThisSpinRef.current);
            const fullTurns = fullTurnsThisSpinRef.current;
            const rawEnd = startFrom + fullTurns * 360;
            const delta = ((targetBase - (rawEnd % 360)) % 360 + 360) % 360;
            const finalDeg = rawEnd + delta;
            lastFullTurnsForDisplayRef.current = (finalDeg - getWheelRotationForNeedle(idx, segmentAngle, randomOffsetThisSpinRef.current)) / 360;
            lastWheelRotationRef.current = finalDeg;
            wheelControls.set({ rotate: finalDeg });
            onSpinEnd(idx);
            resolvedTargetRef.current = null;
        } else {
            wheelControls.stop();
            ballControls.stop();
            dropControls.stop();
            const rO = wheelSize / 2 - 4;
            const rI = wheelSize / 2 - 11;
            const holeIndex = resolvedHoleIndexRef.current ?? idx * holesPerNumber;
            resolvedHoleIndexRef.current = null;
            const startFrom = lastBallRotationRef.current ?? 0;
            const targetHole = getBallRotationForHole(holeIndex, holeSegmentAngle, restRotation, randomOffsetThisSpinRef.current);
            const targetBase = ((targetHole % 360) + 360) % 360;
            const fullTurns = fullTurnsThisSpinRef.current;
            const rawEnd = startFrom + fullTurns * 360;
            const delta = ((targetBase - (rawEnd % 360)) % 360 + 360) % 360;
            const finalBallRot = rawEnd + delta;
            lastBallRotationRef.current = finalBallRot;
            wheelControls.set({ rotate: restRotation });
            ballControls.set({ rotate: finalBallRot });
            const dropDistance = rO - rI;
            dropControls.set({ y: dropDistance, scale: 0.85 });
            shadowControls.set({ scale: 0.9, opacity: 0.75, filter: "blur(0.8px)" });
            onSpinEnd(idx);
            resolvedTargetRef.current = null;
        }
    }, [skipRequested, isSpinning, targetIndex, spinKey, N, segmentAngle, holesPerNumber, holeSegmentAngle, isNeedle, restRotation, wheelControls, ballControls, dropControls, shadowControls, wheelSize, onSpinEnd]);

    const ballSize = !isNeedle && (N > 26 || H > 40) ? 12 : 20;

    const textColor = isLightMode ? "#1a1a2e" : "rgba(255,255,255,0.98)";
    /** グリッド線: ダーク時は濃いめにして文字盤をはっきり見せる */
    const strokeColor = isLightMode ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.55)";
    const textStrokeColor = isLightMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)";

    return (
        <div className="flex flex-col items-center gap-4 max-md:gap-2">
            <div className="relative overflow-hidden" style={{ width: wheelSize + 48, height: wheelSize + 48 }}>
                {/* 金属光沢ベゼル */}
                <div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        width: wheelSize + 12,
                        height: wheelSize + 12,
                        left: 24 - 6,
                        top: 24 - 6,
                        zIndex: 15,
                        border: "1px solid rgba(255, 255, 255, 0.45)",
                        boxShadow: isLightMode
                            ? "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.18)"
                            : "inset 0 2px 4px rgba(255, 255, 255, 0.35), inset 0 -2px 4px rgba(0,0,0,0.75), 0 6px 16px rgba(0,0,0,0.5)",
                        WebkitMaskImage: "radial-gradient(circle, transparent 92%, black 93%)",
                        maskImage: "radial-gradient(circle, transparent 92%, black 93%)",
                        ...getBezelStyle(style, isLightMode),
                    }}
                />

                {/* 針（needle のときのみ・上部中央に固定・多層リアルシャドウ） */}
                {isNeedle && (
                    <div
                        className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45)) drop-shadow(0 6px 12px rgba(0,0,0,0.22))" }}
                    >
                        <svg width="24" height="32" viewBox="0 0 24 32" fill="none" className="pointer-events-none">
                            <path d="M12 0 L14 28 L12 32 L10 28 Z" fill={style === "classic" || style === "custom" ? "#ca8a04" : accentColor} stroke={style === "classic" || style === "custom" ? "#a16207" : strokeColor} strokeWidth="1" />
                        </svg>
                    </div>
                )}

                {/* カジノ用: ボール（ラッパーは回転のみ、止まったら子で落ちる） */}
                {!isNeedle && (
                    <motion.div
                        className="absolute z-20 pointer-events-none"
                        style={{
                            left: 24,
                            top: 24,
                            width: wheelSize,
                            height: wheelSize,
                            transformOrigin: "center center",
                            willChange: "transform",
                        }}
                        animate={ballControls}
                        initial={{ rotate: 0 }}
                    >
                        {/* 2.5D 立体連動ボールシャドウ */}
                        <motion.div
                            className="absolute rounded-full bg-black/60"
                            style={{
                                left: (wheelSize - ballSize) / 2,
                                top: (wheelSize - ballSize) / 2 - rOuter,
                                width: ballSize,
                                height: ballSize,
                                transformOrigin: "center center",
                                y: 7, // dropDistance = 7 固定でポケット底に影を配置
                            }}
                            animate={shadowControls}
                            initial={{ scale: 0.9, opacity: 0.75, filter: "blur(0.8px)" }}
                        />

                        {/* ボール本体 */}
                        <motion.div
                            className="absolute rounded-full"
                            style={
                                style === "orbit"
                                    ? {
                                          left: (wheelSize - ballSize) / 2,
                                          top: (wheelSize - ballSize) / 2 - rOuter,
                                          width: ballSize,
                                          height: ballSize,
                                          background: "radial-gradient(circle at 38% 32%, rgba(255,255,255,0.5), #a8a29e 40%, #57534e 100%)",
                                          boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.2)",
                                          border: "1px solid rgba(0,0,0,0.15)",
                                        }
                                    : {
                                          left: (wheelSize - ballSize) / 2,
                                          top: (wheelSize - ballSize) / 2 - rOuter,
                                          width: ballSize,
                                          height: ballSize,
                                          background: `radial-gradient(circle at 30% 30%, #fff, ${accentColor})`,
                                          boxShadow: `0 0 10px ${accentColor}80`,
                                          border: `2px solid ${strokeColor}`,
                                        }
                            }
                            animate={dropControls}
                            initial={{ y: 0, scale: 1 }}
                        />
                    </motion.div>
                )}

                {/* ホイール（needle: 回転 / casino: 固定） */}
                <motion.div
                    className="absolute left-1/2 top-1/2 z-10 rounded-full overflow-hidden"
                    style={{
                        width: wheelSize,
                        height: wheelSize,
                        x: "-50%",
                        y: "-50%",
                        marginLeft: wheelSize / 2,
                        marginTop: wheelSize / 2,
                        left: 24,
                        top: 24,
                        willChange: "transform",
                        border: `2px solid ${strokeColor}`,
                        boxShadow: isLightMode
                            ? `0 4px 20px rgba(0,0,0,0.12), 0 0 28px ${accentColor}50, 0 0 56px ${accentColor}22`
                            : `0 4px 24px rgba(0,0,0,0.28), 0 0 32px ${accentColor}55, 0 0 64px ${accentColor}28`,
                    }}
                    animate={wheelControls}
                    initial={{ rotate: restRotation }}
                >
                    <svg
                        width={wheelSize}
                        height={wheelSize}
                        viewBox={`0 0 ${wheelSize} ${wheelSize}`}
                        style={{ display: "block" }}
                    >
                        <defs>
                            <clipPath id="roulette-wheel-clip">
                                <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2} />
                            </clipPath>
                            {/* オービット用 木目パターン */}
                            <pattern id="orbit-wood-grain" patternUnits="userSpaceOnUse" width="8" height="32" patternTransform="rotate(-3)">
                                <rect width="8" height="32" fill="#d4b896" />
                                <rect width="8" height="32" fill="url(#orbit-wood-shade)" />
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                                    <line key={j} x1={j * 1.2} y1={0} x2={j * 1.2 + 2} y2={32} stroke="rgba(0,0,0,0.07)" strokeWidth="0.35" />
                                ))}
                            </pattern>
                            <linearGradient id="orbit-wood-shade" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="#e8d5c4" stopOpacity="0.5" />
                                <stop offset="0.5" stopColor="transparent" stopOpacity="0" />
                                <stop offset="1" stopColor="#b8956a" stopOpacity="0.4" />
                            </linearGradient>
                            {/* オービット用 ラベル用の濃い木目 */}
                            <pattern id="orbit-wood-grain-dark" patternUnits="userSpaceOnUse" width="6" height="24" patternTransform="rotate(-2)">
                                <rect width="6" height="24" fill="#2d1f0f" />
                                <rect width="6" height="24" fill="url(#orbit-wood-shade-dark)" />
                                {[0, 1, 2, 3, 4, 5].map((j) => (
                                    <line key={j} x1={j * 1.5} y1={0} x2={j * 1.5 + 1.5} y2={24} stroke="rgba(255,255,255,0.06)" strokeWidth="0.25" />
                                ))}
                            </pattern>
                            <linearGradient id="orbit-wood-shade-dark" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="#4a3728" stopOpacity="0.6" />
                                <stop offset="0.5" stopColor="transparent" stopOpacity="0" />
                                <stop offset="1" stopColor="#1a1209" stopOpacity="0.5" />
                            </linearGradient>
                            
                            {/* 2.5D用 立体陰影（シャーディング）グラデーション */}
                            <radialGradient id="wheel-shading-grad" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity={isLightMode ? 0.28 : 0.16} />
                                <stop offset="42%" stopColor="#ffffff" stopOpacity="0" />
                                <stop offset="78%" stopColor="#000000" stopOpacity="0" />
                                <stop offset="94%" stopColor="#000000" stopOpacity={isLightMode ? 0.22 : 0.40} />
                                <stop offset="100%" stopColor="#000000" stopOpacity={isLightMode ? 0.45 : 0.60} />
                            </radialGradient>

                            {/* 2.5D用 ガラスグレアグラデーション */}
                            <linearGradient id="wheel-glazing-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity={isLightMode ? 0.16 : 0.09} />
                                <stop offset="38%" stopColor="#ffffff" stopOpacity={isLightMode ? 0.05 : 0.02} />
                                <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <g clipPath="url(#roulette-wheel-clip)">
                        {/* 盤のベース: 透明（背景オーブを見せる） */}
                        <circle
                            cx={wheelSize / 2}
                            cy={wheelSize / 2}
                            r={wheelSize / 2 - 1}
                            fill="transparent"
                        />
                        {/* 外枠 */}
                        {isNeedle ? (
                            <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 1} fill="none" stroke={style === "classic" || style === "custom" ? "#ca8a04" : strokeColor} strokeWidth={style === "minimal" ? 1 : 1.5} />
                        ) : (
                            <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 1} fill="none" stroke={style === "orbit" ? "#8b5a2b" : strokeColor} strokeWidth={style === "orbit" ? 2.5 : 2} strokeOpacity={style === "orbit" ? 0.9 : 0.5} />
                        )}
                        <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 2} fill="transparent" stroke={style === "orbit" ? "#6b4423" : strokeColor} strokeWidth={style === "orbit" ? 1.5 : 2} />
                        {/* オービット用: 土台を一回り大きくして先に描き、その上に木目盤 */}
                        {!isNeedle && style === "orbit" && (() => {
                            const cx = wheelSize / 2;
                            const cy = wheelSize / 2;
                            const rBaseOuter = wheelSize / 2;
                            const rBaseInner = Math.round((wheelSize / 2) * 0.42);
                            const outerD = `M ${cx + rBaseOuter} ${cy} A ${rBaseOuter} ${rBaseOuter} 0 1 1 ${cx - rBaseOuter} ${cy} A ${rBaseOuter} ${rBaseOuter} 0 1 1 ${cx + rBaseOuter} ${cy}`;
                            const innerD = `M ${cx + rBaseInner} ${cy} A ${rBaseInner} ${rBaseInner} 0 0 1 ${cx - rBaseInner} ${cy} A ${rBaseInner} ${rBaseInner} 0 0 1 ${cx + rBaseInner} ${cy}`;
                            return (
                                <g>
                                    <path d={`${outerD} ${innerD}`} fill="#c4a574" fillRule="evenodd" stroke="none" />
                                    <circle cx={cx} cy={cy} r={rBaseOuter} fill="none" stroke="#8b5a2b" strokeWidth={2} />
                                </g>
                            );
                        })()}
                        {!isNeedle && style !== "orbit" && (
                            <>
                                <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 5} fill="transparent" stroke={strokeColor} strokeWidth="4" />
                                {(() => {
                                    const r = wheelSize / 2 - 4;
                                    const holeDepth = 14;
                                    const rInnerHole = Math.max(r * 0.3, r - holeDepth);
                                    const centerFill = "transparent";
                                    const ringR = (rInnerHole + r) / 2;
                                    return (
                                        <>
                                            <circle cx={wheelSize / 2} cy={wheelSize / 2} r={ringR} fill="none" stroke={strokeColor} strokeWidth="1" opacity={0.6} />
                                            <circle cx={wheelSize / 2} cy={wheelSize / 2} r={rInnerHole} fill={centerFill} stroke={strokeColor} strokeWidth="1" />
                                        </>
                                    );
                                })()}
                            </>
                        )}
                        {(() => {
                            const r = wheelSize / 2 - 4;
                            const holeDepth = 14;
                            const rInnerHole = Math.max(r * 0.3, r - holeDepth);
                            const cx = wheelSize / 2;
                            const cy = wheelSize / 2;

                            if (isNeedle) {
                                const anglePerSegment = segmentAngle;
                                const rInner = r * 0.65;
                                const simplified = N > effectiveMaxLabels;
                                const isClassic = style === "classic";
                                const isCustom = style === "custom";
                                const isMinimal = style === "minimal";
                                const customPalette = (segmentColors?.length ? segmentColors : DEFAULT_CUSTOM_SEGMENT_COLORS) as string[];
                                const segStrokeWidth = isMinimal ? 0.8 : (simplified ? 1 : 1.5);
                                return (
                                    <>
                                        {Array.from({ length: N }, (_, i) => {
                                            const startAngle = (i * anglePerSegment + DEG_12_O_CLOCK) * (Math.PI / 180);
                                            const endAngle = ((i + 1) * anglePerSegment + DEG_12_O_CLOCK) * (Math.PI / 180);
                                            const x1 = cx + r * Math.cos(startAngle);
                                            const y1 = cy + r * Math.sin(startAngle);
                                            const x2 = cx + r * Math.cos(endAngle);
                                            const y2 = cy + r * Math.sin(endAngle);
                                            const large = anglePerSegment > 180 ? 1 : 0;
                                            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                                            const midAngle = ((i + 0.5) * anglePerSegment + DEG_12_O_CLOCK) * (Math.PI / 180);
                                            const textX = cx + rInner * Math.cos(midAngle);
                                            const textY = cy + rInner * Math.sin(midAngle);
                                            const rot = (i + 0.5) * anglePerSegment;
                                            const label = slots[i]!;
                                            const fontSize = Math.max(10, Math.min(14, 260 / N));
                                            const overrideFill = slotColorOverrides?.[i];
                                            const segmentFill = overrideFill ?? (isCustom ? (customPalette[i % customPalette.length] ?? customPalette[0]) : isClassic ? (i % 2 === 0 ? "#b91c1c" : "#1f2937") : "transparent");
                                            const segmentStroke = isClassic || isCustom ? "#ca8a04" : isMinimal ? (isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.25)") : strokeColor;
                                            const labelFill = isClassic || isCustom ? "#fef3c7" : isMinimal ? (isLightMode ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)") : textColor;
                                            const labelStroke = isClassic || isCustom ? "rgba(0,0,0,0.35)" : textStrokeColor;
                                            return (
                                                <g key={i}>
                                                    <path d={d} fill={segmentFill} stroke={segmentStroke} strokeWidth={segStrokeWidth} />
                                                    {!simplified && (
                                                        <text x={textX} y={textY} fill={labelFill} stroke={labelStroke} strokeWidth={1.8} paintOrder="stroke fill" fontSize={fontSize} fontWeight="600" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${rot}, ${textX}, ${textY})`}>
                                                            {label.length > 6 ? label.slice(0, 5) + "…" : label}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}

                                        {/* 2.5D 立体陰影レイヤーをセクターの直上に被せる（テキストの可読性は邪魔しない） */}
                                        {!isMinimal && (
                                            <circle cx={cx} cy={cy} r={r} fill="url(#wheel-shading-grad)" pointerEvents="none" />
                                        )}
                                    </>
                                );
                            }

                            if (style === "orbit") {
                                const anglePerSegment = segmentAngle;
                                const orbitBoardInset = 14;
                                const rOuterRing = r - orbitBoardInset;
                                const rInnerRing = r * 0.52;
                                const simplified = N > effectiveMaxLabels;
                                const orbitStroke = isLightMode ? "rgba(139,90,43,0.45)" : "rgba(101,67,33,0.6)";
                                return (
                                    <>
                                        {Array.from({ length: N }, (_, i) => {
                                            const startAngle = (i * anglePerSegment + DEG_12_O_CLOCK) * (Math.PI / 180);
                                            const endAngle = ((i + 1) * anglePerSegment + DEG_12_O_CLOCK) * (Math.PI / 180);
                                            const x1 = cx + rOuterRing * Math.cos(startAngle);
                                            const y1 = cy + rOuterRing * Math.sin(startAngle);
                                            const x2 = cx + rOuterRing * Math.cos(endAngle);
                                            const y2 = cy + rOuterRing * Math.sin(endAngle);
                                            const xi1 = cx + rInnerRing * Math.cos(startAngle);
                                            const yi1 = cy + rInnerRing * Math.sin(startAngle);
                                            const xi2 = cx + rInnerRing * Math.cos(endAngle);
                                            const yi2 = cy + rInnerRing * Math.sin(endAngle);
                                            const large = anglePerSegment > 180 ? 1 : 0;
                                            const d = `M ${xi1} ${yi1} L ${x1} ${y1} A ${rOuterRing} ${rOuterRing} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${rInnerRing} ${rInnerRing} 0 ${large} 0 ${xi1} ${yi1} Z`;
                                            const midAngle = ((i + 0.5) * anglePerSegment + DEG_12_O_CLOCK) * (Math.PI / 180);
                                            const textR = (rInnerRing + rOuterRing) / 2;
                                            const textX = cx + textR * Math.cos(midAngle);
                                            const textY = cy + textR * Math.sin(midAngle);
                                            const rot = (i + 0.5) * anglePerSegment;
                                            const label = slots[i]!;
                                            const fontSize = Math.max(10, Math.min(14, 260 / N));
                                            const overrideFill = slotColorOverrides?.[i];
                                            const segFill = overrideFill ?? "url(#orbit-wood-grain)";
                                            const segStroke = overrideFill ? "#8b5a2b" : orbitStroke;
                                            return (
                                                <g key={i}>
                                                    <path d={d} fill={segFill} stroke={segStroke} strokeWidth={1} />
                                                    {!simplified && (
                                                        <text x={textX} y={textY} fill="url(#orbit-wood-grain-dark)" stroke={isLightMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"} strokeWidth={1.8} paintOrder="stroke fill" fontSize={fontSize} fontWeight="600" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${rot}, ${textX}, ${textY})`}>
                                                            {label.length > 6 ? label.slice(0, 5) + "…" : label}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}

                                        {/* 木目盤の立体陰影 */}
                                        <circle cx={cx} cy={cy} r={rOuterRing} fill="url(#wheel-shading-grad)" pointerEvents="none" />
                                    </>
                                );
                            }

                            // カジノ: 内側 N 分割（数字のみ）＋ 外側 H 分割（穴のみ・ラベルなし）
                            const anglePerSegmentInner = segmentAngle;
                            const holeSegmentAngle = H > 0 ? 360 / H : 0;
                            const rInnerForText = rInnerHole * 0.65;
                            const innerFontSize = Math.max(12, Math.min(16, 280 / N));
                            const simplified = N > effectiveMaxLabels;
                            const innerStrokeWidth = simplified ? 1 : 1.5;
                            const holeStrokeWidth = simplified ? 1 : 2;

                            return (
                                <>
                                    {/* 内側の盤: N セグメント（簡易時はグリッドのみ・中央に「N スロット」） */}
                                    {Array.from({ length: N }, (_, i) => {
                                        const startAngle = (i * anglePerSegmentInner + DEG_12_O_CLOCK) * (Math.PI / 180);
                                        const endAngle = ((i + 1) * anglePerSegmentInner + DEG_12_O_CLOCK) * (Math.PI / 180);
                                        const xi1 = cx + rInnerHole * Math.cos(startAngle);
                                        const yi1 = cy + rInnerHole * Math.sin(startAngle);
                                        const xi2 = cx + rInnerHole * Math.cos(endAngle);
                                        const yi2 = cy + rInnerHole * Math.sin(endAngle);
                                        const large = anglePerSegmentInner > 180 ? 1 : 0;
                                        const d = `M ${cx} ${cy} L ${xi1} ${yi1} A ${rInnerHole} ${rInnerHole} 0 ${large} 1 ${xi2} ${yi2} Z`;
                                        const midAngle = ((i + 0.5) * anglePerSegmentInner + DEG_12_O_CLOCK) * (Math.PI / 180);
                                        const textX = cx + rInnerForText * Math.cos(midAngle);
                                        const textY = cy + rInnerForText * Math.sin(midAngle);
                                        const rot = (i + 0.5) * anglePerSegmentInner;
                                        const label = slots[i]!;
                                        const overrideFill = slotColorOverrides?.[i];
                                        const innerFill = overrideFill ?? "transparent";
                                        return (
                                            <g key={`inner-${i}`}>
                                                <path d={d} fill={innerFill} stroke={strokeColor} strokeWidth={innerStrokeWidth} />
                                                {!simplified && (
                                                    <text x={textX} y={textY} fill={textColor} stroke={textStrokeColor} strokeWidth={1.8} paintOrder="stroke fill" fontSize={innerFontSize} fontWeight="600" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${rot}, ${textX}, ${textY})`}>
                                                        {label.length > 6 ? label.slice(0, 5) + "…" : label}
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                    {/* 外側の穴: H セグメント・ラベルなし */}
                                    {Array.from({ length: H }, (_, i) => {
                                        const startAngle = (i * holeSegmentAngle + DEG_12_O_CLOCK) * (Math.PI / 180);
                                        const endAngle = ((i + 1) * holeSegmentAngle + DEG_12_O_CLOCK) * (Math.PI / 180);
                                        const x1 = cx + r * Math.cos(startAngle);
                                        const y1 = cy + r * Math.sin(startAngle);
                                        const x2 = cx + r * Math.cos(endAngle);
                                        const y2 = cy + r * Math.sin(endAngle);
                                        const xi1 = cx + rInnerHole * Math.cos(startAngle);
                                        const yi1 = cy + rInnerHole * Math.sin(startAngle);
                                        const xi2 = cx + rInnerHole * Math.cos(endAngle);
                                        const yi2 = cy + rInnerHole * Math.sin(endAngle);
                                        const large = holeSegmentAngle > 180 ? 1 : 0;
                                        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${rInnerHole} ${rInnerHole} 0 ${large} 0 ${xi1} ${yi1} Z`;
                                        return <path key={`hole-${i}`} d={d} fill="transparent" stroke={strokeColor} strokeWidth={holeStrokeWidth} />;
                                    })}

                                    {/* カジノ全体の立体陰影 */}
                                    <circle cx={cx} cy={cy} r={r} fill="url(#wheel-shading-grad)" pointerEvents="none" />
                                </>
                            );
                        })()}

                        {/* ガラスドーム光沢（グレア）オーバーレイ */}
                        <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 2} fill="url(#wheel-glazing-grad)" pointerEvents="none" />
                        </g>
                    </svg>
                </motion.div>
            </div>

            {N > effectiveMaxLabels && (
                <p
                    className="text-sm font-semibold text-center"
                    style={{
                        color: textColor,
                        WebkitTextStroke: `1px ${textStrokeColor}`,
                        paintOrder: "stroke fill",
                    }}
                >
                    {N} スロット
                </p>
            )}

            {!hideControls && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={onSpin}
                        disabled={slots.length === 0 || isSpinning}
                        className="px-6 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95"
                        style={{ background: accentColor }}
                    >
                        {isSpinning ? "回転中…" : "回す"}
                    </button>
                    {resultSlot != null && <span className="flex items-center min-h-[3rem]">{resultSlot}</span>}
                    {isSpinning && onSkipRequest && (
                        <button
                            type="button"
                            onClick={onSkipRequest}
                            className="px-4 py-3 rounded-xl font-medium text-white/90 bg-white/20 hover:bg-white/30 border border-white/30 transition-all"
                        >
                            スキップ
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
