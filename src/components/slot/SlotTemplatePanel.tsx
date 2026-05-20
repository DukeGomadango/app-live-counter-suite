"use client";

import React, { useState } from "react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { Trash2, Download, Save, Scale, Dices, Sparkles, Flame, Skull, Crown, Hash, RotateCcw, Cherry } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/Toast";
import {
  getSlotProbabilityTemplates,
  applyProbabilityTemplate,
  applyEqualWeights,
  type SlotSymbol,
  type SlotTemplate,
} from "@/lib/slot";

interface SlotTemplatePanelProps {
  symbolMaster: SlotSymbol[];
  onSymbolMasterChange: (s: SlotSymbol[]) => void;
  templates: SlotTemplate[];
  onSaveTemplate: (name: string) => void;
  onLoadTemplate: (templateId: string) => void;
  isLightMode: boolean;
  /** 1〜7 数字スロット（等確率・当たりなし）を一括適用 */
  onApplyNumbers17Preset?: () => void;
  /** デフォルト図柄モード（7・BAR・スイカ…）に一括で戻す */
  onApplyDefaultSymbolsPreset?: () => void;
  onDeleteTemplate?: (templateId: string) => void;
  onOverwriteTemplate?: (templateId: string, templateName: string) => void;
  isInline?: boolean;
}

const getTemplateMetadata = (isNumbersMode: boolean): Record<
  string,
  { desc: string; icon: React.ReactNode; accentClass: string; activeAccentClass: string }
> => ({
  equal: {
    desc: isNumbersMode
      ? "すべての数字が完全に等確率（1/7）で出現する、純粋なランダムモード"
      : "全図柄が偏りなく完全に均等な割合で出現します",
    icon: <Scale className="w-4 h-4 text-teal-500 dark:text-teal-400" />,
    accentClass: "hover:border-teal-500/50 hover:bg-teal-500/5",
    activeAccentClass:
      "border-teal-500/80 bg-teal-500/10 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.25)] border-solid font-bold",
  },
  standard: {
    desc: isNumbersMode
      ? "1などの小さな数字が出やすく、7などの大きな数字はやや出にくい標準バランス"
      : "現実のスロットに近い、適度な当たりやすさとハズレのバランス",
    icon: <Dices className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
    accentClass: "hover:border-blue-500/50 hover:bg-blue-500/5",
    activeAccentClass:
      "border-blue-500/80 bg-blue-500/10 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)] border-solid font-bold",
  },
  sweet: {
    desc: isNumbersMode
      ? "どの数字も程よく出るため、様々な数字の揃い（ゾロ目）が楽しめるマイルド仕様"
      : "ハズレが非常に少なく、サクサク当たる爽快仕様",
    icon: <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
    accentClass: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
    activeAccentClass:
      "border-emerald-500/80 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] border-solid font-bold",
  },
  tight: {
    desc: isNumbersMode
      ? "小さな数字ばかり出るが、稀に大きな数字が揃うと熱い波乱仕様"
      : "ハズレが多く、当たった時の喜びが大きいヒリヒリ仕様",
    icon: <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    accentClass: "hover:border-amber-500/50 hover:bg-amber-500/5",
    activeAccentClass:
      "border-amber-500/80 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] border-solid font-bold",
  },
  setting1: {
    desc: isNumbersMode
      ? "7などの大きな数字は絶望的。1や2の連続に耐え忍ぶ修行モード"
      : "現実の厳しい洗礼を体験する、ハズレ75%の修行モード",
    icon: <Skull className="w-4 h-4 text-red-500 dark:text-red-400" />,
    accentClass: "hover:border-red-500/50 hover:bg-red-500/5",
    activeAccentClass:
      "border-red-500/80 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)] border-solid font-bold",
  },
  setting6: {
    desc: isNumbersMode
      ? "7などの大きな数字がバシバシ出現する、超高確率の無双状態！"
      : "ハズレ図柄0%！ボーナスと小役が吹き荒れる超無双状態",
    icon: <Crown className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
    accentClass: "hover:border-purple-500/50 hover:bg-purple-500/5",
    activeAccentClass:
      "border-purple-500/80 bg-purple-500/10 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)] border-solid font-bold",
  },
});

