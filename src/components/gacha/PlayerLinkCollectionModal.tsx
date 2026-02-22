"use client";

import { useMemo } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Player, GachaPool } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface PlayerLinkCollectionModalProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
    onClose: () => void;
}

/** プレイヤーがこのガチャで獲得した品目のうち、リンクが設定されているものを一覧表示 */
export default function PlayerLinkCollectionModal({
    player,
    pool,
    isLightMode,
    onClose,
}: PlayerLinkCollectionModalProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    // このガチャの履歴から獲得品目を集計し、リンクが設定されているものだけ抽出
    const linkItems = useMemo(() => {
        const runs = (player.runHistory ?? []).filter((r) => r.poolId === pool.id);
        const itemIds = new Set<string>();
        const itemInfo = new Map<string, { name: string; rarityId: string }>();
        for (const run of runs) {
            for (const it of run.items) {
                itemIds.add(it.itemId);
                if (!itemInfo.has(it.itemId)) itemInfo.set(it.itemId, { name: it.itemName, rarityId: it.rarityId });
            }
        }
        const result: { itemId: string; name: string; rarityId: string; link: string }[] = [];
        for (const itemId of itemIds) {
            const poolItem = pool.items.find((i) => i.id === itemId);
            if (poolItem?.link) {
                const info = itemInfo.get(itemId);
                result.push({
                    itemId,
                    name: info?.name ?? poolItem.name,
                    rarityId: info?.rarityId ?? poolItem.rarityId,
                    link: poolItem.link,
                });
            }
        }
        const sortOrderMap = new Map(pool.rarities.map((r) => [r.id, r.sortOrder]));
        result.sort(
            (a, b) =>
                (sortOrderMap.get(a.rarityId) ?? 0) - (sortOrderMap.get(b.rarityId) ?? 0) ||
                a.name.localeCompare(b.name)
        );
        return result;
    }, [player.runHistory, pool.id, pool.items, pool.rarities]);

    return (
        <>
            <div
                className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div
                className="fixed left-1/2 top-1/2 z-[71] w-[min(90vw,400px)] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                style={{ transform: "translate(-50%, -50%)", background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
                role="dialog"
                aria-labelledby="link-collection-title"
            >
                <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b" style={{ borderColor: glassBorder }}>
                    <h2 id="link-collection-title" className={`text-sm font-bold ${textPrimary}`}>
                        {player.name} — リンク集
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                        aria-label="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {linkItems.length === 0 ? (
                        <p className={`text-xs ${textMuted}`}>
                            このガチャで獲得した品目にリンクが設定されているものはありません。設定タブで品目にURLを設定してください。
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {linkItems.map((item) => {
                                const rarity = pool.rarities.find((r) => r.id === item.rarityId);
                                return (
                                    <li key={item.itemId}>
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-2 p-3 rounded-xl transition-colors ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}
                                            style={{ border: `1px solid ${glassBorder}` }}
                                        >
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                                style={{ color: rarity?.color, background: rarity?.bgColor }}
                                            >
                                                {rarity?.name ?? "?"}
                                            </span>
                                            <span className={`flex-1 text-sm truncate ${textPrimary}`}>{item.name}</span>
                                            <ExternalLink size={14} className={`shrink-0 ${textSecondary}`} />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
