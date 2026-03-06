/**
 * スロット用の型・デフォルト値・抽選・役判定・機械割・天井・リプレイ
 */

export type SlotSymbolRole = "bonus" | "small" | "replay" | "chance";

export interface SlotSymbol {
  id: string;
  label: string;
  weight: number;
  /** 役成立時の倍率。払い出し枚数 = BET × payoutMultiplier */
  payoutMultiplier: number;
  role: SlotSymbolRole;
}

export interface SlotPlayer {
  id: string;
  name: string;
  /** 残高（枚） */
  balance: number;
  /** 1回あたりのBET枚数 */
  defaultBet: number;
}

export interface SlotSettings {
  /** リール数。2〜7 */
  reelCount: number;
  accentColor: string;
  orbIntensity: number;
  soundEnabled: boolean;
  /** 演出（フラッシュ・紙吹雪など）を表示するかどうか */
  effectsEnabled?: boolean;
  /** 設定プリセット名（表示用） */
  presetName?: string;
  /** 天井までの回転数。0のときは天井なし */
  ceilingSpins: number;
}

/** 役判定結果 */
export interface SlotWinResult {
  win: boolean;
  /** 成立した図柄の reelStrips[0] 内インデックス。不成立時は null */
  symbolIndex: number | null;
  /** 配当倍率（不成立時は 0） */
  multiplier: number;
  /** リプレイ役か */
  isReplay: boolean;
  /** 成立した図柄（表示用）。不成立時は null */
  symbol: SlotSymbol | null;
}

export const MIN_REEL_COUNT = 2;
export const MAX_REEL_COUNT = 7;
export const DEFAULT_REEL_COUNT = 3;

const genId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** デフォルト図柄（7・ベル・スイカ・チェリー・リプレイ等） */
export function createDefaultSymbols(): SlotSymbol[] {
  return [
    { id: "seven", label: "7", weight: 2, payoutMultiplier: 10, role: "bonus" },
    { id: "bell", label: "ベル", weight: 8, payoutMultiplier: 5, role: "small" },
    { id: "watermelon", label: "スイカ", weight: 10, payoutMultiplier: 3, role: "small" },
    { id: "cherry", label: "チェリー", weight: 15, payoutMultiplier: 2, role: "small" },
    { id: "replay", label: "リプレイ", weight: 12, payoutMultiplier: 0, role: "replay" },
    { id: "blank", label: "－", weight: 53, payoutMultiplier: 0, role: "chance" },
  ];
}

/** デフォルトのリール配列（3リール分）。各リールは同じ図柄リストの参照で、並びは共通 */
export function createDefaultReelStrips(symbols: SlotSymbol[]): SlotSymbol[][] {
  if (symbols.length === 0) return [];
  const strip = [...symbols];
  return [
    [...strip],
    [...strip],
    [...strip],
  ];
}

/** 図柄 id の並びをマスタから解決して SlotSymbol[] を返す。マスタに無い id は先頭図柄で補う */
export function resolveStrip(ids: string[], master: SlotSymbol[]): SlotSymbol[] {
  if (master.length === 0) return [];
  const fallback = master[0]!;
  return ids
    .map((id) => master.find((s) => s.id === id) ?? fallback)
    .filter(Boolean);
}

/** 全リールの id 並びをマスタで解決して SlotSymbol[][] を返す */
export function resolveReelStrips(
  reelStripIds: string[][],
  master: SlotSymbol[]
): SlotSymbol[][] {
  return reelStripIds.map((ids) => resolveStrip(ids, master));
}

/** デフォルトのリール別 id 並び（3リール分）。各リールはマスタの id をその順で並べた配列 */
export function createDefaultReelStripIds(master: SlotSymbol[]): string[][] {
  if (master.length === 0) return [[], [], []];
  const ids = master.map((s) => s.id);
  return [[...ids], [...ids], [...ids]];
}

/** localStorage に保存された slot-reel-strips が旧形式（SlotSymbol[][]）かどうか */
export function isReelStripsLegacyFormat(value: unknown): value is SlotSymbol[][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  if (!Array.isArray(first) || first.length === 0) return false;
  const cell = first[0];
  return (
    cell != null &&
    typeof cell === "object" &&
    "id" in cell &&
    "label" in cell &&
    "weight" in cell
  );
}

/** 旧形式のリール配列から symbolMaster と id 並び（string[][]）を生成する */
export function migrateReelStripsToSymbolMasterAndIds(
  legacyStrips: SlotSymbol[][]
): { symbolMaster: SlotSymbol[]; reelStrips: string[][] } {
  const byId = new Map<string, SlotSymbol>();
  for (const strip of legacyStrips) {
    for (const s of strip) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
  }
  const symbolMaster = [...byId.values()];
  const reelStrips = legacyStrips.map((strip) => strip.map((s) => s.id));
  return { symbolMaster, reelStrips };
}

