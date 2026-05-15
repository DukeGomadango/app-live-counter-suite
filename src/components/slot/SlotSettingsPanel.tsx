 "use client";

import { motion } from "framer-motion";
import { X, Users } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { type SlotSettings } from "@/lib/slot";

const SLOT_PALETTE = [
  { value: "#a855f7", label: "パープル" },
  { value: "#14b8a6", label: "ティール" },
  { value: "#3b82f6", label: "ブルー" },
  { value: "#22c55e", label: "グリーン" },
  { value: "#eab308", label: "イエロー" },
  { value: "#f97316", label: "オレンジ" },
  { value: "#ec4899", label: "ピンク" },
  { value: "#ef4444", label: "レッド" },
] as const;

interface SlotSettingsPanelProps {
  settings: SlotSettings;
  onSettingsChange: (s: SlotSettings) => void;
  isLightMode: boolean;
  onClose: () => void;
  onOpenPlayerManager?: () => void;
}

export default function SlotSettingsPanel({
  settings,
  onSettingsChange,
  isLightMode,
  onClose,
  onOpenPlayerManager,
}: SlotSettingsPanelProps) {
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-md max-h-[90vh] rounded-2xl overflow-hidden"
        style={{
          background: glassBg,
          border: `1px solid ${glassBorder}`,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: glassBorder }}
        >
          <h2 className={`font-semibold ${textPrimary}`}>スロット設定</h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg ${
              isLightMode
                ? "hover:bg-gray-200 text-gray-600"
                : "hover:bg-white/10 text-white/80"
            }`}
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <div>
            <label
              className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
            >
              アクセント色
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {SLOT_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    onSettingsChange({ ...settings, accentColor: c.value })
                  }
                  className={`h-8 rounded-lg transition-all ${
                    settings.accentColor === c.value
                      ? "ring-2 ring-teal-500 ring-offset-1"
                      : ""
                  }`}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label
              className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
            >
              オーブの濃さ
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.orbIntensity}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  orbIntensity: Number(e.target.value),
                })
              }
              className="w-full h-2 rounded-full accent-teal-500"
            />
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              {settings.orbIntensity}%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="slot-sound"
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  soundEnabled: e.target.checked,
                })
              }
              className="rounded accent-teal-500"
            />
            <label htmlFor="slot-sound" className={`text-sm ${textPrimary}`}>
              効果音を再生する
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="slot-effects"
              type="checkbox"
              checked={settings.effectsEnabled !== false}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  effectsEnabled: e.target.checked,
                })
              }
              className="rounded accent-teal-500"
            />
            <label htmlFor="slot-effects" className={`text-sm ${textPrimary}`}>
              演出（フラッシュ・紙吹雪）を表示する
            </label>
          </div>

          {onOpenPlayerManager && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: glassBorder }}>
              <button
                onClick={onOpenPlayerManager}
                className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 dango-btn-tier2 shadow-lg"
                style={{ 
                  background: isLightMode ? "white" : "rgba(255,255,255,0.05)",
                  color: isLightMode ? settings.accentColor : "white",
                  "--btn-glow-color": settings.accentColor
                } as React.CSSProperties}
              >
                <Users size={18} />
                プレイヤー名簿（設定）を開く
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
