"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import {
  MIN_REEL_COUNT,
  MAX_REEL_COUNT,
  PAYLINE_PRESETS,
  normalizePaylines,
  type SlotSettings,
  type SlotSymbol,
  type SlotSymbolRole,
} from "@/lib/slot";

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
        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
        placeholder="ラベル"
      />
      <input
        type="number"
        min={0}
        value={weight}
        onChange={(e) => setWeight(Number(e.target.value) || 0)}
        className="w-14 px-2 py-1 rounded text-sm text-center"
        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
        title="確率（相対値・合計に対する割合で%表示されます）"
        placeholder="確率"
      />
      <input
        type="number"
        min={0}
        value={payout}
        onChange={(e) => setPayout(Number(e.target.value) || 0)}
        className="w-14 px-2 py-1 rounded text-sm text-center"
        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as SlotSymbolRole)}
        className={`px-2 py-1 rounded text-sm ${textPrimary}`}
        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
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
        className="px-2 py-1 rounded text-xs bg-teal-500/30 text-teal-200"
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
              isLightMode ? "bg-black/5" : "bg-white/10"
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
                isLightMode
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
            isLightMode
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
}

export default function SlotReelSymbolPanel({
  settings,
  onSettingsChange,
  symbolMaster,
  onSymbolMasterChange,
  reelStripIds,
  onReelStripIdsChange,
  isLightMode,
}: SlotReelSymbolPanelProps) {
  const [symbolEditId, setSymbolEditId] = useState<string | null>(null);
  const [reelTab, setReelTab] = useState(0);

  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const reelCount = Math.min(
    MAX_REEL_COUNT,
    Math.max(MIN_REEL_COUNT, settings.reelCount)
  );

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
              className={`min-w-[2.5rem] py-2 rounded-lg text-sm font-medium transition ${
                settings.reelCount === n
                  ? "bg-teal-500/30 text-teal-200 border border-teal-500/50"
                  : isLightMode
                    ? "bg-black/5 text-gray-600 border border-black/10"
                    : "bg-white/10 text-white/70 border border-white/10"
              }`}
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
              className={`min-w-[4rem] py-2 rounded-lg text-sm font-medium transition ${
                (settings.visibleRows ?? 1) === n
                  ? "bg-teal-500/30 text-teal-200 border border-teal-500/50"
                  : isLightMode
                    ? "bg-black/5 text-gray-600 border border-black/10"
                    : "bg-white/10 text-white/70 border border-white/10"
              }`}
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
                      ? "bg-teal-500/30 text-teal-200 border border-teal-500/50"
                      : isLightMode
                        ? "bg-black/5 text-gray-600 border border-black/10"
                        : "bg-white/10 text-white/70 border border-white/10"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t pt-4" style={{ borderColor: glassBorder }}>
        <label
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}
        >
          図柄マスタ
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() =>
              onSymbolMasterChange(
                symbolMaster.map((s) => ({ ...s, enabled: true }))
              )
            }
            className={`px-2 py-1 rounded text-xs font-medium ${
              isLightMode
                ? "bg-black/5 text-gray-700 border border-black/10 hover:bg-black/10"
                : "bg-white/10 text-white/80 border border-white/10 hover:bg-white/15"
            }`}
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
              onSymbolMasterChange(
                symbolMaster.map((s) => ({ ...s, enabled: s.id === keepId }))
              );
            }}
            disabled={symbolMaster.filter((s) => s.enabled !== false).length <= 1}
            className={`px-2 py-1 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
              isLightMode
                ? "bg-black/5 text-gray-700 border border-black/10 hover:bg-black/10"
                : "bg-white/10 text-white/80 border border-white/10 hover:bg-white/15"
            }`}
            title="1種類だけオンにして他をオフにする（最低1種類は必要）"
          >
            すべてオフ（1種類残す）
          </button>
        </div>
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto mb-2">
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
              const handleToggleEnabled = () => {
                if (isEnabled && isOnlyEnabled) return;
                if (isEnabled) {
                  onSymbolMasterChange(
                    symbolMaster.map((s) => (s.id === sym.id ? { ...s, enabled: false } : s))
                  );
                } else {
                  onSymbolMasterChange(
                    symbolMaster.map((s) => (s.id === sym.id ? { ...s, enabled: true } : s))
                  );
                }
              };
              return (
              <div
                key={sym.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                  isLightMode ? "bg-black/5" : "bg-white/10"
                } ${!isEnabled ? "opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={isOnlyEnabled}
                  onChange={handleToggleEnabled}
                  title={isOnlyEnabled ? "1種類以上オンにする必要があります" : isEnabled ? "オフにすると抽選・リールから外れます" : "オンにする"}
                  className="rounded shrink-0"
                />
                {isEditing ? (
                  <SymbolEditRow
                    symbol={sym}
                    isLightMode={isLightMode}
                    inputBg={inputBg}
                    inputBorder={inputBorder}
                    textPrimary={textPrimary}
                    onSave={(next) => {
                      onSymbolMasterChange(
                        symbolMaster.map((s) => (s.id === sym.id ? { ...next, enabled: s.enabled } : s))
                      );
                      setSymbolEditId(null);
                    }}
                    onCancel={() => setSymbolEditId(null)}
                  />
                ) : (
                  <>
                    <span className={`flex-1 min-w-0 truncate ${textPrimary}`}>
                      {sym.label}
                      {isEnabled ? ` (確率${prob.toFixed(1)}%・${sym.payoutMultiplier}枚)` : " (オフ)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSymbolEditId(sym.id)}
                      className={`p-1 rounded ${
                        isLightMode
                          ? "hover:bg-gray-200 text-gray-600"
                          : "hover:bg-white/10 text-white/70"
                      }`}
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
                        onSymbolMasterChange(
                          symbolMaster.filter((s) => s.id !== sym.id)
                        );
                      }}
                      disabled={used}
                      className={`p-1 rounded disabled:opacity-40 ${
                        isLightMode
                          ? "hover:bg-gray-200 text-gray-600"
                          : "hover:bg-white/10 text-white/70"
                      }`}
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
            );
          });
          })()}
        </div>
        <button
          type="button"
          onClick={() => {
            const id = `sym-${Date.now()}`;
            onSymbolMasterChange([
              ...symbolMaster,
              { id, label: "新規", weight: 10, payoutMultiplier: 0, role: "chance", enabled: true },
            ]);
            setSymbolEditId(id);
          }}
          className={`text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 ${
            isLightMode
              ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
              : "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
          }`}
        >
          <Plus size={12} /> 図柄を追加
        </button>
      </div>

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
              className={`px-2 py-1 rounded text-xs font-medium ${
                reelTab === i
                  ? "bg-teal-500/30 text-teal-200 border border-teal-500/50"
                  : isLightMode
                    ? "bg-black/5 text-gray-600 border border-black/10"
                    : "bg-white/10 text-white/70 border border-white/10"
              }`}
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
            const next = reelStripIds.map((s, j) => (j === reelTab ? ids : s));
            onReelStripIdsChange(next);
          }}
        />
      </div>
    </div>
  );
}

