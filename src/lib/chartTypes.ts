/**
 * Chart の保存・メニュー表示用の最小型。
 * HamburgerMenu で @xyflow/react を import せずに済むようにする。
 */
export type ChartNodeForMenu = {
    id: string;
    type?: string;
    position?: { x: number; y: number };
    selected?: boolean;
    draggable?: boolean;
    data?: {
        operation?: string;
        mode?: "add" | "subtract";
        emoji?: string;
        label?: string;
        color?: string;
        value?: number;
        step?: number;
        target?: number;
        count?: number;
        isLightMode?: boolean;
        addTotal?: number;
        subTotalSigned?: number;
        grandTotal?: number;
        labelAdd?: string;
        labelSub?: string;
        labelGrand?: string;
    };
};

export type ChartEdgeForMenu = {
    id: string;
    source?: string;
    sourceHandle?: string | null;
    target?: string;
    targetHandle?: string | null;
};

export type SavedChart = {
    id: string;
    name: string;
    nodes: ChartNodeForMenu[];
    edges: ChartEdgeForMenu[];
    updatedAt: number;
};
