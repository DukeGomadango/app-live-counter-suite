"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/components/Toast";
import {
  saveImage,
  resolveImageUrl,
  deleteImage,
  isIdbKey,
  dataUrlToBlob,
} from "../lib/panelImageStore";
import {
  type PanelState,
  type PanelOverlay,
  type SavedPanel,
  type SavedCustomShape,
  type PartitionStroke,
  type PanelEditStep,
  createOverlayId,
  defaultPanelState,
} from "../lib/panelTypes";

const OVERLAY_HISTORY_MAX = 50;

export function usePanelState() {
  const { showToast } = useToast();
  const [panelState, setPanelState] = useLocalStorage<PanelState>("panel-state", defaultPanelState);
  
  /** IndexedDB から解決した背景画像の表示用 URL（ObjectURL or data: URL） */
  const [resolvedBgUrl, setResolvedBgUrl] = useState<string | null>(null);
  /** IndexedDB から解決した覆い画像の表示用 URL。キー = overlay.id */
  const [resolvedOverlayUrls, setResolvedOverlayUrls] = useState<Record<string, string>>({});
  
  const [isSharing, setIsSharing] = useState(false);
  const [savedPanels, setSavedPanels] = useLocalStorage<SavedPanel[]>("panel-saved-list", []);
  const [savedCustomShapes, setSavedCustomShapes] = useLocalStorage<SavedCustomShape[]>("panel-custom-shapes", []);
  const [favoriteColors, setFavoriteColors] = useLocalStorage<string[]>("panel-favorite-colors", []);
  const [editSidebarWidthPx, setEditSidebarWidthPx] = useLocalStorage<number>("panel-edit-sidebar-width", 288);
  
  const overlayHistoryRef = useRef<PanelOverlay[][]>([]);

  const pushOverlayHistory = useCallback((current: PanelOverlay[]) => {
    const snapshot = current.map((o) => ({ ...o }));
    overlayHistoryRef.current = [...overlayHistoryRef.current, snapshot].slice(-OVERLAY_HISTORY_MAX);
  }, []);

  const undoOverlays = useCallback(() => {
    const prev = overlayHistoryRef.current.pop();
    if (prev) {
      setPanelState((s) => ({ ...s, overlays: prev }));
      return true;
    }
    return false;
  }, [setPanelState]);

  const {
    imageDataUrl,
    imageAspectRatio,
    activeFilters,
    filterIntensity: rawFilterIntensity,
    filterShowLabel,
    overlays,
    isEditMode,
    panelEditStep = "overlays",
  } = panelState;

  const filterIntensity = rawFilterIntensity ?? 50;

  const setOverlays = useCallback(
    (updater: (prev: PanelOverlay[]) => PanelOverlay[]) => {
      setPanelState((s) => ({ ...s, overlays: updater(s.overlays) }));
    },
    [setPanelState]
  );

  // ---------- IndexedDB → 表示用 URL 解決 ----------

  // 背景画像の解決
  useEffect(() => {
    let cancelled = false;
    const ref = imageDataUrl;
    if (!ref) { setResolvedBgUrl(null); return; }
    if (!isIdbKey(ref)) { setResolvedBgUrl(ref); return; }
    resolveImageUrl(ref).then((url) => {
      if (!cancelled) setResolvedBgUrl(url);
    }).catch(() => {
      if (!cancelled) setResolvedBgUrl(null);
    });
    return () => { cancelled = true; };
  }, [imageDataUrl]);

  // 覆い画像オーバーレイの解決
  useEffect(() => {
    let cancelled = false;
    const imageOverlays = overlays.filter((o) => o.shape === "image" && o.imageDataUrl);
    if (imageOverlays.length === 0) {
      setResolvedOverlayUrls({});
      return;
    }
    const resolveAll = async () => {
      const entries: [string, string][] = [];
      for (const o of imageOverlays) {
        const ref = o.imageDataUrl!;
        if (!isIdbKey(ref)) {
          entries.push([o.id, ref]);
        } else {
          const url = await resolveImageUrl(ref);
          if (url) entries.push([o.id, url]);
        }
      }
      if (!cancelled) setResolvedOverlayUrls(Object.fromEntries(entries));
    };
    resolveAll().catch(() => {});
    return () => { cancelled = true; };
  }, [overlays]);

  // ObjectURL のクリーンアップ
  useEffect(() => {
    return () => {
      if (resolvedBgUrl?.startsWith("blob:")) URL.revokeObjectURL(resolvedBgUrl);
      Object.values(resolvedOverlayUrls).forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    panelState, setPanelState,
    resolvedBgUrl,
    resolvedOverlayUrls,
    isSharing, setIsSharing,
    savedPanels, setSavedPanels,
    savedCustomShapes, setSavedCustomShapes,
    favoriteColors, setFavoriteColors,
    editSidebarWidthPx, setEditSidebarWidthPx,
    pushOverlayHistory,
    undoOverlays,
    setOverlays,
    
    // Derived state
    imageDataUrl,
    imageAspectRatio,
    activeFilters,
    filterIntensity,
    filterShowLabel,
    overlays,
    isEditMode,
    panelEditStep
  };
}
