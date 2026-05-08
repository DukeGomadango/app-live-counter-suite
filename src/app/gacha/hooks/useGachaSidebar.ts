"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type MobileTab = "setup" | "gacha" | "results" | "players" | "items" | "distribute";
export type SidebarTab = "setup" | "players" | "items" | "presets" | "distribute";

export function useGachaSidebar() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("gacha");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("setup");
  const [playerHistoryViewId, setPlayerHistoryViewId] = useState<string | null>(null);
  const [sidebarWidthPx, setSidebarWidthPx] = useLocalStorage<number>("gacha-sidebar-width", 320);
  
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [showSidebarScrollHint, setShowSidebarScrollHint] = useState(true);
  const setupScrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const sidebarResizeRafRef = useRef<number | null>(null);
  const sidebarResizePendingRef = useRef<number | null>(null);

  const applyResize = useCallback((clientX: number, startX: number, startW: number) => {
    const newW = Math.min(720, Math.max(200, startW + (clientX - startX)));
    sidebarResizePendingRef.current = newW;
    if (sidebarResizeRafRef.current !== null) return;
    sidebarResizeRafRef.current = requestAnimationFrame(() => {
      sidebarResizeRafRef.current = null;
      const w = sidebarResizePendingRef.current;
      if (w !== null) setSidebarWidthPx(w);
    });
  }, [setSidebarWidthPx]);

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startW = sidebarWidthPx;
    const onMove = (moveEvent: MouseEvent) => applyResize(moveEvent.clientX, startX, startW);
    const onUp = () => {
      if (sidebarResizeRafRef.current !== null) {
        cancelAnimationFrame(sidebarResizeRafRef.current);
        sidebarResizeRafRef.current = null;
      }
      const pending = sidebarResizePendingRef.current;
      if (pending !== null) setSidebarWidthPx(pending);
      sidebarResizePendingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidthPx, setSidebarWidthPx, applyResize]);

  const handleSidebarResizeTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length === 0) return;
    const startX = e.changedTouches[0]!.clientX;
    const startW = sidebarWidthPx;
    const onMove = (moveEvent: TouchEvent) => {
      if (moveEvent.changedTouches.length === 0) return;
      moveEvent.preventDefault();
      applyResize(moveEvent.changedTouches[0]!.clientX, startX, startW);
    };
    const onEnd = () => {
      const pending = sidebarResizePendingRef.current;
      if (pending !== null) setSidebarWidthPx(pending);
      sidebarResizePendingRef.current = null;
      document.removeEventListener("touchmove", onMove, { capture: true });
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
    document.addEventListener("touchmove", onMove, { passive: false, capture: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
  }, [sidebarWidthPx, setSidebarWidthPx, applyResize]);

  const handleSetMobileTab = useCallback((tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === "setup") setShowScrollHint(true);
  }, []);

  const handleSetSidebarTab = useCallback((tab: SidebarTab) => {
    setSidebarTab(tab);
    setShowSidebarScrollHint(true);
  }, []);

  return {
    mobileTab, setMobileTab: handleSetMobileTab,
    sidebarOpen, setSidebarOpen,
    sidebarTab, setSidebarTab: handleSetSidebarTab,
    playerHistoryViewId, setPlayerHistoryViewId,
    sidebarWidthPx, setSidebarWidthPx,
    showScrollHint, setShowScrollHint,
    showSidebarScrollHint, setShowSidebarScrollHint,
    setupScrollRef, sidebarScrollRef,
    handleSidebarResizeStart,
    handleSidebarResizeTouchStart
  };
}
