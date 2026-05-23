"use client";

import {
    getGachaIntegrationReadiness,
    getIntegrationSetupPrompt,
} from "@/lib/gachaIntegration";
import type { GachaPool, IntegrationConfig } from "@/lib/gacha";

export default function GachaIntegrationStatusBanner({
    integrationEnabled,
    integrationConfig,
    pool,
    isLightMode,
    onOpenDistribution,
}: {
    integrationEnabled: boolean;
    integrationConfig: IntegrationConfig;
    pool: Pick<GachaPool, "linkedCampaignId">;
    isLightMode: boolean;
    onOpenDistribution?: () => void;
}) {
    const readiness = getGachaIntegrationReadiness(
        integrationEnabled,
        integrationConfig,
        pool
    );
    const prompt = getIntegrationSetupPrompt(readiness);
    if (!prompt) return null;
    if (readiness !== "needs_reconnect" && readiness !== "needs_campaign") {
        return null;
    }

    const box = isLightMode
        ? "bg-amber-50 border-amber-200 text-amber-950"
        : "bg-amber-500/10 border-amber-500/25 text-amber-50";

    return (
        <div className={`mx-2 mb-2 rounded-2xl border p-3 text-xs leading-relaxed ${box}`}>
            <p className="font-bold mb-1">{prompt.title}</p>
            <p className={isLightMode ? "text-amber-900/90" : "text-amber-50/90"}>{prompt.body}</p>
            {onOpenDistribution && prompt.actionLabel ? (
                <button
                    type="button"
                    onClick={onOpenDistribution}
                    className="mt-2 font-bold underline"
                >
                    {prompt.actionLabel}
                </button>
            ) : null}
        </div>
    );
}
