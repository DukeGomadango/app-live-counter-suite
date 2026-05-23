"use client";

import { useRef } from "react";
import { FiFilter, FiRefreshCw, FiLoader, FiUpload, FiZap } from "react-icons/fi";
import type { DistributionTheme } from "./theme";

export default function GachaDistributionToolbar({
    theme,
    showUnmappedOnly,
    onToggleUnmappedOnly,
    onRefreshAssets,
    refreshingAssets,
    onAutoMatch,
    onBulkUpload,
    showAutoMatch,
    syncing,
}: {
    theme: DistributionTheme;
    showUnmappedOnly: boolean;
    onToggleUnmappedOnly: () => void;
    onRefreshAssets: () => void;
    refreshingAssets: boolean;
    onAutoMatch: () => void;
    onBulkUpload: (files: FileList) => void;
    showAutoMatch: boolean;
    syncing: boolean;
}) {
    const bulkInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
                type="button"
                onClick={onToggleUnmappedOnly}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    showUnmappedOnly
                        ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                        : `${theme.borderCard} ${theme.textSecondary}`
                }`}
            >
                <FiFilter size={14} />
                未紐づけのみ
            </button>

            <button
                type="button"
                onClick={onRefreshAssets}
                disabled={refreshingAssets || syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 ${theme.borderCard} ${theme.textSecondary} hover:border-purple-400 disabled:opacity-50`}
            >
                {refreshingAssets ? <FiLoader className="animate-spin" size={14} /> : <FiRefreshCw size={14} />}
                アセットを再取得
            </button>

            {showAutoMatch && (
                <button
                    type="button"
                    onClick={onAutoMatch}
                    disabled={syncing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 ${theme.borderCard} ${theme.textSecondary} hover:border-purple-400 disabled:opacity-50`}
                >
                    <FiZap size={14} />
                    名前で自動マッチ
                </button>
            )}

            <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
                disabled={syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 ${theme.borderCard} ${theme.textSecondary} hover:border-purple-400 disabled:opacity-50`}
            >
                <FiUpload size={14} />
                ファイルを一括登録
            </button>
            <input
                ref={bulkInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) onBulkUpload(e.target.files);
                    e.target.value = "";
                }}
            />
        </div>
    );
}
