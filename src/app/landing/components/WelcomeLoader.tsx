"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeLoaderProps {
  onFadeOutComplete?: () => void;
  isLoadedTrigger?: boolean;
}

/**
 * Awwwards-grade welcome loader:
 * 1. Three dango balls (pink/white/green) bounce in stagger
 * 2. Balls converge toward center and merge into a dango stick silhouette
 * 3. Progress bar fills at the bottom
 * 4. Logo text fades in, then the whole overlay fades out with blur
 */
export default function WelcomeLoader({
  onFadeOutComplete,
  isLoadedTrigger = false,
}: WelcomeLoaderProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [phase, setPhase] = useState<"bounce" | "merge" | "reveal">("bounce");

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

  // Phase progression: bounce → merge → reveal
  useEffect(() => {
    if (!shouldShow) return;

    const mergeTimer = setTimeout(() => {
      setPhase("merge");
    }, 1200);

    const revealTimer = setTimeout(() => {
      setPhase("reveal");
    }, 2000);

    return () => {
      clearTimeout(mergeTimer);
      clearTimeout(revealTimer);
    };
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow) return;

    // Timeout safety net (3.5 seconds max)
    const timeoutId = setTimeout(() => {
      handleComplete();
    }, 3500);

    let frameId: number;
    // If external trigger signals loading is complete, trigger fade out after reveal phase
    if (isLoadedTrigger && phase === "reveal") {
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
  }, [shouldShow, isLoadedTrigger, handleComplete, phase]);

  if (!mounted || !shouldShow) return null;

  // Dango ball config: [color, glowColor, delay]
  const dangoBalls: Array<{ color: string; glow: string; delay: number }> = [
    { color: "#f472b6", glow: "rgba(244,114,182,0.5)", delay: 0 },
    { color: "#f4f4f5", glow: "rgba(244,244,245,0.4)", delay: 0.15 },
    { color: "#34d399", glow: "rgba(52,211,153,0.5)", delay: 0.3 },
  ];

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
            scale: 1.02,
            filter: "blur(20px)",
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, rgba(88, 28, 135, 0.3) 0%, rgba(10, 1, 24, 0.97) 70%)",
          }}
        >
          {/* Atmospheric background glow orbs */}
          <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/8 blur-[120px] pointer-events-none" />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[250px] h-[250px] rounded-full bg-pink-500/10 blur-[80px] pointer-events-none"
          />

          {/* Dango balls container */}
          <div className="relative flex flex-col items-center justify-center mb-8">
            {/* The 3 dango balls - bounce phase → merge phase → reveal SVG */}
            <div
              className={`relative flex items-center justify-center ${
                phase === "merge" || phase === "reveal" ? "lp-dango-merge" : "gap-4"
              }`}
            >
              {dangoBalls.map((ball, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.3, y: 40 }}
                  animate={
                    phase === "bounce"
                      ? {
                          opacity: 1,
                          scale: 1,
                          y: [0, -28, 0],
                          scaleX: [1, 0.88, 1.12, 1],
                          scaleY: [1, 1.12, 0.88, 1],
                        }
                      : phase === "merge"
                      ? {
                          opacity: 1,
                          scale: 0.85,
                          y: 0,
                          scaleX: 1,
                          scaleY: 1,
                        }
                      : {
                          opacity: [1, 0],
                          scale: [0.85, 1.2],
                          y: 0,
                        }
                  }
                  transition={
                    phase === "bounce"
                      ? {
                          opacity: { duration: 0.4, delay: ball.delay },
                          scale: { duration: 0.4, delay: ball.delay },
                          y: { duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: ball.delay },
                          scaleX: { duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: ball.delay },
                          scaleY: { duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: ball.delay },
                        }
                      : phase === "merge"
                      ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                      : { duration: 0.5, ease: "easeOut" }
                  }
                  className="w-10 h-10 rounded-full"
                  style={{
                    background: ball.color,
                    boxShadow: `0 0 24px ${ball.glow}, 0 0 48px ${ball.glow}`,
                  }}
                />
              ))}
            </div>

            {/* SVG Dango stick silhouette (appears during reveal) */}
            <AnimatePresence>
              {phase === "reveal" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute"
                >
                  <svg width="48" height="120" viewBox="0 0 48 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Stick */}
                    <rect x="22" y="10" width="4" height="100" rx="2" fill="rgba(255,255,255,0.15)" />
                    {/* Pink dango */}
                    <circle cx="24" cy="24" r="16" fill="#f472b6" opacity="0.9" />
                    <ellipse cx="20" cy="19" rx="5" ry="3" fill="rgba(255,255,255,0.25)" transform="rotate(-20 20 19)" />
                    {/* White dango */}
                    <circle cx="24" cy="56" r="16" fill="#f4f4f5" opacity="0.9" />
                    <ellipse cx="20" cy="51" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-20 20 51)" />
                    {/* Green dango */}
                    <circle cx="24" cy="88" r="16" fill="#34d399" opacity="0.9" />
                    <ellipse cx="20" cy="83" rx="5" ry="3" fill="rgba(255,255,255,0.25)" transform="rotate(-20 20 83)" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Elegant textual branding */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={phase === "reveal" ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <h1 className="text-2xl font-bold tracking-[0.25em] text-zinc-100 font-[family-name:var(--font-plus-jakarta)] uppercase">
              Dango Tool Kit
            </h1>
            <p className="text-xs text-zinc-500 font-[family-name:var(--font-outfit)] tracking-wider">
              Preparing your stream setup...
            </p>
          </motion.div>

          {/* Neon progress bar at bottom */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48">
            <div className="h-[2px] rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full lp-loader-progress-bar"
                style={{
                  background: "linear-gradient(90deg, #a855f7, #ec4899, #06b6d4)",
                  boxShadow: "0 0 12px rgba(168, 85, 247, 0.6)",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
