"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { 
  formatSlotShareText, 
} from "@/lib/slot";

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [tweetText, setTweetText] = useState("");
  const shareAreaRef = useRef<HTMLDivElement | null>(null);

  const handleShare = useCallback(() => {
    setIsCapturing(true);
  }, []);

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
        // 共有は常にモーダル経由で行う（モーダル内ボタンで Web Share / フォールバック）。
        setCapturedDataUrl(dataUrl);
        setTweetText(shareText);
        setIsShareModalOpen(true);
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
    handleShare,
    isShareModalOpen,
    setIsShareModalOpen,
    capturedDataUrl,
    tweetText
  };
}
