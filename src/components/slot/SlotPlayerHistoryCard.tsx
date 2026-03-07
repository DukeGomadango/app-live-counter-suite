"use client";

import { X } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { SlotPlayer, SlotSpinRecord } from "@/lib/slot";

interface SlotPlayerHistoryCardProps {
  player: SlotPlayer;
  isLightMode: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function SlotPlayerHistoryCard({
  player,
  isLightMode,
  onClose,
}: SlotPlayerHistoryCardProps) {
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

  const history = (player.spinHistory ?? []).slice().reverse();
  const totalSpins = history.length;
  const totalBet = history.reduce((s, r) => s + r.bet, 0);
  const totalPayout = history.reduce((s, r) => s + r.payout, 0);
  const bonusCount = history.filter((r) => r.bonusTriggered).length;
  const replayCount = history.filter((r) => r.isReplay).length;
  const ceilingCount = history.filter((r) => r.ceilingTriggered).length;
  const actualPercent =
    totalBet > 0 ? ((totalPayout / totalBet) * 100).toFixed(1) : "—";

  return (
    <div
      className="h-full flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: glassBg,
        border: `1px solid ${glassBorder}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${glassBorder}` }}
      >
        <h2 className={`text-sm font-bold ${textPrimary}`}>{player.name} の履歴</h2>
        <button
          type="button"
          onClick={onClose}
          className={`p-2 rounded-lg transition-all ${
            isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"
          }`}
          title="閉じる"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textSecondary} mb-2`}>
            集計（最大100件）
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <dt className={textSecondary}>スピン数</dt>
            <dd className={textPrimary}>{totalSpins}</dd>
            <dt className={textSecondary}>総BET</dt>
            <dd className={textPrimary}>{totalBet} 枚</dd>
            <dt className={textSecondary}>総払出</dt>
            <dd className={textPrimary}>{totalPayout} 枚</dd>
            <dt className={textSecondary}>実質機械割</dt>
            <dd className={textPrimary}>{actualPercent}%</dd>
            <dt className={textSecondary}>ボーナス成立</dt>
            <dd className={textPrimary}>{bonusCount} 回</dd>
            <dt className={textSecondary}>リプレイ</dt>
            <dd className={textPrimary}>{replayCount} 回</dd>
            <dt className={textSecondary}>天井発動</dt>
            <dd className={textPrimary}>{ceilingCount} 回</dd>
          </dl>
        </div>

        <div className="border-t pt-4" style={{ borderColor: glassBorder }}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textSecondary} mb-2`}>
            スピン履歴（新しい順）
          </h3>
          <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <li className={`text-sm ${textSecondary}`}>履歴がありません</li>
            ) : (
              history.map((r: SlotSpinRecord) => (
                <li
                  key={r.id}
                  className={`flex items-center justify-between gap-2 text-xs py-1 px-2 rounded ${
                    isLightMode ? "bg-black/5" : "bg-white/5"
                  }`}
                >
                  <span className={textSecondary}>{formatTime(r.timestamp)}</span>
                  <span className={textPrimary}>
                    BET{r.bet} → {r.payout}枚
                    {r.winLabels.length > 0 && ` (${r.winLabels.join(",")})`}
                    {r.ceilingTriggered && " [天井]"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
