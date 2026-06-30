"use client";

import { motion, AnimatePresence } from "framer-motion";

export interface PanelSilhouettePreviewModalProps {
  open: boolean;
  polygonCount: number;
  isComputing: boolean;
  errorMessage: string | null;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLightMode: boolean;
}

export default function PanelSilhouettePreviewModal({
  open,
  polygonCount,
  isComputing,
  errorMessage,
  title,
  description,
  onConfirm,
  onCancel,
  isLightMode,
}: PanelSilhouettePreviewModalProps) {
  const canConfirm = !isComputing && !errorMessage && polygonCount > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ぼかしなし：キャンバス上のプレビューをくっきり見せる */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/25 pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={`fixed bottom-0 left-0 right-0 z-[81] border-t shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
              isLightMode
                ? "bg-white border-gray-200 text-gray-900"
                : "bg-[#1a1035] border-white/10 text-white"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="silhouette-preview-title"
          >
            <h2 id="silhouette-preview-title" className="text-base font-semibold mb-1">
              {title}
            </h2>
            <p className={`text-sm mb-3 ${isLightMode ? "text-gray-600" : "text-white/70"}`}>
              {description}
            </p>

            {isComputing ? (
              <p className={`text-sm py-1 ${isLightMode ? "text-violet-600" : "text-violet-300"}`}>
                立ち絵の形を解析しています…
              </p>
            ) : errorMessage ? (
              <p className="text-sm py-1 text-red-500">{errorMessage}</p>
            ) : (
              <p className={`text-sm py-1 ${isLightMode ? "text-gray-800" : "text-white/90"}`}>
                <span className="font-bold text-violet-500">{polygonCount}</span> 件の覆いを追加します。
                上のキャンバスで紫色のプレビューを確認してください。
              </p>
            )}

            <div className="flex gap-2 mt-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isLightMode
                    ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "border-white/20 text-white/80 hover:bg-white/5"
                }`}
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  isLightMode
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "bg-violet-500/80 text-white hover:bg-violet-500"
                }`}
              >
                覆いを追加
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
