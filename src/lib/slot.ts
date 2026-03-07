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
  /** このプレイヤーのスピン履歴（ガチャの runHistory と同様にプレイヤーごとに保持） */
  spinHistory?: SlotSpinRecord[];
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
  /** ボーナス役成立時に突入するゲーム数（0でボーナスゲームなし＝1回払い出しのみ）。未指定時は15 */
  bonusGamesCount?: number;
  /** 表示する行数（1＝1段、3＝3段）。未指定時は1 */
  visibleRows?: 1 | 3;
  /** ペイライン。各要素は [リール0の行, リール1の行, ...]。行は0=上,1=中,2=下。未指定時は1ライン中央のみ */
  paylines?: number[][];
  /** ART（アナザーリボルビング）：ボーナス中にボーナス図柄で当たったら残りゲーム数を加算するか */
  artEnabled?: boolean;
  /** ART で加算するゲーム数（artEnabled 時のみ有効） */
  artAddGames?: number;
}

/** 1ライン分の成立情報 */
export interface SlotLineWin {
  lineIndex: number;
  symbol: SlotSymbol;
  multiplier: number;
  isReplay: boolean;
}

/** 役判定結果（複数ペイライン対応） */
export interface SlotWinResult {
  win: boolean;
  /** 成立したラインごとの情報 */
  wins: SlotLineWin[];
  /** 合計配当倍率（全ラインの multiplier 合計） */
  multiplier: number;
  /** いずれかのラインがリプレイ役か */
  isReplay: boolean;
  /** 表示用：最初に成立した図柄（互換用） */
  symbol: SlotSymbol | null;
  /** 表示用：最初の成立図柄の strip 内インデックス（互換用） */
  symbolIndex: number | null;
}

export const MIN_REEL_COUNT = 2;
export const MAX_REEL_COUNT = 7;
export const DEFAULT_REEL_COUNT = 3;

/** 3リール用ペイラインプリセット。各要素は [リール0の行, リール1の行, リール2の行]。行0=上,1=中,2=下 */
export const PAYLINE_PRESETS: Record<string, number[][]> = {
  one: [[1, 1, 1]],
  three: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
  five: [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 2], [2, 1, 0]],
};

