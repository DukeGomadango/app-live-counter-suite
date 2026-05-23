"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    fetchExternalCampaigns,
    createExternalCampaign,
    type ExternalCampaign,
    issueClaimForPlayer,
    type ExternalAsset,
    fetchExternalAssets,
    uploadAssetAndRegister,
    fetchExternalGachaConfig,
    resolveExternalGachaItemDisplayName,
    formatIntegrationApiErrorMessage,
    applyItemAssetMapping,
    syncGachaConfigToExternalFromPool,
    runWithConcurrency,
    matchItemIdForFileName,
    buildAutoMappingSuggestions,
    type AutoMappingSuggestion,
} from "@/lib/gachaDistribution";
import { clearPartialUnmappedPullDismissIfResolved } from "@/lib/gachaPullGuard";
import type { GachaPool, IntegrationConfig, GachaItem, Player, RarityTier } from "@/lib/gacha";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/components/Toast";

const CLAIM_SYNC_CONCURRENCY = 4;
const UPLOAD_CONCURRENCY = 3;
const GACHA_CONFIG_SYNC_DEBOUNCE_MS = 800;

export interface DistributionUploadStatus {
    status: "uploading" | "success" | "error";
    progress?: number;
    error?: string;
}

export function useGachaDistribution({
    pool,
    onPoolChange,
    integrationConfig,
    onIntegrationConfigChange,
    players,
}: {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    integrationConfig: IntegrationConfig;
    onIntegrationConfigChange: (config: IntegrationConfig) => void;
    players: Player[];
}) {
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const [campaigns, setCampaigns] = useState<ExternalCampaign[]>([]);
    const [assets, setAssets] = useState<ExternalAsset[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [refreshingAssets, setRefreshingAssets] = useState(false);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [uploads, setUploads] = useState<Record<string, DistributionUploadStatus>>({});
    const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);

    const poolRef = useRef(pool);
    poolRef.current = pool;
    const mappingRef = useRef(mapping);
    mappingRef.current = mapping;
    const gachaConfigSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadDataInFlightRef = useRef(false);

    const refreshAssets = useCallback(async () => {
        const campaignId = poolRef.current.linkedCampaignId;
        if (!campaignId) return;
        setRefreshingAssets(true);
        try {
            const asts = await fetchExternalAssets(campaignId, integrationConfig);
            setAssets(asts);
        } catch (e) {
            showToast(formatIntegrationApiErrorMessage(e), "error");
        } finally {
            setRefreshingAssets(false);
        }
    }, [integrationConfig, showToast]);

    const loadData = useCallback(async () => {
        const currentPool = poolRef.current;
        try {
            const camps = await fetchExternalCampaigns(integrationConfig);
            setCampaigns(camps);

            if (currentPool.linkedCampaignId) {
                const exists = camps.some((c) => c.id === currentPool.linkedCampaignId);
                if (!exists) {
                    onPoolChange({
                        ...currentPool,
                        linkedCampaignId: undefined,
                        items: currentPool.items.map((it) => ({ ...it, linkedAssetId: undefined })),
                    });
                    setAssets([]);
                } else {
                    try {
                        const asts = await fetchExternalAssets(currentPool.linkedCampaignId, integrationConfig);
                        setAssets(asts);
                    } catch (e) {
                        if (e instanceof Error && e.message.includes("404")) {
                            onPoolChange({
                                ...currentPool,
                                linkedCampaignId: undefined,
                                items: currentPool.items.map((it) => ({ ...it, linkedAssetId: undefined })),
                            });
                            setAssets([]);
                        } else {
                            throw e;
                        }
                    }
                }
            }

            const newMapping: Record<string, string> = {};
            currentPool.items.forEach((it) => {
                if (it.linkedAssetId) newMapping[it.id] = it.linkedAssetId;
            });
            setMapping(newMapping);
        } catch (e) {
            console.error("Failed to load distribution data:", e);
            showToast(formatIntegrationApiErrorMessage(e), "error");
        }
    }, [integrationConfig, onPoolChange, showToast]);

    useEffect(() => {
        const token = integrationConfig.integrationToken?.trim();
        if (!token) return;
        if (loadDataInFlightRef.current) return;
        loadDataInFlightRef.current = true;
        void loadData().finally(() => {
            loadDataInFlightRef.current = false;
        });
        // loadData は poolRef 経由。integrationToken / linkedCampaignId の変化時のみ再取得
        // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData を deps に入れると連続再実行になる
    }, [integrationConfig.integrationToken, pool.linkedCampaignId]);

    useEffect(() => {
        const newMapping: Record<string, string> = {};
        pool.items.forEach((it) => {
            if (it.linkedAssetId) newMapping[it.id] = it.linkedAssetId;
        });
        setMapping(newMapping);
    }, [pool.items]);

    const scheduleGachaConfigSync = useCallback(
        (nextPool: GachaPool) => {
            if (!nextPool.linkedCampaignId || !integrationConfig.integrationToken) return;
            if (gachaConfigSyncTimerRef.current) clearTimeout(gachaConfigSyncTimerRef.current);
            gachaConfigSyncTimerRef.current = setTimeout(() => {
                void syncGachaConfigToExternalFromPool(nextPool, integrationConfig).catch((e) => {
                    console.error(e);
                    showToast(formatIntegrationApiErrorMessage(e), "error");
                });
            }, GACHA_CONFIG_SYNC_DEBOUNCE_MS);
        },
        [integrationConfig, showToast]
    );

    const syncAllClaims = useCallback(
        async (updatedItems: GachaItem[]) => {
            const targetPlayers = players.filter((p) => p.results.length > 0);
            if (targetPlayers.length === 0) return;

            setSyncing(true);
            const tempPool = { ...poolRef.current, items: updatedItems };
            try {
                await runWithConcurrency(targetPlayers, CLAIM_SYNC_CONCURRENCY, async (p) => {
                    await issueClaimForPlayer(p, tempPool, integrationConfig);
                });
            } finally {
                setSyncing(false);
            }
        },
        [players, integrationConfig]
    );

    const persistMapping = useCallback(
        (newMapping: Record<string, string>, options?: { skipClaimSync?: boolean }) => {
            const nextPool = applyItemAssetMapping(poolRef.current, newMapping);
            onPoolChange(nextPool);
            clearPartialUnmappedPullDismissIfResolved(nextPool);
            scheduleGachaConfigSync(nextPool);
            if (!options?.skipClaimSync) {
                void syncAllClaims(nextPool.items);
            }
            return nextPool;
        },
        [onPoolChange, scheduleGachaConfigSync, syncAllClaims]
    );

    const handleMappingChange = useCallback(
        (itemId: string, assetId: string) => {
            const newMapping = { ...mappingRef.current, [itemId]: assetId };
            setMapping(newMapping);
            persistMapping(newMapping);
        },
        [persistMapping]
    );

    const handleFileChange = useCallback(
        async (itemId: string, file: File) => {
            const campaignId = poolRef.current.linkedCampaignId;
            if (!campaignId) return;

            setUploads((prev) => ({ ...prev, [itemId]: { status: "uploading", progress: 0 } }));

            try {
                const asset = await uploadAssetAndRegister(
                    campaignId,
                    file,
                    integrationConfig,
                    (progress) => {
                        setUploads((prev) => {
                            const current = prev[itemId];
                            if (!current) return prev;
                            return { ...prev, [itemId]: { ...current, progress } };
                        });
                    }
                );

                setAssets((prev) => [asset, ...prev.filter((a) => a.id !== asset.id)]);
                const newMapping = { ...mappingRef.current, [itemId]: asset.id };
                setMapping(newMapping);
                setUploads((prev) => ({ ...prev, [itemId]: { status: "success", progress: 100 } }));
                persistMapping(newMapping);
            } catch (e) {
                console.error(e);
                setUploads((prev) => ({
                    ...prev,
                    [itemId]: { status: "error", error: formatIntegrationApiErrorMessage(e) },
                }));
                showToast(formatIntegrationApiErrorMessage(e), "error");
            }
        },
        [integrationConfig, persistMapping, showToast]
    );

    const applyAutoMatch = useCallback(
        (selected: AutoMappingSuggestion[]) => {
            if (selected.length === 0) return;
            const newMapping = { ...mappingRef.current };
            for (const s of selected) {
                newMapping[s.itemId] = s.assetId;
            }
            setMapping(newMapping);
            persistMapping(newMapping);
            showToast(`${selected.length}件の紐づけを適用しました`, "success");
        },
        [persistMapping, showToast]
    );

    const bulkUploadFiles = useCallback(
        async (files: FileList | File[]) => {
            const campaignId = poolRef.current.linkedCampaignId;
            if (!campaignId) return;

            const list = Array.from(files);
            if (list.length === 0) return;

            let uploaded = 0;
            const unmatched: string[] = [];
            const workingMapping = { ...mappingRef.current };

            const tasks: { itemId: string; file: File }[] = [];
            for (const file of list) {
                const itemId = matchItemIdForFileName(poolRef.current, file.name, workingMapping);
                if (itemId) {
                    tasks.push({ itemId, file });
                } else {
                    unmatched.push(file.name);
                }
            }

            if (tasks.length === 0) {
                showToast("品目名と一致するファイルがありませんでした", "info");
                return;
            }

            setSyncing(true);
            try {
                await runWithConcurrency(tasks, UPLOAD_CONCURRENCY, async ({ itemId, file }) => {
                    const asset = await uploadAssetAndRegister(campaignId, file, integrationConfig);
                    setAssets((prev) => [asset, ...prev.filter((a) => a.id !== asset.id)]);
                    workingMapping[itemId] = asset.id;
                    uploaded++;
                });
                setMapping(workingMapping);
                persistMapping(workingMapping);
                const msg =
                    unmatched.length > 0
                        ? `${uploaded}件を登録しました。${unmatched.length}件は品目名と一致せずスキップしました。`
                        : `${uploaded}件のファイルを登録・紐づけしました。`;
                showToast(msg, unmatched.length > 0 ? "info" : "success");
            } catch (e) {
                showToast(formatIntegrationApiErrorMessage(e), "error");
            } finally {
                setSyncing(false);
            }
        },
        [integrationConfig, persistMapping, showToast]
    );

    const getAutoMatchSuggestions = useCallback((): AutoMappingSuggestion[] => {
        return buildAutoMappingSuggestions(poolRef.current, assets, mappingRef.current);
    }, [assets]);

    const handleDisconnect = async () => {
        const ok = await confirm({
            title: "だんごシェアリンクとの接続を解除",
            message:
                "この端末に保存した連携トークンを削除します。配布キャンペーンの選択は残ります。だんごシェアリンク側のトークンを完全に無効にするには、だんごシェアリンクの設定 → 外部連携で失効してください。",
            confirmLabel: "接続を解除",
            danger: true,
        });
        if (!ok) return;
        onIntegrationConfigChange({ ...integrationConfig, integrationToken: "" });
        setCampaigns([]);
        showToast("だんごシェアリンクとの接続を解除しました", "success");
    };

    const handleCreateCampaign = async () => {
        setIsCreating(true);
        try {
            const newCamp = await createExternalCampaign(
                pool.conceptName || "新ガチャ配布キャンペーン",
                integrationConfig
            );
            const updatedList = await fetchExternalCampaigns(integrationConfig);
            setCampaigns(updatedList);
            onPoolChange({ ...pool, linkedCampaignId: newCamp.id });
        } catch (e) {
            showToast(formatIntegrationApiErrorMessage(e), "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleImportFromLinkShare = async () => {
        if (!pool.linkedCampaignId) return;
        const ok = await confirm({
            title: "だんごシェアリンクから構成を取り込む",
            message:
                "だんごシェアリンクのガチャ構成・品目一覧で、だんごツールのレアリティと品目が上書きされます。品目IDもだんごシェアリンクのアセットIDに置き換わります。よろしいですか？",
            confirmLabel: "取り込む",
            danger: true,
        });
        if (!ok) return;

        setSyncing(true);
        try {
            const config = await fetchExternalGachaConfig(pool.linkedCampaignId, integrationConfig);
            if (!config.gachaConfig) {
                showToast("キャンペーン側にガチャ構成が設定されていません", "error");
                return;
            }

            const newRarities: RarityTier[] = config.gachaConfig.rarities.map((r, i) => ({
                id: r.id,
                name: r.name,
                color: r.color,
                glowColor: r.color + "66",
                bgColor: r.color + "1a",
                sortOrder: i + 1,
                defaultWeight: r.probability,
            }));

            const newItems: GachaItem[] = config.items.map((item) => ({
                id: item.id,
                name: resolveExternalGachaItemDisplayName(item),
                rarityId: item.rarityId || newRarities[newRarities.length - 1]!.id,
                weight: 100,
                linkedAssetId: item.id,
            }));

            const nextPool = { ...pool, rarities: newRarities, items: newItems };
            onPoolChange(nextPool);
            clearPartialUnmappedPullDismissIfResolved(nextPool);

            const newMapping: Record<string, string> = {};
            newItems.forEach((it) => {
                if (it.linkedAssetId) newMapping[it.id] = it.linkedAssetId;
            });
            setMapping(newMapping);

            await refreshAssets();
            showToast("だんごシェアリンクからガチャ構成とアセットを取り込みました", "success");
        } catch (e) {
            showToast(formatIntegrationApiErrorMessage(e), "error");
        } finally {
            setSyncing(false);
        }
    };

    const handleCampaignChange = async (nextId: string) => {
        if (pool.linkedCampaignId && nextId !== pool.linkedCampaignId) {
            const ok = await confirm({
                title: "配布キャンペーンの変更",
                message: "キャンペーンを変更すると、これまでの景品との紐付け設定がすべてリセットされます。よろしいですか？",
                confirmLabel: "変更してリセット",
                danger: true,
            });
            if (!ok) return;
        }
        onPoolChange({
            ...pool,
            linkedCampaignId: nextId || undefined,
            items: pool.items.map((it) => ({ ...it, linkedAssetId: undefined })),
        });
    };

    return {
        campaigns,
        assets,
        mapping,
        uploads,
        isCreating,
        syncing,
        refreshingAssets,
        showUnmappedOnly,
        setShowUnmappedOnly,
        loadData,
        refreshAssets,
        handleMappingChange,
        handleFileChange,
        bulkUploadFiles,
        applyAutoMatch,
        getAutoMatchSuggestions,
        handleDisconnect,
        handleCreateCampaign,
        handleImportFromLinkShare,
        handleCampaignChange,
    };
}
