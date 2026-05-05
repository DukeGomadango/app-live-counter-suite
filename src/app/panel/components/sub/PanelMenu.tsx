"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PanelTopOpen, 
  Save, 
  Share2, 
  List, 
  Edit3, 
  Trash2 
} from "lucide-react";
import ShareReplyToField from "@/components/ShareReplyToField";
import { type SavedPanel } from "../../lib/panelTypes";

interface PanelMenuProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (v: boolean) => void;
  isLightMode: boolean;
  handleSavePanel: () => void;
  handleShare: () => void;
  isSharing: boolean;
  savedPanels: SavedPanel[];
  renamePanelId: string | null;
  setRenamePanelId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  handleRenameSubmit: () => void;
  handleRenameSavedPanel: (saved: SavedPanel) => void;
  handleLoadPanel: (saved: SavedPanel) => void;
  setPanelToDeleteId: (id: string | null) => void;
}

export function PanelMenu({
  isMenuOpen,
  setIsMenuOpen,
  isLightMode,
  handleSavePanel,
  handleShare,
  isSharing,
  savedPanels,
  renamePanelId,
  setRenamePanelId,
  renameValue,
  setRenameValue,
  handleRenameSubmit,
  handleRenameSavedPanel,
  handleLoadPanel,
  setPanelToDeleteId,
}: PanelMenuProps) {
  return (
    <AnimatePresence>
      {isMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40"
            onClick={() => setIsMenuOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed left-0 top-[56px] bottom-0 w-72 max-w-[85vw] z-[91] overflow-y-auto scroll-touch p-4"
            style={{
              background: isLightMode ? "rgba(255,255,255,0.98)" : "rgba(20,10,40,0.98)",
              borderRight: `1px solid ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <div className={`space-y-4 ${isLightMode ? "text-gray-800" : "text-white"}`}>
              <h3 className="font-bold flex items-center gap-2">
                <PanelTopOpen size={18} /> パネル
              </h3>
              <button
                onClick={handleSavePanel}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
              >
                <Save size={16} /> 現在のパネルを保存
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 ${isSharing ? "opacity-50 cursor-wait" : ""}`}
              >
                <Share2 size={16} />
                {isSharing ? "共有中…" : "画像を保存して X で共有"}
              </button>

              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Share2 size={14} className="opacity-70" /> X共有の設定
                </h4>
                <ShareReplyToField toolId="panel" isLightMode={isLightMode} />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <List size={14} /> 保存したパネル
                </h4>
                <ul className="space-y-1">
                  {savedPanels.length === 0 ? (
                    <li className="text-sm opacity-70">保存したパネルはありません</li>
                  ) : (
                    savedPanels.map((s) => (
                      <li key={s.id} className="flex items-center gap-1 group">
                        {renamePanelId === s.id ? (
                          <>
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => { 
                                if (e.key === "Enter") handleRenameSubmit(); 
                                if (e.key === "Escape") { setRenamePanelId(null); setRenameValue(""); } 
                              }}
                              onBlur={handleRenameSubmit}
                              className="flex-1 min-w-0 px-2 py-1 rounded text-sm border bg-transparent"
                              autoFocus
                            />
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleLoadPanel(s)}
                              className="flex-1 min-w-0 text-left px-2 py-1.5 rounded text-sm hover:bg-white/10 truncate"
                            >
                              {s.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRenameSavedPanel(s)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 shrink-0"
                              title="名前を変更"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPanelToDeleteId(s.id)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 shrink-0"
                              title="削除"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
