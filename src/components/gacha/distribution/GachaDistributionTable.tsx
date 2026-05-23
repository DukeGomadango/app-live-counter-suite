"use client";

import { useEffect, useRef } from "react";
import type { GachaPool, GachaItem } from "@/lib/gacha";
import type { ExternalAsset } from "@/lib/gachaDistribution";
import type { DistributionUploadStatus } from "@/app/gacha/hooks/useGachaDistribution";
import GachaDistributionFileCell from "./GachaDistributionFileCell";
import type { DistributionTheme } from "./theme";

export default function GachaDistributionTable({
    pool,
    items,
    assets,
    mapping,
    uploads,
    dragOverItemId,
    focusItemId,
    theme,
    onMappingChange,
    onFileSelect,
    onDragOverItem,
    onDragLeaveItem,
    onDropOnItem,
}: {
    pool: GachaPool;
    items: GachaItem[];
    assets: ExternalAsset[];
    mapping: Record<string, string>;
    uploads: Record<string, DistributionUploadStatus>;
    dragOverItemId: string | null;
    focusItemId?: string | null;
    theme: DistributionTheme;
    onMappingChange: (itemId: string, assetId: string) => void;
    onFileSelect: (itemId: string, file: File) => void;
    onDragOverItem: (itemId: string) => void;
    onDragLeaveItem: () => void;
    onDropOnItem: (itemId: string, files: FileList) => void;
}) {
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    useEffect(() => {
        if (!focusItemId) return;
        const row = rowRefs.current[focusItemId];
        row?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [focusItemId, items.length]);

    return (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${theme.borderCard}`}>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50/50 dark:bg-white/5 text-xs font-bold uppercase tracking-wider">
                        <th className={`px-4 py-3 w-[40%] ${theme.textSecondary}`}>景品名</th>
                        <th className={`px-4 py-3 ${theme.textSecondary}`}>配布ファイル</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {items.map((item) => {
                        const rarity = pool.rarities.find((r) => r.id === item.rarityId);
                        const isFocused = focusItemId === item.id;
                        return (
                            <tr
                                key={item.id}
                                ref={(el) => {
                                    rowRefs.current[item.id] = el;
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    onDragOverItem(item.id);
                                }}
                                onDragLeave={onDragLeaveItem}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    onDropOnItem(item.id, e.dataTransfer.files);
                                }}
                                className={`transition-colors ${
                                    isFocused
                                        ? "ring-2 ring-inset ring-purple-500/50 bg-purple-500/5"
                                        : dragOverItemId === item.id
                                          ? "bg-purple-500/5"
                                          : "hover:bg-gray-50/50 dark:hover:bg-white/5"
                                }`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="w-1.5 h-8 rounded-full shrink-0"
                                            style={{ backgroundColor: rarity?.color || "#ccc" }}
                                        />
                                        <span className={`font-bold text-sm truncate ${theme.textPrimary}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <GachaDistributionFileCell
                                        itemId={item.id}
                                        assetId={mapping[item.id] || ""}
                                        assets={assets}
                                        uploadStatus={uploads[item.id]}
                                        isDragOver={dragOverItemId === item.id}
                                        theme={theme}
                                        onAssetChange={(aid) => onMappingChange(item.id, aid)}
                                        onFileSelect={(file) => onFileSelect(item.id, file)}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