const genId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** デフォルト図柄（7・ベル・スイカ・チェリー・リプレイ等）。図柄率を上げて当たりやすくした初期値 */
export function createDefaultSymbols(): SlotSymbol[] {
  return [
    { id: "seven", label: "7", weight: 5, payoutMultiplier: 10, role: "bonus" },
    { id: "bell", label: "🔔", weight: 11, payoutMultiplier: 5, role: "small" },
    { id: "watermelon", label: "🍉", weight: 13, payoutMultiplier: 3, role: "small" },
    { id: "cherry", label: "🍒", weight: 18, payoutMultiplier: 2, role: "small" },
    { id: "replay", label: "🔄", weight: 15, payoutMultiplier: 0, role: "replay" },
    { id: "blank", label: "⬜", weight: 38, payoutMultiplier: 0, role: "chance" },
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

/** 確率テンプレート（図柄の id が一致するものだけ重みを上書きする） */
export interface SlotProbabilityTemplate {
  id: string;
  name: string;
  symbols: SlotSymbol[];
}

const DEFAULT_SYMBOL_IDS = ["seven", "bell", "watermelon", "cherry", "replay", "blank"] as const;
const DEFAULT_LABELS = ["7", "🔔", "🍉", "🍒", "🔄", "⬜"] as const;
const DEFAULT_PAYOUTS = [10, 5, 3, 2, 0, 0] as const;
const DEFAULT_ROLES: SlotSymbolRole[] = ["bonus", "small", "small", "small", "replay", "chance"];

function buildTemplateSymbols(weights: number[]): SlotSymbol[] {
  return weights.map((weight, i) => ({
    id: DEFAULT_SYMBOL_IDS[i]!,
    label: DEFAULT_LABELS[i]!,
    weight: weights[i]!,
    payoutMultiplier: DEFAULT_PAYOUTS[i]!,
    role: DEFAULT_ROLES[i]!,
  }));
}

/** 確率テンプレート一覧（標準・甘め・辛め・設定1・設定6）。甘め・設定6は約5倍当たりやすく調整 */
export function getSlotProbabilityTemplates(): SlotProbabilityTemplate[] {
  return [
    { id: "standard", name: "標準", symbols: buildTemplateSymbols([2, 8, 10, 15, 12, 53]) },
    { id: "sweet", name: "甘め", symbols: buildTemplateSymbols([8, 20, 20, 28, 23, 1]) },
    { id: "tight", name: "辛め", symbols: buildTemplateSymbols([1, 5, 6, 10, 8, 70]) },
    { id: "setting1", name: "設定1", symbols: buildTemplateSymbols([1, 4, 6, 8, 6, 75]) },
    { id: "setting6", name: "設定6", symbols: buildTemplateSymbols([10, 20, 20, 26, 24, 0]) },
  ];
}

/** テンプレートの重みを現在の図柄マスタに適用（id 一致分のみ重みを更新） */
export function applyProbabilityTemplate(
  master: SlotSymbol[],
  template: SlotSymbol[]
): SlotSymbol[] {
  const weightById = new Map(template.map((s) => [s.id, s.weight]));
  return master.map((s) => {
    const w = weightById.get(s.id);
    return w !== undefined ? { ...s, weight: w } : s;
  });
}

/** ユーザー保存用スロットテンプレート（リール数・天井・確率・リール配列を含む） */
export interface SlotTemplate {
  id: string;
  name: string;
  savedAt: number;
  reelCount: number;
  ceilingSpins: number;
  symbolMaster: SlotSymbol[];
  reelStrips: string[][];
}

const MAX_SAVED_TEMPLATES = 30;

export function createSlotTemplate(
  name: string,
  reelCount: number,
  ceilingSpins: number,
  symbolMaster: SlotSymbol[],
  reelStrips: string[][]
): SlotTemplate {
  const strips = reelStrips.slice(0, reelCount);
  while (strips.length < reelCount) {
    strips.push(symbolMaster.map((s) => s.id));
  }
  return {
    id: crypto.randomUUID?.() ?? `slot-t-${Date.now()}`,
    name: name.trim() || "無題",
    savedAt: Date.now(),
    reelCount,
    ceilingSpins,
    symbolMaster: symbolMaster.map((s) => ({ ...s })),
    reelStrips: strips.map((row) => [...row]),
  };
}

/** 読み込み時にリール数に合わせて reelStrips を trim または pad する */
export function normalizeReelStripsForLoad(
  reelStrips: string[][],
  reelCount: number,
  symbolMaster: SlotSymbol[]
): string[][] {
  const ids = symbolMaster.map((s) => s.id);
  const strips = reelStrips.slice(0, reelCount);
  while (strips.length < reelCount) {
    strips.push([...ids]);
  }
  return strips;
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
    bonusGamesCount: 15,
    visibleRows: 1,
    paylines: [[1, 1, 1]],
    artEnabled: false,
    artAddGames: 3,
  };
}

/** 表示行数とリール数に合わせてペイラインを正規化（不足分は中央行で埋める） */
export function normalizePaylines(
  paylines: number[][] | undefined,
  reelCount: number,
  visibleRows: 1 | 3
): number[][] {
  if (!paylines || paylines.length === 0) {
    return [Array(reelCount).fill(visibleRows === 3 ? 1 : 0)];
  }
  const rows = visibleRows === 3 ? 3 : 1;
  return paylines.map((line) => {
    const arr = [...line];
    while (arr.length < reelCount) arr.push(rows === 3 ? 1 : 0);
    return arr.slice(0, reelCount).map((r) => (rows === 1 ? 0 : Math.max(0, Math.min(2, r))));
  });
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
 * 指定リール・行の図柄を取得。visibleRows=1 のとき row は 0 のみで strip[reelResults[r]]。
 * visibleRows=3 のとき row 0=上,1=中,2=下 で中心が reelResults[r]。上=center-1, 中=center, 下=center+1。
 */
function getSymbolAt(
  reelStrips: SlotSymbol[][],
  reelResults: number[],
  reelIndex: number,
  rowIndex: number,
  visibleRows: 1 | 3
): SlotSymbol | null {
  const strip = reelStrips[reelIndex];
  const center = reelResults[reelIndex];
  if (!strip || center == null || center < 0 || center >= strip.length) return null;
  const len = strip.length;
  if (visibleRows === 1) {
    return strip[center] ?? null;
  }
  const offset = rowIndex - 1;
  const idx = (center + offset + len) % len;
  return strip[idx] ?? null;
}

/**
 * 複数ペイラインで役判定。各ラインについて全リール同一図柄なら成立。
 */
export function checkPaylines(
  reelResults: number[],
  reelStrips: SlotSymbol[][],
  paylines: number[][],
  visibleRows: 1 | 3
): SlotWinResult {
  const empty: SlotWinResult = {
    win: false,
    wins: [],
    multiplier: 0,
    isReplay: false,
    symbol: null,
    symbolIndex: null,
  };
  const n = reelResults.length;
  if (n === 0 || reelStrips.length < n || !paylines.length) return empty;

  const rows = visibleRows === 3 ? 3 : 1;
  const wins: SlotLineWin[] = [];

  for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
    const line = paylines[lineIdx];
    if (!line || line.length < n) continue;
    let firstSym: SlotSymbol | null = getSymbolAt(reelStrips, reelResults, 0, line[0]!, visibleRows);
    if (!firstSym) continue;
    let same = true;
    for (let r = 1; r < n; r++) {
      const sym = getSymbolAt(reelStrips, reelResults, r, line[r] ?? 0, visibleRows);
      if (!sym || sym.id !== firstSym.id) {
        same = false;
        break;
      }
    }
    if (same && firstSym) {
      wins.push({
        lineIndex: lineIdx,
        symbol: firstSym,
        multiplier: firstSym.payoutMultiplier,
        isReplay: firstSym.role === "replay",
      });
    }
  }

  const multiplier = wins.reduce((s, w) => s + w.multiplier, 0);
  const isReplay = wins.some((w) => w.isReplay);
  const firstWin = wins[0];
  const symbol = firstWin?.symbol ?? null;
  const symbolIndex = firstWin ? reelResults[0] ?? null : null;

  return {
    win: wins.length > 0,
    wins,
    multiplier,
    isReplay,
    symbol,
    symbolIndex,
  };
}

/**
 * 理論機械割（％）= (1回あたりの期待払い出し / BET) × 100
 * 複数ペイライン対応。各ライン・各図柄の成立確率を合算（リール独立・重み/合計で出現確率）。
 */
export function calculateTheoreticalPayoutPercent(
  reelStrips: SlotSymbol[][],
  bet: number,
  paylines: number[][] = [[0, 0, 0]],
  visibleRows: 1 | 3 = 1
): number {
  if (reelStrips.length === 0 || bet <= 0) return 0;
  const symbolIds = new Set<string>();
  for (const strip of reelStrips) {
    for (const s of strip) symbolIds.add(s.id);
  }
  let expectedPayout = 0;
  const rows = visibleRows === 3 ? 3 : 1;
  const normPaylines = paylines.length ? paylines : [Array(reelStrips.length).fill(rows === 3 ? 1 : 0)];

  for (const line of normPaylines) {
    for (const sid of symbolIds) {
      let prob = 1;
      for (let r = 0; r < reelStrips.length; r++) {
        const strip = reelStrips[r]!;
        const total = strip.reduce((s, sym) => s + sym.weight, 0);
        if (total <= 0) {
          prob = 0;
          break;
        }
        const weightForId = strip.reduce((s, sym) => s + (sym.id === sid ? sym.weight : 0), 0);
        prob *= weightForId / total;
      }
      const symbol = reelStrips[0]?.find((s) => s.id === sid);
      if (symbol) expectedPayout += prob * (bet * symbol.payoutMultiplier);
    }
  }
  return (expectedPayout / bet) * 100;
}

/** 1スピン分の履歴（統計・履歴表示用） */
export interface SlotSpinRecord {
  id: string;
  timestamp: number;
  playerId: string;
  bet: number;
  reelResults: number[];
  payout: number;
  isReplay: boolean;
  bonusTriggered: boolean;
  inBonus: boolean;
  ceilingTriggered?: boolean;
  /** 成立した役のラベル（表示用・複数ライン対応） */
  winLabels: string[];
}

/** グローバル履歴の最大件数（マイグレーション・後方互換用） */
const MAX_SPIN_HISTORY = 500;
/** プレイヤーごとの履歴の最大件数（ガチャの MAX_RUN_HISTORY に合わせる） */
export const MAX_SPIN_HISTORY_PER_PLAYER = 100;

/** 履歴に1件追加し、最大件数で先頭を削除（プレイヤー別履歴用） */
export function appendSpinRecord(
  history: SlotSpinRecord[],
  record: Omit<SlotSpinRecord, "id">,
  maxLength: number = MAX_SPIN_HISTORY_PER_PLAYER
): SlotSpinRecord[] {
  const id = crypto.randomUUID?.() ?? `spin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [...history, { ...record, id }];
  return next.slice(-maxLength);
}

/** 全プレイヤーの spinHistory を結合して「全員」用の一覧にする（新しい順・件数制限あり） */
export function getAllPlayersSpinHistory(
  players: SlotPlayer[],
  limit: number = 200
): SlotSpinRecord[] {
  const combined = players.flatMap((p) => p.spinHistory ?? []);
  combined.sort((a, b) => b.timestamp - a.timestamp);
  return combined.slice(0, limit);
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
