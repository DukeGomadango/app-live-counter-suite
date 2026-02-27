"use client";

import type { Player, GachaPool, RarityTier } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface GachaHistorySummaryProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
}

export default function GachaHistorySummary({ player, pool, isLightMode }: GachaHistorySummaryProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-500" : "text-white/65";

    const runsForPool = (player.runHistory ?? []).filter(r => r.poolId === pool.id);
    const totalPulls = runsForPool.reduce((sum, run) => sum + run.pullCount, 0);

    // 品目別累計
    const aggregate = new Map<string, { itemName: string; rarityId: string; count: number }>();
    for (const run of runsForPool) {
        for (const it of run.items) {
            const cur = aggregate.get(it.itemId) ?? { itemName: it.itemName, rarityId: it.rarityId, count: 0 };
            cur.count += it.count;
            aggregate.set(it.itemId, cur);
        }
    }

    const sortOrderMap = new Map(pool.rarities.map(r => [r.id, r.sortOrder]));
    const items = Array.from(aggregate.entries())
        .map(([itemId, v]) => ({ itemId, ...v }))
        .sort((a, b) => {
            const sa = sortOrderMap.get(a.rarityId) ?? 0;
            const sb = sortOrderMap.get(b.rarityId) ?? 0;
            if (sa !== sb) return sa - sb;
            return a.itemName.localeCompare(b.itemName);
        });

    const getRarity = (rarityId: string): RarityTier | undefined =>
        pool.rarities.find(r => r.id === rarityId);

    // レア度別累計
    const rarityTotals = new Map<string, number>();
    for (const value of aggregate.values()) {
        rarityTotals.set(value.rarityId, (rarityTotals.get(value.rarityId) ?? 0) + value.count);
    }

    const rarityStats = pool.rarities
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(r => {
            const count = rarityTotals.get(r.id) ?? 0;
            return {
                rarity: r,
                count,
                percentage: totalPulls > 0 ? (count / totalPulls) * 100 : 0,
            };
        })
        .filter(s => s.count > 0);

    // レア度ごとのコンプリート判定（このガチャの全品目を1つ以上引いているか）
    const completedRarityIds = pool.rarities
        .filter(r => {
            const itemsOfRarity = pool.items.filter(it => it.rarityId === r.id);
            if (itemsOfRarity.length === 0) return false;
            return itemsOfRarity.every(it => aggregate.has(it.id));
        })
        .map(r => r.id);

    if (runsForPool.length === 0) {
        return (
            <div
                className="flex-1 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: glassBg, border: `1px solid ${glassBorder}` }}
            >
                <p className={`text-sm ${textMuted}`}>まだ結果がありません</p>
            </div>
        );
    }

    return (
        <div
            className="flex-1 rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
        >
            <div className="flex flex-col gap-1">
                <div className={`text-xs font-semibold ${textSecondary}`}>累計結果（このガチャ）</div>
                <div className={`text-sm font-bold ${textPrimary}`}>
                    {player.name}: {totalPulls.toLocaleString()}連
                </div>
                {pool.pityEnabled && (
                    <div className={`text-[10px] ${textMuted}`}>
                        現在の天井カウント: {player.pityCounter} / {pool.pityThreshold}
                    </div>
                )}
            </div>

            {/* レア度別集計バー */}
            {rarityStats.length > 0 && (
                <div className="mt-1">
                    <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)" }}>
                        {rarityStats.map(stat => (
                            <div
                                key={stat.rarity.id}
                                className="h-full"
                                style={{ width: `${stat.percentage}%`, background: stat.rarity.color }}
                                title={`${stat.rarity.name}: ${stat.count}個 (${stat.percentage.toFixed(1)}%)`}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {rarityStats.map(stat => (
                            <span key={stat.rarity.id} className="text-[10px] flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: stat.rarity.color }} />
                                <span style={{ color: stat.rarity.color }} className="font-bold">{stat.rarity.name}</span>
                                <span className={textMuted}>{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                            </span>
                        ))}
                    </div>

                    {/* コンプリート済みレア度バッジ */}
                    {completedRarityIds.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {rarityStats
                                .filter(stat => completedRarityIds.includes(stat.rarity.id))
                                .map(stat => (
                                    <span
                                        key={stat.rarity.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                        style={{
                                            color: "#fbbf24",
                                            border: "1px solid rgba(251,191,36,0.8)",
                                            background:
                                                "radial-gradient(circle at 0% 0%, rgba(253,224,71,0.35), transparent 60%), rgba(0,0,0,0.25)",
                                            boxShadow: "0 0 6px rgba(251,191,36,0.6)",
                                        }}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full inline-block"
                                            style={{ background: stat.rarity.color }}
                                        />
                                        <span>{stat.rarity.name}</span>
                                        <span className="tracking-widest">COMPLETE!!</span>
                                    </span>
                                ))}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch mt-2">
                <div className="flex flex-col gap-1">
                    {items.map(item => {
                        const rarity = getRarity(item.rarityId);
                        return (
                            <div
                                key={item.itemId}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                                style={{
                                    background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)",
                                    borderLeft: `3px solid ${rarity?.color || "#666"}`,
                                }}
                            >
                                <span
                                    className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                    style={{ color: rarity?.color, background: rarity?.bgColor }}
                                >
                                    {rarity?.name || "?"}
                                </span>
                                <span className={`text-sm flex-1 ${textPrimary}`}>{item.itemName}</span>
                                <span className={`text-sm font-bold tabular-nums ${textPrimary}`}>
                                    ×{item.count.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

