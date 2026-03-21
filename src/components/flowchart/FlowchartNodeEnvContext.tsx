"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppSettings } from "@/components/SettingsModal";
import type { LineNodePersistedData, LedgerTotalPersistedData } from "@/lib/flowchartLedger";

/** localStorage / React Flow の node.data に保存するフィールドのみ（関数は含めない） */
export type { LineNodePersistedData };

export type FlowchartNodeEnv = {
    isLightMode: boolean;
    accentColor: string;
    /** FlowchartContent の state（カードサイズ等を全ノードで即時反映するため LS とは別に渡す） */
    appSettings: AppSettings;
    globalTarget: number;
    onIncrement: (id: string) => void;
    onDecrement: (id: string) => void;
    /** count に delta を加え、0 未満にならないようにする */
    onAdjustLineCount: (id: string, delta: number) => void;
    /** count を直接設定（0 未満は 0 にクランプ） */
    onSetLineCount: (id: string, value: number) => void;
    onUpdateLineConfig: (id: string, updates: Partial<LineNodePersistedData>) => void;
    onDelete: (id: string) => void;
    onUpdateSummaryLabels: (id: string, updates: Partial<Pick<LedgerTotalPersistedData, "labelAdd" | "labelSub" | "labelGrand">>) => void;
};

const FlowchartNodeEnvContext = createContext<FlowchartNodeEnv | null>(null);

export function FlowchartNodeEnvProvider({ value, children }: { value: FlowchartNodeEnv; children: ReactNode }) {
    return <FlowchartNodeEnvContext.Provider value={value}>{children}</FlowchartNodeEnvContext.Provider>;
}

export function useFlowchartNodeEnv(): FlowchartNodeEnv {
    const v = useContext(FlowchartNodeEnvContext);
    if (!v) {
        throw new Error("useFlowchartNodeEnv must be used within FlowchartNodeEnvProvider");
    }
    return v;
}
