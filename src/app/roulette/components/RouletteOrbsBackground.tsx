"use client";

import React from "react";
import { motion } from "framer-motion";

interface RouletteOrbsBackgroundProps {
    isLightMode: boolean;
    accentColor: string;
    orbIntensity: number;
}

export function RouletteOrbsBackground({
    isLightMode,
    accentColor,
    orbIntensity,
}: RouletteOrbsBackgroundProps) {
    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}>
            <motion.div
                animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
                style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, opacity: (orbIntensity / 100) * (isLightMode ? 1.5 : 1) }}
            />
            <motion.div
                animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
                style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`, opacity: (orbIntensity / 100) * 0.8 * (isLightMode ? 1.5 : 1) }}
            />
            <motion.div
                animate={{ x: [0, 50, -100, 0], y: [0, 50, -100, 0], scale: [1, 1.1, 0.9, 1] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute top-[40%] left-[30%] w-[40rem] h-[40rem] rounded-full blur-[100px]"
                style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`, opacity: (orbIntensity / 100) * 0.6 * (isLightMode ? 1.5 : 1) }}
            />
        </div>
    );
}
