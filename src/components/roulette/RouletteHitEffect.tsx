"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONFETTI_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f97316", "#06b6d4"];

interface RouletteHitEffectProps {
    show: boolean;
    onComplete?: () => void;
    accentColor: string;
    /** 当たった予想者の名前一覧（表示用） */
    hitNames?: string[];
    /** 演出量: high=派手（紙吹雪多め・長め・テキスト大） / low=控えめ */
    effectLevel?: "high" | "low";
}

export default function RouletteHitEffect({ show, onComplete, accentColor, hitNames = [], effectLevel = "low" }: RouletteHitEffectProps) {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number; duration: number; size: number; rotate: number }>>([]);

    const isHigh = effectLevel === "high";
    const particleCount = isHigh ? 100 : 50;
    const durationMin = isHigh ? 2 : 1.5;
    const durationMax = isHigh ? 3.5 : 3;
    const sizeMin = isHigh ? 6 : 4;
    const sizeMax = isHigh ? 14 : 12;
    const spread = isHigh ? 10 : 6;
    const totalMs = isHigh ? 4000 : 2500;

    useEffect(() => {
        if (show) {
            const next = Array.from({ length: particleCount }, (_, i) => ({
                id: i,
                x: Math.random() * 100 - 50,
                y: Math.random() * 100 - 50,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
                delay: Math.random() * (isHigh ? 0.5 : 0.3),
                duration: Math.random() * (durationMax - durationMin) + durationMin,
                size: Math.random() * (sizeMax - sizeMin) + sizeMin,
                rotate: Math.random() * 720 - 360,
            }));
            const id = setTimeout(() => setParticles(next), 0);
            const t = setTimeout(() => onComplete?.(), totalMs);
            return () => {
                clearTimeout(id);
                clearTimeout(t);
            };
        }
    }, [show, onComplete, effectLevel, particleCount, durationMin, durationMax, sizeMin, sizeMax, totalMs]);

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] pointer-events-none flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                {/* 紙吹雪 */}
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        className="absolute rounded-sm"
                        style={{
                            left: "50%",
                            top: "50%",
                            width: p.size,
                            height: p.size * 0.6,
                            background: p.color,
                            boxShadow: isHigh ? `0 0 12px ${p.color}, 0 0 24px ${p.color}80` : `0 0 6px ${p.color}80`,
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                        animate={{
                            x: p.x * spread,
                            y: p.y * spread,
                            opacity: 0,
                            rotate: p.rotate,
                        }}
                        transition={{
                            duration: p.duration,
                            delay: p.delay,
                            ease: "easeOut",
                        }}
                    />
                ))}

                {/* 当たりテキスト + 誰が当たったか */}
                <motion.div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: isHigh ? 1.3 : 1.2, opacity: 0 }}
                    transition={{ type: "spring", damping: isHigh ? 10 : 12, stiffness: isHigh ? 180 : 200 }}
                >
                    <span
                        className={`font-black tracking-wider drop-shadow-lg ${isHigh ? "text-5xl md:text-7xl" : "text-4xl md:text-5xl"}`}
                        style={{
                            color: accentColor,
                            textShadow: isHigh
                                ? `0 0 40px ${accentColor}, 0 0 80px ${accentColor}, 0 0 120px ${accentColor}99`
                                : `0 0 30px ${accentColor}, 0 0 60px ${accentColor}80`,
                        }}
                    >
                        当たり!
                    </span>
                    {hitNames.length > 0 && (
                        <p className={`font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center px-4 ${isHigh ? "text-xl md:text-2xl" : "text-lg md:text-xl"}`}>
                            当たった人: {hitNames.join("、")}
                        </p>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
