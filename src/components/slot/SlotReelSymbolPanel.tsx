"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, Lock, Unlock } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import {
  MIN_REEL_COUNT,
  MAX_REEL_COUNT,
  PAYLINE_PRESETS,
  normalizePaylines,
  type SlotSettings,
  type SlotSymbol,
  type SlotSymbolRole,
  type SlotTemplate,
} from "@/lib/slot";
import SlotTemplatePanel from "./SlotTemplatePanel";

const ROLES: { value: SlotSymbolRole; label: string }[] = [
  { value: "bonus", label: "ボーナス" },
  { value: "small", label: "小役" },
  { value: "replay", label: "リプレイ" },
  { value: "chance", label: "チャンス" },
];

function isSymbolUsedInReels(symbolId: string, reelStripIds: string[][]): boolean {
  return reelStripIds.some((strip) => strip.includes(symbolId));
}

interface SymbolEditRowProps {
  symbol: SlotSymbol;
  isLightMode: boolean;
  inputBg: string;
  inputBorder: string;
  textPrimary: string;
  onSave: (s: SlotSymbol) => void;
  onCancel: () => void;
}

function SymbolEditRow({
  symbol,
  isLightMode: _isLightMode,
  inputBg: _inputBg,
  inputBorder: _inputBorder,
  textPrimary,
  onSave,
  onCancel,
}: SymbolEditRowProps) {
  const [label, setLabel] = useState(symbol.label);
  const [weight, setWeight] = useState(symbol.weight);
  const [payout, setPayout] = useState(symbol.payoutMultiplier);
  const [role, setRole] = useState<SlotSymbolRole>(symbol.role);

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className={`flex-1 min-w-0 px-2 py-1 rounded text-sm ${textPrimary}`}
        style={{ background: _inputBg, border: `1px solid ${_inputBorder}` }}
        placeholder="ラベル"
      />
      <input
        type="number"
        min={0}
        value={weight}
        onChange={(e) => setWeight(Number(e.target.value) || 0)}
        className="w-14 px-2 py-1 rounded text-sm text-center"
        style={{ background: _inputBg, border: `1px solid ${_inputBorder}` }}
        title="確率（相対値・合計に対する割合で%表示されます）"
        placeholder="確率"
      />
      <input
        type="number"
        min={0}
        value={payout}
        onChange={(e) => setPayout(Number(e.target.value) || 0)}
        className="w-14 px-2 py-1 rounded text-sm text-center"
        style={{ background: _inputBg, border: `1px solid ${_inputBorder}` }}
      />
      <select
        value={role}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as SlotSymbolRole)}
        className={`px-2 py-1 rounded text-sm ${textPrimary}`}
        style={{ background: _inputBg, border: `1px solid ${_inputBorder}` }}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onSave({
            ...symbol,
            label: label.trim() || symbol.label,
            weight,
            payoutMultiplier: payout,
            role,
          })
        }
        className={`px-2 py-1 rounded text-xs transition-colors ${_isLightMode ? "bg-teal-100 text-teal-800 hover:bg-teal-200" : "bg-teal-500/30 text-teal-200 hover:bg-teal-500/40"}`}
      >
        保存
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 rounded text-xs opacity-70"
      >
        キャンセル
      </button>
    </div>
  );
}

interface ReelStripEditorProps {
  stripIds: string[];
  symbolMaster: SlotSymbol[];
  isLightMode: boolean;
  inputBg: string;
  inputBorder: string;
  textPrimary: string;
  textSecondary: string;
  onStripChange: (ids: string[]) => void;
}

