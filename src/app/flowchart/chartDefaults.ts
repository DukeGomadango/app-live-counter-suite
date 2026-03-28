import type { Node, Edge } from "@xyflow/react";
import type { AppSettings } from "@/components/SettingsModal";
import type { SavedChart } from "@/lib/chartTypes";
import { CHART_TOTAL_ID, type LedgerTotalPersistedData } from "@/lib/chartLedger";

/** Chart 用ノード・エッジの初期値（localStorage に未保存のとき） */
export const CHART_INITIAL_NODES: Node[] = [
    {
        id: CHART_TOTAL_ID,
        type: "total",
        position: { x: 600, y: 200 },
        draggable: false,
        data: {
            addTotal: 0,
            subTotalSigned: 0,
            grandTotal: 0,
            labelAdd: "加算合計",
            labelSub: "減算合計",
            labelGrand: "総合計",
        } satisfies LedgerTotalPersistedData,
    },
];

export const CHART_INITIAL_EDGES: Edge[] = [];

/** PC でホイール／トラックパッドによるズーム。誤操作が気になる場合は false に変更 */
export const CHART_ZOOM_ON_SCROLL = true;

/** `flowchart-app-settings` のデフォルト（キー名は後方互換のため変更しない） */
export const CHART_APP_SETTINGS_DEFAULT: AppSettings = {
    cardSize: "L" as const,
    edgeThickness: "M",
    showProjectName: false,
    projectName: "",
    projectNameSize: "M" as const,
    projectNameColor: "#a855f7",
    accentColor: "#a855f7",
    orbIntensity: 50,
    dotIntensity: 50,
    showStep5: true,
    showStep10: true,
    showStepFree: false,
    stepFreeValue: 1,
    flowchartFxIntensity: "normal",
};

/** `flowchart-saved-charts` の初回デフォルト（キー名は後方互換のため変更しない） */
export const CHART_SAMPLE_SAVED_CHARTS: SavedChart[] = [
    {
        id: "sample-1",
        name: "サンプル（加減算の台帳）",
        nodes: [
            {
                id: CHART_TOTAL_ID,
                type: "total",
                position: { x: 520, y: 120 },
                draggable: false,
                data: {
                    addTotal: 0,
                    subTotalSigned: 0,
                    grandTotal: 0,
                    labelAdd: "加算合計",
                    labelSub: "減算合計",
                    labelGrand: "総合計",
                },
                selected: false,
            },
            {
                id: "sample-line-a",
                type: "line",
                position: { x: 48, y: 120 },
                draggable: false,
                data: { label: "ポイント", emoji: "⭐", step: 1, count: 0, mode: "add" },
                selected: false,
            },
            {
                id: "sample-line-b",
                type: "line",
                position: { x: 48, y: 424 },
                draggable: false,
                data: { label: "ペナルティ", emoji: "➖", step: 1, count: 0, mode: "subtract" },
                selected: false,
            },
        ],
        edges: [
            {
                id: "edge-sample-line-a-total",
                source: "sample-line-a",
                target: CHART_TOTAL_ID,
                sourceHandle: "source-top",
                targetHandle: "target-bottom",
            },
            {
                id: "edge-sample-line-b-total",
                source: "sample-line-b",
                target: CHART_TOTAL_ID,
                sourceHandle: "source-top",
                targetHandle: "target-bottom",
            },
        ],
        updatedAt: Date.now(),
    },
];
