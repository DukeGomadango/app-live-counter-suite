"use client";

import Link from "next/link";
import type { IntegrationConnectionState } from "@/app/gacha/hooks/useIntegrationConnectionState";

interface IntegrationReconnectBannerProps {
    state: IntegrationConnectionState;
    isLightMode: boolean;
    /** 配布タブ内では OAuth ボタンが近いので短い文言 */
    variant?: "compact" | "full";
    onReconnectClick?: () => void;
}

export default function IntegrationReconnectBanner({
    state,
    isLightMode,
    variant = "full",
    onReconnectClick,
}: IntegrationReconnectBannerProps) {
    if (state !== "needs_reconnect") return null;

    const box = isLightMode
        ? "bg-amber-50 border-amber-200 text-amber-950"
        : "bg-amber-500/10 border-amber-500/25 text-amber-50";

    return (
        <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${box}`}>
            <p className="font-bold mb-1">だんごシェアリンクへの再接続が必要です</p>
            <p className={isLightMode ? "text-amber-900/90" : "text-amber-50/90"}>
                配布キャンペーンの設定はこの端末にありますが、だんごシェアリンクへの接続は含まれていません（データ連携では接続情報を移しません）。
            </p>
            {variant === "full" ? (
                <p className={`mt-2 text-xs ${isLightMode ? "text-amber-800/80" : "text-amber-50/75"}`}>
                    <Link href="/gacha" className="underline font-bold">
                        ガチャ
                    </Link>
                    の配布タブから「連携を開始する」を実行してください。
                </p>
            ) : null}
            {onReconnectClick ? (
                <button
                    type="button"
                    onClick={onReconnectClick}
                    className="mt-3 text-xs font-bold underline"
                >
                    連携を開始する
                </button>
            ) : null}
        </div>
    );
}
