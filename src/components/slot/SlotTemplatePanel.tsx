"use client";

import { useState } from "react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import {
  getSlotProbabilityTemplates,
  applyProbabilityTemplate,
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
}

export default function SlotTemplatePanel({
  symbolMaster,
  onSymbolMasterChange,
  templates,
  onSaveTemplate,
  onLoadTemplate,
  isLightMode,
}: SlotTemplatePanelProps) {
  const [templateName, setTemplateName] = useState("");
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

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
          標準テンプレート（確率）
        </label>
        <p className={`text-[10px] ${textSecondary} mb-2`}>
          図柄マスタの確率だけを一括で差し替えます（id が一致する図柄のみ）。
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {getSlotProbabilityTemplates().map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() =>
                onSymbolMasterChange(
                  applyProbabilityTemplate(symbolMaster, tpl.symbols)
                )
              }
              className={`min-w-0 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isLightMode
                  ? "bg-black/5 text-gray-700 border border-black/10 hover:bg-black/10"
                  : "bg-white/10 text-white/80 border border-white/10 hover:bg-white/15"
              }`}
              title={`${tpl.name}の確率配分を図柄マスタに適用`}
            >
              {tpl.name}
            </button>
          ))}
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
          <button
            type="button"
            onClick={() => {
              if (templateName.trim()) {
                onSaveTemplate(templateName.trim());
                setTemplateName("");
              }
            }}
            disabled={!templateName.trim()}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              templateName.trim()
                ? isLightMode
                  ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                  : "bg-teal-500/30 text-teal-300 hover:bg-teal-500/40"
                : isLightMode
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white/5 text-white/40 cursor-not-allowed"
            }`}
          >
            保存
          </button>
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
                <button
                  type="button"
                  onClick={() => onLoadTemplate(t.id)}
                  className={`px-2 py-1 rounded text-xs ${
                    isLightMode
                      ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                      : "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30"
                  }`}
                >
                  読み込み
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
