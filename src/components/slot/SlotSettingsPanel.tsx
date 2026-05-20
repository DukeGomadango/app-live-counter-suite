 "use client";

import { Users } from "lucide-react";
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
  onClose?: () => void;
  onOpenPlayerManager?: () => void;
}

export default function SlotSettingsPanel({
  settings,
  onSettingsChange,
  isLightMode,
  onOpenPlayerManager,
}: SlotSettingsPanelProps) {
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-4 h-full overflow-y-auto"
      style={{
        background: glassBg,
        border: `1px solid ${glassBorder}`,
        backdropFilter: "blur(12px)",
      }}
    >
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

      <div className="pt-2">
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          表示サイズ（ズーム）
        </label>
        <div className={`flex rounded-lg p-1 ${isLightMode ? "bg-black/5" : "bg-white/5"}`}>
          {[
            { label: "小", value: 0.8 },
            { label: "中", value: 1.0 },
            { label: "大", value: 1.25 },
            { label: "特大", value: 1.5 },
          ].map((size) => {
            const isActive = (settings.zoomLevel ?? 1.0) === size.value;
            return (
              <button
                key={size.label}
                type="button"
                onClick={() => onSettingsChange({ ...settings, zoomLevel: size.value })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  isActive
                    ? isLightMode ? "bg-white shadow-sm text-gray-900" : "bg-white/20 shadow-sm text-white"
                    : `${textSecondary} hover:bg-black/5 dark:hover:bg-white/10`
                }`}
              >
                {size.label}
              </button>
            );
          })}
        </div>
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

      <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: glassBorder }}>
        <div className="flex items-center gap-2">
          <input
            id="slot-auto-stop"
            type="checkbox"
            checked={settings.autoStopEnabled ?? false}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                autoStopEnabled: e.target.checked,
              })
            }
            className="rounded accent-teal-500 cursor-pointer"
          />
          <label htmlFor="slot-auto-stop" className={`text-sm font-bold ${textPrimary} cursor-pointer`}>
            自動停止 (オートストップ) を有効にする
          </label>
        </div>
        
        {(settings.autoStopEnabled ?? false) && (
          <div className="pl-6 flex flex-col gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${textSecondary}`}>最初の停止までの時間</label>
                <span className={`text-xs ${textSecondary}`}>{settings.autoStopInitialDelay ?? 1000} ms</span>
              </div>
              <input
                type="range"
                min={500}
                max={2000}
                step={100}
                value={settings.autoStopInitialDelay ?? 1000}
                onChange={(e) => onSettingsChange({ ...settings, autoStopInitialDelay: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full accent-teal-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${textSecondary}`}>2番目以降の停止間隔</label>
                <span className={`text-xs ${textSecondary}`}>{settings.autoStopInterval ?? 600} ms</span>
              </div>
              <input
                type="range"
                min={200}
                max={1500}
                step={100}
                value={settings.autoStopInterval ?? 600}
                onChange={(e) => onSettingsChange({ ...settings, autoStopInterval: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full accent-teal-500"
              />
            </div>
          </div>
        )}
      </div>

      {onOpenPlayerManager && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: glassBorder }}>
          <button
            onClick={onOpenPlayerManager}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 dango-btn-tier2 shadow-lg animate-pulse"
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
  );
}
