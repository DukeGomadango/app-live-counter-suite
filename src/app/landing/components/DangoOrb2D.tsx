"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface DangoOrb2DProps {
  pulseTrigger: number;
  className?: string;
}

export default function DangoOrb2D({
  pulseTrigger,
  className = "",
}: DangoOrb2DProps) {
  const [pulseActive, setPulseActive] = useState(false);

  // Trigger brief scale animation on inner core when pulseTrigger increments
  useEffect(() => {
    if (pulseTrigger === 0) return;
    let frameId = requestAnimationFrame(() => {
      setPulseActive(true);
    });
    const timeout = setTimeout(() => {
      frameId = requestAnimationFrame(() => {
        setPulseActive(false);
      });
    }, 500);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      clearTimeout(timeout);
    };
  }, [pulseTrigger]);

  return (
    <div className={`w-[320px] h-[320px] md:w-[450px] md:h-[450px] flex items-center justify-center relative select-none pointer-events-none ${className}`}>
      
      {/* 1. Deep dynamic atmospheric background glow */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.35, 0.45, 0.35],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 blur-[60px] md:blur-[80px]"
      />

      {/* 2. Sleek outer glow ring */}
      <motion.div
        animate={{
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-4 rounded-full border border-white/10 shadow-[0_0_50px_rgba(168,85,247,0.25)]"
      />

      {/* 3. Outer Glassmorphic Sphere Container */}
      <div 
        className="absolute inset-6 rounded-full overflow-hidden border border-white/20 shadow-inner flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(216, 180, 254, 0.15) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(88, 28, 135, 0.45) 100%)",
          boxShadow: "inset 0 12px 32px rgba(255, 255, 255, 0.25), inset 0 -12px 32px rgba(0, 0, 0, 0.5), 0 24px 48px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* 4. Elegant Glass Highlight Reflection (creates authentic 3D sphere depth) */}
        <div 
          className="absolute top-[8%] left-[12%] w-[45%] h-[22%] rounded-full opacity-70 blur-[1px]"
          style={{
            background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%)",
            transform: "rotate(-25deg)",
          }}
        />

        {/* 5. Ambient secondary light bounce from bottom right */}
        <div 
          className="absolute bottom-[5%] right-[10%] w-[35%] h-[20%] rounded-full opacity-40 blur-[4px]"
          style={{
            background: "linear-gradient(to top, rgba(168, 85, 247, 0.4) 0%, rgba(6, 182, 212, 0.1) 100%)",
            transform: "rotate(35deg)",
          }}
        />

        {/* 6. Soft Inner Core Glow (Breathing + Pulsing on Count Click) */}
        <motion.div
          animate={
            pulseActive
              ? {
                  scale: [1, 1.45, 1],
                  opacity: [0.85, 1.0, 0.85],
                  filter: ["blur(14px)", "blur(6px)", "blur(14px)"],
                }
              : {
                  scale: [1, 1.08, 1],
                  opacity: [0.75, 0.88, 0.75],
                }
          }
          transition={
            pulseActive
              ? {
                  duration: 0.45,
                  ease: "easeOut",
                }
              : {
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
          className="w-[100px] h-[100px] md:w-[150px] md:h-[150px] rounded-full blur-[14px]"
          style={{
            background: "radial-gradient(circle, #f472b6 0%, #a855f7 60%, #4f46e5 100%)",
            boxShadow: "0 0 35px #a855f7, 0 0 70px #ec4899",
          }}
        />
      </div>

    </div>
  );
}
