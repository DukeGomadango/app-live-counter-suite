/**
 * データ同期の対象キー（単一ソース）。
 * 新規: コンポーネントで useLocalStorage にキーを追加したら、ここに同じ文字列を追記する。
 */
export const SYNC_GROUPS = [
  {
    id: "counter",
    labelJa: "人数カウンター",
    keys: [
      "counter-items",
      "counter-template",
      "counter-menu-open",
      "counter-light-mode",
      "counter-custom-templates",
      "counter-prefecture-show-labels",
      "counter-prefecture-show-names",
      "counter-app-settings",
    ],
  },
  {
    id: "chart",
    labelJa: "チャート",
    keys: [
      "flowchart-app-settings",
      "flowchart-nodes",
      "flowchart-edges",
      "flowchart-saved-charts",
      "flowchart-global-target",
      "flowchart-undo-history",
    ],
  },
  {
    id: "split",
    labelJa: "スプリットビュー",
    keys: ["split-pane-left", "split-pane-right"],
  },
  {
    id: "lp",
    labelJa: "トップページ（LP）",
    keys: ["lp-layout-mode"],
  },
  {
    id: "gacha",
    labelJa: "ガチャ",
    keys: [
      "gacha-pool",
      "gacha-players",
      "gacha-active-player",
      "gacha-light-mode",
      "gacha-settings",
      "gacha-presets",
      "gacha-sidebar-width",
      "gacha-hide-prob-normalize-message",
    ],
  },
  {
    id: "roulette",
    labelJa: "ルーレット",
    keys: [
      "roulette-slots",
      "roulette-settings",
      "roulette-light-mode",
      "roulette-predictors",
      "roulette-templates",
      "roulette-history",
      "roulette-hit-history",
      "roulette-sidebar-width",
    ],
  },
  {
    id: "slot",
    labelJa: "スロット",
    keys: [
      "slot-symbol-master",
      "slot-reel-strips",
      "slot-settings",
      "slot-players",
      "slot-active-player",
      "slot-light-mode",
      "slot-sidebar-width",
      "slot-templates",
      "slot-spin-history",
    ],
  },
  {
    id: "panel",
    labelJa: "パネル",
    keys: [
      "panel-light-mode",
      "panel-state",
      "panel-saved-list",
      "panel-custom-shapes",
      "panel-favorite-colors",
      "panel-edit-sidebar-width",
    ],
  },
  {
    id: "clock",
    labelJa: "時計",
    keys: ["clock-light-mode", "clock-settings"],
  },
  {
    id: "calculator",
    labelJa: "電卓",
    keys: ["calculator-settings", "calculator-light-mode"],
  },
] as const;

export type SyncGroupId = (typeof SYNC_GROUPS)[number]["id"];

export const ALL_SYNC_GROUP_IDS: SyncGroupId[] = SYNC_GROUPS.map((g) => g.id);

const GROUP_BY_ID = Object.fromEntries(SYNC_GROUPS.map((g) => [g.id, g])) as Record<
  SyncGroupId,
  (typeof SYNC_GROUPS)[number]
>;

export function getKeysForGroups(groupIds: Iterable<SyncGroupId>): string[] {
  const set = new Set<string>();
  for (const id of groupIds) {
    const g = GROUP_BY_ID[id];
    if (g) for (const k of g.keys) set.add(k);
  }
  return [...set];
}

export function getGroupIdsForKeys(keys: string[]): SyncGroupId[] {
  const keySet = new Set(keys);
  return SYNC_GROUPS.filter((g) => g.keys.some((k) => keySet.has(k))).map((g) => g.id);
}
