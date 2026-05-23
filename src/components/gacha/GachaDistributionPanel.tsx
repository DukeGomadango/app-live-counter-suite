"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiLink2, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { getPoolMappingStats, type AutoMappingSuggestion } from "@/lib/gachaDistribution";
import { useIntegrationConnectionState } from "@/app/gacha/hooks/useIntegrationConnectionState";
import { useGachaDistribution } from "@/app/gacha/hooks/useGachaDistribution";
import IntegrationReconnectBanner from "@/components/gacha/IntegrationReconnectBanner";
import type { GachaPool, IntegrationConfig, Player } from "@/lib/gacha";
import { distributionTheme } from "@/components/gacha/distribution/theme";
import GachaDistributionHeader from "@/components/gacha/distribution/GachaDistributionHeader";
import GachaDistributionAlerts from "@/components/gacha/distribution/GachaDistributionAlerts";
import GachaDistributionToolbar from "@/components/gacha/distribution/GachaDistributionToolbar";
import GachaDistributionTable from "@/components/gacha/distribution/GachaDistributionTable";
import AutoMatchPreviewModal from "@/components/gacha/distribution/AutoMatchPreviewModal";

interface GachaDistributionPanelProps {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    integrationConfig: IntegrationConfig;
    onIntegrationConfigChange: (config: IntegrationConfig) => void;
    players: Player[];
    isLightMode: boolean;
    focusItemId?: string | null;
    onNavigateToPlayers?: () => void;
}

