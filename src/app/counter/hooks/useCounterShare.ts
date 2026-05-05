"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";
import { generateShareUrl, getTimestampForFilename, shareImageWithText } from "@/lib/share";
import { DEFAULT_SHARE_HASHTAG } from "@/lib/site";

export function useCounterShare(isLightMode: boolean, currentTemplateId: string) {
  const [isCapturingShareImage, setIsCapturingShareImage] = useState(false);
  const [captureDims, setCaptureDims] = useState<{ w: number; h: number } | null>(null);
  const shareAreaRef = useRef<HTMLDivElement>(null);

  const handleShareAsImage = useCallback(() => {
    setCaptureDims({ w: window.innerWidth, h: window.innerHeight });
    setIsCapturingShareImage(true);
  }, []);

  const captureDelayMs = currentTemplateId === "prefectures" ? 500 : 80;

  useEffect(() => {
    if (!isCapturingShareImage) return;
    const id = setTimeout(async () => {
      const el = shareAreaRef.current;
      if (!el) {
        setIsCapturingShareImage(false);
        return;
      }
      try {
        const backgroundColor = isLightMode ? "#f5f3ff" : "#0f0a1e";
        const dataUrl = await toPng(el, { backgroundColor, pixelRatio: 3 });
        const tweetText = `進捗状況\n\n${DEFAULT_SHARE_HASHTAG}`;
        const filename = `counter-progress-${getTimestampForFilename()}.png`;
        const shared = await shareImageWithText(dataUrl, tweetText, filename);
        if (shared) {
          setIsCapturingShareImage(false);
          return;
        }
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
        window.open(generateShareUrl(tweetText, { toolId: "counter" }), "_blank", "noopener,noreferrer");
      } catch (err) {
        console.warn("Image export failed:", err);
      } finally {
        setIsCapturingShareImage(false);
      }
    }, captureDelayMs);
    return () => clearTimeout(id);
  }, [isCapturingShareImage, isLightMode, captureDelayMs]);

  return {
    isCapturingShareImage,
    shareAreaRef,
    captureDims,
    handleShareAsImage
  };
}
