"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type SplitModuleType = "counter" | "flowchart" | "gacha" | "roulette" | "slot" | "calculator" | "clock" | "panel";

type SplitModuleContextValue = {
    activeModule: SplitModuleType | null;
    setActiveModule: (m: SplitModuleType | null) => void;
};

const SplitModuleContext = createContext<SplitModuleContextValue>({
    activeModule: null,
    setActiveModule: () => {},
});

export function useSplitModule() {
    return useContext(SplitModuleContext);
}

export function SplitModuleProvider({ children }: { children: ReactNode }) {
    const [activeModule, setActiveModule] = useState<SplitModuleType | null>(null);
    const setter = useCallback((m: SplitModuleType | null) => setActiveModule(m), []);
    return (
        <SplitModuleContext.Provider value={{ activeModule, setActiveModule: setter }}>
            {children}
        </SplitModuleContext.Provider>
    );
}