export default function GachaDistributionPanel({
    pool,
    onPoolChange,
    integrationConfig,
    onIntegrationConfigChange,
    players,
    isLightMode,
    focusItemId,
    onNavigateToPlayers,
}: GachaDistributionPanelProps) {
    const theme = distributionTheme(isLightMode);
    const connectionState = useIntegrationConnectionState(integrationConfig, pool);
    const mappingStats = getPoolMappingStats(pool);

    const [workflowMode, setWorkflowMode] = useState<"tool" | "linkshare">("tool");
    const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
    const [autoMatchOpen, setAutoMatchOpen] = useState(false);
    const [autoMatchSuggestions, setAutoMatchSuggestions] = useState<AutoMappingSuggestion[]>([]);

    const dist = useGachaDistribution({
        pool,
        onPoolChange,
        integrationConfig,
        onIntegrationConfigChange,
        players,
    });

    const visibleItems = useMemo(() => {
        if (!dist.showUnmappedOnly) return pool.items;
        return pool.items.filter((it) => !it.linkedAssetId);
    }, [pool.items, dist.showUnmappedOnly]);

    const handleOAuthLogin = () => {
        const u = new URL(`${integrationConfig.apiBaseUrl}/settings/integrations/authorize`);
        u.searchParams.set("client_id", "dango-tools-gacha");
        u.searchParams.set("redirect_uri", window.location.origin + window.location.pathname);
        if (typeof window !== "undefined" && window.location.search) {
            u.searchParams.set("state", window.location.search);
        }
        window.location.href = u.toString();
    };

    const openAutoMatch = () => {
        setAutoMatchSuggestions(dist.getAutoMatchSuggestions());
        setAutoMatchOpen(true);
    };

    if (connectionState === "needs_reconnect") {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full max-w-lg mx-auto w-full gap-4">
                <IntegrationReconnectBanner
                    state={connectionState}
                    isLightMode={isLightMode}
                    variant="full"
                    onReconnectClick={handleOAuthLogin}
                />
            </div>
        );
    }

    if (!integrationConfig.integrationToken) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <FiLink2 className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${theme.textPrimary}`}>だんごシェアリンクとの連携</h3>
                <p className={`max-w-md mb-8 ${theme.textSecondary}`}>
                    だんごシェアリンクと連携すると、ガチャの景品としてデジタルファイルを自動配布できます。
                </p>
                <button
                    type="button"
                    onClick={handleOAuthLogin}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <FiExternalLink />
                    <span>連携を開始する</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden min-h-[280px]">
            <GachaDistributionHeader
                pool={pool}
                campaigns={dist.campaigns}
                mappingStats={mappingStats}
                isCreating={dist.isCreating}
                syncing={dist.syncing}
                theme={theme}
                onCampaignChange={(id) => void dist.handleCampaignChange(id)}
                onCreateCampaign={() => void dist.handleCreateCampaign()}
                onImportFromLinkShare={() => void dist.handleImportFromLinkShare()}
                onOpenManagement={() => {
                    if (pool.linkedCampaignId) {
                        window.open(
                            `${integrationConfig.apiBaseUrl}/campaigns/${pool.linkedCampaignId}`,
                            "_blank",
                            "noopener,noreferrer"
                        );
                    }
                }}
                onDisconnect={() => void dist.handleDisconnect()}
            />

            <div className="flex-1 overflow-auto p-4 sm:p-6">
                <IntegrationReconnectBanner
                    state={connectionState}
                    isLightMode={isLightMode}
                    variant="compact"
                    onReconnectClick={handleOAuthLogin}
                />

                <GachaDistributionAlerts
                    hasCampaign={!!pool.linkedCampaignId}
                    mappingStats={mappingStats}
                    workflowMode={workflowMode}
                    onWorkflowModeChange={setWorkflowMode}
                    onNavigateToPlayers={onNavigateToPlayers}
                    theme={theme}
                    isLightMode={isLightMode}
                />

                {!pool.linkedCampaignId ? (
                    <div className={`flex flex-col items-center justify-center py-16 text-center opacity-60 ${theme.textSecondary}`}>
                        <FiSearch className="w-12 h-12 mb-4" />
                        <p>上部で配布キャンペーンを選択してください</p>
                    </div>
                ) : (
                    <>
                        <GachaDistributionToolbar
                            theme={theme}
                            showUnmappedOnly={dist.showUnmappedOnly}
                            onToggleUnmappedOnly={() => dist.setShowUnmappedOnly((v) => !v)}
                            onRefreshAssets={() => void dist.refreshAssets()}
                            refreshingAssets={dist.refreshingAssets}
                            onAutoMatch={openAutoMatch}
                            onBulkUpload={(files) => void dist.bulkUploadFiles(files)}
                            showAutoMatch={workflowMode === "tool"}
                            syncing={dist.syncing}
                        />

                        {visibleItems.length === 0 ? (
                            <p className={`text-sm text-center py-8 ${theme.textSecondary}`}>
                                {dist.showUnmappedOnly ? "未紐づけの品目はありません" : "品目がありません。設定タブで品目を追加してください。"}
                            </p>
                        ) : (
                            <GachaDistributionTable
                                pool={pool}
                                items={visibleItems}
                                assets={dist.assets}
                                mapping={dist.mapping}
                                uploads={dist.uploads}
                                dragOverItemId={dragOverItemId}
                                focusItemId={focusItemId}
                                theme={theme}
                                onMappingChange={dist.handleMappingChange}
                                onFileSelect={(itemId, file) => void dist.handleFileChange(itemId, file)}
                                onDragOverItem={setDragOverItemId}
                                onDragLeaveItem={() => setDragOverItemId(null)}
                                onDropOnItem={(itemId, files) => {
                                    setDragOverItemId(null);
                                    if (files.length > 1) {
                                        void dist.bulkUploadFiles(files);
                                        return;
                                    }
                                    const file = files[0];
                                    if (file) void dist.handleFileChange(itemId, file);
                                }}
                            />
                        )}
                    </>
                )}
            </div>

            <AnimatePresence>
                {dist.syncing && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="p-3 bg-purple-600 text-white flex items-center justify-center gap-3 text-sm font-bold shrink-0"
                    >
                        <FiRefreshCw className="animate-spin" />
                        <span>だんごシェアリンクへ同期中...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AutoMatchPreviewModal
                open={autoMatchOpen}
                suggestions={autoMatchSuggestions}
                onClose={() => setAutoMatchOpen(false)}
                onApply={dist.applyAutoMatch}
                theme={theme}
            />
        </div>
    );
}
