"use client";

import { useState } from "react";
import type { PoolMappingStats } from "@/lib/gachaDistribution";
import type { DistributionTheme } from "./theme";

const RECIPIENT_HINT_KEY = "gacha-distribution-recipient-hint-collapsed";

export default function GachaDistributionAlerts({
    hasCampaign,
    mappingStats,
    workflowMode,
    onWorkflowModeChange,
    onNavigateToPlayers,
    theme,
    isLightMode,
}: {
    hasCampaign: boolean;
    mappingStats: PoolMappingStats;
    workflowMode: "tool" | "linkshare";
    onWorkflowModeChange: (mode: "tool" | "linkshare") => void;
    onNavigateToPlayers?: () => void;
    theme: DistributionTheme;
    isLightMode: boolean;
}) {
    const [recipientCollapsed, setRecipientCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(RECIPIENT_HINT_KEY) === "1";
    });

    const toggleRecipient = () => {
        const next = !recipientCollapsed;
        setRecipientCollapsed(next);
        if (typeof window !== "undefined") {
            localStorage.setItem(RECIPIENT_HINT_KEY, next ? "1" : "0");
        }
    };

    return (
        <>
            {hasCampaign && (
                <div
                    className={`mb-4 p-3 rounded-2xl text-sm border ${theme.borderCard} ${isLightMode ? "bg-purple-50/80" : "bg-purple-500/5"}`}
                >
                    <p className={`font-bold mb-2 ${theme.textPrimary}`}>運用の進め方</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => onWorkflowModeChange("tool")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                workflowMode === "tool"
                                    ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                                    : `${theme.borderCard} ${theme.textSecondary}`
                            }`}
                        >
                            品目はだんごで作った
                        </button>
                        <button
                            type="button"
                            onClick={() => onWorkflowModeChange("linkshare")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                workflowMode === "linkshare"
                                    ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                                    : `${theme.borderCard} ${theme.textSecondary}`
                            }`}
                        >
                            リンクシェアでファイル済み
                        </button>
                    </div>
                    <p className={`mt-2 text-xs leading-relaxed ${theme.textSecondary}`}>
                        {workflowMode === "tool"
                            ? "下の表でファイルを選ぶか登録してください。名前が一致すれば自動マッチも使えます。"
                            : "「アセットを再取得」で一覧を更新し、プルダウンで選んでください。品目ごと作り直す場合はメニューの取り込みを使います。"}
                    </p>
                </div>
            )}

            {hasCampaign && mappingStats.itemCount > 0 && mappingStats.mappedCount < mappingStats.itemCount && (
                <div
                    className={`mb-4 p-4 rounded-2xl text-sm leading-relaxed border ${isLightMode ? "bg-red-50 border-red-200 text-red-950" : "bg-red-500/10 border-red-500/25 text-red-50"}`}
                >
                    <p className="font-bold mb-1">景品とファイルの紐づけが未完了です</p>
                    <p className={isLightMode ? "text-red-900/90" : "text-red-50/90"}>
                        {mappingStats.unmappedCount}件の景品に配布ファイルがありません。未紐づけの当選はリンクシェアへ
                        <strong>ファイルは付きません</strong>。
                    </p>
                </div>
            )}

            {hasCampaign && mappingStats.itemCount > 0 && mappingStats.mappedCount === 0 && (
                <div
                    className={`mb-4 p-4 rounded-2xl text-sm leading-relaxed border ${isLightMode ? "bg-red-50 border-red-200 text-red-950" : "bg-red-500/10 border-red-500/25 text-red-50"}`}
                >
                    <p className="font-bold mb-1">配布ファイルが1件も紐づいていません</p>
                    <p className={isLightMode ? "text-red-900/90" : "text-red-50/90"}>
                        このまま抽選すると配布リンクは作られても<strong>受け取れるファイルは0件</strong>です。
                    </p>
                </div>
            )}

            {hasCampaign && (
                <div
                    className={`mb-4 rounded-2xl text-sm border overflow-hidden ${isLightMode ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/25"}`}
                >
                    <button
                        type="button"
                        onClick={toggleRecipient}
                        className={`w-full flex items-center justify-between px-4 py-2.5 font-bold text-left ${isLightMode ? "text-amber-950" : "text-amber-50"}`}
                    >
                        受取人の扱い（推奨）
                        <span className="text-xs font-normal opacity-70">{recipientCollapsed ? "開く" : "閉じる"}</span>
                    </button>
                    {!recipientCollapsed && (
                        <div className={`px-4 pb-3 leading-relaxed ${isLightMode ? "text-amber-900/90" : "text-amber-50/90"}`}>
                            <p>
                                同一人物はリンクシェアの<strong>受取人名簿</strong>で管理します。プレイヤーごとに名簿を紐づけると二重枠を減らせます。
                            </p>
                            {onNavigateToPlayers && (
                                <button
                                    type="button"
                                    onClick={onNavigateToPlayers}
                                    className="mt-2 text-xs font-bold underline text-amber-700 dark:text-amber-200"
                                >
                                    プレイヤー一覧で名簿を紐づける
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