export default function SlotTemplatePanel({
  symbolMaster,
  onSymbolMasterChange,
  templates,
  onSaveTemplate,
  onLoadTemplate,
  isLightMode,
  onApplyNumbers17Preset,
  onApplyDefaultSymbolsPreset,
  onDeleteTemplate,
  onOverwriteTemplate,
  isInline = false,
}: SlotTemplatePanelProps) {
  const [templateName, setTemplateName] = useState("");
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const { showToast } = useToast();

  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  // 有効なシンボルのみを抽出
  const enabledCurrent = symbolMaster.filter((s) => s.enabled !== false);

  // 数字スロットモードか否かを判定（numで始まるIDがあるか）
  const isNumbersMode = symbolMaster.some((s) => s.id.startsWith("num"));

  const metaData = getTemplateMetadata(isNumbersMode);

  // 現在の設定が「均等」かどうか判定（誤差0.15%以内）
  const isEqualWeightsActive = () => {
    if (enabledCurrent.length === 0) return false;
    const weights = enabledCurrent.map((s) => s.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    return maxWeight - minWeight <= 0.15;
  };

  // 各確率テンプレートと一致しているか判定
  const isTemplateActive = (tplSymbols: SlotSymbol[]) => {
    if (enabledCurrent.length !== tplSymbols.length) return false;

    const tplWeightMap = new Map(tplSymbols.map((s) => [s.id, s.weight]));
    return enabledCurrent.every((s) => {
      const tplWeight = tplWeightMap.get(s.id);
      if (tplWeight === undefined) return false;
      return Math.abs(s.weight - tplWeight) < 0.05;
    });
  };

  return (
    <div
      className={isInline ? "flex flex-col gap-4" : "flex flex-col gap-4 rounded-2xl p-4 h-full overflow-y-auto"}
      style={
        isInline
          ? undefined
          : {
              background: glassBg,
              border: `1px solid ${glassBorder}`,
              backdropFilter: "blur(12px)",
            }
      }
    >
      {(onApplyNumbers17Preset || onApplyDefaultSymbolsPreset) && (
        <div>
          <label
            className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
          >
            スロット構成プリセット
          </label>
          <p className={`text-[10px] ${textSecondary} mb-2`}>
            図柄・リール配列をまとめて差し替えます（天井・ボーナスは数字モード時のみ0にします）。
          </p>
          <div className="flex flex-col gap-2">
            {onApplyNumbers17Preset && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onApplyNumbers17Preset();
                  showToast(isNumbersMode ? "数字スロットを初期化しました 🔄" : "1〜7 数字スロットに切り替えました 🔢", "success");
                }}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition border flex items-center justify-center gap-2 ${
                  isLightMode
                    ? "bg-black/5 text-gray-700 border-black/10 hover:bg-black/10 hover:border-black/20"
                    : "bg-white/10 text-white/80 border-white/10 hover:bg-white/15 hover:border-white/20"
                }`}
                title={isNumbersMode ? "現在の数字スロット設定を初期状態にリセットします" : "1〜7の数字のみ・等確率・当たりなしのスロットに変更"}
              >
                {isNumbersMode ? <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" /> : <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                {isNumbersMode ? "数字スロットの配列を初期化" : "1〜7 数字スロットに切り替える"}
              </motion.button>
            )}
            {onApplyDefaultSymbolsPreset && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onApplyDefaultSymbolsPreset();
                  showToast(
                    isNumbersMode
                      ? "スタンダード図柄に切り替えました 🎰"
                      : "スタンダード図柄を初期化しました 🔄",
                    "success"
                  );
                }}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition border flex items-center justify-center gap-2 ${
                  isLightMode
                    ? "bg-black/5 text-gray-700 border-black/10 hover:bg-black/10 hover:border-black/20"
                    : "bg-white/10 text-white/80 border-white/10 hover:bg-white/15 hover:border-white/20"
                }`}
                title={
                  isNumbersMode
                    ? "7・スイカ・チェリーなどの標準スロットに変更"
                    : "現在の図柄とリール配列をデフォルトの初期状態にリセットします"
                }
              >
                {isNumbersMode ? <Cherry className="w-4 h-4 text-gray-500 dark:text-gray-400" /> : <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                {isNumbersMode ? "スタンダード図柄に切り替える" : "スタンダード図柄の配列を初期化"}
              </motion.button>
            )}
          </div>
        </div>
      )}

      <div>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          標準テンプレート（確率）
        </label>
        <p className={`text-[10px] ${textSecondary} mb-2.5`}>
          図柄マスタの確率を一括で調整します（南京錠ロックは自動解除されます）。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {/* 均等確率ボタン */}
          {(() => {
            const isActive = isEqualWeightsActive();
            const meta = metaData.equal!;
            return (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onSymbolMasterChange(applyEqualWeights(symbolMaster));
                  showToast("等確率（フラット）を適用しました ⚖️", "success");
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left w-full ${
                  isActive
                    ? meta.activeAccentClass
                    : isLightMode
                    ? "bg-black/5 text-gray-800 border-black/10 hover:bg-black/10 hover:border-black/20"
                    : "bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20"
                } ${meta.accentClass}`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <span>{meta.icon}</span>
                  <span>フラット（等確率）</span>
                </div>
                <span className="text-[10px] opacity-75 mt-1 leading-tight">{meta.desc}</span>
              </motion.button>
            );
          })()}

          {/* 各確率テンプレートボタン */}
          {getSlotProbabilityTemplates(isNumbersMode).map((tpl) => {
            const isActive = isTemplateActive(tpl.symbols);
            const meta = metaData[tpl.id] || {
              desc: `${tpl.name}の確率配分を図柄マスタに適用`,
              icon: <Dices className="w-4 h-4 text-teal-500 dark:text-teal-400" />,
              accentClass: "hover:border-teal-500/50 hover:bg-teal-500/5",
              activeAccentClass:
                "border-teal-500/80 bg-teal-500/10 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.25)] border-solid font-bold",
            };
            return (
              <motion.button
                key={tpl.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onSymbolMasterChange(applyProbabilityTemplate(symbolMaster, tpl.symbols));
                  showToast(`確率テンプレート「${tpl.name}」を適用しました ${meta.icon}`, "success");
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left w-full ${
                  isActive
                    ? meta.activeAccentClass
                    : isLightMode
                    ? "bg-black/5 text-gray-800 border-black/10 hover:bg-black/10 hover:border-black/20"
                    : "bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20"
                } ${meta.accentClass}`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <span>{meta.icon}</span>
                  <span>{tpl.name}</span>
                </div>
                <span className="text-[10px] opacity-75 mt-1 leading-tight">{meta.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: glassBorder }}>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          カスタムテンプレートを保存
        </label>
        <p className={`text-[10px] ${textSecondary} mb-2`}>
          現在のリール数・天井・図柄・確率・リール配列を名前を付けて保存できます。
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="テンプレート名"
            className={`flex-1 min-w-[8rem] px-2 py-1.5 rounded text-sm ${textPrimary}`}
            style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          />
          <motion.button
            type="button"
            whileTap={templateName.trim() ? { scale: 0.95 } : undefined}
            onClick={() => {
              if (templateName.trim()) {
                onSaveTemplate(templateName.trim());
                showToast(`テンプレート「${templateName.trim()}」を新規保存しました 💾`, "success");
                setTemplateName("");
              }
            }}
            disabled={!templateName.trim()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              templateName.trim()
                ? isLightMode
                  ? "bg-teal-500 text-white hover:bg-teal-600 shadow-sm"
                  : "bg-teal-500/30 text-teal-300 hover:bg-teal-500/40"
                : isLightMode
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : "bg-white/5 text-white/40 cursor-not-allowed"
            }`}
          >
            保存
          </motion.button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="border-t pt-4" style={{ borderColor: glassBorder }}>
          <label
            className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
          >
            保存済みテンプレート
          </label>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                  isLightMode ? "bg-black/5" : "bg-white/10"
                }`}
              >
                <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>
                  {t.name}
                </span>
                <span className={`text-[10px] ${textSecondary} shrink-0`}>
                  {t.reelCount}リール・天井{t.ceilingSpins || "—"}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      onLoadTemplate(t.id);
                      showToast(`テンプレート「${t.name}」を読み込みました 💾`, "success");
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      isLightMode
                        ? "text-teal-600 hover:bg-teal-50"
                        : "text-teal-300 hover:bg-teal-500/20"
                    }`}
                    title="読み込み"
                  >
                    <Download size={16} />
                  </motion.button>
                  {onOverwriteTemplate && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onOverwriteTemplate(t.id, t.name);
                        showToast(`テンプレート「${t.name}」を上書き保存しました 💾`, "success");
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isLightMode
                          ? "text-amber-600 hover:bg-amber-50"
                          : "text-amber-300 hover:bg-amber-500/20"
                      }`}
                      title="現在の設定で上書き保存"
                    >
                      <Save size={16} />
                    </motion.button>
                  )}
                  {onDeleteTemplate && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onDeleteTemplate(t.id);
                        showToast(`テンプレート「${t.name}」を削除しました 🗑️`, "success");
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isLightMode
                          ? "text-red-600 hover:bg-red-50"
                          : "text-red-400 hover:bg-red-500/20"
                      }`}
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