/** デフォルト設定 */
export function createDefaultSettings(): SlotSettings {
  return {
    reelCount: DEFAULT_REEL_COUNT,
    accentColor: "#a855f7",
    orbIntensity: 50,
    soundEnabled: true,
    effectsEnabled: true,
    presetName: "標準",
    ceilingSpins: 0,
  };
}

/** デフォルトプレイヤー1人（初回から遊べるように） */
export function createDefaultPlayers(): SlotPlayer[] {
  return [createDefaultPlayer("プレイヤー1")];
}

/** 新規プレイヤーを1人分作成する */
export function createDefaultPlayer(name: string): SlotPlayer {
  return {
    id: genId(),
    name: name.trim() || "プレイヤー",
    balance: 100,
    defaultBet: 3,
  };
}

/**
 * 重み付き乱数で図柄インデックスを1つ選ぶ。
 * 目押しB: 各リールのストップ時にこの関数を呼ぶ。
 */
export function pickSymbolByWeight(symbols: SlotSymbol[]): number {
  if (symbols.length === 0) return 0;
  const totalWeight = symbols.reduce((s, sym) => s + sym.weight, 0);
  if (totalWeight <= 0) return 0;
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < symbols.length; i++) {
    rand -= symbols[i]!.weight;
    if (rand <= 0) return i;
  }
  return symbols.length - 1;
}

/**
 * 全リール同じ図柄（同一 id）で揃っているか判定し、配当倍率とリプレイ可否を返す。
 * reelResults[i] は reelStrips[i] のインデックス。
 */
export function checkWin(
  reelResults: number[],
  reelStrips: SlotSymbol[][]
): SlotWinResult {
  const n = reelResults.length;
  if (n === 0 || reelStrips.length < n) {
    return { win: false, symbolIndex: null, multiplier: 0, isReplay: false, symbol: null };
  }
  const firstReelIndex = reelResults[0]!;
  const firstStrip = reelStrips[0];
  if (!firstStrip || firstReelIndex < 0 || firstReelIndex >= firstStrip.length) {
    return { win: false, symbolIndex: null, multiplier: 0, isReplay: false, symbol: null };
  }
  const firstSymbol = firstStrip[firstReelIndex]!;
  const firstId = firstSymbol.id;

  for (let r = 1; r < n; r++) {
    const strip = reelStrips[r];
    const idx = reelResults[r];
    if (!strip || idx == null || idx < 0 || idx >= strip.length) return { win: false, symbolIndex: null, multiplier: 0, isReplay: false, symbol: null };
    if (strip[idx]!.id !== firstId) return { win: false, symbolIndex: null, multiplier: 0, isReplay: false, symbol: null };
  }

  return {
    win: true,
    symbolIndex: firstReelIndex,
    multiplier: firstSymbol.payoutMultiplier,
    isReplay: firstSymbol.role === "replay",
    symbol: firstSymbol,
  };
}

/**
 * 理論機械割（％）= (1回あたりの期待払い出し / BET) × 100
 * 1ライン（全リール同一図柄）のみ。各リール独立で、出現確率は重み/合計。
 */
export function calculateTheoreticalPayoutPercent(
  reelStrips: SlotSymbol[][],
  bet: number
): number {
  if (reelStrips.length === 0 || bet <= 0) return 0;
  const symbolIds = new Set<string>();
  for (const strip of reelStrips) {
    for (const s of strip) symbolIds.add(s.id);
  }
  let expectedPayout = 0;
  for (const sid of symbolIds) {
    let prob = 1;
    for (const strip of reelStrips) {
      const total = strip.reduce((s, sym) => s + sym.weight, 0);
      if (total <= 0) {
        prob = 0;
        break;
      }
      const weightForId = strip.reduce((s, sym) => s + (sym.id === sid ? sym.weight : 0), 0);
      prob *= weightForId / total;
    }
    const symbol = reelStrips[0]!.find(s => s.id === sid);
    if (symbol) expectedPayout += prob * (bet * symbol.payoutMultiplier);
  }
  return (expectedPayout / bet) * 100;
}

/** ボーナス役の図柄 id 一覧（天井で使用） */
export function getBonusSymbolIds(reelStrips: SlotSymbol[][]): string[] {
  const ids = new Set<string>();
  for (const strip of reelStrips) {
    for (const s of strip) {
      if (s.role === "bonus") ids.add(s.id);
    }
  }
  return [...ids];
}

/**
 * 天井到達時、次回スピンで全リールに出すボーナス図柄のインデックスを決める。
 * bonusIds は getBonusSymbolIds(reelStrips) の結果。各リールの strip 内でその id のインデックスを返す。
 */
export function pickCeilingBonusIndices(
  reelStrips: SlotSymbol[][],
  bonusIds: string[]
): number[] {
  if (bonusIds.length === 0) return reelStrips.map(() => 0);
  const chosenId = bonusIds[Math.floor(Math.random() * bonusIds.length)]!;
  return reelStrips.map(strip => {
    const idx = strip.findIndex(s => s.id === chosenId);
    return idx >= 0 ? idx : 0;
  });
}
