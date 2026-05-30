"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeLoaderProps {
  onFadeOutComplete?: () => void;
  isLoadedTrigger?: boolean;
}

export default function WelcomeLoader({
  onFadeOutComplete,
  isLoadedTrigger = false,
}: WelcomeLoaderProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleComplete = useCallback(() => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    try {
      sessionStorage.setItem("dango-lp-visited", "true");
    } catch {
      // Fallback if sessionStorage is disabled or throws
    }
  }, [isFadingOut]);

  useEffect(() => {
    let frameId: number;

    // sessionStorage check to show only once per session
    try {
      const hasVisited = sessionStorage.getItem("dango-lp-visited");
      if (!hasVisited) {
        // Defer all state transitions to prevent synchronous setState inside effect body
        frameId = requestAnimationFrame(() => {
          setMounted(true);
          setShouldShow(true);
        });
      } else {
        frameId = requestAnimationFrame(() => {
          setMounted(true);
        });
        if (onFadeOutComplete) onFadeOutComplete();
      }
    } catch {
      // Fallback if sessionStorage is disabled
      frameId = requestAnimationFrame(() => {
        setMounted(true);
        setShouldShow(true);
      });
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [onFadeOutComplete]);

  useEffect(() => {
    if (!shouldShow) return;

    // Timeout safety net (3 seconds max)
    const timeoutId = setTimeout(() => {
      handleComplete();
    }, 3000);

    let frameId: number;
    // If external trigger signals loading is complete, trigger fade out immediately
    if (isLoadedTrigger) {
      // Defer state update to next frame to satisfy linter and prevent cascading renders
      frameId = requestAnimationFrame(() => {
        handleComplete();
      });
    }

    return () => {
      clearTimeout(timeoutId);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [shouldShow, isLoadedTrigger, handleComplete]);

  if (!mounted || !shouldShow) return null;

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (onFadeOutComplete) onFadeOutComplete();
      }}
    >
      {!isFadingOut && (
        <motion.div
          key="welcome-loader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.015,
            filter: "blur(16px)",
            transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } 
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-2xl"
        >
          {/* Subtle glow orb behind loader */}
          <div className="absolute w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

          {/* Dango bouncing balls with squish/stretch physics */}
          <div className="relative flex items-center justify-center gap-4 mb-8">
            {/* Pink Dango */}
            <motion.div
              animate={{
                y: [0, -32, 0],
                scaleX: [1, 0.85, 1.15, 1],
                scaleY: [1, 1.15, 0.85, 1],
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.0,
              }}
              className="w-10 h-10 rounded-full bg-pink-400 shadow-[0_0_20px_rgba(244,114,182,0.4)]"
            />
            {/* White Dango */}
            <motion.div
              animate={{
                y: [0, -32, 0],
                scaleX: [1, 0.85, 1.15, 1],
                scaleY: [1, 1.15, 0.85, 1],
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.15,
              }}
              className="w-10 h-10 rounded-full bg-zinc-100 shadow-[0_0_20px_rgba(244,244,245,0.3)]"
            />
            {/* Green Dango */}
            <motion.div
              animate={{
                y: [0, -32, 0],
                scaleX: [1, 0.85, 1.15, 1],
                scaleY: [1, 1.15, 0.85, 1],
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
              className="w-10 h-10 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
            />
          </div>

          {/* Elegant textual branding */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <h1 className="text-xl font-bold tracking-[0.2em] text-zinc-100 font-[family-name:var(--font-syne)] uppercase">
              Dango Tool Kit
            </h1>
            <p className="text-xs text-zinc-500 font-[family-name:var(--font-outfit)] tracking-wider">
              Preparing your stream setup...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
