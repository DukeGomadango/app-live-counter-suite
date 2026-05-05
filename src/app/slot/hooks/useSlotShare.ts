"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { 
  formatSlotShareText, 
} from "@/lib/slot";
import { 
  generateShareUrl, 
  shareImageWithText,
  getTimestampForFilename,
} from "@/lib/share";

interface SlotShareProps {
  activePlayerName: string | undefined;
  reelLabels: string[];
  resultLine: string;
  isLightMode: boolean;
}

export function useSlotShare({
  activePlayerName,
  reelLabels,
  resultLine,
  isLightMode
}: SlotShareProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const shareAreaRef = useRef<HTMLDivElement | null>(null);
  const tweetUrlAfterDownloadRef = useRef<string | null>(null);

  const handleShare = useCallback(() => {
    const text = formatSlotShareText(activePlayerName, reelLabels, resultLine);
    tweetUrlAfterDownloadRef.current = generateShareUrl(text, { toolId: "slot" });
    setIsCapturing(true);
  }, [activePlayerName, reelLabels, resultLine]);

  useEffect(() => {
    if (!isCapturing) return;
    const id = setTimeout(async () => {
      const el = shareAreaRef.current;
      if (!el) {
        setIsCapturing(false);
        return;
      }
      try {
        const dataUrl = await toPng(el, {
          backgroundColor: isLightMode ? "#f5f3ff" : "#0f0a1e",
          pixelRatio: 2,
        });
        const shareText = formatSlotShareText(activePlayerName, reelLabels, resultLine);
        const filename = `slot-result-${getTimestampForFilename()}.png`;
        
        const shared = await shareImageWithText(dataUrl, shareText, filename);
        if (shared) {
          tweetUrlAfterDownloadRef.current = null;
          return;
        }
        
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
        
        const urlToOpen = tweetUrlAfterDownloadRef.current;
        if (urlToOpen) {
          tweetUrlAfterDownloadRef.current = null;
          window.open(urlToOpen, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        console.warn("Slot image export failed:", err);
      } finally {
        setIsCapturing(false);
      }
    }, 50);
    return () => clearTimeout(id);
  }, [isCapturing, isLightMode, activePlayerName, reelLabels, resultLine]);

  return {
    isCapturing,
    shareAreaRef,
    handleShare
  };
}
