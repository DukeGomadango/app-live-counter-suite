"use client";

import { useGlassStyle } from "@/hooks/useGlassStyle";

interface SlotShareSummaryProps {
  /** プレイヤー名（省略可） */
  playerName?: string;
  /** リール止まりの図柄ラベル（左→右） */
  reelLabels: string[];
  /** 役の文言（例: REPLAY! / 7 10枚 / はずれ） */
  resultLine: string;
  isLightMode: boolean;
}

export default function SlotShareSummary({
  playerName,
  reelLabels,
  resultLine,
  isLightMode,
}: SlotShareSummaryProps) {
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
  const textMuted = isLightMode ? "text-gray-500" : "text-white/65";
  const trimmedName = playerName?.trim();

  return (
    <div
      className="w-full min-h-0 flex justify-center px-4 py-6"
      style={{ background: isLightMode ? "#f5f3ff" : "#0f0a1e" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl shadow-xl px-5 py-4 flex flex-col gap-3"
        style={{
          background: glassBg,
          border: `1px solid ${glassBorder}`,
          backdropFilter: "blur(18px)",
        }}
      >
        {/* プレイヤー名 */}
        {trimmedName && (
          <div className={`text-sm font-semibold ${textSecondary}`}>{trimmedName}</div>
        )}
        {/* スロット結果：図柄並び */}
        <div className={`text-xl font-bold ${textPrimary} flex justify-center gap-2 flex-wrap`}>
          {reelLabels.length > 0 ? (
            reelLabels.map((label, i) => (
              <span key={i} className="tabular-nums">
                {label}
              </span>
            ))
          ) : (
            <span>—</span>
          )}
        </div>
        {/* 役の文言 */}
        <div className={`text-base font-bold text-center ${textPrimary}`}>{resultLine}</div>
        <div className={`text-xs text-center ${textMuted}`}>#だんごツール</div>
      </div>
    </div>
  );
}
