"use client";

import { useMemo } from "react";
import type { GachaPool, IntegrationConfig } from "@/lib/gacha";
import { getGachaIntegrationReadiness } from "@/lib/gachaIntegration";

export type IntegrationConnectionState =
    | "disconnected"
    | "connected"
    | "needs_reconnect";

export function useIntegrationConnectionState(
    integrationConfig: IntegrationConfig,
    pool: Pick<GachaPool, "linkedCampaignId">
): IntegrationConnectionState {
    return useMemo(() => {
        const readiness = getGachaIntegrationReadiness(true, integrationConfig, pool);
        if (readiness === "needs_reconnect") return "needs_reconnect";
        if (readiness === "ready") return "connected";
        return "disconnected";
    }, [integrationConfig, pool]);
}
