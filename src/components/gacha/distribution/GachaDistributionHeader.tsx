"use client";

import { useState, useRef, useEffect } from "react";
import { FiGift, FiPlus, FiLoader, FiMoreVertical } from "react-icons/fi";
import type { ExternalCampaign } from "@/lib/gachaDistribution";
import type { GachaPool } from "@/lib/gacha";
import type { PoolMappingStats } from "@/lib/gachaDistribution";
import GachaDistributionOverflowMenu from "./GachaDistributionOverflowMenu";
import type { DistributionTheme } from "./theme";

export default function GachaDistributionHeader({
    pool,
    campaigns,
    mappingStats,
    isCreating,
    syncing,
    theme,
    onCampaignChange,
    onCreateCampaign,
    onImportFromLinkShare,
    onOpenManagement,
    onDisconnect,
}: {
    pool: GachaPool;
    campaigns: ExternalCampaign[];
    mappingStats: PoolMappingStats;
    isCreating: boolean;
    syncing: boolean;
    theme: DistributionTheme;
    onCampaignChange: (nextId: string) => void;
    onCreateCampaign: () => void;
    onImportFromLinkShare: () => void;
    onOpenManagement: () => void;
    onDisconnect: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [menuOpen]);

    return (
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${theme.textPrimary}`}>
                            <FiGift className="text-purple-500 shrink-0" />
                            配布管理
                        </h2>
                        <p className={`text-xs sm:text-sm mt-0.5 ${theme.textSecondary}`}>
                            景品とリンクシェアの配布ファイルを紐づけます
                        </p>
                    </div>
                    {pool.linkedCampaignId && mappingStats.itemCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                mappingStats.unmappedCount > 0
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            }`}
                        >
                            {mappingStats.mappedCount}/{mappingStats.itemCount} 紐づけ済
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={pool.linkedCampaignId || ""}
                        onChange={(e) => onCampaignChange(e.target.value)}
                        className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-sm font-medium border-2 focus:ring-2 focus:ring-purple-500 outline-none ${theme.bgCard} ${theme.borderCard} ${theme.textPrimary}`}
                    >
                        <option value="">配布キャンペーンを選択</option>
                        {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={onCreateCampaign}
                        disabled={isCreating}
                        className={`p-2 rounded-xl border-2 border-dashed flex items-center gap-1.5 px-3 text-sm font-bold hover:border-purple-500 hover:text-purple-500 ${theme.borderCard} ${theme.textSecondary}`}
                    >
                        {isCreating ? <FiLoader className="animate-spin" /> : <FiPlus />}
                        新規
                    </button>

                    {pool.linkedCampaignId && (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen((v) => !v)}
                                className={`p-2 rounded-xl border-2 flex items-center gap-1 px-3 text-sm font-bold ${theme.borderCard} ${theme.textSecondary} hover:border-purple-400`}
                                aria-expanded={menuOpen}
                                aria-haspopup="menu"
                            >
                                <FiMoreVertical />
                                その他
                            </button>
                            {menuOpen && (
                                <GachaDistributionOverflowMenu
                                    syncing={syncing}
                                    onImport={onImportFromLinkShare}
                                    onOpenManagement={onOpenManagement}
                                    onDisconnect={onDisconnect}
                                    onClose={() => setMenuOpen(false)}
                                    theme={theme}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
