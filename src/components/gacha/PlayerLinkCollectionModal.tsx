"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink, Copy, RefreshCw } from "lucide-react";
import type { Player, GachaPool, IntegrationConfig } from "@/lib/gacha";
import {
    buildGachaPlayerExternalTransactionId,
    buildLinkShareCampaignUrl,
    fetchExternalRecipients,
    getPlayerDistributionStats,
    type ExternalRegistryRecipient,
    type RecipientSlotLinkStatus,
} from "@/lib/gachaDistribution";
import {
    getGachaIntegrationReadiness,
    isGachaDistributionReady,
    mergeDistributionPool,
} from "@/lib/gachaIntegration";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import { useToast } from "@/components/Toast";
import GachaIntegrationSetupPrompt from "@/components/gacha/GachaIntegrationSetupPrompt";

interface PlayerLinkCollectionModalProps {
    player: Player;
    pool: GachaPool;
    /** 履歴表示時など。配布用 pool の linkedCampaignId 補完に使う */
    activePool?: GachaPool;
    isLightMode: boolean;
    integrationEnabled?: boolean;
    integrationConfig?: IntegrationConfig;
    linkStatus?: RecipientSlotLinkStatus;
    onLinkedRecipientChange?: (recipientId: string | null) => void;
    onResync?: () => void;
    onNavigateToDistribution?: () => void;
    onClose: () => void;
}

