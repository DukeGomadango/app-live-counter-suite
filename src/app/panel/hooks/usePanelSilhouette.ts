"use client";

import { useCallback, useEffect, useState } from "react";
import { getPartitionSegments, type PanelOverlay, type PanelState } from "../lib/panelTypes";
import { imageUrlHasTransparency, clearMaskCache, rasterToPreviewDataUrl, erodeBinaryRaster } from "../lib/panelSilhouetteMask";
import {
  computeMaskedPolygonsFromSegmentsOrWhole,
  computeMaskedPreviewRaster,
  computeWholeSilhouettePolygons,
  loadSilhouetteMask,
  overlaysFromPolygons,
  filterValidSilhouettePolygons,
} from "../lib/panelSilhouetteRegions";
import type { Point100 } from "../lib/panelSilhouetteMask";

export type SilhouettePreviewMode = "whole" | "masked-regions";

interface UsePanelSilhouetteProps {
  imageDataUrl: string | null;
  resolvedBgUrl: string | null;
  panelState: PanelState;
  overlays: PanelOverlay[];
  setOverlays: (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => void;
  setPanelState: React.Dispatch<React.SetStateAction<PanelState>>;
  pushOverlayHistory: (current: PanelOverlay[]) => void;
  showToast: (m: string, t: "success" | "error" | "info") => void;
}

export function usePanelSilhouette({
  imageDataUrl,
  resolvedBgUrl,
  panelState,
  overlays,
  setOverlays,
  setPanelState,
  pushOverlayHistory,
  showToast,
}: UsePanelSilhouetteProps) {
  const [hasTransparentBackground, setHasTransparentBackground] = useState<boolean | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<SilhouettePreviewMode>("whole");
  const [previewPolygons, setPreviewPolygons] = useState<Point100[][]>([]);
  const [previewRasterUrl, setPreviewRasterUrl] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolveDisplayUrl = useCallback((): string | null => {
    if (resolvedBgUrl) return resolvedBgUrl;
    if (imageDataUrl && imageDataUrl.startsWith("data:")) return imageDataUrl;
    return null;
  }, [resolvedBgUrl, imageDataUrl]);

  useEffect(() => {
    clearMaskCache();
    const url = resolveDisplayUrl();
    if (!url) {
      setHasTransparentBackground(null);
      return;
    }
    let cancelled = false;
    imageUrlHasTransparency(url)
      .then((v) => {
        if (!cancelled) setHasTransparentBackground(v);
      })
      .catch(() => {
        if (!cancelled) setHasTransparentBackground(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolveDisplayUrl]);

  const resetPreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewPolygons([]);
    setPreviewRasterUrl(null);
    setErrorMessage(null);
    setIsComputing(false);
  }, []);

  const runPreview = useCallback(
    async (mode: SilhouettePreviewMode) => {
      const url = resolveDisplayUrl();
      if (!url) {
        showToast("画像を読み込み中です。しばらくしてからお試しください。", "error");
        return;
      }
      if (hasTransparentBackground === false) {
        showToast("透過PNGの背景画像で使えます。", "info");
        return;
      }

      setPreviewMode(mode);
      setPreviewOpen(true);
      setPreviewPolygons([]);
      setPreviewRasterUrl(null);
      setErrorMessage(null);
      setIsComputing(true);

      try {
        let polygons: Point100[][] = [];
        let rasterUrl: string | null = null;
        const mask = await loadSilhouetteMask(url);
        if (mode === "whole") {
          polygons = await computeWholeSilhouettePolygons(url);
          const raster = erodeBinaryRaster(mask.opaque, mask.gridW, mask.gridH);
          rasterUrl = rasterToPreviewDataUrl(raster, mask.gridW, mask.gridH);
        } else {
          const segments = getPartitionSegments(panelState);
          polygons = computeMaskedPolygonsFromSegmentsOrWhole(segments, mask);
          const raster = computeMaskedPreviewRaster(segments, mask);
          rasterUrl = rasterToPreviewDataUrl(raster, mask.gridW, mask.gridH);
        }
        polygons = filterValidSilhouettePolygons(polygons);
        if (polygons.length === 0) {
          setErrorMessage(
            mode === "whole"
              ? "立ち絵の形を検出できませんでした。透過PNGで、キャラクター部分が不透明になっているか確認してください。"
              : "覆いにできる領域がありませんでした。線の引き方を確認してください。"
          );
        } else {
          setPreviewPolygons(polygons);
          setPreviewRasterUrl(rasterUrl);
        }
      } catch {
        setErrorMessage("立ち絵の形の解析に失敗しました。");
      } finally {
        setIsComputing(false);
      }
    },
    [resolveDisplayUrl, hasTransparentBackground, panelState, showToast]
  );

  const handleGenerateWholeSilhouette = useCallback(() => {
    void runPreview("whole");
  }, [runPreview]);

  const handleGenerateMaskedRegions = useCallback(() => {
    void runPreview("masked-regions");
  }, [runPreview]);

  const handleConfirmPreview = useCallback(() => {
    if (previewPolygons.length === 0) return;
    const newOverlays = overlaysFromPolygons(previewPolygons);
    if (newOverlays.length === 0) {
      showToast("覆いを作成できませんでした。画像の透過設定を確認してください。", "error");
      return;
    }
    pushOverlayHistory(overlays);
    setOverlays((prev) => [...prev, ...newOverlays]);
    setPanelState((s) => ({ ...s, panelEditStep: "overlays" }));
    resetPreview();
    showToast(`${newOverlays.length} 件の覆いを追加しました。`, "success");
  }, [previewPolygons, pushOverlayHistory, overlays, setOverlays, setPanelState, resetPreview, showToast]);

  const handleCancelPreview = useCallback(() => {
    resetPreview();
  }, [resetPreview]);

  const previewTitle =
    previewMode === "whole" ? "立ち絵全体を覆いにする" : "立ち絵の形で覆いにする";

  const previewDescription =
    previewMode === "whole"
      ? "背景の透過立ち絵の輪郭に沿った覆いを1枚以上追加します。"
      : "引いた線で区切った領域を、立ち絵の不透明部分だけに切り詰めて覆いにします。";

  return {
    hasTransparentBackground,
    previewOpen,
    previewPolygons,
    previewRasterUrl,
    isComputing,
    errorMessage,
    previewTitle,
    previewDescription,
    handleGenerateWholeSilhouette,
    handleGenerateMaskedRegions,
    handleConfirmPreview,
    handleCancelPreview,
  };
}
