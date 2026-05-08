"use client";

import React from "react";
import { 
  PanelLeft, 
  Eye, 
  Pencil, 
  PanelTopOpen, 
  Share2, 
  Menu, 
  Moon, 
  Sun 
} from "lucide-react";
import ModeSelector from "@/components/ModeSelector";

interface PanelHeaderProps {
  isLightMode: boolean;
  setIsLightMode: (v: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  isSplitMode: boolean;
  isEditSidebarNarrow: boolean;
  setEditSidebarOverlayOpen: (v: boolean) => void;
  setAllAchieveConfirmOpen: (v: boolean) => void;
  handleShare: () => void;
  isSharing: boolean;
  setIsMenuOpen: (v: boolean) => void;
  isMenuOpen: boolean;
}

export function PanelHeader({
  isLightMode,
  setIsLightMode,
  isEditMode,
  setIsEditMode,
  isSplitMode,
  isEditSidebarNarrow,
  setEditSidebarOverlayOpen,
  setAllAchieveConfirmOpen,
  handleShare,
  isSharing,
  setIsMenuOpen,
  isMenuOpen,
}: PanelHeaderProps) {
  const headerBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.92)";
  const iconColor = isLightMode ? "text-gray-800" : "text-white";
  const iconHover = isLightMode ? "hover:bg-gray-200" : "hover:bg-white/20";

  return (
    <div
      className={`shrink-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 ${isSplitMode ? "relative min-h-[56px]" : "fixed top-0"}`}
      style={{
        background: isSplitMode ? (isLightMode ? "#f8f9fa" : "#0a051e") : headerBg,
        backdropFilter: isSplitMode ? "none" : "blur(12px)",
        borderBottom: isSplitMode ? "none" : `1px solid ${isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
        {isEditMode && isEditSidebarNarrow && (
          <button
            onClick={() => setEditSidebarOverlayOpen(true)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title="編集パネルを開く"
            aria-label="編集パネルを開く"
          >
            <PanelLeft size={16} />
          </button>
        )}
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
          title={isEditMode ? "パネル開けモードに切り替え" : "編集モードに切り替え"}
        >
          {isEditMode ? <Eye size={16} /> : <Pencil size={16} />}
          <span className="sr-only">{isEditMode ? "編集" : "パネル開け"}</span>
        </button>
        {!isEditMode && (
          <button
            onClick={() => setAllAchieveConfirmOpen(true)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title="すべての覆いを開ける"
          >
            <PanelTopOpen size={16} />
            <span className="sr-only">全達成</span>
            <span className="ml-1 text-xs font-medium hidden sm:inline">全達成</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className={`p-1.5 rounded-lg transition-all shrink-0 ${isSharing ? "opacity-50 cursor-wait" : `${iconColor} ${iconHover}`}`}
          title="画像を保存して X で共有"
        >
          <Share2 size={16} />
        </button>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
          title="メニュー"
        >
          <Menu size={16} />
        </button>
        <button
          onClick={() => setIsLightMode(!isLightMode)}
          className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
          title={isLightMode ? "ダークモード" : "ライトモード"}
        >
          {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </div>
  );
}
