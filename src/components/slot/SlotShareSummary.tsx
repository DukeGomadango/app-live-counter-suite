"use client";

import { useGlassStyle } from "@/hooks/useGlassStyle";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import GenericShareCard from "@/components/GenericShareCard";

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
    <GenericShareCard isLightMode={isLightMode} maxWidth="max-w-sm">
      {/* プレイヤー名 */}
      {trimmedName && (
        <div className={`text-sm font-semibold ${textSecondary}`}>{trimmedName}</div>
      )}
      {/* スロット結果：図柄並び */}
      <div className={`text-xl font-bold ${textPrimary} flex justify-center gap-2 flex-wrap`}>
        {reelLabels.length > 0 ? (
          reelLabels.map((label, i) => (
            <span key={i} className="tabular-nums inline-flex items-center justify-center">
              <EmojiGlyph emoji={label} size={22} />
            </span>
          ))
        ) : (
          <span>—</span>
        )}
      </div>
      {/* 役の文言 */}
      <div className={`text-base font-bold text-center ${textPrimary}`}>{resultLine}</div>
      <div className={`text-xs text-center ${textMuted}`}>#だんごツール</div>
    </GenericShareCard>
  );
}
