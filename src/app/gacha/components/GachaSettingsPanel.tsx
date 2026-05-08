"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import ShareReplyToField from "@/components/ShareReplyToField";
import { 
  type GachaSettings, 
  type IntegrationConfig, 
  type GachaPool,
  GACHA_ACCENT_COLORS,
  createDefaultSettings
} from "@/lib/gacha";
import { DEFAULT_EXTRA_HASHTAG } from "@/lib/site";

interface GachaSettingsPanelProps {
  settings: GachaSettings;
  onSettingsChange: (s: GachaSettings) => void;
  pool: GachaPool;
  onPoolChange: (p: GachaPool) => void;
  integrationConfig?: IntegrationConfig;
  onIntegrationConfigChange?: (c: IntegrationConfig) => void;
  isLightMode: boolean;
  onClose: () => void;
}

export function GachaSettingsPanel({
  settings,
  onSettingsChange,
  pool,
  onPoolChange,
  integrationConfig,
  onIntegrationConfigChange,
  isLightMode,
  onClose,
}: GachaSettingsPanelProps) {
  const { glassBorder } = useGlassStyle(isLightMode);
  const overlayBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";

  return (
    <>
      {/* バックドロップ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* パネル */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="fixed top-14 right-4 z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: overlayBg,
          border: `1px solid ${glassBorder}`,
          backdropFilter: "blur(20px)",
          maxHeight: "min(80dvh, calc(100dvh - 10rem - env(safe-area-inset-bottom, 0px)), calc(100vh - 10rem))",
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: glassBorder }}>
          <span className={`text-sm font-bold ${textPrimary} inline-flex items-center gap-1`}>
            <EmojiGlyph emoji="⚙️" size={14} />
            ガチャ設定
          </span>
          <button onClick={onClose} className={`p-1 rounded-lg ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}>
            <X size={16} className={textSecondary} />
          </button>
        </div>

        <div
          className="px-4 py-3 flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-touch"
          style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
        >
          {/* ガチャ配色 */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
              ガチャ配色
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {GACHA_ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onSettingsChange({ ...settings, accentColor: c.value })}
                  className={`w-full aspect-square rounded-full transition-all ${settings.accentColor === c.value ? "ring-2 ring-white/80 ring-offset-1 scale-110" : "hover:scale-105"}`}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* オーブの色 */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
              オーブの色
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {GACHA_ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onSettingsChange({ ...settings, orbColor: c.value })}
                  className={`w-full aspect-square rounded-full transition-all ${(settings.orbColor ?? settings.accentColor) === c.value ? "ring-2 ring-white/80 ring-offset-1 scale-110" : "hover:scale-105"}`}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* オーブの濃さ */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-2 block`}>
              オーブの濃さ
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.orbIntensity ?? 50}
              onChange={(e) => onSettingsChange({ ...settings, orbIntensity: Number(e.target.value) })}
              className="w-full h-2 rounded-full accent-purple-500"
            />
            <p className={`text-[10px] ${textSecondary} mt-0.5`}>{settings.orbIntensity ?? 50}%</p>
          </div>

          {/* タイトル表示 */}
          <div className="flex items-center justify-between">
            <span className={`text-xs ${textPrimary}`}>タイトル表示</span>
            <div
              onClick={() => onSettingsChange({ ...settings, showTitle: !settings.showTitle })}
              className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${settings.showTitle ? "bg-purple-500" : isLightMode ? "bg-gray-300" : "bg-white/20"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${settings.showTitle ? "left-5" : "left-0.5"}`} />
            </div>
          </div>

          {/* 演出ON/OFF */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className={`text-xs ${textPrimary}`}>ガチャ演出</span>
              <span className={`text-[9px] ${textSecondary}`}>オフで結果を即時表示</span>
            </div>
            <div
              onClick={() => onSettingsChange({ ...settings, enableAnimation: !settings.enableAnimation })}
              className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${settings.enableAnimation ? "bg-purple-500" : isLightMode ? "bg-gray-300" : "bg-white/20"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${settings.enableAnimation ? "left-5" : "left-0.5"}`} />
            </div>
          </div>

          {/* 共有時のハッシュタグ */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-1 block`}>
              共有時のハッシュタグ
            </label>
            <p className={`text-[10px] ${textSecondary} mb-1`}>固定: #だんごツール</p>
            <input
              type="text"
              value={settings.shareHashtags ?? DEFAULT_EXTRA_HASHTAG}
              onChange={e => onSettingsChange({ ...settings, shareHashtags: e.target.value })}
              placeholder={DEFAULT_EXTRA_HASHTAG}
              className={`w-full px-2 py-1.5 rounded-lg text-xs ${textPrimary} outline-none`}
              style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)", border: `1px solid ${glassBorder}` }}
            />
          </div>

          {/* X共有時の返信先 */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary} mb-1 block`}>
              X共有の返信先
            </label>
            <p className={`text-[10px] ${textSecondary} mb-1.5`}>設定すると、共有時にそのツイートへの返信として開きます</p>
            <ShareReplyToField toolId="gacha" isLightMode={isLightMode} compact />
          </div>

          <div className="h-px bg-white/10 my-2" style={{ backgroundColor: glassBorder }} />
        </div>
      </motion.div>
    </>
  );
}
