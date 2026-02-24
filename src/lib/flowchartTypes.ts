/**
 * フローチャートの保存・メニュー表示用の最小型。
 * HamburgerMenu で @xyflow/react を import せずに済むようにする。
 * FlowchartContent の Node/Edge は構造的に代入可能。
 */
export type FlowchartNodeForMenu = {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  selected?: boolean;
  data?: {
    isGhost?: boolean;
    operation?: string;
    emoji?: string;
    label?: string;
    color?: string;
    value?: number;
    target?: number;
    count?: number;
    isLightMode?: boolean;
  };
};

export type FlowchartEdgeForMenu = {
  id: string;
  source?: string;
  sourceHandle?: string | null;
  target?: string;
  targetHandle?: string | null;
};

export type SavedFlowChart = {
  id: string;
  name: string;
  notes?: string;
  nodes: FlowchartNodeForMenu[];
  edges: FlowchartEdgeForMenu[];
  updatedAt: number;
};
