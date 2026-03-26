"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ListOrdered } from "lucide-react";
import { useEffect } from "react";
import { coerceStoredEmojiToDisplay } from "@/lib/constants";
import type { CounterItem } from "@/lib/templates";
import EmojiGlyph from "@/components/icons/EmojiGlyph";

interface PrefectureRankingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: CounterItem[];
  isLightMode: boolean;
  onIncrement: (index: number) => void;
  onDecrement: (index: number) => void;
  accentColor?: string;
}

export default function PrefectureRankingPanel({
  isOpen,
  onClose,
  items,
  isLightMode,
  onIncrement,
  onDecrement,
  accentColor = "#a855f7",
}: PrefectureRankingPanelProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const sorted = [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.count - a.item.count);

  const bg = isLightMode ? "bg-white" : "bg-gray-900";
  const textPrimary = isLightMode ? "text-gray-900" : "text-white";
  const textMuted = isLightMode ? "text-gray-500" : "text-gray-400";
  const rowBg = isLightMode ? "hover:bg-gray-50" : "hover:bg-gray-800";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ranking-title"
            className={`fixed left-1/2 top-1/2 z-50 w-[min(95vw,420px)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl ${bg}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between border-b p-4" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
              <h2 id="ranking-title" className={`flex items-center gap-2 text-lg font-bold ${textPrimary}`}>
                <ListOrdered size={20} />
                一覧・ランキング
              </h2>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg p-1 ${textMuted} hover:opacity-80`}
                aria-label="閉じる"
              >
                <X size={24} />
              </button>
            </div>
            <div className="max-h-[calc(85vh-72px)] overflow-y-auto p-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`${textMuted} border-b`} style={{ borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
                    <th className="w-12 py-2 pl-2 font-medium">順位</th>
                    <th className="py-2 font-medium">都道府県</th>
                    <th className="w-20 py-2 text-right font-medium">人数</th>
                    <th className="w-16 py-2 pr-2 text-center font-medium">増減</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ item, index }, rank) => (
                    <tr
                      key={item.id}
                      className={`${rowBg} border-b transition-colors`}
                      style={{ borderColor: isLightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)" }}
                    >
                      <td className={`py-2 pl-2 ${textMuted}`}>{rank + 1}</td>
                      <td className={`py-2 ${textPrimary}`}>
                        <span className="mr-1.5 opacity-80 inline-flex items-center" style={{ color: item.color }}>
                          <EmojiGlyph emoji={coerceStoredEmojiToDisplay(item.emoji)} size={14} />
                        </span>
                        {item.label}
                      </td>
                      <td className={`py-2 text-right font-medium ${textPrimary}`}>{item.count}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            className="rounded px-1.5 py-0.5 text-xs font-bold transition opacity-80 hover:opacity-100"
                            style={{
                              background: `${accentColor}25`,
                              color: accentColor,
                              border: `1px solid ${accentColor}50`,
                            }}
                            onClick={() => onIncrement(index)}
                            title="1増やす"
                          >
                            △
                          </button>
                          <button
                            type="button"
                            className="rounded px-1.5 py-0.5 text-xs font-bold transition opacity-80 hover:opacity-100"
                            style={{
                              background: isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
                              color: isLightMode ? "#374151" : "rgba(255,255,255,0.9)",
                              border: isLightMode ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.2)",
                            }}
                            onClick={() => onDecrement(index)}
                            title="1減らす"
                          >
                            ▽
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
