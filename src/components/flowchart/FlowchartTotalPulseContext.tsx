"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type FlowchartTotalPulseKind = "up" | "down";

export type FlowchartFxIntensityMode = "off" | "subtle" | "normal";

type PulseState = { token: number; kind: FlowchartTotalPulseKind | null };

type Ctx = {
    pulse: PulseState;
    bump: (kind: FlowchartTotalPulseKind) => void;
};

const FlowchartTotalPulseContext = createContext<Ctx | null>(null);

export function FlowchartTotalPulseProvider({
    children,
    intensityMode,
}: {
    children: ReactNode;
    intensityMode: FlowchartFxIntensityMode;
}) {
    const [pulse, setPulse] = useState<PulseState>({ token: 0, kind: null });

    const bump = useCallback(
        (kind: FlowchartTotalPulseKind) => {
            if (intensityMode === "off") return;
            setPulse((p) => ({ token: p.token + 1, kind }));
        },
        [intensityMode]
    );

    const value = useMemo(() => ({ pulse, bump }), [pulse, bump]);

    return <FlowchartTotalPulseContext.Provider value={value}>{children}</FlowchartTotalPulseContext.Provider>;
}

export function useFlowchartTotalPulse(): Ctx {
    const ctx = useContext(FlowchartTotalPulseContext);
    if (!ctx) {
        throw new Error("useFlowchartTotalPulse must be used within FlowchartTotalPulseProvider");
    }
    return ctx;
}

/** 合計ノードのみが使う。Provider 外では演出なし。 */
export function useFlowchartTotalPulseOptional(): Ctx | null {
    return useContext(FlowchartTotalPulseContext);
}