/** プレイヤーに景品を配布するためのモーダル（Dango Link Share 連携・管理画面への橋渡し） */
export default function PlayerLinkCollectionModal({
    player,
    pool,
    activePool,
    isLightMode,
    integrationEnabled = false,
    integrationConfig,
    linkStatus,
    onLinkedRecipientChange,
    onResync,
    onNavigateToDistribution,
    onClose,
}: PlayerLinkCollectionModalProps) {
    const { showToast } = useToast();
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    const distributionPool = useMemo(
        () => mergeDistributionPool(activePool ?? pool, pool),
        [activePool, pool]
    );

    const readiness = useMemo(
        () =>
            getGachaIntegrationReadiness(
                integrationEnabled,
                integrationConfig,
                distributionPool
            ),
        [integrationEnabled, integrationConfig, distributionPool]
    );

    const isIntegrationActive = isGachaDistributionReady(
        integrationEnabled,
        integrationConfig,
        distributionPool
    );

    const [registry, setRegistry] = useState<ExternalRegistryRecipient[]>([]);
    const [registryLoading, setRegistryLoading] = useState(false);
    const [selectedRegistryId, setSelectedRegistryId] = useState(
        player.linkedRecipientId ?? ""
    );

    const externalTxId = buildGachaPlayerExternalTransactionId(distributionPool.id, player.id);
    const distStats = isIntegrationActive ? getPlayerDistributionStats(player, distributionPool) : null;

    const dashboardUrl =
        isIntegrationActive && distributionPool.linkedCampaignId && integrationConfig
            ? buildLinkShareCampaignUrl(integrationConfig, distributionPool.linkedCampaignId, {
                  focusExternalTx:
                      linkStatus === "missing" ? externalTxId : undefined,
              })
            : null;

    useEffect(() => {
        if (!isIntegrationActive || !onLinkedRecipientChange || !integrationConfig) return;
        let cancelled = false;
        void (async () => {
            setRegistryLoading(true);
            try {
                const list = await fetchExternalRecipients(integrationConfig);
                if (!cancelled) setRegistry(list);
            } finally {
                if (!cancelled) setRegistryLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isIntegrationActive, integrationConfig, onLinkedRecipientChange]);

    const handleCopyUrl = () => {
        if (player.issuedClaimUrl) {
            navigator.clipboard.writeText(player.issuedClaimUrl);
            showToast("URLをコピーしました", "success");
        }
    };

    const applyRegistryLink = () => {
        if (!onLinkedRecipientChange) return;
        onLinkedRecipientChange(selectedRegistryId || null);
        showToast(
            selectedRegistryId ? "受取人名簿に紐づけました" : "名簿の紐づけを解除しました",
            "success"
        );
    };

    const handleOpenDistribution = () => {
        onNavigateToDistribution?.();
        onClose();
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div
                className="fixed left-1/2 top-1/2 z-[71] w-[min(90vw,400px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    transform: "translate(-50%, -50%)",
                    background: glassBg,
                    border: `1px solid ${glassBorder}`,
                    backdropFilter: "blur(12px)",
                }}
                role="dialog"
                aria-labelledby="link-collection-title"
            >
                <div
                    className="flex items-center justify-between gap-2 px-4 py-3 shrink-0 border-b"
                    style={{ borderColor: glassBorder }}
                >
                    <h2 id="link-collection-title" className={`text-sm font-bold truncate min-w-0 ${textPrimary}`}>
                        {player.name} — 配布
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                        aria-label="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                    {isIntegrationActive && integrationConfig ? (
                        <div className="flex flex-col gap-4">
                            <div
                                className={`p-3 rounded-xl text-[10px] leading-relaxed border ${isLightMode ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/30 text-amber-100"}`}
                            >
                                <strong>推奨運用:</strong> 受取人名簿からキャンペーンに追加し、ガチャでできた枠と重なった場合は管理画面で<strong>マージ</strong>してください。人物の統合はリンクシェア側で行い、ツールは配布内容の同期を担当します。
                            </div>

                            {linkStatus === "missing" && (
                                <div
                                    className={`p-3 rounded-xl border space-y-2 ${isLightMode ? "bg-amber-50/80 border-amber-300" : "bg-amber-500/15 border-amber-500/35"}`}
                                >
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                        配布URLはローカルに残っていますが、リンクシェア側の枠がありません。同じ名前の受取人が2つある場合は、管理画面で<strong>統合（マージ）</strong>してください。
                                    </p>
                                    <p className={`text-[9px] font-mono break-all ${textMuted}`}>
                                        ID: {externalTxId}
                                    </p>
                                    {dashboardUrl ? (
                                        <a
                                            href={dashboardUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={14} />
                                            マージのために管理画面を開く
                                        </a>
                                    ) : null}
                                </div>
                            )}

                            {onLinkedRecipientChange && (
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
                                        受取人名簿（任意）
                                    </label>
                                    <select
                                        value={selectedRegistryId}
                                        onChange={(e) => setSelectedRegistryId(e.target.value)}
                                        disabled={registryLoading}
                                        className={`w-full px-3 py-2 rounded-lg text-sm border ${isLightMode ? "bg-white border-gray-200" : "bg-white/5 border-white/10 text-white"}`}
                                    >
                                        <option value="">— 名簿に紐づけない —</option>
                                        {registry.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={applyRegistryLink}
                                        className={`w-full py-2 rounded-lg text-xs font-bold ${isLightMode ? "bg-gray-100 hover:bg-gray-200 text-gray-800" : "bg-white/10 hover:bg-white/15 text-white/90"}`}
                                    >
                                        名簿の紐づけを反映して同期
                                    </button>
                                </div>
                            )}

                            <a
                                href={dashboardUrl || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                            >
                                <ExternalLink size={16} />
                                管理画面で確認する
                            </a>

                            {distStats && distStats.totalWinCount > 0 && (
                                <p
                                    className={`text-[10px] px-1 leading-relaxed ${distStats.assetCount === 0 ? "text-amber-600 dark:text-amber-400" : textMuted}`}
                                >
                                    リンクシェアへ送る配布ファイル: {distStats.assetCount}件
                                    {distStats.mappedWinCount < distStats.totalWinCount &&
                                        `（当選${distStats.totalWinCount}回のうち、ファイル未紐づけの品目があります）`}
                                </p>
                            )}

                            {onResync && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onResync();
                                        showToast("リンクシェアへ再同期しました", "success");
                                    }}
                                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border ${isLightMode ? "border-gray-200 hover:bg-gray-50" : "border-white/15 hover:bg-white/10"}`}
                                >
                                    <RefreshCw size={14} />
                                    配布を再同期
                                </button>
                            )}

                            {player.issuedClaimUrl &&
                                player.issuedCampaignId === distributionPool.linkedCampaignId && (
                                <div
                                    className={`p-3 rounded-xl border flex flex-col gap-2 ${isLightMode ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                            <EmojiGlyph emoji="✅" size={12} />
                                            {linkStatus === "linked" ? "配布リンク確認済み" : "配布URL（ローカル保持）"}
                                        </span>
                                        <button
                                            onClick={handleCopyUrl}
                                            className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${textMuted}`}
                                            title="URLをコピー"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    <div className={`text-[10px] font-mono truncate px-2 py-1 rounded bg-black/20 ${textMuted}`}>
                                        {player.issuedClaimUrl}
                                    </div>
                                </div>
                            )}

                            <p className={`text-[9px] ${textMuted} text-center leading-relaxed`}>
                                ※受取人は「{player.name}」として同期されます。
                                <br />
                                複数回ガチャを回した場合も、同一の冪等キーで最新の景品が配布されます。
                            </p>
                        </div>
                    ) : (
                        <GachaIntegrationSetupPrompt
                            readiness={readiness}
                            isLightMode={isLightMode}
                            onOpenDistribution={onNavigateToDistribution ? handleOpenDistribution : undefined}
                        />
                    )}
                </div>

                <div className="px-4 py-3 border-t shrink-0 flex justify-end" style={{ borderColor: glassBorder }}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isLightMode ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </>
    );
}
