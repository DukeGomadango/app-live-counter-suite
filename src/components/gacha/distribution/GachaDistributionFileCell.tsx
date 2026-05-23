"use client";

import { FiUpload, FiLoader, FiCheck } from "react-icons/fi";
import { resolveExternalAssetDisplayName, type ExternalAsset } from "@/lib/gachaDistribution";
import type { DistributionUploadStatus } from "@/app/gacha/hooks/useGachaDistribution";
import type { DistributionTheme } from "./theme";

export default function GachaDistributionFileCell({
    itemId,
    assetId,
    assets,
    uploadStatus,
    isDragOver,
    theme,
    onAssetChange,
    onFileSelect,
}: {
    itemId: string;
    assetId: string;
    assets: ExternalAsset[];
    uploadStatus?: DistributionUploadStatus;
    isDragOver: boolean;
    theme: DistributionTheme;
    onAssetChange: (assetId: string) => void;
    onFileSelect: (file: File) => void;
}) {
    const inputId = `dist-file-${itemId}`;

    return (
        <div
            className={`flex items-center gap-2 rounded-xl border-2 transition-colors ${
                isDragOver
                    ? "border-purple-500 bg-purple-500/10"
                    : uploadStatus?.status === "uploading"
                      ? "border-purple-500/50"
                      : theme.borderCard
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) onFileSelect(file);
            }}
        >
            <select
                value={assetId}
                onChange={(e) => onAssetChange(e.target.value)}
                disabled={uploadStatus?.status === "uploading"}
                className={`flex-1 min-w-0 bg-transparent rounded-l-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none ${theme.textPrimary}`}
            >
                <option value="">（未設定）</option>
                {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                        {resolveExternalAssetDisplayName(asset)}
                    </option>
                ))}
            </select>

            <input
                type="file"
                id={inputId}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelect(file);
                    e.target.value = "";
                }}
            />

            {uploadStatus?.status === "uploading" ? (
                <span className="flex items-center gap-1 pr-2 text-purple-600 text-xs font-bold shrink-0">
                    <FiLoader className="animate-spin" />
                    {uploadStatus.progress}%
                </span>
            ) : uploadStatus?.status === "success" ? (
                <span className="flex items-center gap-1 pr-2 text-green-600 text-xs font-bold shrink-0">
                    <FiCheck />
                </span>
            ) : (
                <label
                    htmlFor={inputId}
                    className={`shrink-0 p-2 rounded-r-lg cursor-pointer ${theme.textSecondary} hover:text-purple-500`}
                    title="新規ファイルを登録"
                >
                    <FiUpload size={16} />
                </label>
            )}
        </div>
    );
}
