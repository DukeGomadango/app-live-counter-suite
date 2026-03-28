"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ChartTotalPulseKind = "up" | "down";

export type ChartFxIntensityMode = "off" | "subtle" | "normal";

type PulseState = { token: number; kind: ChartTotalPulseKind | null };

type Ctx = {
    pulse: PulseState;
    bump: (kind: ChartTotalPulseKind) => void;
};

const ChartTotalPulseContext = createContext<Ctx | null>(null);

export function ChartTotalPulseProvider({
    children,
    intensityMode,
}: {
    children: ReactNode;
    intensityMode: ChartFxIntensityMode;
}) {
    const [pulse, setPulse] = useState<PulseState>({ token: 0, kind: null });

    const bump = useCallback(
        (kind: ChartTotalPulseKind) => {
            if (intensityMode === "off") return;
            setPulse((p) => ({ token: p.token + 1, kind }));
        },
        [intensityMode]
    );

    const value = useMemo(() => ({ pulse, bump }), [pulse, bump]);

    return <ChartTotalPulseContext.Provider value={value}>{children}</ChartTotalPulseContext.Provider>;
}

export function useChartTotalPulse(): Ctx {
    const ctx = useContext(ChartTotalPulseContext);
    if (!ctx) {
        throw new Error("useChartTotalPulse must be used within ChartTotalPulseProvider");
    }
    return ctx;
}

/** 合計ノードのみが使う。Provider 外では演出なし。 */
export function useChartTotalPulseOptional(): Ctx | null {
    return useContext(ChartTotalPulseContext);
}
