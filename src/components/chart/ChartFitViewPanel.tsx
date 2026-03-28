"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { Maximize2 } from "lucide-react";

type Props = {
    isLightMode: boolean;
    accentColor: string;
    minZoom: number;
    maxZoom: number;
};

/** ReactFlow の子としてのみマウントすること（useReactFlow 必須） */
export function ChartFitViewPanel({ isLightMode, accentColor, minZoom, maxZoom }: Props) {
    const { fitView } = useReactFlow();

    return (
        <Panel position="top-left" className="!mt-12 !ml-2 pointer-events-auto z-[5]">
            <button
                type="button"
                aria-label="表示を初期化（全体表示）"
                title="表示を初期化（全体表示）"
                onClick={() =>
                    fitView({
                        padding: 0.2,
                        minZoom,
                        maxZoom,
                        duration: 200,
                    })
                }
                className="flex items-center justify-center w-9 h-9 rounded-lg border shadow-md backdrop-blur-md transition-opacity hover:opacity-90 active:opacity-80"
                style={{
                    background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(10,5,30,0.75)",
                    borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)",
                    color: accentColor,
                }}
            >
                <Maximize2 size={18} strokeWidth={2} />
            </button>
        </Panel>
    );
}
