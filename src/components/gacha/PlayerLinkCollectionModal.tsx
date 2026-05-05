"use client";

import { X, ExternalLink, Copy } from "lucide-react";
import type { Player, GachaPool, IntegrationConfig } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import EmojiGlyph from "@/components/icons/EmojiGlyph";
import { useToast } from "@/components/Toast";

interface PlayerLinkCollectionModalProps {
    player: Player;
    pool: GachaPool;
    isLightMode: boolean;
    integrationConfig?: IntegrationConfig;
    onClose: () => void;
}

/** プレイヤーに景品を配布するためのモーダル（Dango Link Share 連携・管理画面への橋渡し） */
export default function PlayerLinkCollectionModal({
    player,
    pool,
    isLightMode,
    integrationConfig,
    onClose,
}: PlayerLinkCollectionModalProps) {
    const { showToast } = useToast();
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    const isIntegrationActive = !!integrationConfig?.integrationToken && !!pool.linkedCampaignId;
    
    // 管理画面（キャンペーン詳細）へのURL
    const dashboardUrl = isIntegrationActive 
        ? `${integrationConfig.apiBaseUrl}/campaigns/${pool.linkedCampaignId}`
        : null;

    const handleCopyUrl = () => {
        if (player.issuedClaimUrl) {
            navigator.clipboard.writeText(player.issuedClaimUrl);
            showToast("URLをコピーしました", "success");
        }
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
                style={{ transform: "translate(-50%, -50%)", background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
                role="dialog"
                aria-labelledby="link-collection-title"
            >
                <div className="flex items-center justify-between gap-2 px-4 py-3 shrink-0 border-b" style={{ borderColor: glassBorder }}>
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
                
                <div className="p-4 flex flex-col gap-4">
                    {isIntegrationActive ? (
                        <div className="flex flex-col gap-5">
                            <div className="space-y-2">
                                <h3 className={`text-[10px] font-bold uppercase tracking-wider ${textMuted} flex items-center gap-1.5`}>
                                    <EmojiGlyph emoji="🔗" size={12} /> Dango Share 連携
                                </h3>
                                <p className={`text-[11px] leading-relaxed ${textPrimary}`}>
                                    抽選結果は自動的に Dango Share と同期されています。配布の管理やURLの発行は管理画面で行えます。
                                </p>
                            </div>

                            <a
                                href={dashboardUrl || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                            >
                                <ExternalLink size={16} />
                                管理画面で確認する
                            </a>

                            {player.issuedClaimUrl && player.issuedCampaignId === pool.linkedCampaignId && (
                                <div className={`p-3 rounded-xl border flex flex-col gap-2 ${isLightMode ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                            <EmojiGlyph emoji="✅" size={12} /> 配布URL取得済み
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
                                ※受取人は「{player.name}」として登録されています。<br />
                                複数回ガチャを回した場合も、同一のURLで最新の景品が配布されます。
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <EmojiGlyph emoji="⚠️" size={24} />
                            <div className="space-y-1">
                                <p className={`text-xs font-bold ${textPrimary}`}>連携が設定されていません</p>
                                <p className={`text-[10px] ${textMuted} leading-relaxed`}>
                                    景品を配布するには、先に「設定」タブから<br />
                                    dango link share との連携を行ってください。
                                </p>
                            </div>
                        </div>
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
