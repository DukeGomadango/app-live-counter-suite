"use client";

import { FiExternalLink, FiLogOut, FiRefreshCw, FiLoader } from "react-icons/fi";
import type { DistributionTheme } from "./theme";

export default function GachaDistributionOverflowMenu({
    syncing,
    onImport,
    onOpenManagement,
    onDisconnect,
    onClose,
    theme,
}: {
    syncing: boolean;
    onImport: () => void;
    onOpenManagement: () => void;
    onDisconnect: () => void;
    onClose: () => void;
    theme: DistributionTheme;
}) {
    const itemClass = `w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left hover:bg-purple-500/10 ${theme.textPrimary}`;

    return (
        <div
            role="menu"
            className={`absolute right-0 top-full mt-1 min-w-[220px] rounded-xl border shadow-lg z-50 overflow-hidden ${theme.bgCard} ${theme.borderCard}`}
        >
            <button
                type="button"
                role="menuitem"
                disabled={syncing}
                className={itemClass}
                onClick={() => {
                    onImport();
                    onClose();
                }}
            >
                {syncing ? <FiLoader className="animate-spin shrink-0" /> : <FiRefreshCw className="shrink-0" />}
                だんごシェアリンクから構成を取り込む
            </button>
            <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                    onOpenManagement();
                    onClose();
                }}
            >
                <FiExternalLink className="shrink-0" />
                管理画面を開く
            </button>
            <hr className={theme.borderCard} />
            <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-red-500 hover:bg-red-500/10`}
                onClick={() => {
                    onDisconnect();
                    onClose();
                }}
            >
                <FiLogOut className="shrink-0" />
                接続を解除
            </button>
        </div>
    );
}