function ReelStripEditor({
  stripIds,
  symbolMaster,
  isLightMode: _isLightMode,
  inputBg: _inputBg,
  inputBorder: _inputBorder,
  textPrimary,
  textSecondary,
  onStripChange,
}: ReelStripEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const labelOf = (id: string) => symbolMaster.find((s) => s.id === id)?.label ?? id;

  const move = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= stripIds.length) return;
    const next = [...stripIds];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed!);
    onStripChange(next);
  };

  const remove = (index: number) => {
    if (stripIds.length <= 1) return;
    onStripChange(stripIds.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
        {stripIds.map((id, i) => (
          <div
            key={`${id}-${i}`}
            className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs ${
              _isLightMode ? "bg-black/5" : "bg-white/10"
            } ${textPrimary}`}
          >
            <span className="min-w-0 truncate max-w-[4rem]">{labelOf(id)}</span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="p-0.5 rounded disabled:opacity-30"
              aria-label="上へ"
            >
              <ChevronUp size={10} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === stripIds.length - 1}
              className="p-0.5 rounded disabled:opacity-30"
              aria-label="下へ"
            >
              <ChevronDown size={10} />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={stripIds.length <= 1}
              className="p-0.5 rounded disabled:opacity-30 text-red-400"
              aria-label="削除"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
      {addOpen ? (
        <div className="flex flex-wrap gap-1 items-center">
          {symbolMaster.map((sym) => (
            <button
              key={sym.id}
              type="button"
              onClick={() => {
                onStripChange([...stripIds, sym.id]);
                setAddOpen(false);
              }}
              className={`px-2 py-1 rounded text-xs ${
                _isLightMode
                  ? "bg-teal-100 text-teal-800"
                  : "bg-teal-500/20 text-teal-300"
              }`}
            >
              {sym.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAddOpen(false)}
            className={`px-2 py-1 rounded text-xs ${textSecondary}`}
          >
            閉じる
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={`text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 w-fit ${
            _isLightMode
              ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
              : "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
          }`}
        >
          <Plus size={12} /> 図柄を追加
        </button>
      )}
    </div>
  );
}

interface SlotReelSymbolPanelProps {
  settings: SlotSettings;
  onSettingsChange: (s: SlotSettings) => void;
  symbolMaster: SlotSymbol[];
  onSymbolMasterChange: (s: SlotSymbol[]) => void;
  reelStripIds: string[][];
  onReelStripIdsChange: (ids: string[][]) => void;
  isLightMode: boolean;
  templates: SlotTemplate[];
  onSaveTemplate: (name: string) => void;
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onOverwriteTemplate?: (templateId: string, templateName: string) => void;
  onApplyNumbers17Preset?: () => void;
  onApplyDefaultSymbolsPreset?: () => void;
}

export default function SlotReelSymbolPanel({
  settings,
  onSettingsChange,
  symbolMaster,
  onSymbolMasterChange,
  reelStripIds,
  onReelStripIdsChange,
  isLightMode,
  templates,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  onOverwriteTemplate,
  onApplyNumbers17Preset,
  onApplyDefaultSymbolsPreset,
}: SlotReelSymbolPanelProps) {
  const [symbolEditId, setSymbolEditId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reels" | "symbols">("symbols");
  const [reelTab, setReelTab] = useState(0);
  const [lockedSymbolIds, setLockedSymbolIds] = useState<Set<string>>(new Set());

  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const reelCount = Math.min(
    MAX_REEL_COUNT,
    Math.max(MIN_REEL_COUNT, settings.reelCount)
  );

  const probabilityMode = settings.probabilityMode ?? "direct-percent";
  const accentColor = settings.accentColor ?? "#a855f7";

  const resolvedTab = probabilityMode === "direct-percent" ? "symbols" : activeTab;

  const normalizeWeights = (symbols: SlotSymbol[]): SlotSymbol[] => {
    const enabledSymbols = symbols.filter((s) => s.enabled !== false);
    if (enabledSymbols.length === 0) return symbols;

    const totalWeight = enabledSymbols.reduce((sum, s) => sum + s.weight, 0);

    // 1. 各有効図柄の生割合（パーセント）を算出
    const rawWeightsMap = new Map<string, number>();
    enabledSymbols.forEach((s) => {
      let rawWeight = 0;
      if (totalWeight > 0) {
        rawWeight = (s.weight / totalWeight) * 100;
      } else {
        rawWeight = 100 / enabledSymbols.length;
      }
      rawWeightsMap.set(s.id, rawWeight);
    });

    // 2. 小数第1位で四捨五入した初期値を割り当てる
    const roundedWeightsMap = new Map<string, number>();
    let roundedSum = 0;
    enabledSymbols.forEach((s) => {
      const raw = rawWeightsMap.get(s.id) ?? 0;
      const rounded = Math.round(raw * 10) / 10;
      roundedWeightsMap.set(s.id, rounded);
      roundedSum += rounded;
    });

    // 浮動小数点数誤差を考慮して四捨五入した合計を丸める
    roundedSum = Math.round(roundedSum * 10) / 10;

    // 3. 最大剰余方式 (Largest Remainder Method) による残余（端数）の補正
    const diff = 100.0 - roundedSum; // 例: 0.1 や -0.2 など
    const steps = Math.round(diff * 10); // 0.1刻みで補正する回数

    if (steps !== 0) {
      // 各図柄の残余（生値 - 丸め値）を計算
      const remainders = enabledSymbols.map((s) => {
        const raw = rawWeightsMap.get(s.id) ?? 0;
        const rounded = roundedWeightsMap.get(s.id) ?? 0;
        return {
          id: s.id,
          rounded,
          remainder: raw - rounded,
        };
      });

      if (steps > 0) {
        // 不足している場合: 切り捨てられた割合が大きい（残余 remainder が大きい）順に 0.1 ずつ加算
        remainders.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < steps; i++) {
          const item = remainders[i % remainders.length];
          if (item) {
            item.rounded = Math.round((item.rounded + 0.1) * 10) / 10;
            roundedWeightsMap.set(item.id, item.rounded);
          }
        }
      } else if (steps < 0) {
        // 超過している場合: 切り上げられた割合が大きい（残余 remainder が小さい）順に 0.1 ずつ減算 (ただし0.1を下回らない)
        const absSteps = Math.abs(steps);
        remainders.sort((a, b) => a.remainder - b.remainder);
        let subtracted = 0;
        for (let attempt = 0; attempt < 5 && subtracted < absSteps; attempt++) {
          for (let i = 0; i < remainders.length && subtracted < absSteps; i++) {
            const item = remainders[i];
            if (item && item.rounded > 0.1) {
              item.rounded = Math.round((item.rounded - 0.1) * 10) / 10;
              roundedWeightsMap.set(item.id, item.rounded);
              subtracted++;
            }
          }
        }
      }
    }

    // 4. 最終的なシンボルリストを作成
    return symbols.map((s) => {
      if (s.enabled === false) return s;
      const finalWeight = roundedWeightsMap.get(s.id) ?? s.weight;
      return { ...s, weight: finalWeight };
    });
  };

  const changeSymbolMaster = (next: SlotSymbol[]) => {
    if (probabilityMode === "direct-percent") {
      onSymbolMasterChange(normalizeWeights(next));
    } else {
      onSymbolMasterChange(next);
    }
  };

  const handleTemplateSymbolMasterChange = (next: SlotSymbol[]) => {
    setLockedSymbolIds(new Set());
    changeSymbolMaster(next);
  };

  const handleDirectProbabilityChange = (targetId: string, newPercent: number) => {
    const enabledSymbols = symbolMaster.filter((s) => s.enabled !== false);
    if (enabledSymbols.length <= 1) {
      changeSymbolMaster(
        symbolMaster.map((s) => (s.id === targetId ? { ...s, weight: 100 } : s))
      );
      return;
    }

    // 1. ロックされている有効な図柄（操作対象 targetId を除く）を抽出
    const lockedSymbols = enabledSymbols.filter((s) => lockedSymbolIds.has(s.id) && s.id !== targetId);
    const lockedWeightSum = lockedSymbols.reduce((sum, s) => sum + s.weight, 0);

    // 2. targetId の新しいパーセントをクランプ（100% - ロック済みの合計値 を超えないようにする）
    const maxAllowed = Math.max(0, 100 - lockedWeightSum);
    const clampedNewPercent = Math.min(newPercent, maxAllowed);

    // 3. 他の未ロック有効図柄（targetId を除く）を抽出
    const otherUnlocked = enabledSymbols.filter((s) => s.id !== targetId && !lockedSymbolIds.has(s.id));
    const remainingWeight = 100 - lockedWeightSum - clampedNewPercent;

    let nextSymbols: SlotSymbol[] = [];

    if (otherUnlocked.length === 0) {
      // 他の未ロック有効図柄がない場合は、操作対象が残り枠をすべて吸収する（通常はdisabledで防がれるがフォールバック）
      nextSymbols = symbolMaster.map((s) => {
        if (s.id === targetId) {
          return { ...s, weight: parseFloat(maxAllowed.toFixed(1)) };
        }
        return s;
      });
    } else {
      const currentOtherUnlockedSum = otherUnlocked.reduce((sum, s) => sum + s.weight, 0);

      // 4. 生の配分値（rawWeight）を計算する
      const rawWeightsMap = new Map<string, number>();
      otherUnlocked.forEach((s) => {
        let rawWeight = 0;
        if (currentOtherUnlockedSum > 0) {
          rawWeight = (s.weight / currentOtherUnlockedSum) * remainingWeight;
        } else {
          rawWeight = remainingWeight / otherUnlocked.length;
        }
        rawWeightsMap.set(s.id, rawWeight);
      });

      // 5. 四捨五入（小数第1位）を行う
      const roundedWeightsMap = new Map<string, number>();
      let roundedSum = clampedNewPercent; // targetId の値を含めて合計をカウント
      
      // ロックされているものはそのまま加算、未ロックのものは四捨五入して加算
      enabledSymbols.forEach((s) => {
        if (s.id === targetId) {
          roundedWeightsMap.set(s.id, clampedNewPercent);
        } else if (lockedSymbolIds.has(s.id)) {
          roundedWeightsMap.set(s.id, s.weight);
          roundedSum += s.weight;
        } else {
          const raw = rawWeightsMap.get(s.id) ?? 0;
          const rounded = Math.round(raw * 10) / 10;
          roundedWeightsMap.set(s.id, rounded);
          roundedSum += rounded;
        }
      });

      // 小数点浮動小数点の誤差を考慮して丸め合計を再度丸める
      roundedSum = Math.round(roundedSum * 10) / 10;

      // 6. 余剰分の配分 (最大剰余方式)
      const diff = 100 - roundedSum; // 例: 0.1 や -0.2 など
      const steps = Math.round(diff * 10); // 配分するステップ数 (0.1刻みの回数)

      if (steps !== 0) {
        // 残余（raw - rounded）を計算してソートする
        const remainders = otherUnlocked.map((s) => {
          const raw = rawWeightsMap.get(s.id) ?? 0;
          const rounded = roundedWeightsMap.get(s.id) ?? 0;
          return {
            id: s.id,
            rounded,
            remainder: raw - rounded,
          };
        });

        if (steps > 0) {
          // 不足している場合: 四捨五入で「切り捨てられた」割合が大きい順（remainder が大きい順）に 0.1 ずつ足す
          remainders.sort((a, b) => b.remainder - a.remainder);
          for (let i = 0; i < steps; i++) {
            const item = remainders[i % remainders.length];
            if (item) {
              item.rounded = Math.round((item.rounded + 0.1) * 10) / 10;
              roundedWeightsMap.set(item.id, item.rounded);
            }
          }
        } else if (steps < 0) {
          // 超過している場合: 四捨五入で「切り上げられた」割合が大きい順（remainder が小さい順、かつ引いても負数にならないもの）に 0.1 ずつ引く
          const absSteps = Math.abs(steps);
          remainders.sort((a, b) => a.remainder - b.remainder);
          
          let subtracted = 0;
          // rounded > 0 の要素から順次減算
          for (let attempt = 0; attempt < 5 && subtracted < absSteps; attempt++) {
            for (let i = 0; i < remainders.length && subtracted < absSteps; i++) {
              const item = remainders[i];
              if (item && item.rounded > 0) {
                item.rounded = Math.round((item.rounded - 0.1) * 10) / 10;
                roundedWeightsMap.set(item.id, item.rounded);
                subtracted++;
              }
            }
          }
        }
      }

      // 7. 新しいシンボルリストを作成
      nextSymbols = symbolMaster.map((s) => {
        if (s.enabled === false) return s;
        const finalWeight = roundedWeightsMap.get(s.id) ?? s.weight;
        return { ...s, weight: finalWeight };
      });
    }

    changeSymbolMaster(nextSymbols);
  };

  const getReelStopProbability = (symbolId: string, reelIdx: number): number => {
    const stripIds = reelStripIds[reelIdx];
    if (!stripIds || stripIds.length === 0) return 0;
    
    const resolved = stripIds.map(id => symbolMaster.find(s => s.id === id)).filter((s): s is SlotSymbol => !!s && s.enabled !== false);
    if (resolved.length === 0) return 0;
    
    const totalWeight = resolved.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight <= 0) return 0;
    
    const symbolWeight = resolved.filter(s => s.id === symbolId).reduce((sum, s) => sum + s.weight, 0);
    return (symbolWeight / totalWeight) * 100;
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-4 h-full overflow-y-auto"
      style={{
        background: glassBg,
        border: `1px solid ${glassBorder}`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* テンプレート・プリセット アコーディオン */}
      <div className="border-b pb-4" style={{ borderColor: glassBorder }}>
        <button
          type="button"
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ${textSecondary} hover:text-teal-400 transition-colors`}
        >
          <span className="flex items-center gap-1.5">
            💾 テンプレート・プリセット
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${templatesOpen ? "rotate-180" : ""}`}
          />
        </button>
        {templatesOpen && (
          <div className="mt-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <SlotTemplatePanel
              symbolMaster={symbolMaster}
              onSymbolMasterChange={handleTemplateSymbolMasterChange}
              templates={templates}
              onSaveTemplate={onSaveTemplate}
              onLoadTemplate={(id) => {
                setLockedSymbolIds(new Set());
                onLoadTemplate(id);
              }}
              onDeleteTemplate={onDeleteTemplate}
              onOverwriteTemplate={onOverwriteTemplate}
              onApplyNumbers17Preset={onApplyNumbers17Preset ? () => {
                setLockedSymbolIds(new Set());
                onApplyNumbers17Preset();
              } : undefined}
              onApplyDefaultSymbolsPreset={onApplyDefaultSymbolsPreset ? () => {
                setLockedSymbolIds(new Set());
                onApplyDefaultSymbolsPreset();
              } : undefined}
              isLightMode={isLightMode}
              isInline={true}
            />
          </div>
        )}
      </div>

      {/* 確率設定モード切り替え */}
      <div>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          確率設定モード
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, probabilityMode: "direct-percent" })}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium dango-btn-tier3 transition-all ${
              probabilityMode === "direct-percent"
                ? (isLightMode ? "bg-teal-500 text-white shadow-sm font-bold" : "bg-teal-500/30 text-teal-200 border border-teal-500/50 font-bold shadow-[0_0_12px_rgba(20,184,166,0.25)]")
                : isLightMode
                  ? "bg-black/5 text-gray-600 border border-black/10 hover:bg-black/10"
                  : "bg-white/10 text-white/70 border border-white/10 hover:bg-white/15"
            }`}
            style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
          >
            ダイレクト確率 (推奨)
          </button>
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, probabilityMode: "reel-sequence" })}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-medium dango-btn-tier3 transition-all ${
              probabilityMode === "reel-sequence"
                ? (isLightMode ? "bg-teal-500 text-white shadow-sm font-bold" : "bg-teal-500/30 text-teal-200 border border-teal-500/50 font-bold shadow-[0_0_12px_rgba(20,184,166,0.25)]")
                : isLightMode
                  ? "bg-black/5 text-gray-600 border border-black/10 hover:bg-black/10"
                  : "bg-white/10 text-white/70 border border-white/10 hover:bg-white/15"
            }`}
            style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
          >
            リール配列 (クラシック)
          </button>
        </div>
        <p className={`text-[10px] ${textSecondary} mt-1.5 leading-relaxed`}>
          {probabilityMode === "direct-percent"
            ? "図柄ごとの確率を直接%で設定します。配列は裏側で自動調整されます。"
            : "物理的なリールの配列を手動で編集します。真の確率は配列コマ数に依存します。"}
        </p>
      </div>

      <div>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          リール数
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from(
            { length: MAX_REEL_COUNT - MIN_REEL_COUNT + 1 },
            (_, i) => MIN_REEL_COUNT + i
          ).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSettingsChange({ ...settings, reelCount: n })}
              className={`min-w-[2.5rem] py-2 rounded-lg text-sm font-medium dango-btn-tier3 ${
                settings.reelCount === n
                  ? (isLightMode ? "bg-teal-500 text-white shadow-sm" : "bg-teal-500/30 text-teal-200 border border-teal-500/50")
                  : isLightMode
                    ? "bg-black/5 text-gray-600 border border-black/10"
                    : "bg-white/10 text-white/70 border border-white/10"
              }`}
              style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          天井までの回転数（0で無効）
        </label>
        <input
          type="number"
          min={0}
          max={9999}
          value={settings.ceilingSpins}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              ceilingSpins: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            isLightMode
              ? "bg-white border-gray-200 text-gray-800"
              : "bg-white/10 border-white/20 text-white"
          }`}
        />
      </div>

      <div>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          ボーナスゲーム数（0で1回払い出しのみ）
        </label>
        <input
          type="number"
          min={0}
          max={999}
          value={settings.bonusGamesCount ?? 15}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              bonusGamesCount: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            isLightMode
              ? "bg-white border-gray-200 text-gray-800"
              : "bg-white/10 border-white/20 text-white"
          }`}
        />
        <p className={`text-[10px] ${textSecondary} mt-1`}>
          ボーナス役（7揃い等）で突入する無料ゲーム数。0なら従来どおり1回払い出しのみ。
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.artEnabled ?? false}
            onChange={(e) =>
              onSettingsChange({ ...settings, artEnabled: e.target.checked })
            }
            className="rounded"
          />
          <span className={`text-sm ${textPrimary}`}>ART（ボーナス中にボーナス図柄で当たりでゲーム加算）</span>
        </label>
        {(settings.artEnabled ?? false) && (
          <div className="mt-2 flex items-center gap-2">
            <label className={`text-xs ${textSecondary}`}>加算ゲーム数</label>
            <input
              type="number"
              min={0}
              max={99}
              value={settings.artAddGames ?? 3}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  artAddGames: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className={`w-16 px-2 py-1 rounded text-sm ${
                isLightMode
                  ? "bg-white border-gray-200 text-gray-800"
                  : "bg-white/10 border-white/20 text-white"
              }`}
            />
          </div>
        )}
        <p className={`text-[10px] ${textSecondary} mt-1`}>
          ボーナス消化中にボーナス図柄（7等）で当たると残りゲーム数に加算されます。
        </p>
      </div>

      <div>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          表示段数
        </label>
        <div className="flex flex-wrap gap-2">
          {([1, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  visibleRows: n,
                  paylines:
                    n === 3 && reelCount === 3
                      ? settings.paylines ?? PAYLINE_PRESETS.three
                      : normalizePaylines(settings.paylines, reelCount, n),
                })
              }
              className={`min-w-[4rem] py-2 rounded-lg text-sm font-medium dango-btn-tier3 ${
                (settings.visibleRows ?? 1) === n
                  ? (isLightMode ? "bg-teal-500 text-white shadow-sm" : "bg-teal-500/30 text-teal-200 border border-teal-500/50")
                  : isLightMode
                    ? "bg-black/5 text-gray-600 border border-black/10"
                    : "bg-white/10 text-white/70 border border-white/10"
              }`}
              style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
            >
              {n}段
            </button>
          ))}
        </div>
      </div>

      {reelCount === 3 && (settings.visibleRows ?? 1) === 3 && (
        <div>
          <label
            className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
          >
            ペイライン（3リール・3段時）
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "one", label: "1ライン" },
              { key: "three", label: "3ライン" },
              { key: "five", label: "5ライン" },
            ].map(({ key, label }) => {
              const preset = PAYLINE_PRESETS[key];
              const isActive =
                JSON.stringify(settings.paylines ?? []) ===
                JSON.stringify(preset ?? []);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      paylines: preset ?? PAYLINE_PRESETS.one,
                    })
                  }
                  className={`min-w-[4.5rem] py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? (isLightMode ? "bg-teal-500 text-white shadow-sm" : "bg-teal-500/30 text-teal-200 border border-teal-500/50")
                      : isLightMode
                        ? "bg-black/5 text-gray-600 border border-black/10 hover:bg-black/10"
                        : "bg-white/10 text-white/70 border border-white/10 hover:bg-white/15"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {probabilityMode !== "direct-percent" && (
        <div className="flex gap-2">
            <button
                onClick={() => setActiveTab("reels")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border dango-btn-tier3 ${
                    resolvedTab === "reels"
                        ? "bg-teal-500/20 border-teal-500/40 text-teal-400 shadow-lg"
                        : `bg-black/5 border-transparent ${textSecondary}`
                }`}
                style={{ "--btn-glow-color": "rgba(20,184,166,0.3)" } as React.CSSProperties}
            >
                リール配列
            </button>
            <button
                onClick={() => setActiveTab("symbols")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border dango-btn-tier3 ${
                    resolvedTab === "symbols"
                        ? "bg-teal-500/20 border-teal-500/40 text-teal-400 shadow-lg"
                        : `bg-black/5 border-transparent ${textSecondary}`
                }`}
                style={{ "--btn-glow-color": "rgba(20,184,166,0.3)" } as React.CSSProperties}
            >
                図柄マスタ
            </button>
        </div>
      )}

      {resolvedTab === "symbols" ? (
      <div className="border-t pt-4" style={{ borderColor: glassBorder }}>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          図柄マスタ {probabilityMode === "direct-percent" && "・確率設定"}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() =>
              changeSymbolMaster(
                symbolMaster.map((s) => ({ ...s, enabled: true }))
              )
            }
            className={`px-2 py-1 rounded text-xs font-medium dango-btn-tier3 ${
              isLightMode
                ? "bg-black/5 text-gray-700 border border-black/10"
                : "bg-white/10 text-white/80 border border-white/10"
            }`}
            style={{ "--btn-glow-color": "rgba(20,184,166,0.3)" } as React.CSSProperties}
            title="全図柄をオンにする"
          >
            すべてオン
          </button>
          <button
            type="button"
            onClick={() => {
              const enabledIds = symbolMaster.filter((s) => s.enabled !== false).map((s) => s.id);
              if (enabledIds.length <= 1) return;
              const keepId = enabledIds[0]!;
              changeSymbolMaster(
                symbolMaster.map((s) => ({ ...s, enabled: s.id === keepId }))
              );
            }}
            disabled={symbolMaster.filter((s) => s.enabled !== false).length <= 1}
            className={`px-2 py-1 rounded text-xs font-medium dango-btn-tier3 disabled:opacity-40 disabled:cursor-not-allowed ${
              isLightMode
                ? "bg-black/5 text-gray-700 border border-black/10"
                : "bg-white/10 text-white/80 border border-white/10"
            }`}
            style={{ "--btn-glow-color": "rgba(20,184,166,0.3)" } as React.CSSProperties}
            title="1種類だけオンにして他をオフにする（最低1種類は必要）"
          >
            すべてオフ（1種類残す）
          </button>
        </div>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto mb-2 pr-1 custom-scrollbar">
          {(() => {
            const enabledMaster = symbolMaster.filter((m) => m.enabled !== false);
            const totalWeight = enabledMaster.reduce((s, m) => s + m.weight, 0);
            const enabledCount = enabledMaster.length;
            return symbolMaster.map((sym) => {
              const prob = totalWeight > 0 && sym.enabled !== false ? (sym.weight / totalWeight) * 100 : 0;
              const isEditing = symbolEditId === sym.id;
              const used = isSymbolUsedInReels(sym.id, reelStripIds);
              const isEnabled = sym.enabled !== false;
              const isOnlyEnabled = isEnabled && enabledCount <= 1;
              const isLocked = lockedSymbolIds.has(sym.id);
              const lockedCount = enabledMaster.filter((m) => lockedSymbolIds.has(m.id)).length;
              const unlockedCount = enabledCount - lockedCount;
              const isSliderDisabled = isLocked || (!isLocked && unlockedCount <= 1);
              const handleToggleEnabled = () => {
                if (isEnabled && isOnlyEnabled) return;
                if (isEnabled) {
                  changeSymbolMaster(
                    symbolMaster.map((s) => (s.id === sym.id ? { ...s, enabled: false } : s))
                  );
                } else {
                  changeSymbolMaster(
                    symbolMaster.map((s) => (s.id === sym.id ? { ...s, enabled: true } : s))
                  );
                }
              };
              return (
              <div
                key={sym.id}
                className={`flex flex-col gap-1.5 p-2 rounded-lg text-sm transition ${
                  isLightMode ? "bg-black/5" : "bg-white/10"
                } ${!isEnabled ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={isOnlyEnabled}
                    onChange={handleToggleEnabled}
                    title={isOnlyEnabled ? "1種類以上オンにする必要があります" : isEnabled ? "オフにすると抽選・リールから外れます" : "オンにする"}
                    className="rounded shrink-0 cursor-pointer"
                  />
                  {isEditing ? (
                    <SymbolEditRow
                      symbol={sym}
                      isLightMode={isLightMode}
                      inputBg={inputBg}
                      inputBorder={inputBorder}
                      textPrimary={textPrimary}
                      onSave={(next) => {
                        changeSymbolMaster(
                          symbolMaster.map((s) => (s.id === sym.id ? { ...next, enabled: s.enabled } : s))
                        );
                        setSymbolEditId(null);
                      }}
                      onCancel={() => setSymbolEditId(null)}
                    />
                  ) : (
                    <>
                      <span className={`flex-1 min-w-0 truncate ${textPrimary} font-medium`}>
                        {sym.label}
                        {isEnabled ? (
                          probabilityMode === "direct-percent" ? (
                            ` (確率${prob.toFixed(1)}%・${sym.payoutMultiplier}枚)`
                          ) : (
                            <span>
                              {` (${sym.payoutMultiplier}枚) `}
                              <span className="text-[10px] opacity-80 block mt-0.5 text-teal-400 font-normal">
                                真の停止確率: {Array.from({ length: reelCount }, (_, i) => `R${i + 1}:${getReelStopProbability(sym.id, i).toFixed(1)}%`).join(" / ")}
                              </span>
                            </span>
                          )
                        ) : " (オフ)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSymbolEditId(sym.id)}
                        className={`p-1 rounded dango-btn-tier3 ${
                          isLightMode
                            ? "text-gray-600 hover:bg-black/5"
                            : "text-white/70 hover:bg-white/5"
                        }`}
                        style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
                        aria-label="編集"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (used) {
                            alert("この図柄はリールで使用中のため削除できません。");
                            return;
                          }
                          changeSymbolMaster(
                            symbolMaster.filter((s) => s.id !== sym.id)
                          );
                        }}
                        disabled={used}
                        className={`p-1 rounded dango-btn-tier3 disabled:opacity-40 ${
                          isLightMode
                            ? "text-gray-600"
                            : "text-white/70"
                        }`}
                        style={{ "--btn-glow-color": "rgba(239,68,68,0.5)" } as React.CSSProperties}
                        title={
                          used ? "リールで使用中のため削除できません" : "削除"
                        }
                        aria-label="削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>

                {isEnabled && !isEditing && probabilityMode === "direct-percent" && (
                  <div className="flex items-center gap-2 pl-4 pr-1 py-1 w-full border-t border-black/5 dark:border-white/5 pt-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(lockedSymbolIds);
                        if (next.has(sym.id)) {
                          next.delete(sym.id);
                        } else {
                          next.add(sym.id);
                        }
                        setLockedSymbolIds(next);
                      }}
                      className={`p-1 rounded-lg transition-all flex items-center justify-center shrink-0 ${
                        isLocked
                          ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/35 shadow-sm"
                          : "text-gray-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                      title={
                        isLocked
                          ? "確率を固定中（クリックして解除）"
                          : "この図柄の確率を固定する（他のスライダー連動から除外されます）"
                      }
                      aria-label={isLocked ? "アンロック" : "ロック"}
                    >
                      {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={sym.weight}
                      disabled={isSliderDisabled}
                      onChange={(e) => handleDirectProbabilityChange(sym.id, Number(e.target.value))}
                      className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer bg-black/20 dark:bg-white/10 ${
                        isSliderDisabled ? "opacity-45 cursor-not-allowed" : "accent-teal-500"
                      }`}
                      style={{
                        background: isSliderDisabled
                          ? `linear-gradient(to right, rgba(128,128,128,0.4) 0%, rgba(128,128,128,0.4) ${sym.weight}%, rgba(0,0,0,0.1) ${sym.weight}%, rgba(0,0,0,0.1) 100%)`
                          : `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${sym.weight}%, rgba(0,0,0,0.2) ${sym.weight}%, rgba(0,0,0,0.2) 100%)`
                      }}
                      title={
                        isLocked
                          ? "確率がロックされているため調整できません"
                          : !isLocked && unlockedCount <= 1
                          ? "他の図柄がすべてロックされているため、この確率は自動的に固定されます。他の図柄をアンロックすると調整可能になります。"
                          : "スライダーを動かして確率比率を調整します"
                      }
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={sym.weight}
                        disabled={isSliderDisabled}
                        onChange={(e) => handleDirectProbabilityChange(sym.id, Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className={`w-14 px-1 py-0.5 text-center text-xs rounded border ${
                          isSliderDisabled
                            ? "opacity-50 cursor-not-allowed bg-black/5 dark:bg-white/5 text-gray-400 border-gray-300 dark:border-white/10"
                            : isLightMode
                            ? "bg-white border-gray-200 text-gray-800"
                            : "bg-white/10 border-white/15 text-white"
                        }`}
                        title={
                          isLocked
                            ? "確率がロックされているため調整できません"
                            : !isLocked && unlockedCount <= 1
                            ? "他の図柄がすべてロックされているため、この確率は自動的に固定されます。"
                            : "数値を入力して確率比率を調整します"
                        }
                      />
                      <span className={`text-[10px] font-bold ${textSecondary}`}>%</span>
                    </div>
                  </div>
                )}
              </div>
              );
            });
          })()}
        </div>
        <button
          type="button"
          onClick={() => {
            const id = `sym-${Date.now()}`;
            changeSymbolMaster([
              ...symbolMaster,
              { id, label: "新規", weight: 10, payoutMultiplier: 0, role: "chance", enabled: true },
            ]);
            setSymbolEditId(id);
          }}
          className={`text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 dango-btn-tier3 ${
            isLightMode
              ? "bg-teal-100 text-teal-700"
              : "bg-teal-500/20 text-teal-400"
          }`}
          style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
        >
          <Plus size={12} /> 図柄を追加
        </button>
      </div>
    ) : (
      <div className="border-t pt-4" style={{ borderColor: glassBorder }}>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          リール別配列
        </label>
        <div className="flex gap-1 mb-2">
          {Array.from({ length: reelCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setReelTab(i)}
              className={`px-2 py-1 rounded text-xs font-medium dango-btn-tier3 transition-all ${
                reelTab === i
                  ? (isLightMode ? "bg-teal-500 text-white shadow-sm" : "bg-teal-500/30 text-teal-200 border border-teal-500/50")
                  : isLightMode
                    ? "bg-black/5 text-gray-600 border border-black/10"
                    : "bg-white/10 text-white/70 border border-white/10"
              }`}
              style={{ "--btn-glow-color": "rgba(20,184,166,0.5)" } as React.CSSProperties}
            >
              リール{i + 1}
            </button>
          ))}
        </div>
        <ReelStripEditor
          stripIds={reelStripIds[reelTab] ?? []}
          symbolMaster={symbolMaster}
          isLightMode={isLightMode}
          inputBg={inputBg}
          inputBorder={inputBorder}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          onStripChange={(ids) => {
            const next = [...reelStripIds];
            while (next.length <= reelTab) {
              next.push([]);
            }
            next[reelTab] = ids;
            onReelStripIdsChange(next);
          }}
        />
      </div>
    )}
    </div>
  );
}

