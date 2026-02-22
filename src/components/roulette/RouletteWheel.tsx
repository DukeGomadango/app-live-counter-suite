"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { RouletteStyle } from "@/lib/roulette";

const FULL_TURNS = 12;
const SPIN_DURATION_NEEDLE = 8;
const SPIN_DURATION_CASINO = 12;
/** 終盤でゆっくり止まるベジェ（じらし用） */
const SPIN_EASE = [0.12, 0.5, 0.35, 1] as const;

interface RouletteWheelProps {
    slots: string[];
    style: RouletteStyle;
    isSpinning: boolean;
    targetIndex: number | null;
    spinKey?: number;
    onSpin: () => void;
    onSpinEnd: (index: number) => void;
    accentColor: string;
    isLightMode: boolean;
}

export default function RouletteWheel({
    slots,
    style,
    isSpinning,
    targetIndex,
    spinKey = 0,
    onSpin,
    onSpinEnd,
    accentColor,
    isLightMode,
}: RouletteWheelProps) {
    const wheelControls = useAnimationControls();
    const ballControls = useAnimationControls();
    const dropControls = useAnimationControls();
    const hasCompletedRef = useRef(false);
    const lastSpinKeyRef = useRef<number | null>(null);

    const N = slots.length;
    const isNeedle = style === "needle";

    const wheelSizeNeedle = 280;
    const wheelSizeCasino = 380;
    const wheelSize = isNeedle ? wheelSizeNeedle : wheelSizeCasino;

    const holesPerNumber = !isNeedle && N > 0
        ? (N <= 13 ? 3 : N <= 26 ? 2 : 1)
        : 1;
    const H = N * holesPerNumber;
    const segmentAngle = N > 0 ? 360 / N : 0;
    const holeSegmentAngle = H > 0 ? 360 / H : 0;
    const rOuter = !isNeedle ? wheelSize / 2 - 4 : 0;
    const rInner = !isNeedle ? wheelSize / 2 - 11 : 0;

    useEffect(() => {
        if (!isSpinning || targetIndex === null || N === 0) return;
        if (lastSpinKeyRef.current === spinKey) return;
        lastSpinKeyRef.current = spinKey;
        hasCompletedRef.current = false;

        if (isNeedle) {
            const transition = { duration: SPIN_DURATION_NEEDLE, ease: SPIN_EASE };
            wheelControls.set({ rotate: 0 });
            const finalDeg = FULL_TURNS * 360 - (targetIndex + 0.5) * segmentAngle;
            wheelControls
                .start({ rotate: finalDeg, transition })
                .then(() => {
                    if (!hasCompletedRef.current && targetIndex !== null) {
                        hasCompletedRef.current = true;
                        lastSpinKeyRef.current = null;
                        onSpinEnd(targetIndex);
                    }
                });
        } else {
            const transition = { duration: SPIN_DURATION_CASINO, ease: SPIN_EASE };
            const rO = wheelSize / 2 - 4;
            const rI = wheelSize / 2 - 11;
            ballControls.set({ rotate: 0 });
            dropControls.set({ y: 0, scale: 1 });
            const holeIndex = targetIndex * holesPerNumber + Math.floor(Math.random() * holesPerNumber);
            const finalDeg = FULL_TURNS * 360 + (holeIndex + 0.5) * holeSegmentAngle;
            ballControls
                .start({ rotate: finalDeg, transition })
                .then(() => {
                    if (!hasCompletedRef.current && targetIndex !== null) {
                        hasCompletedRef.current = true;
                        lastSpinKeyRef.current = null;
                        onSpinEnd(targetIndex);
                    }
                    const dropDistance = rO - rI;
                    dropControls.start({
                        y: dropDistance,
                        scale: 0.85,
                        transition: { duration: 0.5, ease: "easeOut" },
                    });
                });
        }
    }, [isSpinning, targetIndex, spinKey, N, segmentAngle, holesPerNumber, holeSegmentAngle, isNeedle, wheelControls, ballControls, dropControls, wheelSize, onSpinEnd]);

    const ballSize = !isNeedle && (N > 26 || H > 40) ? 12 : 20;

    const textColor = isLightMode ? "#1a1a2e" : "rgba(255,255,255,0.95)";
    const strokeColor = isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)";

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: wheelSize + 48, height: wheelSize + 48 }}>
                {/* 針（needle のときのみ・上部中央に固定） */}
                {isNeedle && (
                    <div
                        className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
                        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                    >
                        <svg width="24" height="32" viewBox="0 0 24 32" fill="none" className="pointer-events-none">
                            <path d="M12 0 L14 28 L12 32 L10 28 Z" fill={accentColor} stroke={strokeColor} strokeWidth="1" />
                        </svg>
                    </div>
                )}

                {/* カジノ用: ボール（ラッパーは回転のみ、止まったら子で落ちる） */}
                {!isNeedle && (
                    <motion.div
                        key={spinKey}
                        className="absolute z-20 pointer-events-none"
                        style={{
                            left: 24,
                            top: 24,
                            width: wheelSize,
                            height: wheelSize,
                            transformOrigin: "center center",
                        }}
                        animate={ballControls}
                        initial={{ rotate: 0 }}
                    >
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                left: (wheelSize - ballSize) / 2,
                                top: (wheelSize - ballSize) / 2 - rOuter,
                                width: ballSize,
                                height: ballSize,
                                background: `radial-gradient(circle at 30% 30%, #fff, ${accentColor})`,
                                boxShadow: `0 0 10px ${accentColor}80`,
                                border: `2px solid ${strokeColor}`,
                            }}
                            animate={dropControls}
                            initial={{ y: 0, scale: 1 }}
                        />
                    </motion.div>
                )}

                {/* ホイール（needle: 回転 / casino: 固定） */}
                <motion.div
                    className="absolute left-1/2 top-1/2 z-10 rounded-full border-4 overflow-hidden"
                    style={{
                        width: wheelSize,
                        height: wheelSize,
                        x: "-50%",
                        y: "-50%",
                        marginLeft: wheelSize / 2,
                        marginTop: wheelSize / 2,
                        left: 24,
                        top: 24,
                        borderColor: strokeColor,
                        boxShadow: `0 0 20px ${accentColor}40`,
                    }}
                    animate={isNeedle ? wheelControls : { rotate: 0 }}
                    initial={{ rotate: 0 }}
                >
                    <svg
                        width={wheelSize}
                        height={wheelSize}
                        viewBox={`0 0 ${wheelSize} ${wheelSize}`}
                        style={{ display: "block" }}
                    >
                        {!isNeedle && (
                            <defs>
                                <radialGradient id="roulette-inner-grad" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"} />
                                    <stop offset="70%" stopColor={isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"} />
                                    <stop offset="100%" stopColor="transparent" />
                                </radialGradient>
                            </defs>
                        )}
                        <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 2} fill="transparent" stroke={strokeColor} strokeWidth="2" />
                        {!isNeedle && (
                            <>
                                <circle cx={wheelSize / 2} cy={wheelSize / 2} r={wheelSize / 2 - 5} fill="url(#roulette-inner-grad)" stroke={strokeColor} strokeWidth="4" />
                                {(() => {
                                    const r = wheelSize / 2 - 4;
                                    const holeDepth = 14;
                                    const rInnerHole = Math.max(r * 0.3, r - holeDepth);
                                    const centerFill = isLightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)";
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
                            const numSegments = isNeedle ? N : H;
                            const anglePerSegment = isNeedle ? segmentAngle : holeSegmentAngle;
                            const r = wheelSize / 2 - 4;
                            const holeDepth = 14;
                            const rInnerHole = Math.max(r * 0.3, r - holeDepth);
                            const rInner = isNeedle ? r * 0.65 : (r + rInnerHole) / 2;
                            const cx = wheelSize / 2;
                            const cy = wheelSize / 2;
                            return Array.from({ length: numSegments }, (_, i) => {
                                const startAngle = (i * anglePerSegment - 90) * (Math.PI / 180);
                                const endAngle = ((i + 1) * anglePerSegment - 90) * (Math.PI / 180);
                                const x1 = cx + r * Math.cos(startAngle);
                                const y1 = cy + r * Math.sin(startAngle);
                                const x2 = cx + r * Math.cos(endAngle);
                                const y2 = cy + r * Math.sin(endAngle);
                                const xi1 = cx + rInnerHole * Math.cos(startAngle);
                                const yi1 = cy + rInnerHole * Math.sin(startAngle);
                                const xi2 = cx + rInnerHole * Math.cos(endAngle);
                                const yi2 = cy + rInnerHole * Math.sin(endAngle);
                                const large = anglePerSegment > 180 ? 1 : 0;
                                const d = isNeedle
                                    ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
                                    : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${rInnerHole} ${rInnerHole} 0 ${large} 0 ${xi1} ${yi1} Z`;
                                const midAngle = ((i + 0.5) * anglePerSegment - 90) * (Math.PI / 180);
                                const textX = cx + rInner * Math.cos(midAngle);
                                const textY = cy + rInner * Math.sin(midAngle);
                                const rot = (i + 0.5) * anglePerSegment;
                                const label = isNeedle ? slots[i]! : slots[Math.floor(i / holesPerNumber)]!;
                                const fillLight = isLightMode ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)";
                                const fillDark = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)";
                                const holeFill = !isNeedle ? (isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)") : undefined;
                                const holeStroke = !isNeedle ? strokeColor : strokeColor;
                                const segFill = holeFill ?? (i % 2 === 0 ? fillLight : fillDark);
                                const segStroke = !isNeedle ? holeStroke : strokeColor;
                                const fontSize = Math.max(8, Math.min(14, (isNeedle ? 260 / N : 320 / H)));
                                return (
                                    <g key={i}>
                                        <path
                                            d={d}
                                            fill={segFill}
                                            stroke={segStroke}
                                            strokeWidth={!isNeedle ? 1.5 : 1}
                                        />
                                        <text
                                            x={textX}
                                            y={textY}
                                            fill={textColor}
                                            fontSize={fontSize}
                                            fontWeight="600"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            transform={`rotate(${rot}, ${textX}, ${textY})`}
                                        >
                                            {label.length > 6 ? label.slice(0, 5) + "…" : label}
                                        </text>
                                    </g>
                                );
                            });
                        })()}
                    </svg>
                </motion.div>
            </div>

            <button
                type="button"
                onClick={onSpin}
                disabled={slots.length === 0 || isSpinning}
                className="px-6 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95"
                style={{ background: accentColor }}
            >
                {isSpinning ? "回転中…" : "回す"}
            </button>
        </div>
    );
}
