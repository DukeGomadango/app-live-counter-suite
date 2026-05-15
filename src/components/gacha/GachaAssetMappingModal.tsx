"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    fetchCampaignAssets, 
    uploadAssetAndRegister, 
    type ExternalAsset 
} from "@/lib/gachaDistribution";
import type { GachaPool, IntegrationConfig, GachaItem } from "@/lib/gacha";
import { FiX, FiUpload, FiCheck, FiLoader, FiAlertCircle } from "react-icons/fi";
import { useToast } from "@/components/Toast";

interface GachaAssetMappingModalProps {
    open: boolean;
    pool: GachaPool;
    campaignId: string;
    integrationConfig: IntegrationConfig;
    onClose: () => void;
    onSave: (updatedItems: GachaItem[]) => void;
    isLightMode?: boolean;
}

interface UploadState {
    progress: number;
    status: "idle" | "uploading" | "success" | "error";
    error?: string;
}

export default function GachaAssetMappingModal({
    open,
    pool,
    campaignId,
    integrationConfig,
    onClose,
    onSave,
    isLightMode = false,
}: GachaAssetMappingModalProps) {
    const { showToast } = useToast();
    const [assets, setAssets] = useState<ExternalAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapping, setMapping] = useState<Record<string, string>>({}); // itemId -> assetId
    const [uploads, setUploads] = useState<Record<string, UploadState>>({});
    const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
    const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const _textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/60";

    // 初期データロード
    useEffect(() => {
        if (open && campaignId) {
            loadAssets();
            // 現在の紐付けを初期状態としてセット
            const initialMapping: Record<string, string> = {};
            pool.items.forEach(it => {
                if (it.linkedAssetId) initialMapping[it.id] = it.linkedAssetId;
            });
            setMapping(initialMapping);
        }
    }, [open, campaignId]);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const list = await fetchCampaignAssets(campaignId, integrationConfig);
            setAssets(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (itemId: string, file: File) => {
        if (!file) return;

        setUploads(prev => ({ 
            ...prev, 
            [itemId]: { progress: 0, status: "uploading" } 
        }));

        try {
            const asset = await uploadAssetAndRegister(
                campaignId,
                file,
                integrationConfig,
                (progress) => {
                    setUploads(prev => {
                        const current = prev[itemId];
                        if (!current) return prev;
                        return {
                            ...prev,
                            [itemId]: { ...current, progress }
                        };
                    });
                }
            );

            // 4. Update local state
            setAssets(prev => [...prev, asset]);
            setMapping(prev => ({ ...prev, [itemId]: asset.id }));
            setUploads(prev => ({ 
                ...prev, 
                [itemId]: { progress: 100, status: "success" } 
            }));

        } catch (e) {
            console.error(e);
            setUploads(prev => ({ 
                ...prev, 
                [itemId]: { 
                    progress: 0, 
                    status: "error", 
                    error: e instanceof Error ? e.message : "不明なエラー" 
                } 
            }));
        }
    };

    const handleDragOver = (e: React.DragEvent, itemId: string) => {
        e.preventDefault();
        setDragOverItemId(itemId);
        setIsDraggingGlobal(true);
    };

    const handleDragLeave = () => {
        setDragOverItemId(null);
    };

    const handleGlobalDragLeave = (e: React.DragEvent) => {
        // 要素の外に出た時だけフラグを折る
        if (e.currentTarget === e.target) {
            setIsDraggingGlobal(false);
        }
    };

    const handleDrop = (e: React.DragEvent, itemId: string) => {
        e.preventDefault();
        setDragOverItemId(null);
        setIsDraggingGlobal(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 1) {
            showToast("一度に登録できるのは1ファイルのみです。最初のファイルを使用します。", "info");
        }
        const file = files?.[0];
        if (file) handleFileChange(itemId, file);
    };

    const [_syncing, setSyncing] = useState(false);

    const handleSave = async () => {
        setSyncing(true);
        try {
            const updatedItems = pool.items.map(it => ({
                ...it,
                linkedAssetId: mapping[it.id] || undefined
            }));
            
            // 1. まず親コンポーネントに設定を返す（これで pool が更新される）
            onSave(updatedItems);
            
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onDragEnter={() => setIsDraggingGlobal(true)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={handleGlobalDragLeave}
                    className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">景品とファイルの紐付け</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                各当選品に対して、配布するファイルを割り当ててください。
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            <FiX className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <FiLoader className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                                <p className="text-gray-500">ファイルを読み込み中...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pool.items.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
                                        <p className="text-gray-500">景品が登録されていません。先に「品目設定」で景品を追加してください。</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">
                                                <th className="px-4 py-3">景品名</th>
                                                <th className="px-4 py-3">配布ファイル</th>
                                                <th className="px-4 py-3 w-48">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {pool.items.map((item) => (
                                                <tr 
                                                    key={item.id} 
                                                    onDragOver={(e) => handleDragOver(e, item.id)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, item.id)}
                                                    className={`group transition-all duration-200 ${
                                                        dragOverItemId === item.id 
                                                            ? "bg-purple-500/5 shadow-inner" 
                                                            : isLightMode ? "hover:bg-gray-50" : "hover:bg-white/5"
                                                    }`}
                                                >
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div 
                                                                className="w-2 h-8 rounded-full"
                                                                style={{ backgroundColor: pool.rarities.find(r => r.id === item.rarityId)?.color || "#ccc" }}
                                                            />
                                                            <span className="font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <select
                                                            value={mapping[item.id] || ""}
                                                            onChange={(e) => setMapping(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                        >
                                                            <option value="">（未設定）</option>
                                                            {assets.map(asset => (
                                                                <option key={asset.id} value={asset.id}>{asset.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div 
                                                            className={`relative group/upload border-2 border-dashed rounded-2xl transition-all flex items-center justify-center p-2 min-h-[48px] ${
                                                                uploads[item.id]?.status === "uploading"
                                                                    ? "border-purple-500 bg-purple-50"
                                                                    : dragOverItemId === item.id
                                                                        ? "border-purple-600 bg-purple-100 scale-[1.02] shadow-sm"
                                                                        : isDraggingGlobal
                                                                            ? "border-purple-400 bg-purple-50/50 animate-pulse"
                                                                            : "border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/5 hover:border-purple-300 hover:bg-purple-50/30"
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
                                                                    <FiCheck className="w-4 h-4" />
                                                                    <span>完了</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => fileInputRefs.current[item.id]?.click()}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                                        isDraggingGlobal 
                                                                            ? "text-purple-600 animate-bounce" 
                                                                            : `${textSecondary} ${isLightMode ? "group-hover/upload:text-purple-600" : "group-hover/upload:text-purple-400"}`
                                                                    }`}
                                                                >
                                                                    {isDraggingGlobal ? (
                                                                        <span>ここにドロップ</span>
                                                                    ) : (
                                                                        <>
                                                                            <FiUpload className="w-4 h-4" />
                                                                            <span>アップロード</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                            
                                                            {uploads[item.id]?.status === "error" && (
                                                                <div className="absolute -right-1 -top-1 bg-red-500 text-white rounded-full p-1 shadow-lg" title={uploads[item.id]?.error}>
                                                                    <FiAlertCircle className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            設定を保存
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
