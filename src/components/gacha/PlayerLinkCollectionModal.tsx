"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { X, ExternalLink, Copy, Check, Music } from "lucide-react";
import type { Player, GachaPool, IntegrationConfig } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { isLocalUrl, getGachaFile } from "@/lib/gachaFileStore";
import { issueClaimForPlayer } from "@/lib/gachaDistribution";
import EmojiGlyph from "@/components/icons/EmojiGlyph";

/** 1行分のコピー用テキスト（項目名 + 種別 + リンク）。local:// は「ローカル登録」と表記 */
function formatLine(item: { name: string; link: string; kindLabel: string }): string {
    const linkDisplay = isLocalUrl(item.link) ? "ローカル登録" : item.link;
    return `${item.name} (${item.kindLabel})\t${linkDisplay}`;
}

interface PlayerLinkCollectionModalProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
    integrationConfig?: IntegrationConfig;
    onUpdatePlayers?: (updater: (prev: Player[]) => Player[]) => void;
    onClose: () => void;
}

/** プレイヤーがこのガチャで獲得した品目のうち、リンクが設定されているものを一覧表示 */
export default function PlayerLinkCollectionModal({
    player,
    pool,
    isLightMode,
    integrationConfig,
    onUpdatePlayers,
    onClose,
}: PlayerLinkCollectionModalProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    // このガチャの履歴から獲得品目を集計し、imageUrl/audioUrl が設定されているものを抽出（1URL＝1行）
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
        type Row = { itemId: string; name: string; rarityId: string; link: string; kindLabel: string };
        const result: Row[] = [];
        for (const itemId of itemIds) {
            const poolItem = pool.items.find((i) => i.id === itemId);
            if (!poolItem) continue;
            const info = itemInfo.get(itemId);
            const name = info?.name ?? poolItem.name;
            const rarityId = info?.rarityId ?? poolItem.rarityId;
            if (poolItem.imageUrl?.trim()) {
                result.push({ itemId: `${itemId}-image`, name, rarityId, link: poolItem.imageUrl.trim(), kindLabel: "画像" });
            }
            if (poolItem.audioUrl?.trim()) {
                result.push({ itemId: `${itemId}-audio`, name, rarityId, link: poolItem.audioUrl.trim(), kindLabel: "音声" });
            }
        }
        const sortOrderMap = new Map(pool.rarities.map((r) => [r.id, r.sortOrder]));
        result.sort(
            (a, b) =>
                (sortOrderMap.get(a.rarityId) ?? 0) - (sortOrderMap.get(b.rarityId) ?? 0) ||
                a.name.localeCompare(b.name) ||
                a.kindLabel.localeCompare(b.kindLabel)
        );
        return result;
    }, [player.runHistory, pool.id, pool.items, pool.rarities]);

    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [localPreviewUrls, setLocalPreviewUrls] = useState<Record<string, string>>({});
    const localPreviewUrlRef = useRef<Record<string, string>>({});

    // local:// の品目について IndexedDB から Blob を取得しプレビュー用 URL を生成
    useEffect(() => {
        const localItems = linkItems.filter((i) => isLocalUrl(i.link));
        if (localItems.length === 0) {
            setLocalPreviewUrls((prev) => {
                Object.values(prev).forEach(URL.revokeObjectURL);
                localPreviewUrlRef.current = {};
                return {};
            });
            return;
        }
        let cancelled = false;
        const next: Record<string, string> = {};
        (async () => {
            for (const item of localItems) {
                if (cancelled) break;
                try {
                    const blob = await getGachaFile(item.link);
                    if (blob && item.kindLabel === "画像" && blob.type.startsWith("image/")) {
                        next[item.itemId] = URL.createObjectURL(blob);
                    }
                } catch {
                    // ignore
                }
            }
            if (!cancelled) {
                setLocalPreviewUrls((prev) => {
                    Object.values(prev).forEach(URL.revokeObjectURL);
                    localPreviewUrlRef.current = next;
                    return next;
                });
            } else {
                Object.values(next).forEach(URL.revokeObjectURL);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [linkItems]);

    // アンマウント時にローカルプレビュー URL を破棄
    useEffect(() => {
        return () => {
            Object.values(localPreviewUrlRef.current).forEach(URL.revokeObjectURL);
            localPreviewUrlRef.current = {};
        };
    }, []);

    const copyAllText = useMemo(
        () => linkItems.map((item) => formatLine(item)).join("\n"),
        [linkItems]
    );

    const handleCopyAll = useCallback(async () => {
        if (linkItems.length === 0) return;
        try {
            await navigator.clipboard.writeText(copyAllText);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        } catch {
            // fallback or ignore
        }
    }, [copyAllText, linkItems.length]);

    const handleCopyRow = useCallback(async (item: { itemId: string; name: string; link: string; kindLabel: string }) => {
        try {
            await navigator.clipboard.writeText(formatLine(item));
            setCopiedId(item.itemId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // ignore
        }
    }, []);

    const [isIssuing, setIsIssuing] = useState(false);
    const [issueError, setIssueError] = useState<string | null>(null);

    const handleIssueClaim = useCallback(async () => {
        if (!integrationConfig || !onUpdatePlayers) return;
        setIsIssuing(true);
        setIssueError(null);
        try {
            const res = await issueClaimForPlayer(player, pool, integrationConfig);
            if (res.ok && res.claim_url) {
                const campaignId = pool.linkedCampaignId;
                onUpdatePlayers(prev => prev.map(p => p.id === player.id ? { ...p, issuedClaimUrl: res.claim_url, issuedCampaignId: campaignId } : p));
            } else {
                setIssueError(res.error || "発行に失敗しました");
            }
        } catch (e) {
            setIssueError(e instanceof Error ? e.message : "通信エラーが発生しました");
        } finally {
            setIsIssuing(false);
        }
    }, [integrationConfig, onUpdatePlayers, player, pool]);

    const isIntegrationActive = !!integrationConfig?.integrationToken && !!pool.linkedCampaignId;

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
                <div className="flex items-center justify-between gap-2 px-4 py-3 shrink-0 border-b" style={{ borderColor: glassBorder }}>
                    <h2 id="link-collection-title" className={`text-sm font-bold truncate min-w-0 ${textPrimary}`}>
                        {player.name} — 配布・リンク集
                    </h2>
                    <div className="flex items-center gap-1 shrink-0">
                        {linkItems.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopyAll}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isLightMode ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"}`}
                                title="項目+リンクをすべてコピー（タブ区切り・改行区切り）"
                            >
                                {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedAll ? "コピーした" : "すべてコピー"}</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                            aria-label="閉じる"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* API連携配布エリア */}
                    {isIntegrationActive && (
                        <div className="p-4 border-b shrink-0" style={{ borderColor: glassBorder, background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)" }}>
                            <h3 className={`text-xs font-bold ${textPrimary} mb-3 flex items-center gap-1`}>
                                <EmojiGlyph emoji="🎁" size={14} /> dango link share で配布
                            </h3>
                            {player.issuedClaimUrl && player.issuedCampaignId === pool.linkedCampaignId ? (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                        <EmojiGlyph emoji="✅" size={12} /> 配布URLを発行済みです
                                    </span>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={player.issuedClaimUrl}
                                            className={`flex-1 text-xs px-2 py-1.5 rounded-lg outline-none ${textPrimary}`}
                                            style={{ background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: `1px solid ${glassBorder}` }}
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(player.issuedClaimUrl!)}
                                            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors whitespace-nowrap"
                                        >
                                            コピー
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <p className={`text-[10px] ${textMuted}`}>
                                        このプレイヤーに割り当てる受取人URL（Claim）を発行します。
                                    </p>
                                    <button
                                        onClick={handleIssueClaim}
                                        disabled={isIssuing}
                                        className="w-full py-2 px-3 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <EmojiGlyph emoji="🌐" size={16} />
                                        {isIssuing ? "発行中..." : "配布URLを発行"}
                                    </button>
                                    {issueError && (
                                        <p className="text-[10px] text-red-500">{issueError}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ローカルリンク集エリア */}
                    <div className="flex-1 overflow-y-auto scroll-touch p-4">
                        <h3 className={`text-xs font-bold ${textPrimary} mb-3 flex items-center gap-1`}>
                            <EmojiGlyph emoji="📂" size={14} /> 獲得品目 (ローカル・個別リンク)
                        </h3>
                        {linkItems.length === 0 ? (
                            <p className={`text-xs ${textMuted}`}>
                                このガチャで獲得した品目に画像URL・音声URLが設定されているものはありません。
                            </p>
                        ) : (
                        <ul className="flex flex-col gap-2">
                            {linkItems.map((item) => {
                                const rarity = pool.rarities.find((r) => r.id === item.rarityId);
                                const rowCopied = copiedId === item.itemId;
                                return (
                                    <li key={item.itemId}>
                                        <div
                                            className={`flex items-center gap-2 p-3 rounded-xl transition-colors ${isLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`}
                                            style={{ border: `1px solid ${glassBorder}` }}
                                        >
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                                style={{ color: rarity?.color, background: rarity?.bgColor }}
                                            >
                                                {rarity?.name ?? "?"}
                                            </span>
                                            {localPreviewUrls[item.itemId] && item.kindLabel === "画像" ? (
                                                // eslint-disable-next-line @next/next/no-img-element -- ローカルプレビュー用データURLのため img を使用
                                                <img
                                                    src={localPreviewUrls[item.itemId]}
                                                    alt={`${item.name ?? "アイテム"}のプレビュー`}
                                                    className="w-8 h-8 rounded object-cover shrink-0"
                                                />
                                            ) : isLocalUrl(item.link) && item.kindLabel === "音声" ? (
                                                <Music size={16} className={`shrink-0 ${textMuted}`} aria-hidden />
                                            ) : null}
                                            {isLocalUrl(item.link) ? (
                                                <span className={`flex-1 text-sm truncate min-w-0 ${textPrimary}`}>
                                                    {item.name} <span className="text-[10px] opacity-80">({item.kindLabel}) ローカル登録</span>
                                                </span>
                                            ) : (
                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex-1 text-sm truncate min-w-0 ${textPrimary} hover:underline`}
                                                >
                                                    {item.name} <span className="text-[10px] opacity-80">({item.kindLabel})</span>
                                                </a>
                                            )}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); handleCopyRow(item); }}
                                                    className={`p-1.5 rounded-lg transition-colors ${rowCopied ? "text-green-500" : isLightMode ? "text-gray-500 hover:bg-gray-200 hover:text-gray-700" : "text-white/60 hover:bg-white/10 hover:text-white/90"}`}
                                                    title="項目+リンクをコピー"
                                                    aria-label="この行をコピー"
                                                >
                                                    {rowCopied ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                                {!isLocalUrl(item.link) && (
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`p-1.5 rounded-lg transition-colors ${isLightMode ? "text-gray-500 hover:bg-gray-200" : "text-white/60 hover:bg-white/10"}`}
                                                        title="リンクを開く"
                                                        aria-label="リンクを開く"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    </>
);
}
