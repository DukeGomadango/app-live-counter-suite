"use client";

import React from "react";
import { motion } from "framer-motion";

interface CounterOrbsBackgroundProps {
  isLightMode: boolean;
}

export function CounterOrbsBackground({ isLightMode }: CounterOrbsBackgroundProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? 'mix-blend-multiply opacity-20' : 'opacity-80'}`}>
      <motion.div
        animate={{ x: [0, 60, -30, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.85, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)', opacity: 'var(--orb-opacity)' }}
      />
      <motion.div
        animate={{ x: [0, -70, 35, 0], y: [0, 70, -35, 0], scale: [1, 0.85, 1.15, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 60%)', opacity: 'calc(var(--orb-opacity) * 0.8)' }}
      />
    </div>
  );
}
