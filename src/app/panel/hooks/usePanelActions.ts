"use client";

import { useCallback, useState } from "react";
import { toPng } from "html-to-image";
import { 
  type PanelOverlay, 
  type SavedPanel, 
  type SavedCustomShape, 
  type PanelState,
  type PanelEditStep,
  type CustomPart,
  OverlayShape,
  createDefaultOverlay,
  createCustomOverlay,
  createOverlayId,
  defaultPanelState,
  getPartitionSegments,
  createFreeOverlayFromCurvedRegion
} from "../lib/panelTypes";
import { 
  getImageBoundsPct,
} from "../lib/panelUtils";
import { getRegionsFromSegments } from "../lib/panelRegionDetection";
import { 
  getTimestampForFilename,
  generateShareUrl,
  shareImageWithText
} from "@/lib/share";
import { deleteImage, isIdbKey } from "../lib/panelImageStore";
import { useToast } from "@/components/Toast";

interface PanelActionsProps {
  panelState: PanelState;
  setPanelState: React.Dispatch<React.SetStateAction<PanelState>>;
  overlays: PanelOverlay[];
  setOverlays: (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => void;
  pushOverlayHistory: (current: PanelOverlay[]) => void;
  setSelectedOverlayIdAndClearDraft: (id: string | null) => void;
  imageDataUrl: string | null;
  imageAspectRatio: number | null | undefined;
  captureRef: React.RefObject<HTMLDivElement | null>;
  isLightMode: boolean;
  isDesktop: boolean;
  resolvedBgUrl: string | null;
  resolvedOverlayUrls: Record<string, string>;
  savedPanels: SavedPanel[];
  setSavedPanels: (v: SavedPanel[]) => void;
  setSavedCustomShapes: React.Dispatch<React.SetStateAction<SavedCustomShape[]>>;
  showToast: (m: string, t: "success" | "error" | "info") => void;
}

export function usePanelActions({
  panelState,
  setPanelState,
  overlays,
  setOverlays,
  pushOverlayHistory,
  setSelectedOverlayIdAndClearDraft,
  imageDataUrl,
  imageAspectRatio,
  captureRef,
  isLightMode,
  isDesktop,
  resolvedBgUrl,
  resolvedOverlayUrls,
  savedPanels,
  setSavedPanels,
  setSavedCustomShapes,
  showToast
}: PanelActionsProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleGenerateRegions = useCallback(() => {
    const segments = getPartitionSegments(panelState);
    const regions = getRegionsFromSegments(segments);
    const newOverlays = regions.map((region) => createFreeOverlayFromCurvedRegion(region));
    setPanelState((s) => ({ ...s, overlays: [...s.overlays, ...newOverlays], panelEditStep: "overlays" as PanelEditStep }));
  }, [setPanelState, panelState]);

  const handleAddOverlayAtPoint = useCallback(
    (shape: OverlayShape, x: number, y: number) => {
      const newOverlay = createDefaultOverlay(shape, x, y);
      const half = 8;
      // Note: grid snapping logic could be here or passed from props
      newOverlay.x = Math.max(0, x - half);
      newOverlay.y = Math.max(0, y - half);
      newOverlay.width = half * 2;
      newOverlay.height = half * 2;
      setOverlays((prev) => [...prev, newOverlay]);
      setSelectedOverlayIdAndClearDraft(newOverlay.id);
    },
    [setOverlays, setSelectedOverlayIdAndClearDraft]
  );

  const handleAddTriangleStripes = useCallback(
    (rows: number) => {
      if (!captureRef.current || !imageDataUrl) return;
      const rect = captureRef.current.getBoundingClientRect();
      const { x: imgX, y: imgY, width: imgW, height: imgH } = getImageBoundsPct(rect, imageAspectRatio ?? undefined);
      const rowH = imgH / rows;
      const newOverlays: PanelOverlay[] = [];
      for (let row = 0; row < rows; row++) {
        const y0 = imgY + row * rowH;
        const h = row === rows - 1 ? imgY + imgH - y0 : rowH;
        const x0 = imgX;
        const w = imgW;
        const useDownward = row % 2 === 0;
        const upper = createDefaultOverlay("triangle", x0, y0);
        upper.x = x0; upper.y = y0; upper.width = w; upper.height = h;
        upper.triangleKind = useDownward ? "diagDownUpper" : "diagUpUpper";
        upper.rotation = 0;
        const lower = createDefaultOverlay("triangle", x0, y0);
        lower.x = x0; lower.y = y0; lower.width = w; lower.height = h;
        lower.triangleKind = useDownward ? "diagDownLower" : "diagUpLower";
        lower.rotation = 0;
        newOverlays.push(upper, lower);
      }
      pushOverlayHistory(overlays);
      setOverlays((prev) => [...prev, ...newOverlays]);
    },
    [imageAspectRatio, imageDataUrl, overlays, pushOverlayHistory, setOverlays, captureRef]
  );

  const handleSavePanel = useCallback(() => {
    const name = prompt("保存名を入力", `パネル ${savedPanels.length + 1}`);
    if (!name?.trim()) return;
    const saved: SavedPanel = {
      id: `saved-${Date.now()}`,
      name: name.trim(),
      savedAt: Date.now(),
      state: { ...panelState },
    };
    setSavedPanels([...savedPanels, saved]);
  }, [panelState, savedPanels, setSavedPanels]);

  const handleShare = useCallback(async () => {
    const el = captureRef.current;
    if (!el || isSharing) return;

    if (imageDataUrl && isIdbKey(imageDataUrl) && !resolvedBgUrl) {
      showToast("画像を読み込み中です。しばらくしてからもう一度お試しください。", "error");
      return;
    }
    const hasUnresolvedOverlay = overlays.some(
      (o) => o.shape === "image" && o.imageDataUrl && isIdbKey(o.imageDataUrl) && !resolvedOverlayUrls[o.id]
    );
    if (hasUnresolvedOverlay) {
      showToast("画像を読み込み中です。しばらくしてからもう一度お試しください。", "error");
      return;
    }

    setIsSharing(true);
    const shareText = "パネル開け進捗";
    const tweetUrl = generateShareUrl(shareText, { toolId: "panel" });
    try {
      // 1. まず全体のキャプチャを取得
      const fullDataUrl = await toPng(el, {
        backgroundColor: null,
        pixelRatio: 2,
        skipFonts: true,
      });

      // 2. クロップ範囲（ピクセル）を計算
      const rect = el.getBoundingClientRect();
      const bounds = getImageBoundsPct(rect, imageAspectRatio ?? undefined);

      // 3. クロップ処理
      const dataUrl = await cropDataUrl(fullDataUrl, bounds);
      const filename = `panel-${getTimestampForFilename()}.png`;

      if (!isDesktop) {
        const shared = await shareImageWithText(dataUrl, shareText, filename);
        if (shared) {
          setIsSharing(false);
          return;
        }
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
      window.open(tweetUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("Panel image export failed:", err);
      showToast("画像の書き出しに失敗しました。", "error");
    } finally {
      setIsSharing(false);
    }
  }, [isLightMode, isSharing, isDesktop, imageDataUrl, resolvedBgUrl, overlays, resolvedOverlayUrls, showToast, captureRef]);

  const handleAddRectGrid = useCallback(
    (cols: number, rows: number) => {
      if (!captureRef.current || !imageDataUrl) return;
      const rect = captureRef.current.getBoundingClientRect();
      const { x: imgX, y: imgY, width: imgW, height: imgH } = getImageBoundsPct(rect, imageAspectRatio ?? undefined);
      const cellW = imgW / cols;
      const cellH = imgH / rows;
      const newOverlays: PanelOverlay[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const o = createDefaultOverlay("rect", imgX + c * cellW, imgY + r * cellH);
          o.x = imgX + c * cellW;
          o.y = imgY + r * cellH;
          o.width = c === cols - 1 ? imgX + imgW - o.x : cellW;
          o.height = r === rows - 1 ? imgY + imgH - o.y : cellH;
          newOverlays.push(o);
        }
      }
      pushOverlayHistory(overlays);
      setOverlays((prev) => [...prev, ...newOverlays]);
    },
    [imageAspectRatio, imageDataUrl, overlays, pushOverlayHistory, setOverlays, captureRef]
  );

  const handleCustomShapeConfirm = useCallback(
    (parts: CustomPart[]) => {
      const newOverlay = createCustomOverlay(parts, 40, 40);
      setOverlays((prev) => {
        pushOverlayHistory(prev);
        return [...prev, newOverlay];
      });
      setSelectedOverlayIdAndClearDraft(newOverlay.id);
    },
    [pushOverlayHistory, setOverlays, setSelectedOverlayIdAndClearDraft]
  );

  const handleSaveCustomTemplate = useCallback(
    (name: string, parts: CustomPart[]) => {
      const newTemplate: SavedCustomShape = {
        id: createOverlayId(),
        name: name.trim() || "カスタム図形",
        savedAt: Date.now(),
        parts: [...parts],
      };
      setSavedCustomShapes((prev) => [...prev, newTemplate]);
    },
    [setSavedCustomShapes]
  );

  return {
    handleGenerateRegions,
    handleAddOverlayAtPoint,
    handleAddTriangleStripes,
    handleAddRectGrid,
    handleSavePanel,
    handleShare,
    handleCustomShapeConfirm,
    handleSaveCustomTemplate,
    isSharing
  };
}

/**
 * DataURL の画像を指定されたパーセント範囲でクロップする
 */
async function cropDataUrl(
  dataUrl: string,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 元画像のサイズを取得
      const W = img.width;
      const H = img.height;

      // クロップ範囲をピクセルに変換
      const cropX = (W * bounds.x) / 100;
      const cropY = (H * bounds.y) / 100;
      const cropW = (W * bounds.width) / 100;
      const cropH = (H * bounds.height) / 100;

      // キャンバスをクロップ後のサイズに設定
      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context is not available"));
        return;
      }

      // 切り出し描画
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}
