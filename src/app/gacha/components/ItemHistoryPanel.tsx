"use client";

import React, { useMemo } from "react";
import { Package } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { type Player, type GachaPool } from "@/lib/gacha";

interface ItemHistoryPanelProps {
  players: Player[];
  pool: GachaPool;
  isLightMode: boolean;
  textContrastLight?: boolean;
}

export function ItemHistoryPanel({
  players,
  pool,
  isLightMode,
  textContrastLight = false,
}: ItemHistoryPanelProps) {
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textLight = isLightMode || textContrastLight;
  const textPrimary = textLight ? "text-gray-900" : "text-white/95";
  const textSecondary = textLight ? "text-gray-800" : "text-white/75";
  const textMuted = textLight ? "text-gray-700" : "text-white/65";

  // 品目→プレイヤー別排出数（このガチャの履歴のみ）
  const itemPlayerMap = useMemo(() => {
    const map = new Map<string, { itemName: string; rarityId: string; players: Map<string, number> }>();

    for (const player of (players || [])) {
      const runs = (player.runHistory ?? []).filter((r) => r.poolId === pool.id);
      for (const run of runs) {
        for (const it of run.items) {
          if (!map.has(it.itemId)) {
            map.set(it.itemId, { itemName: it.itemName, rarityId: it.rarityId, players: new Map() });
          }
          const entry = map.get(it.itemId)!;
          entry.players.set(player.id, (entry.players.get(player.id) || 0) + it.count);
        }
      }
    }

    // ソート: レア度順 → 名前順
    const sortOrderMap = new Map(pool.rarities.map(r => [r.id, r.sortOrder]));
    return Array.from(map.entries())
      .sort(([, a], [, b]) =>
        (sortOrderMap.get(b.rarityId) || 0) - (sortOrderMap.get(a.rarityId) || 0)
        || a.itemName.localeCompare(b.itemName)
      );
  }, [players, pool.id, pool.rarities]);

  if ((players || []).length === 0 || itemPlayerMap.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Package size={24} className={textMuted} />
        <p className={`text-xs mt-2 ${textMuted}`}>まだ排出履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pr-1 pb-4">
      <div className={`px-2 py-1.5 ${textSecondary}`}>
        <span className="text-[10px] font-bold uppercase tracking-wider">
          排出品目別 — {itemPlayerMap.length}種類
        </span>
      </div>
      {itemPlayerMap.map(([itemId, data]) => {
        const rarity = pool.rarities.find(r => r.id === data.rarityId);
        const totalCount = Array.from(data.players.values()).reduce((s, c) => s + c, 0);
        return (
          <div
            key={itemId}
            className="rounded-xl p-3"
            style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
          >
            {/* 品目ヘッダー */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ color: rarity?.color, background: rarity?.bgColor }}
              >
                {rarity?.name || "?"}
              </span>
              <span className={`text-xs font-medium flex-1 truncate ${textPrimary}`}>{data.itemName}</span>
              <span className={`text-[10px] ${textMuted}`}>計{totalCount}</span>
            </div>
            {/* プレイヤー別 */}
            <div className="flex flex-col gap-1">
              {Array.from(data.players.entries())
                .sort(([, a], [, b]) => b - a)
                .map(([playerId, count]) => {
                  const player = players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} className="flex items-center justify-between">
                      <span className={`text-[11px] ${textSecondary}`}>
                        {player?.name || "不明"}
                      </span>
                      <span className={`text-[11px] font-bold tabular-nums ${textPrimary}`}>
                        ×{count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
