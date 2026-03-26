/**
 * ツール一覧の単一ソース。LP・ModeSelector・sitemap・JsonLd で共有。
 * 機能追加時はこの配列に 1 件追加するだけで拡張できる。
 */
import { Users, Network, Sparkles, CircleDot, Dices, LayoutGrid, Calculator, Clock, PanelTopOpen, type LucideIcon } from "lucide-react";

export type ToolCategory = "tools" | "games";

export interface ToolDef {
  id: string;
  path: string;
  labelEn: string;
  labelJa: string;
  description: string;
  /** 狭い画面でここで改行する（この文字列の直後で改行）。例: "複数同時に。" */
  descriptionNarrowBreakAfter?: string;
  icon: LucideIcon;
  colorClass: string;
  activeBg: string;
  activeBorder: string;
  /** LP のカード・アクセントライン用 */
  accentHex: string;
  /** ホーム・LP のセクション分け用 */
  category: ToolCategory;
  /** LPのBento表示における優先度（1が最優先） */
  lpPriority: 1 | 2 | 3 | 4;
  /** LPのBento表示での推奨幅 */
  lpSpan: "large" | "medium" | "small";
}

/** ツール: カウンター, チャート, パネル, 電卓, 時計, スプリット */
/** ゲーム: ガチャ, ルーレット, スロット */
export const TOOLS: ToolDef[] = [
  {
    id: "counter",
    path: "/counter",
    labelEn: "Counter",
    labelJa: "人数カウンター",
    description: "入室カウント・項目集計を複数同時に。テンプレートや目標値で配信・イベントをサポート。",
    descriptionNarrowBreakAfter: "複数同時に。",
    icon: Users,
    colorClass: "text-purple-400",
    activeBg: "bg-purple-500/20",
    activeBorder: "border-purple-500/40",
    accentHex: "#a855f7",
    category: "tools",
    lpPriority: 1,
    lpSpan: "large",
  },
  {
    id: "flowchart",
    path: "/flowchart",
    labelEn: "Chart",
    labelJa: "チャート",
    description: "ノード式で数値演算。分岐・確率・集計を視覚的に整理し、リアルタイムで計算。",
    descriptionNarrowBreakAfter: "数値演算。",
    icon: Network,
    colorClass: "text-blue-400",
    activeBg: "bg-blue-500/20",
    activeBorder: "border-blue-500/40",
    accentHex: "#60a5fa",
    category: "tools",
    lpPriority: 2,
    lpSpan: "medium",
  },
  {
    id: "panel",
    path: "/panel",
    labelEn: "Panel",
    labelJa: "パネル",
    description: "画像に覆いをかけてタップで開け。AI読み取り防止・目標達成で覆い解除。",
    descriptionNarrowBreakAfter: "開け。",
    icon: PanelTopOpen,
    colorClass: "text-violet-400",
    activeBg: "bg-violet-500/20",
    activeBorder: "border-violet-500/40",
    accentHex: "#8b5cf6",
    category: "tools",
    lpPriority: 4,
    lpSpan: "small",
  },
  {
    id: "calculator",
    path: "/calculator",
    labelEn: "Calculator",
    labelJa: "電卓",
    description: "四則演算・分数・確率の簡易計算。配信のサポートツールとして。",
    descriptionNarrowBreakAfter: "簡易計算。",
    icon: Calculator,
    colorClass: "text-cyan-400",
    activeBg: "bg-cyan-500/20",
    activeBorder: "border-cyan-500/40",
    accentHex: "#22d3ee",
    category: "tools",
    lpPriority: 4,
    lpSpan: "small",
  },
  {
    id: "clock",
    path: "/clock",
    labelEn: "Clock",
    labelJa: "時計",
    description: "現在時刻・ストップウォッチ・タイマー。デジタルとアナログ表示に対応。",
    descriptionNarrowBreakAfter: "タイマー。",
    icon: Clock,
    colorClass: "text-orange-400",
    activeBg: "bg-orange-500/20",
    activeBorder: "border-orange-500/40",
    accentHex: "#f97316",
    category: "tools",
    lpPriority: 4,
    lpSpan: "small",
  },
  {
    id: "split",
    path: "/split",
    labelEn: "Split",
    labelJa: "スプリットビュー",
    description: "カウンター・チャート・ガチャなどを1画面で切り替え。",
    descriptionNarrowBreakAfter: "1画面で",
    icon: LayoutGrid,
    colorClass: "text-emerald-400",
    activeBg: "bg-emerald-500/20",
    activeBorder: "border-emerald-500/40",
    accentHex: "#34d399",
    category: "tools",
    lpPriority: 4,
    lpSpan: "small",
  },
  {
    id: "gacha",
    path: "/gacha",
    labelEn: "Gacha",
    labelJa: "ガチャシミュレーター",
    description: "確率・レア度・天井をカスタマイズ。配信やイベントの演出に。",
    descriptionNarrowBreakAfter: "カスタマイズ。",
    icon: Sparkles,
    colorClass: "text-yellow-400",
    activeBg: "bg-yellow-500/20",
    activeBorder: "border-yellow-500/40",
    accentHex: "#facc15",
    category: "games",
    lpPriority: 1,
    lpSpan: "large",
  },
  {
    id: "roulette",
    path: "/roulette",
    labelEn: "Roulette",
    labelJa: "ルーレット",
    description: "スロットを回して抽選。予測や履歴で盛り上げる。",
    descriptionNarrowBreakAfter: "抽選。",
    icon: CircleDot,
    colorClass: "text-amber-400",
    activeBg: "bg-amber-500/20",
    activeBorder: "border-amber-500/40",
    accentHex: "#fbbf24",
    category: "games",
    lpPriority: 3,
    lpSpan: "medium",
  },
  {
    id: "slot",
    path: "/slot",
    labelEn: "Slot",
    labelJa: "スロット",
    description: "順押し・目押し・BET・天井・リプレイ。図柄と確率をカスタマイズ。",
    descriptionNarrowBreakAfter: "リプレイ。",
    icon: Dices,
    colorClass: "text-teal-400",
    activeBg: "bg-teal-500/20",
    activeBorder: "border-teal-500/40",
    accentHex: "#14b8a6",
    category: "games",
    lpPriority: 3,
    lpSpan: "medium",
  },
];

export const TOOLS_BY_CATEGORY: Record<ToolCategory, ToolDef[]> = {
  tools: TOOLS.filter((t) => t.category === "tools"),
  games: TOOLS.filter((t) => t.category === "games"),
};

/** path から日本語ラベルを取得（JsonLd のパンくず用） */
export function getToolLabelJa(path: string): string | null {
  const t = TOOLS.find((x) => x.path === path);
  return t ? t.labelJa : null;
}

/** path からツールIDを取得（分析用）。トップは "top"、未定義パスは path の先頭スラッシュ除く */
export function getToolIdFromPath(path: string): string {
  if (path === "/") return "top";
  const t = TOOLS.find((x) => x.path === path);
  return t ? t.id : path.replace(/^\//, "") || "unknown";
}
