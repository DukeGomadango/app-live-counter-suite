"use client";

import { useState, useMemo } from "react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { getAllPlayersSpinHistory } from "@/lib/slot";
import type { SlotPlayer, SlotSpinRecord } from "@/lib/slot";

interface SlotStatsPanelProps {
  players: SlotPlayer[];
  isLightMode: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function SlotStatsPanel({
  players,
  isLightMode,
}: SlotStatsPanelProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

  const spinHistory: SlotSpinRecord[] = useMemo(() => {
    if (!selectedPlayerId) return getAllPlayersSpinHistory(players, 500);
    const p = players.find((x) => x.id === selectedPlayerId);
    return (p?.spinHistory ?? []).slice().reverse();
  }, [players, selectedPlayerId]);

  const totalSpins = spinHistory.length;
  const totalBet = spinHistory.reduce((s, r) => s + r.bet, 0);
  const totalPayout = spinHistory.reduce((s, r) => s + r.payout, 0);
  const bonusCount = spinHistory.filter((r) => r.bonusTriggered).length;
  const replayCount = spinHistory.filter((r) => r.isReplay).length;
  const ceilingCount = spinHistory.filter((r) => r.ceilingTriggered).length;
  const actualPercent =
    totalBet > 0 ? ((totalPayout / totalBet) * 100).toFixed(1) : "—";

  const getPlayerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? id;

  const recent = spinHistory.slice(0, 50);

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
        <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary} block mb-2`}>
          表示するプレイヤー
        </label>
        <select
          value={selectedPlayerId ?? ""}
          onChange={(e) => setSelectedPlayerId(e.target.value || null)}
          className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${
            isLightMode ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/20 text-white"
          }`}
        >
          <option value="">全員</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <h3
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} mb-2`}
        >
          {selectedPlayerId ? "集計（このプレイヤー・最大100件）" : "集計（全員・最大200件）"}
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
        <h3
          className={`text-xs font-bold uppercase tracking-wider ${textSecondary} mb-2`}
        >
          直近の履歴（最大50件）
        </h3>
        <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto">
          {recent.length === 0 ? (
            <li className={`text-sm ${textSecondary}`}>履歴がありません</li>
          ) : (
            recent.map((r) => (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-2 text-xs py-1 px-2 rounded ${
                  isLightMode ? "bg-black/5" : "bg-white/5"
                }`}
              >
                <span className={`min-w-0 truncate ${textSecondary}`}>
                  {formatTime(r.timestamp)} {getPlayerName(r.playerId)}
                </span>
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
  );
}
