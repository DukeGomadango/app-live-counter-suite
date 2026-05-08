"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FiGift, 
    FiPlus, 
    FiRefreshCw, 
    FiExternalLink, 
    FiAlertCircle, 
    FiUpload, 
    FiCheck, 
    FiLoader, 
    FiSearch,
    FiLink2
} from "react-icons/fi";
import { fetchExternalCampaigns, createExternalCampaign, type ExternalCampaign, issueClaimForPlayer, type ExternalAsset, fetchExternalAssets, uploadAssetAndRegister, fetchExternalGachaConfig } from "@/lib/gachaDistribution";
import type { GachaPool, IntegrationConfig, GachaItem, Player, RarityTier } from "@/lib/gacha";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

interface GachaDistributionPanelProps {
    pool: GachaPool;
    onPoolChange: (pool: GachaPool) => void;
    integrationConfig: IntegrationConfig;
    onIntegrationConfigChange: (config: IntegrationConfig) => void;
    players: Player[];
    isLightMode: boolean;
}

export default function GachaDistributionPanel({
    pool,
    onPoolChange,
    integrationConfig,
    onIntegrationConfigChange,
    players,
    isLightMode
}: GachaDistributionPanelProps) {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState<ExternalCampaign[]>([]);
    
    interface UploadStatus {
        status: "uploading" | "success" | "error";
        progress?: number;
        error?: string;
    }
    const [assets, setAssets] = useState<ExternalAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    
    // Mapping state
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [uploads, setUploads] = useState<Record<string, UploadStatus>>({});
    const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
    const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const [showChangeConfirm, setShowChangeConfirm] = useState(false);
    const [pendingCampaignId, setPendingCampaignId] = useState<string | undefined>(undefined);

    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/60";
    const bgCard = isLightMode ? "bg-white" : "bg-white/5";
    const borderCard = isLightMode ? "border-gray-200" : "border-white/10";

    // データロード
    useEffect(() => {
        if (!integrationConfig.integrationToken) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. キャンペーン一覧を取得
                const camps = await fetchExternalCampaigns(integrationConfig);
                setCampaigns(camps);
                
                // 2. 選択中のキャンペーンが存在するか確認
                if (pool.linkedCampaignId) {
                    const exists = camps.some(c => c.id === pool.linkedCampaignId);
                    if (!exists) {
                        // キャンペーンが外部で削除された場合、紐付けをリセット
                        onPoolChange({ 
                            ...pool, 
                            linkedCampaignId: undefined,
                            items: pool.items.map(it => ({ ...it, linkedAssetId: undefined }))
                        });
                        setAssets([]);
                    } else {
                        // 存在する場合のみアセットを取得
                        try {
                            const asts = await fetchExternalAssets(pool.linkedCampaignId, integrationConfig);
                            setAssets(asts);
                        } catch (e) {
                            if (e instanceof Error && e.message.includes("404")) {
                                onPoolChange({ 
                                    ...pool, 
                                    linkedCampaignId: undefined,
                                    items: pool.items.map(it => ({ ...it, linkedAssetId: undefined }))
                                });
                                setAssets([]);
                            } else {
                                throw e;
                            }
                        }
                    }
                }
                
                // 現状の紐付けを State に反映
                const newMapping: Record<string, string> = {};
                pool.items.forEach(it => {
                    if (it.linkedAssetId) newMapping[it.id] = it.linkedAssetId;
                });
                setMapping(newMapping);
            } catch (e) {
                console.error("Failed to load distribution data:", e);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [integrationConfig.integrationToken, pool.linkedCampaignId, integrationConfig.apiBaseUrl]);

    const handleOAuthLogin = () => {
        const u = new URL(`${integrationConfig.apiBaseUrl}/settings/integrations/authorize`);
        u.searchParams.set("client_id", "dango-tools-gacha");
        u.searchParams.set("redirect_uri", window.location.origin + window.location.pathname);
        window.location.href = u.toString();
    };

    const handleCreateCampaign = async () => {
        setIsCreating(true);
        setCreateError(null);
        try {
            const newCamp = await createExternalCampaign(pool.conceptName || "新ガチャ配布キャンペーン", integrationConfig);
            const updatedList = await fetchExternalCampaigns(integrationConfig);
            setCampaigns(updatedList);
            onPoolChange({ ...pool, linkedCampaignId: newCamp.id });
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : "作成に失敗しました");
        } finally {
            setIsCreating(false);
        }
    };

    const handleFileChange = async (itemId: string, file: File) => {
        if (!pool.linkedCampaignId) return;
        
        setUploads(prev => ({ ...prev, [itemId]: { status: "uploading", progress: 0 } }));
        
        try {
            const asset = await uploadAssetAndRegister(
                pool.linkedCampaignId,
                file,
                integrationConfig,
                (progress) => {
                    setUploads(prev => {
                        const current = prev[itemId];
                        if (!current) return prev;
                        return { ...prev, [itemId]: { ...current, progress } };
                    });
                }
            );
            
            setAssets(prev => [asset, ...prev]);
            setMapping(prev => ({ ...prev, [itemId]: asset.id }));
            setUploads(prev => ({ ...prev, [itemId]: { status: "success", progress: 100 } }));
            
            // 自動保存的な挙動（アイテムを更新）
            saveMapping({ ...mapping, [itemId]: asset.id });
            
        } catch (e) {
            console.error(e);
            setUploads(prev => ({ ...prev, [itemId]: { status: "error", error: "アップロード失敗" } }));
        }
    };

    const saveMapping = (newMapping: Record<string, string>) => {
        const updatedItems = pool.items.map(it => ({
            ...it,
            linkedAssetId: newMapping[it.id] || undefined
        }));
        onPoolChange({ ...pool, items: updatedItems });
        
        // 既存プレイヤーへの同期（非同期で実行）
        syncAllClaims(updatedItems);
    };

    const syncAllClaims = async (updatedItems: GachaItem[]) => {
        const targetPlayers = players.filter(p => p.results.length > 0);
        if (targetPlayers.length === 0) return;

        setSyncing(true);
        const tempPool = { ...pool, items: updatedItems };
        await Promise.allSettled(
            targetPlayers.map(p => issueClaimForPlayer(p, tempPool, integrationConfig))
        );
        setSyncing(false);
    };

    const handleSyncConfig = async () => {
        if (!pool.linkedCampaignId) return;
        setSyncing(true);
        try {
            const config = await fetchExternalGachaConfig(pool.linkedCampaignId, integrationConfig);
            if (!config.gachaConfig) {
                showToast("キャンペーン側にガチャ構成が設定されていません", "error");
                return;
            }

            // 1. レアリティの同期
            const newRarities: RarityTier[] = config.gachaConfig.rarities.map((r, i) => ({
                id: r.id,
                name: r.name,
                color: r.color,
                glowColor: r.color + "66",
                bgColor: r.color + "1a",
                sortOrder: i + 1,
                defaultWeight: r.probability
            }));

            // 2. アイテムの同期
            const newItems: GachaItem[] = config.items.map(item => ({
                id: item.id, // AssetID をそのまま ItemID に
                name: item.label || "無題のアイテム",
                rarityId: item.rarityId || newRarities[newRarities.length - 1]!.id,
                weight: 100, // レア度内確率は等倍(100)で初期化
                linkedAssetId: item.id
            }));

            onPoolChange({
                ...pool,
                rarities: newRarities,
                items: newItems
            });

            // マッピング状態も更新
            const newMapping: Record<string, string> = {};
            newItems.forEach(it => {
                if (it.linkedAssetId) newMapping[it.id] = it.linkedAssetId;
            });
            setMapping(newMapping);
            
            showToast("Link Share からガチャ構成とアセットを同期しました", "success");
        } catch (e) {
            console.error(e);
            showToast("同期に失敗しました", "error");
        } finally {
            setSyncing(false);
        }
    };

    if (!integrationConfig.integrationToken) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <FiLink2 className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>外部配布システムとの連携</h3>
                <p className={`max-w-md mb-8 ${textSecondary}`}>
                    Dango Share Link と連携することで、ガチャの景品としてデジタルファイルを自動配布できるようになります。
                </p>
                <button
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
        <div 
            className="flex flex-col h-full overflow-hidden"
            onDragEnter={() => setIsDraggingGlobal(true)}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
                if (e.currentTarget === e.target) setIsDraggingGlobal(false);
            }}
        >
            {/* Header Area */}
            <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className={`text-2xl font-bold flex items-center gap-3 ${textPrimary}`}>
                            <FiGift className="text-purple-500" />
                            配布管理
                        </h2>
                        <p className={`text-sm mt-1 ${textSecondary}`}>景品と配布用ファイルの紐付けを管理します</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <select
                            value={pool.linkedCampaignId || ""}
                            onChange={(e) => {
                                const nextId = e.target.value;
                                if (pool.linkedCampaignId && nextId !== pool.linkedCampaignId) {
                                    setPendingCampaignId(nextId || undefined);
                                    setShowChangeConfirm(true);
                                } else {
                                    onPoolChange({ ...pool, linkedCampaignId: nextId || undefined });
                                }
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 focus:ring-2 focus:ring-purple-500 outline-none transition-all ${bgCard} ${borderCard} ${textPrimary}`}
                        >
                            <option value="">-- 配布キャンペーンを選択 --</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleCreateCampaign}
                            disabled={isCreating}
                            className={`p-2 rounded-xl border-2 border-dashed transition-all flex items-center gap-2 px-4 hover:border-purple-500 hover:text-purple-500 ${borderCard} ${textSecondary}`}
                        >
                            {isCreating ? <FiLoader className="animate-spin" /> : <FiPlus />}
                            <span className="text-sm font-bold">新規作成</span>
                        </button>

                        {pool.linkedCampaignId && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSyncConfig}
                                    disabled={syncing}
                                    className={`p-2 rounded-xl border-2 transition-all flex items-center gap-2 px-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 shadow-sm disabled:opacity-50`}
                                >
                                    {syncing ? <FiLoader className="animate-spin" /> : <FiRefreshCw />}
                                    <span className="text-sm font-bold">設定を同期</span>
                                </button>
                                <a
                                    href={`${integrationConfig.apiBaseUrl}/campaigns/${pool.linkedCampaignId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-2 rounded-xl border-2 transition-all flex items-center gap-2 px-4 bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-500/20 shadow-sm`}
                                >
                                    <FiExternalLink />
                                    <span className="text-sm font-bold">管理画面を開く</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 overflow-auto p-6">
                {!pool.linkedCampaignId ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                        <FiSearch className="w-12 h-12 mb-4" />
                        <p>上部のメニューから、紐付け先のキャンペーンを選択してください</p>
                    </div>
                ) : (
                    <div className={`rounded-3xl border ${borderCard} overflow-hidden shadow-sm`}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/5 text-xs font-bold uppercase tracking-wider">
                                    <th className={`px-6 py-4 ${textSecondary}`}>景品名</th>
                                    <th className={`px-6 py-4 ${textSecondary}`}>配布ファイル</th>
                                    <th className={`px-6 py-4 ${textSecondary}`}>操作 / ドロップ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {pool.items.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverItemId(item.id);
                                        }}
                                        onDragLeave={() => setDragOverItemId(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverItemId(null);
                                            setIsDraggingGlobal(false);
                                            const files = e.dataTransfer.files;
                                            if (files && files.length > 1) {
                                                showToast("一度に登録できるのは1ファイルのみです。最初のファイルを使用します。", "info");
                                            }
                                            const file = files?.[0];
                                            if (file) handleFileChange(item.id, file);
                                        }}
                                        className={`transition-colors ${
                                            dragOverItemId === item.id 
                                                ? "bg-purple-500/5" 
                                                : isLightMode ? "hover:bg-gray-50" : "hover:bg-white/5"
                                        }`}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-2 h-10 rounded-full" 
                                                    style={{ backgroundColor: pool.rarities.find(r => r.id === item.rarityId)?.color || "#ccc" }} 
                                                />
                                                <span className={`font-bold ${textPrimary}`}>{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <select
                                                value={mapping[item.id] || ""}
                                                onChange={(e) => {
                                                    const newAssetId = e.target.value;
                                                    const newMapping = { ...mapping, [item.id]: newAssetId };
                                                    setMapping(newMapping);
                                                    saveMapping(newMapping);
                                                }}
                                                className={`w-full bg-transparent border-2 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all ${borderCard} ${textPrimary}`}
                                            >
                                                <option value="">（未設定）</option>
                                                {assets.map(asset => (
                                                    <option key={asset.id} value={asset.id}>{asset.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div 
                                                className={`relative border-2 border-dashed rounded-2xl transition-all flex items-center justify-center p-2 min-h-[52px] ${
                                                    uploads[item.id]?.status === "uploading"
                                                        ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                                                        : dragOverItemId === item.id
                                                            ? "border-purple-600 bg-purple-100 dark:bg-purple-500/20 scale-[1.02]"
                                                            : isDraggingGlobal
                                                                ? "border-purple-400 bg-purple-50/50 animate-pulse"
                                                                : "border-gray-200 bg-gray-50/30 dark:border-white/5 hover:border-purple-300"
                                                }`}
                                            >
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    ref={el => { fileInputRefs.current[item.id] = el }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileChange(item.id, file);
                                                    }}
                                                />
                                                
                                                {uploads[item.id]?.status === "uploading" ? (
                                                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                                                        <FiLoader className="animate-spin" />
                                                        {uploads[item.id]?.progress}%
                                                    </div>
                                                ) : uploads[item.id]?.status === "success" ? (
                                                    <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
                                                        <FiCheck className="w-5 h-5" />
                                                        <span>同期完了</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => fileInputRefs.current[item.id]?.click()}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                            isDraggingGlobal 
                                                                ? "text-purple-600 animate-bounce" 
                                                                : `${textSecondary} ${isLightMode ? "hover:text-purple-600" : "hover:text-purple-400"}`
                                                        }`}
                                                    >
                                                        {isDraggingGlobal ? (
                                                            <span>ドロップで登録</span>
                                                        ) : (
                                                            <>
                                                                <FiUpload className="w-4 h-4" />
                                                                <span>ファイルを登録</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer / Status Area */}
            <AnimatePresence>
                {syncing && (
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="p-3 bg-purple-600 text-white flex items-center justify-center gap-3 text-sm font-bold"
                    >
                        <FiRefreshCw className="animate-spin" />
                        <span>既存リンクの配布ファイルを同期中...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                open={showChangeConfirm}
                title="配布キャンペーンの変更"
                message="キャンペーンを変更すると、これまでの景品との紐付け設定がすべてリセットされます。よろしいですか？"
                confirmLabel="変更してリセット"
                danger={true}
                onConfirm={() => {
                    onPoolChange({ 
                        ...pool, 
                        linkedCampaignId: pendingCampaignId,
                        items: pool.items.map(it => ({ ...it, linkedAssetId: undefined }))
                    });
                    setShowChangeConfirm(false);
                }}
                onCancel={() => setShowChangeConfirm(false)}
            />
        </div>
    );
}
