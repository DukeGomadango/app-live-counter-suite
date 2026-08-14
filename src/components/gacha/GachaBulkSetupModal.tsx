"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Plus,
    Trash2,
    Sliders,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    SplitSquareHorizontal,
    Lock,
    Unlock,
    Coins,
    Wand2,
} from "lucide-react";
import type { GachaPool, GachaItem, RarityTier } from "@/lib/gacha";
import { generateId, distributePercentagesProportionally, sanitizeItemLimits } from "@/lib/gacha";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/components/Toast";
import GachaProfitChart, { SimDataPoint } from "./GachaProfitChart";
import { GACHA_MOBILE_HEADER_HEIGHT, GACHA_MOBILE_TAB_BAR_HEIGHT } from "@/lib/layoutConstants";

// ============================================================
// 型定義
// ============================================================

/** グリッド内で編集する行データ（下書き） */
interface DraftRow {
    /** オリジナルの GachaItem.id（新規行は "new-xxx"） */
    id: string;
    name: string;
    rarityId: string;
    /** レア度内での確率（%）。0–100 の範囲 */
    weight: number;
    /** ファイル配布連携アセット ID */
    linkedAssetId?: string;
    /** 確率をロックするか（このモーダル内限定の一時状態） */
    locked: boolean;
    costPrice: number;
    maxGlobalCount?: number;
    maxPerPlayerCount?: number;
}

interface GachaBulkSetupModalProps {
    open: boolean;
    pool: GachaPool;
    isLightMode?: boolean;
    onClose: () => void;
    /** 適用ボタン押下時に呼ばれる。更新後の items と rarities、さらに販売単価を渡す */
    onApply: (updatedItems: GachaItem[], updatedRarities: RarityTier[], updatedPullPrice: number) => void;
    showCostSimulator?: boolean;
    onToggleCostSimulator?: () => void;
}

// ============================================================
// プレミアム配色プリセット（新規レア度追加用）
// ============================================================

const PREMIUM_COLORS = [
    { color: "#ec4899", glowColor: "rgba(236,72,153,0.4)", bgColor: "rgba(236,72,153,0.15)" }, // ピンク
    { color: "#06b6d4", glowColor: "rgba(6,182,212,0.4)", bgColor: "rgba(6,182,212,0.15)" },   // シアン
    { color: "#14b8a6", glowColor: "rgba(20,184,166,0.4)", bgColor: "rgba(20,184,166,0.15)" },  // ティール
    { color: "#f97316", glowColor: "rgba(249,115,22,0.4)", bgColor: "rgba(249,115,22,0.15)" },   // オレンジ
    { color: "#10b981", glowColor: "rgba(16,185,129,0.4)", bgColor: "rgba(16,185,129,0.15)" },  // エメラルド
    { color: "#8b5cf6", glowColor: "rgba(139,92,246,0.4)", bgColor: "rgba(139,92,246,0.15)" },  // バイオレット
];

function getPremiumColor(index: number): { color: string; glowColor: string; bgColor: string } {
    return PREMIUM_COLORS[index % PREMIUM_COLORS.length] ?? {
        color: "#ec4899",
        glowColor: "rgba(236,72,153,0.4)",
        bgColor: "rgba(236,72,153,0.15)",
    };
}

// ============================================================
// ユーティリティ
// ============================================================

/** 特定レア度の DraftRow を比例配分で正規化する */
function normalizeDraftForRarity(
    rows: DraftRow[],
    rarityId: string,
    targetId?: string,
    targetVal?: number,
): DraftRow[] {
    const rarityRows = rows.filter(r => r.rarityId === rarityId);
    if (rarityRows.length === 0) return rows;

    const lockedIds = new Set(rarityRows.filter(r => r.locked).map(r => r.id));
    const ratioItems = rarityRows.map(r => ({ id: r.id, value: r.weight }));
    const distributed = distributePercentagesProportionally(ratioItems, lockedIds, targetId, targetVal);
    const valueMap = new Map(distributed.map(it => [it.id, it.value]));

    return rows.map(r => {
        if (r.rarityId !== rarityId) return r;
        return { ...r, weight: valueMap.get(r.id) ?? r.weight };
    });
}

/** DraftRow[] → GachaItem[] への変換（新規行も含む） */
function draftToItems(rows: DraftRow[]): GachaItem[] {
    return rows.map(r => ({
        id: r.id.startsWith("new-") ? generateId() : r.id,
        name: r.name.trim() || "（名称未設定）",
        rarityId: r.rarityId,
        weight: Math.max(0, r.weight),
        ...(r.linkedAssetId ? { linkedAssetId: r.linkedAssetId } : {}),
        costPrice: r.costPrice,
        ...(r.maxGlobalCount ? { maxGlobalCount: r.maxGlobalCount } : {}),
        ...(r.maxPerPlayerCount ? { maxPerPlayerCount: r.maxPerPlayerCount } : {}),
    }));
}

/** 確率の表示フォーマット（小数点以下不要な0を省略） */
function fmtW(w: number): string {
    if (w === 0) return "0";
    const s = w >= 0.01 ? w.toFixed(2) : w >= 0.0001 ? w.toFixed(4) : w.toFixed(8);
    return s.replace(/\.?0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

// ============================================================
// バリデーション
// ============================================================

interface ValidationResult {
    /** レア度ID → その合計（100でなければwarning） */
    rarityTotals: Map<string, number>;
    /** 空の名前を持つ行IDのセット */
    emptyNames: Set<string>;
    /** レア度の確率（defaultWeight）の合計 */
    rarityWeightTotal: number;
    /** レア度の確率合計が 100% (±0.5%) かどうか */
    isRaritiesSumOk: boolean;
    /** 空のレア度名があるかどうか */
    hasEmptyRarityNames: boolean;
    isValid: boolean;
}

function validate(rows: DraftRow[], rarities: RarityTier[]): ValidationResult {
    const rarityTotals = new Map<string, number>();
    const emptyNames = new Set<string>();

    for (const r of rows) {
        rarityTotals.set(r.rarityId, (rarityTotals.get(r.rarityId) ?? 0) + r.weight);
        if (!r.name.trim()) emptyNames.add(r.id);
    }

    const allTotalsOk = [...rarityTotals.values()].every(v => Math.abs(v - 100) < 0.5);
    
    // レア度確率（defaultWeight）の合計計算
    const rarityWeightTotal = rarities.reduce((sum, r) => sum + (r.defaultWeight ?? 0), 0);
    const isRaritiesSumOk = Math.abs(rarityWeightTotal - 100) < 0.5;

    // 空のレア度名チェック
    const hasEmptyRarityNames = rarities.some(r => !r.name.trim());

    const isValid = allTotalsOk && emptyNames.size === 0 && isRaritiesSumOk && !hasEmptyRarityNames;

    return { rarityTotals, emptyNames, rarityWeightTotal, isRaritiesSumOk, hasEmptyRarityNames, isValid };
}

/** 一括修正で直せる項目があるか */
function hasFixableValidationIssues(v: ValidationResult): boolean {
    if (!v.isRaritiesSumOk || v.hasEmptyRarityNames || v.emptyNames.size > 0) return true;
    return [...v.rarityTotals.values()].some(total => Math.abs(total - 100) >= 0.5);
}

function fixEmptyItemNames(rows: DraftRow[]): DraftRow[] {
    let n = 1;
    return rows.map(r => {
        if (!r.name.trim()) {
            return { ...r, name: `景品 ${n++}` };
        }
        return r;
    });
}

function fixEmptyRarityNames(rarities: RarityTier[]): RarityTier[] {
    return rarities.map((r, i) =>
        !r.name.trim() ? { ...r, name: `Tier ${i + 1}` } : r,
    );
}

function fixRarityWeightsTo100(rarities: RarityTier[], lockedIds: Set<string>): RarityTier[] {
    const ratioItems = rarities.map(r => ({ id: r.id, value: r.defaultWeight ?? 0 }));
    const distributed = distributePercentagesProportionally(ratioItems, lockedIds);
    const valueMap = new Map(distributed.map(it => [it.id, it.value]));
    return rarities.map(r => ({
        ...r,
        defaultWeight: valueMap.get(r.id) ?? r.defaultWeight,
    }));
}

function fixRarityItemTotals(rows: DraftRow[], rarityTotals: Map<string, number>): DraftRow[] {
    let next = rows;
    for (const [rarityId, total] of rarityTotals) {
        if (Math.abs(total - 100) >= 0.5) {
            next = normalizeDraftForRarity(next, rarityId);
        }
    }
    return next;
}

function applyBulkValidationFixes(
    rows: DraftRow[],
    rarities: RarityTier[],
    lockedRarityIds: Set<string>,
    validation: ValidationResult,
): { rows: DraftRow[]; rarities: RarityTier[] } {
    let nextRows = rows;
    let nextRarities = rarities;

    if (validation.hasEmptyRarityNames) {
        nextRarities = fixEmptyRarityNames(nextRarities);
    }
    if (!validation.isRaritiesSumOk) {
        nextRarities = fixRarityWeightsTo100(nextRarities, lockedRarityIds);
    }
    if (validation.emptyNames.size > 0) {
        nextRows = fixEmptyItemNames(nextRows);
    }
    const afterRarityFix = validate(nextRows, nextRarities);
    nextRows = fixRarityItemTotals(nextRows, afterRarityFix.rarityTotals);

    return { rows: nextRows, rarities: nextRarities };
}

type DraftSnapshot = {
    rows: Array<{
        id: string;
        name: string;
        rarityId: string;
        weight: number;
        costPrice: number;
        linkedAssetId?: string;
    }>;
    rarities: Array<{
        id: string;
        name: string;
        defaultWeight: number;
        sortOrder: number;
    }>;
    pullPrice: number;
};

function buildSnapshot(
    rows: DraftRow[],
    rarities: RarityTier[],
    pullPrice: number,
): DraftSnapshot {
    return {
        rows: rows.map(r => ({
            id: r.id,
            name: r.name,
            rarityId: r.rarityId,
            weight: r.weight,
            costPrice: r.costPrice,
            ...(r.linkedAssetId ? { linkedAssetId: r.linkedAssetId } : {}),
        })),
        rarities: rarities.map(r => ({
            id: r.id,
            name: r.name,
            defaultWeight: r.defaultWeight ?? 0,
            sortOrder: r.sortOrder,
        })),
        pullPrice,
    };
}

function isDraftDirty(
    rows: DraftRow[],
    rarities: RarityTier[],
    pullPrice: number,
    snapshot: DraftSnapshot | null,
): boolean {
    if (!snapshot) return false;
    const current = buildSnapshot(rows, rarities, pullPrice);
    return JSON.stringify(current) !== JSON.stringify(snapshot);
}

// ============================================================
// WeightCell：確率入力セル（ローカルステートで編集中値を保持）
// ============================================================

interface WeightCellProps {
    row: DraftRow;
    totalOk: boolean;
    total: number;
    isLightMode: boolean;
    textPrimary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    onWeightChange: (id: string, val: string) => void;
}

function WeightCell({
    row,
    totalOk,
    total,
    isLightMode,
    textPrimary,
    textMuted,
    inputBg,
    inputBorder,
    onWeightChange,
}: WeightCellProps) {
    const [localVal, setLocalVal] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const display = localVal !== null ? localVal : fmtW(row.weight);

    const borderStyle = row.locked
        ? (isLightMode ? "rgba(217,119,6,0.4)" : "rgba(251,191,36,0.3)")
        : !totalOk
            ? "rgba(239,68,68,0.4)"
            : inputBorder;

    const textColor = row.locked
        ? (isLightMode ? "#b45309" : "#fbbf24")
        : textPrimary;

    return (
        <div className="flex items-center justify-end gap-1">
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={display}
                onFocus={() => setLocalVal(fmtW(row.weight))}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={() => {
                    const v = localVal ?? fmtW(row.weight);
                    onWeightChange(row.id, v);
                    setLocalVal(null);
                }}
                className="w-16 text-right tabular-nums text-xs px-1.5 py-1 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-purple-400"
                style={{ background: inputBg, border: `1px solid ${borderStyle}`, color: textColor }}
                title={
                    row.locked
                        ? "🔒 ロック中：均等割り・比例配分から除外されます"
                        : `レア度内合計: ${fmtW(total)}%${totalOk ? " ✓" : " ⚠"}`
                }
            />
            <span className="text-[10px]" style={{ color: textMuted }}>%</span>
        </div>
    );
}

// ============================================================
// CostCell：原価入力セル（ローカルステートで編集中値を保持）
// ============================================================

interface CostCellProps {
    row: DraftRow;
    textPrimary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    onCostChange: (id: string, val: string) => void;
}

function CostCell({
    row,
    textPrimary,
    textMuted,
    inputBg,
    inputBorder,
    onCostChange,
}: CostCellProps) {
    const [localVal, setLocalVal] = useState<string | null>(null);

    const display = localVal !== null ? localVal : String(row.costPrice);

    return (
        <div className="flex items-center justify-end gap-1">
            <input
                type="text"
                inputMode="numeric"
                value={display}
                onFocus={() => setLocalVal(String(row.costPrice))}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={() => {
                    const v = localVal ?? String(row.costPrice);
                    onCostChange(row.id, v);
                    setLocalVal(null);
                }}
                className="w-20 text-right tabular-nums text-xs px-1.5 py-1 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-purple-400"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
            />
            <span className="text-[10px]" style={{ color: textMuted }}>円</span>
        </div>
    );
}

function fmtPrice(val: number): string {
    if (Number.isInteger(val)) {
        return val.toLocaleString("ja-JP");
    }
    return val.toLocaleString("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// mulberry32 シード付き疑似乱数生成用の純粋な遷移関数 (React 19 Pure Render対応)
function nextRandom(state: number): { value: number; nextState: number } {
    const nextState = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(nextState ^ (nextState >>> 15), 1 | nextState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return { value, nextState };
}

// ============================================================
// RarityWeightInput：レア度確率入力コンポーネント
// ============================================================

interface RarityWeightInputProps {
    rarity: RarityTier;
    isLocked: boolean;
    isLightMode: boolean;
    textPrimary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    onWeightChange: (id: string, val: string) => void;
}

// ============================================================
// BulkSetupRowCard：スマホ用行カード
// ============================================================

interface BulkSetupRowCardProps {
    row: DraftRow;
    idx: number;
    rarity: RarityTier | undefined;
    total: number;
    totalOk: boolean;
    hasEmptyName: boolean;
    globalProb: number;
    showCostSimulator: boolean;
    pullPrice: number;
    sortedRarities: RarityTier[];
    isLightMode: boolean;
    textPrimary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    borderColor: string;
    selectOptionStyle: React.CSSProperties;
    onRarityChange: (id: string, rarityId: string) => void;
    onNameChange: (id: string, name: string) => void;
    onToggleLock: (id: string) => void;
    onWeightChange: (id: string, val: string) => void;
    onCostChange: (id: string, val: string) => void;
    onMaxGlobalChange: (id: string, val: string) => void;
    onMaxPlayerChange: (id: string, val: string) => void;
    onDeleteRow: (id: string) => void;
}

function BulkSetupRowCard({
    row,
    idx,
    rarity,
    total,
    totalOk,
    hasEmptyName,
    globalProb,
    showCostSimulator,
    pullPrice,
    sortedRarities,
    isLightMode,
    textPrimary,
    textMuted,
    inputBg,
    inputBorder,
    borderColor,
    selectOptionStyle,
    onRarityChange,
    onNameChange,
    onToggleLock,
    onWeightChange,
    onCostChange,
    onMaxGlobalChange,
    onMaxPlayerChange,
    onDeleteRow,
}: BulkSetupRowCardProps) {
    const cardBg = idx % 2 === 0
        ? "transparent"
        : isLightMode ? "rgba(0,0,0,0.015)" : "rgba(255,255,255,0.015)";

    return (
        <div
            className="rounded-xl border p-3 space-y-2.5"
            style={{ background: cardBg, borderColor }}
        >
            <div className="flex items-start gap-2">
                <select
                    value={row.rarityId}
                    onChange={e => onRarityChange(row.id, e.target.value)}
                    className="flex-1 min-h-11 text-[11px] font-bold px-2 py-1.5 rounded-lg cursor-pointer outline-none"
                    style={{
                        color: rarity?.color ?? "#6b7280",
                        background: rarity?.bgColor ?? inputBg,
                        border: `1px solid ${rarity?.glowColor ?? "rgba(107,114,128,0.3)"}`,
                    }}
                >
                    {sortedRarities.map(r => (
                        <option key={r.id} value={r.id} style={selectOptionStyle}>{r.name || "（名称なし）"}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => onDeleteRow(row.id)}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-red-400 shrink-0"
                    style={{ background: "rgba(239,68,68,0.08)" }}
                    title="この行を削除"
                    aria-label="行を削除"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <input
                type="text"
                value={row.name}
                onChange={e => onNameChange(row.id, e.target.value)}
                placeholder="景品名を入力"
                className="w-full min-h-11 px-3 py-2 rounded-lg outline-none text-xs"
                style={{
                    background: inputBg,
                    border: `1px solid ${hasEmptyName ? "rgba(239,68,68,0.5)" : inputBorder}`,
                    color: textPrimary,
                }}
            />

            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold shrink-0" style={{ color: textMuted }}>確率（レア度内）</span>
                <div className="flex items-center gap-2">
                    <WeightCell
                        row={row}
                        totalOk={totalOk}
                        total={total}
                        isLightMode={isLightMode}
                        textPrimary={textPrimary}
                        textMuted={textMuted}
                        inputBg={inputBg}
                        inputBorder={inputBorder}
                        onWeightChange={onWeightChange}
                    />
                    <button
                        type="button"
                        onClick={() => onToggleLock(row.id)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-all shrink-0"
                        style={{
                            color: row.locked
                                ? (isLightMode ? "#d97706" : "#fbbf24")
                                : textMuted,
                            background: row.locked
                                ? (isLightMode ? "rgba(217,119,6,0.1)" : "rgba(251,191,36,0.1)")
                                : "transparent",
                        }}
                        title={row.locked ? "ロック中（クリックして解除）" : "クリックしてロック"}
                        aria-pressed={row.locked}
                        aria-label={row.locked ? "確率ロックを解除" : "確率をロック"}
                    >
                        {row.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between text-[10px]" style={{ color: textMuted }}>
                <span>全体確率</span>
                <span className="font-semibold tabular-nums">{fmtW(globalProb)}%</span>
            </div>

            {/* 個数制限設定（全体・個人） */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor }}>
                <span className="text-[10px] font-semibold shrink-0" style={{ color: textMuted }}>個数制限</span>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/5" style={{ border: `1px solid ${inputBorder}` }}>
                        <span className="text-[9px]" style={{ color: textMuted }}>全体:</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="∞"
                            value={row.maxGlobalCount ? String(row.maxGlobalCount) : ""}
                            onChange={e => onMaxGlobalChange(row.id, e.target.value)}
                            className="w-10 text-right text-xs tabular-nums font-semibold outline-none focus:ring-1 focus:ring-purple-400"
                            style={{ background: inputBg, border: "none", color: textPrimary }}
                            title="全体上限個数（空欄で無制限）"
                        />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/5" style={{ border: `1px solid ${inputBorder}` }}>
                        <span className="text-[9px]" style={{ color: textMuted }}>個人:</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="∞"
                            value={row.maxPerPlayerCount ? String(row.maxPerPlayerCount) : ""}
                            onChange={e => onMaxPlayerChange(row.id, e.target.value)}
                            className="w-10 text-right text-xs tabular-nums font-semibold outline-none focus:ring-1 focus:ring-purple-400"
                            style={{ background: inputBg, border: "none", color: textPrimary }}
                            title="1プレイヤーあたりの上限個数（空欄で無制限）"
                        />
                    </div>
                </div>
            </div>

            {showCostSimulator && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: textMuted }}>原価</span>
                    <CostCell
                        row={row}
                        textPrimary={textPrimary}
                        textMuted={textMuted}
                        inputBg={inputBg}
                        inputBorder={inputBorder}
                        onCostChange={onCostChange}
                    />
                </div>
            )}

            {showCostSimulator && (
                <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: textMuted }}>単体損益</span>
                    <span
                        className={`font-semibold tabular-nums ${
                            pullPrice - row.costPrice >= 0
                                ? (isLightMode ? "text-emerald-600" : "text-emerald-400")
                                : (isLightMode ? "text-rose-600" : "text-rose-400")
                        }`}
                    >
                        {pullPrice - row.costPrice >= 0 ? "+" : ""}{fmtPrice(pullPrice - row.costPrice)}円
                    </span>
                </div>
            )}
        </div>
    );
}

function RarityWeightInput({
    rarity,
    isLocked,
    isLightMode,
    textPrimary,
    textMuted,
    inputBg,
    inputBorder,
    onWeightChange,
}: RarityWeightInputProps) {
    const [localVal, setLocalVal] = useState<string | null>(null);

    const display = localVal !== null ? localVal : fmtW(rarity.defaultWeight ?? 0);

    const borderStyle = isLocked
        ? (isLightMode ? "rgba(217,119,6,0.4)" : "rgba(251,191,36,0.3)")
        : inputBorder;

    const textColor = isLocked
        ? (isLightMode ? "#b45309" : "#fbbf24")
        : textPrimary;

    return (
        <div className="flex items-center justify-end gap-1 w-full">
            <input
                type="text"
                inputMode="decimal"
                value={display}
                onFocus={() => setLocalVal(fmtW(rarity.defaultWeight ?? 0))}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={() => {
                    const v = localVal ?? fmtW(rarity.defaultWeight ?? 0);
                    onWeightChange(rarity.id, v);
                    setLocalVal(null);
                }}
                className="w-full text-right tabular-nums text-xs px-1.5 py-1 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-purple-400"
                style={{ background: inputBg, border: `1px solid ${borderStyle}`, color: textColor }}
                title={
                    isLocked
                        ? "🔒 ロック中：自動調整の対象から除外されます"
                        : "レア度排出確率（%）"
                }
            />
            <span className="text-[10px]" style={{ color: textMuted }}>%</span>
        </div>
    );
}

// ============================================================
// メインコンポーネント
// ============================================================

export default function GachaBulkSetupModal({
    open,
    pool,
    isLightMode = false,
    onClose,
    onApply,
    showCostSimulator: propShowCostSimulator = false,
    onToggleCostSimulator,
}: GachaBulkSetupModalProps) {
    const { confirm } = useConfirm();
    const { showToast } = useToast();
    const [openSnapshot, setOpenSnapshot] = useState<DraftSnapshot | null>(null);

    /** 収益シミュレーションモード（一括設定モーダル内で切り替え可能） */
    const [showCostSimulator, setShowCostSimulator] = useState(propShowCostSimulator);

    /** 下書き行リスト */
    const [rows, setRows] = useState<DraftRow[]>([]);
    /** 選択レア度フィルタ（"all" or rarityId） */
    const [filterRarityId, setFilterRarityId] = useState<string>("all");
    /** 均等割りのターゲットレア度 */
    const [equalizeTarget, setEqualizeTarget] = useState<string>("");

    /** レア度の下書きリスト */
    const [rarities, setRarities] = useState<RarityTier[]>([]);
    /** ロックされたレア度IDのセット */
    const [lockedRarityIds, setLockedRarityIds] = useState<Set<string>>(new Set());
    /** レア度パネルの展開状態 */
    const [isRaritiesExpanded, setIsRaritiesExpanded] = useState(true);

    /** ガチャ1回あたりの販売価格 */
    const [pullPrice, setPullPrice] = useState<number>(300);

    /** スマホ用アクティブタブ ("grid" | "chart") */
    const [activeTab, setActiveTab] = useState<"grid" | "chart">("grid");

    const activeRarities = rarities.length > 0 ? rarities : pool.rarities;
    const sortedRarities = [...activeRarities].sort((a, b) => a.sortOrder - b.sortOrder);

    // モーダルが開くたびに pool.items から下書きを初期化（render中に props の変化を検知してリセット）
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            const initial: DraftRow[] = pool.items.map(it => ({
                id: it.id,
                name: it.name,
                rarityId: it.rarityId,
                weight: it.weight,
                linkedAssetId: it.linkedAssetId,
                locked: false,
                costPrice: it.costPrice ?? 0,
                maxGlobalCount: it.maxGlobalCount,
                maxPerPlayerCount: it.maxPerPlayerCount,
            }));
            setRows(initial);
            setFilterRarityId("all");
            setEqualizeTarget(sortedRarities[0]?.id ?? "");
            setRarities(pool.rarities.map(r => ({ ...r })));
            setLockedRarityIds(new Set());
            setIsRaritiesExpanded(
                typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
            );
            setPullPrice(pool.pullPrice ?? 300);
            setActiveTab("grid");
            setOpenSnapshot(buildSnapshot(
                initial,
                pool.rarities.map(r => ({ ...r })),
                pool.pullPrice ?? 300,
            ));
        } else {
            setOpenSnapshot(null);
        }
    }

    // ============================================================
    // 行操作ハンドラー
    // ============================================================

    const handleNameChange = useCallback((id: string, name: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, name } : r));
    }, []);

    const handleRarityChange = useCallback((id: string, rarityId: string) => {
        setRows(prev => {
            // 元のレア度で正規化してから新しいレア度に移動
            const oldRarityId = prev.find(r => r.id === id)?.rarityId ?? rarityId;
            let next = prev.map(r => r.id === id ? { ...r, rarityId, weight: 0 } : r);
            next = normalizeDraftForRarity(next, oldRarityId);
            next = normalizeDraftForRarity(next, rarityId);
            return next;
        });
    }, []);

    const handleWeightChange = useCallback((id: string, rawVal: string) => {
        const n = parseFloat(rawVal);
        if (Number.isNaN(n) || n < 0) return;
        const val = Math.min(100, n);
        setRows(prev => {
            const row = prev.find(r => r.id === id);
            if (!row) return prev;
            const updated = prev.map(r => r.id === id ? { ...r, weight: val } : r);
            const normalized = normalizeDraftForRarity(updated, row.rarityId, id, val);
            
            const updatedRow = normalized.find(r => r.id === id);
            if (updatedRow) {
                const diff = val - updatedRow.weight;
                if (Math.abs(diff) > 1e-7) {
                    showToast(
                        `他の品目がロックされているため、${row.name || "（名称未設定）"}の確率は上限の${fmtW(updatedRow.weight)}%に制限されました`,
                        "info"
                    );
                }
            }
            return normalized;
        });
    }, [showToast]);

    const handleCostChange = useCallback((id: string, rawVal: string) => {
        const n = parseInt(rawVal, 10);
        const val = Number.isNaN(n) || n < 0 ? 0 : n;
        setRows(prev => prev.map(r => r.id === id ? { ...r, costPrice: val } : r));
    }, []);

    const handleToggleLock = useCallback((id: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, locked: !r.locked } : r));
    }, []);

    const handleMaxGlobalChange = useCallback((id: string, rawVal: string) => {
        const val = rawVal.trim() ? parseInt(rawVal.trim(), 10) : undefined;
        const num = val && !isNaN(val) && val > 0 ? val : undefined;
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            const sanitized = sanitizeItemLimits(num, r.maxPerPlayerCount);
            return { ...r, maxGlobalCount: sanitized.maxGlobalCount, maxPerPlayerCount: sanitized.maxPerPlayerCount };
        }));
    }, []);

    const handleMaxPlayerChange = useCallback((id: string, rawVal: string) => {
        const val = rawVal.trim() ? parseInt(rawVal.trim(), 10) : undefined;
        const num = val && !isNaN(val) && val > 0 ? val : undefined;
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            const sanitized = sanitizeItemLimits(r.maxGlobalCount, num);
            if (num && sanitized.maxPerPlayerCount !== num) {
                showToast("個人上限数は全体上限数を超えられないため自動補正されました", "info");
            }
            return { ...r, maxGlobalCount: sanitized.maxGlobalCount, maxPerPlayerCount: sanitized.maxPerPlayerCount };
        }));
    }, [showToast]);

    const handleAddRow = useCallback(() => {
        const defaultRarityId = sortedRarities[0]?.id ?? "";
        const newRow: DraftRow = {
            id: `new-${generateId()}`,
            name: "",
            rarityId: defaultRarityId,
            weight: 0,
            locked: false,
            costPrice: 0,
        };
        setRows(prev => {
            const next = [...prev, newRow];
            return normalizeDraftForRarity(next, defaultRarityId);
        });
    }, [sortedRarities]);

    const handleDeleteRow = useCallback((id: string) => {
        setRows(prev => {
            const row = prev.find(r => r.id === id);
            if (!row) return prev;
            const next = prev.filter(r => r.id !== id);
            return normalizeDraftForRarity(next, row.rarityId);
        });
    }, []);

    /** 指定レア度の全アイテムを均等割りする */
    const handleEqualize = useCallback(() => {
        const targetId = equalizeTarget;
        if (!targetId) return;
        setRows(prev => {
            const rarityRows = prev.filter(r => r.rarityId === targetId && !r.locked);
            if (rarityRows.length === 0) return prev;
            const lockedRows = prev.filter(r => r.rarityId === targetId && r.locked);
            const lockedSum = lockedRows.reduce((s, r) => s + r.weight, 0);
            const remaining = Math.max(0, 100 - lockedSum);
            const equalShare = Math.round((remaining / rarityRows.length) * 100000000) / 100000000;
            // 最後の要素で丸め誤差を吸収
            const distributed = rarityRows.map((r, i) =>
                i === rarityRows.length - 1
                    ? { ...r, weight: Math.round((remaining - equalShare * (rarityRows.length - 1)) * 100000000) / 100000000 }
                    : { ...r, weight: equalShare }
            );
            const distMap = new Map(distributed.map(r => [r.id, r.weight]));
            return prev.map(r => {
                if (r.rarityId !== targetId || r.locked) return r;
                return { ...r, weight: distMap.get(r.id) ?? r.weight };
            });
        });
    }, [equalizeTarget]);

    // ============================================================
    // レア度確率・編集操作ハンドラー
    // ============================================================

    const handleRarityWeightChange = useCallback((rarityId: string, rawVal: string) => {
        const n = parseFloat(rawVal);
        if (Number.isNaN(n) || n < 0) return;
        const val = Math.min(100, n);

        setRarities(prev => {
            const activePrev = prev.length > 0 ? prev : pool.rarities;
            const ratioItems = activePrev.map(r => ({
                id: r.id,
                value: r.defaultWeight ?? 0,
            }));
            const distributed = distributePercentagesProportionally(
                ratioItems,
                lockedRarityIds,
                rarityId,
                val
            );
            const valueMap = new Map(distributed.map(item => [item.id, item.value]));

            const updatedRarity = distributed.find(item => item.id === rarityId);
            if (updatedRarity) {
                const diff = val - updatedRarity.value;
                if (Math.abs(diff) > 1e-7) {
                    const originalRarity = activePrev.find(r => r.id === rarityId);
                    showToast(
                        `他のレア度がロックされているため、${originalRarity?.name || ""}の確率は上限の${fmtW(updatedRarity.value)}%に制限されました`,
                        "info"
                    );
                }
            }

            return activePrev.map(r => ({
                ...r,
                defaultWeight: valueMap.get(r.id) ?? r.defaultWeight,
            }));
        });
    }, [lockedRarityIds, pool.rarities, showToast]);

    const handleToggleLockRarity = useCallback((rarityId: string) => {
        setLockedRarityIds(prev => {
            const next = new Set(prev);
            if (next.has(rarityId)) {
                next.delete(rarityId);
            } else {
                next.add(rarityId);
            }
            return next;
        });
    }, []);

    const handleRenameRarity = useCallback((rarityId: string, newName: string) => {
        setRarities(prev => {
            const activePrev = prev.length > 0 ? prev : pool.rarities;
            return activePrev.map(r => r.id === rarityId ? { ...r, name: newName } : r);
        });
    }, [pool.rarities]);

    const handleAddRarity = useCallback(() => {
        setRarities(prev => {
            const activePrev = prev.length > 0 ? prev : pool.rarities;
            const newIndex = activePrev.length;
            const newColors = getPremiumColor(newIndex);
            
            const newRarity: RarityTier = {
                id: `rarity-${Date.now()}`,
                name: `Tier ${newIndex + 1}`,
                sortOrder: activePrev.length > 0 ? Math.max(...activePrev.map(r => r.sortOrder)) + 1 : 1,
                defaultWeight: 0,
                color: newColors.color,
                glowColor: newColors.glowColor,
                bgColor: newColors.bgColor,
            };
            return [...activePrev, newRarity];
        });
    }, [pool.rarities]);

    const handleDeleteRarity = useCallback((rarityId: string) => {
        setRarities(prev => {
            const activePrev = prev.length > 0 ? prev : pool.rarities;
            if (activePrev.length <= 1) return prev;

            const targetRarity = activePrev.find(r => r.id === rarityId);
            if (!targetRarity) return prev;

            const remainingRarities = activePrev.filter(r => r.id !== rarityId);
            const firstRemaining = remainingRarities[0];
            if (!firstRemaining) return prev;
            const firstRemainingId = firstRemaining.id;

            setRows(prevRows => {
                let nextRows = prevRows.map(row =>
                    row.rarityId === rarityId
                        ? { ...row, rarityId: firstRemainingId, locked: false }
                        : row
                );
                nextRows = normalizeDraftForRarity(nextRows, firstRemainingId);
                return nextRows;
            });

            const oldSum = remainingRarities.reduce((sum, r) => sum + (r.defaultWeight ?? 0), 0);
            let nextRarities: RarityTier[];
            if (oldSum > 0) {
                nextRarities = remainingRarities.map(r => ({
                    ...r,
                    defaultWeight: Math.round(((r.defaultWeight ?? 0) * 100 / oldSum) * 100000000) / 100000000,
                }));
            } else {
                const equalWeight = Math.round((100 / remainingRarities.length) * 100000000) / 100000000;
                nextRarities = remainingRarities.map((r, idx) => ({
                    ...r,
                    defaultWeight: idx === remainingRarities.length - 1
                        ? Math.round((100 - equalWeight * (remainingRarities.length - 1)) * 100000000) / 100000000
                        : equalWeight,
                }));
            }

            setLockedRarityIds(prevLocked => {
                const next = new Set(prevLocked);
                next.delete(rarityId);
                return next;
            });

            return nextRarities;
        });
    }, [pool.rarities]);


    const handleApply = useCallback(() => {
        const items = draftToItems(rows);
        const finalRarities = rarities.length > 0 ? rarities : pool.rarities;
        onApply(items, finalRarities, pullPrice);
        setOpenSnapshot(null);
        onClose();
    }, [rows, rarities, pool.rarities, pullPrice, onApply, onClose]);

    const handleRequestClose = useCallback(async () => {
        const activeRaritiesForDirty = rarities.length > 0 ? rarities : pool.rarities;
        if (isDraftDirty(rows, activeRaritiesForDirty, pullPrice, openSnapshot)) {
            const ok = await confirm({
                title: "変更を破棄",
                message: "保存していない変更があります。閉じてもよろしいですか？",
                danger: true,
            });
            if (!ok) return;
        }
        setOpenSnapshot(null);
        onClose();
    }, [rows, rarities, pool.rarities, pullPrice, openSnapshot, confirm, onClose]);

    const handleRequestDeleteRow = useCallback(async (id: string) => {
        const row = rows.find(r => r.id === id);
        const label = row?.name.trim() ? `「${row.name.trim()}」` : "この景品";
        const ok = await confirm({
            title: "景品削除",
            message: `${label}を削除しますか？`,
            danger: true,
        });
        if (!ok) return;
        handleDeleteRow(id);
    }, [rows, confirm, handleDeleteRow]);

    const handleRequestDeleteRarity = useCallback(async (rarityId: string) => {
        const rarity = sortedRarities.find(r => r.id === rarityId);
        const name = rarity?.name.trim() || "このレア度";
        const movedCount = rows.filter(r => r.rarityId === rarityId).length;
        const message = movedCount > 0
            ? `「${name}」を削除しますか？紐づく${movedCount}件の景品は別のレア度へ移動し、確率は再配分されます。`
            : `「${name}」を削除しますか？`;
        const ok = await confirm({
            title: "レア度削除",
            message,
            danger: true,
        });
        if (!ok) return;
        handleDeleteRarity(rarityId);
    }, [rows, sortedRarities, confirm, handleDeleteRarity]);

    const handleRequestApply = useCallback(async () => {
        const activeRaritiesForValidation = rarities.length > 0 ? rarities : pool.rarities;
        const currentValidation = validate(rows, activeRaritiesForValidation);
        if (!currentValidation.isValid) {
            const ok = await confirm({
                title: "警告を無視して適用",
                message: "確率や名称に問題があります。このまま適用しますか？",
                danger: true,
            });
            if (!ok) return;
        }
        handleApply();
    }, [rows, rarities, pool.rarities, confirm, handleApply]);

    const handleBulkFix = useCallback(() => {
        const activeRaritiesForFix = rarities.length > 0 ? rarities : pool.rarities;
        const currentValidation = validate(rows, activeRaritiesForFix);
        const { rows: fixedRows, rarities: fixedRarities } = applyBulkValidationFixes(
            rows,
            activeRaritiesForFix,
            lockedRarityIds,
            currentValidation,
        );
        setRows(fixedRows);
        setRarities(fixedRarities);
    }, [rows, rarities, pool.rarities, lockedRarityIds]);

    // ============================================================
    // 期待値・シミュレーション計算ブロック
    // ============================================================
    const currentRarities = rarities.length > 0 ? rarities : pool.rarities;

    const simulatorData = useMemo(() => {
        if (!showCostSimulator) {
            return {
                expectedCost: 0,
                expectedProfitMargin: 0,
                deficitRisk: 0,
                chartData: [] as SimDataPoint[],
            };
        }

        const activeRaritiesWithItems = new Set<string>();
        for (const r of rows) activeRaritiesWithItems.add(r.rarityId);

        let totalRarityWeight = 0;
        for (const r of currentRarities) {
            if (!activeRaritiesWithItems.has(r.id)) continue;
            totalRarityWeight += (r.defaultWeight ?? 1);
        }

        const rarityProbs = new Map<string, number>();
        for (const r of currentRarities) {
            if (!activeRaritiesWithItems.has(r.id)) {
                rarityProbs.set(r.id, 0);
                continue;
            }
            rarityProbs.set(r.id, totalRarityWeight === 0 ? 0 : (((r.defaultWeight ?? 1) / totalRarityWeight) * 100));
        }

        const rarityWeightSums = new Map<string, number>();
        for (const r of rows) {
            rarityWeightSums.set(r.rarityId, (rarityWeightSums.get(r.rarityId) || 0) + r.weight);
        }

        const withinRarityProbs = new Map<string, number>();
        for (const r of rows) {
            const totalInRarity = rarityWeightSums.get(r.rarityId) || 0;
            if (totalInRarity === 0) continue;
            withinRarityProbs.set(r.id, (r.weight / totalInRarity) * 100);
        }

        // 1. 期待原価の計算
        let expectedCost = 0;
        const itemGlobalProbs = new Map<string, number>();
        for (const r of rows) {
            const rp = rarityProbs.get(r.rarityId) || 0;
            const wp = withinRarityProbs.get(r.id) || 0;
            const globalProb = (rp / 100) * (wp / 100);
            itemGlobalProbs.set(r.id, globalProb);
            expectedCost += globalProb * r.costPrice;
        }

        const expectedProfitMargin = pullPrice > 0 ? ((pullPrice - expectedCost) / pullPrice) * 100 : 0;

        // 2. モンテカルロシミュレーション用の準備
        const limits: number[] = [];
        const costPrices: number[] = [];
        let accum = 0;
        for (const r of rows) {
            const globalProb = itemGlobalProbs.get(r.id) || 0;
            accum += globalProb;
            limits.push(accum);
            costPrices.push(r.costPrice);
        }

        const totalSum = accum;
        if (totalSum > 0) {
            for (let i = 0; i < limits.length; i++) {
                limits[i] = (limits[i] ?? 0) / totalSum;
            }
        }

        // 3. モンテカルロ赤字リスクの計算 (100回 × 1,000回抽選)
        let deficitTrials = 0;
        const trialsCount = 100;
        const pullsPerTrial = 1000;
        const revenuePerTrial = pullsPerTrial * pullPrice;

        let seedState = 12345;

        if (totalSum > 0 && rows.length > 0) {
            for (let t = 0; t < trialsCount; t++) {
                let trialCost = 0;
                for (let p = 0; p < pullsPerTrial; p++) {
                    const { value: rand, nextState } = nextRandom(seedState);
                    seedState = nextState;
                    // limitsが小さいことを前提とした高速な線形探索
                    for (let i = 0; i < limits.length; i++) {
                        const limit = limits[i];
                        if (limit !== undefined && rand <= limit) {
                            trialCost += costPrices[i] ?? 0;
                            break;
                        }
                    }
                }
                if (trialCost > revenuePerTrial) {
                    deficitTrials++;
                }
            }
        }
        const deficitRisk = totalSum > 0 && rows.length > 0 ? (deficitTrials / trialsCount) * 100 : 0;

        // 4. グラフ用プロットデータ作成 (単一パスの1,000回シミュレーション)
        const chartData: SimDataPoint[] = [{
            pulls: 0,
            revenue: 0,
            expectedCost: 0,
            simulatedCost: 0,
            expectedProfit: 0,
            simulatedProfit: 0
        }];

        let accumulatedSimCost = 0;
        const sampleInterval = 20;

        if (totalSum > 0 && rows.length > 0) {
            for (let p = 1; p <= 1000; p++) {
                const { value: rand, nextState } = nextRandom(seedState);
                seedState = nextState;
                let cost = 0;
                for (let i = 0; i < limits.length; i++) {
                    const limit = limits[i];
                    if (limit !== undefined && rand <= limit) {
                        cost = costPrices[i] ?? 0;
                        break;
                    }
                }
                accumulatedSimCost += cost;

                if (p % sampleInterval === 0) {
                    const currentRevenue = p * pullPrice;
                    const currentExpectedCost = p * expectedCost;
                    const currentExpectedProfit = currentRevenue - currentExpectedCost;
                    const currentSimulatedProfit = currentRevenue - accumulatedSimCost;

                    chartData.push({
                        pulls: p,
                        revenue: currentRevenue,
                        expectedCost: currentExpectedCost,
                        simulatedCost: accumulatedSimCost,
                        expectedProfit: currentExpectedProfit,
                        simulatedProfit: currentSimulatedProfit,
                    });
                }
            }
        }

        return {
            expectedCost,
            expectedProfitMargin,
            deficitRisk,
            chartData,
        };
    }, [rows, currentRarities, pullPrice, showCostSimulator]);

    // ============================================================
    // 描画
    // ============================================================

    const validation = validate(rows, currentRarities);
    const canBulkFix = hasFixableValidationIssues(validation);
    const displayRows = filterRarityId === "all"
        ? rows
        : rows.filter(r => r.rarityId === filterRarityId);

    // スタイル定数
    const bgMain = isLightMode ? "#ffffff" : "#0f0a1e";
    const bgHeader = isLightMode ? "#f9fafb" : "rgba(255,255,255,0.04)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
    const textPrimary = isLightMode ? "#111827" : "#f1f5f9";
    const textMuted = isLightMode ? "#6b7280" : "rgba(255,255,255,0.5)";
    const inputBg = isLightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.07)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const selectOptionStyle = isLightMode
        ? { background: "#fff", color: "#111827" }
        : { background: "#1e1b4b", color: "#e2e8f0" };


    return (
        <AnimatePresence>
            {open && (
                <div
                    className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-6 max-lg:pt-[calc(var(--gacha-header-h)+env(safe-area-inset-top,0px))] max-lg:pb-[calc(var(--gacha-tab-bar-h)+env(safe-area-inset-bottom,0px))]"
                    style={{
                        "--gacha-header-h": GACHA_MOBILE_HEADER_HEIGHT,
                        "--gacha-tab-bar-h": GACHA_MOBILE_TAB_BAR_HEIGHT,
                    } as React.CSSProperties}
                >
                {/* オーバーレイ */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    onClick={handleRequestClose}
                />

                {/* モーダル本体 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 24 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative w-full ${showCostSimulator ? "sm:max-w-7xl" : "sm:max-w-5xl"} flex flex-col min-h-0 overflow-hidden rounded-t-3xl lg:rounded-3xl shadow-2xl max-lg:max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top,0px)-var(--gacha-header-h)-var(--gacha-tab-bar-h)-env(safe-area-inset-bottom,0px)),calc(100vh-env(safe-area-inset-top,0px)-var(--gacha-header-h)-var(--gacha-tab-bar-h)-env(safe-area-inset-bottom,0px)))] lg:max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)),calc(100vh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))]`}
                    style={{
                        background: bgMain,
                        border: `1px solid ${borderColor}`,
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="一括グリッド設定"
                >
                    {/* ━━━━━ ヘッダー ━━━━━ */}
                    <div
                        className="flex items-center justify-between px-6 py-4 shrink-0"
                        style={{ background: bgHeader, borderBottom: `1px solid ${borderColor}` }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <Sliders size={16} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold" style={{ color: textPrimary }}>
                                    一括グリッド設定
                                </h2>
                                <p className="text-xs" style={{ color: textMuted }}>
                                    レア度・景品名・確率を一覧で編集できます
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCostSimulator(prev => !prev);
                                    onToggleCostSimulator?.();
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                    showCostSimulator
                                        ? isLightMode
                                            ? "bg-amber-100 text-amber-800 border-amber-300 shadow-sm shadow-amber-200/50"
                                            : "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                                        : isLightMode
                                            ? "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
                                            : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                }`}
                                title="原価と期待値ベースの収益シミュレーションモードを切り替えます"
                            >
                                <Coins size={14} className={showCostSimulator ? "animate-pulse text-amber-500" : ""} />
                                <span>収益シミュレーション</span>
                                {showCostSimulator && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleRequestClose}
                                className="min-h-11 min-w-11 rounded-full flex items-center justify-center transition-colors shrink-0"
                                style={{ color: textMuted }}
                                aria-label="閉じる"
                                onMouseOver={e => (e.currentTarget.style.background = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)")}
                                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* スマホ用セグメントタブ (シミュレーションモードONかつモバイル表示時のみ) */}
                    {showCostSimulator && (
                        <div className="px-6 py-2 md:hidden border-b flex shrink-0" style={{ borderColor, background: bgHeader }}>
                            <div className="grid grid-cols-2 w-full p-1 rounded-xl bg-black/10 dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("grid")}
                                    className={`min-h-11 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === "grid"
                                            ? "bg-purple-600 text-white shadow-md"
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    📝 設定グリッド
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("chart")}
                                    className={`min-h-11 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === "chart"
                                            ? "bg-purple-600 text-white shadow-md"
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    📊 収益シミュレータ
                                    {simulatorData.deficitRisk > 20 && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ━━━━━ スクロール領域（レア度・ツールバー・表・バリデーション） ━━━━━ */}
                    <div
                        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch custom-scrollbar"
                        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
                    >
                    {/* ━━━━━ レア度確率設定パネル ━━━━━ */}
                    <div
                        className={`px-6 py-4 ${showCostSimulator && activeTab === "chart" ? "hidden md:block" : ""}`}
                        style={{
                            borderBottom: `1px solid ${borderColor}`,
                            background: isLightMode ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.015)",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <button
                                type="button"
                                onClick={() => setIsRaritiesExpanded(prev => !prev)}
                                className="flex items-center gap-1.5 min-h-11 text-xs font-bold outline-none cursor-pointer group"
                                style={{ color: textPrimary }}
                            >
                                <Sliders size={13} className="text-purple-500 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="hidden md:inline">
                                    レア度排出確率設定（合計100%になるよう自動調整されます）
                                </span>
                                <span className="md:hidden text-left">レア度排出確率</span>
                                <ChevronDown
                                    size={12}
                                    className="transition-transform duration-200"
                                    style={{
                                        transform: isRaritiesExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                                        color: textMuted,
                                    }}
                                />
                            </button>
                            <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-bold transition-all"
                                style={{
                                    color: validation.isRaritiesSumOk
                                        ? (isLightMode ? "#059669" : "#34d399")
                                        : (isLightMode ? "#dc2626" : "#f87171"),
                                    background: validation.isRaritiesSumOk
                                        ? (isLightMode ? "rgba(5,150,105,0.08)" : "rgba(52,211,153,0.1)")
                                        : (isLightMode ? "rgba(220,38,38,0.08)" : "rgba(248,113,113,0.1)"),
                                    border: `1px solid ${
                                        validation.isRaritiesSumOk
                                            ? (isLightMode ? "rgba(5,150,105,0.2)" : "rgba(52,211,153,0.2)")
                                            : (isLightMode ? "rgba(220,38,38,0.2)" : "rgba(248,113,113,0.2)")
                                    }`,
                                }}
                            >
                                合計: {fmtW(validation.rarityWeightTotal)}%
                            </span>
                        </div>
                        
                        <AnimatePresence initial={false}>
                            {isRaritiesExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div
                                        className="max-h-36 overflow-y-auto scroll-touch pr-1 space-y-3"
                                        style={{
                                            scrollbarWidth: "thin",
                                        }}
                                    >
                                        <div className="grid max-md:grid-cols-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 py-1">
                                            {sortedRarities.map(r => {
                                                const isLocked = lockedRarityIds.has(r.id);
                                                return (
                                                    <div
                                                        key={r.id}
                                                        className="flex flex-col gap-1.5 p-2 rounded-xl border transition-all hover:shadow-md"
                                                        style={{
                                                            background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                                                            borderColor: isLocked
                                                                ? (isLightMode ? "rgba(217,119,6,0.3)" : "rgba(251,191,36,0.2)")
                                                                : borderColor,
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <input
                                                                type="text"
                                                                value={r.name}
                                                                onChange={e => handleRenameRarity(r.id, e.target.value)}
                                                                placeholder="レア度名"
                                                                className="text-[10px] font-bold px-1 py-0.5 rounded outline-none border-none max-w-[70px] text-center focus:ring-1 focus:ring-purple-400 focus:bg-black/10 transition-all"
                                                                style={{
                                                                    color: r.color,
                                                                    background: "transparent",
                                                                }}
                                                                title="クリックして名称を変更"
                                                            />
                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleLockRarity(r.id)}
                                                                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded transition-all shrink-0"
                                                                    style={{
                                                                        color: isLocked
                                                                            ? (isLightMode ? "#d97706" : "#fbbf24")
                                                                            : textMuted,
                                                                        background: isLocked
                                                                            ? (isLightMode ? "rgba(217,119,6,0.1)" : "rgba(251,191,36,0.1)")
                                                                            : "transparent",
                                                                    }}
                                                                    title={isLocked ? "🔒 ロック中（クリックして解除）" : "クリックしてロック"}
                                                                >
                                                                    {isLocked ? <Lock size={9} /> : <Unlock size={9} />}
                                                                </button>
                                                                {sortedRarities.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRequestDeleteRarity(r.id)}
                                                                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                                                                        title="このレア度を削除"
                                                                        aria-label="レア度を削除"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <RarityWeightInput
                                                            rarity={r}
                                                            isLocked={isLocked}
                                                            isLightMode={isLightMode}
                                                            textPrimary={textPrimary}
                                                            textMuted={textMuted}
                                                            inputBg={inputBg}
                                                            inputBorder={inputBorder}
                                                            onWeightChange={handleRarityWeightChange}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            {/* レア度追加カード */}
                                            <button
                                                type="button"
                                                onClick={handleAddRarity}
                                                className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-dashed transition-all hover:bg-purple-500/5 hover:border-purple-500/30 cursor-pointer min-h-[64px]"
                                                style={{
                                                    borderColor: borderColor,
                                                }}
                                            >
                                                <Plus size={14} className="text-purple-500" />
                                                <span className="text-[10px] font-bold" style={{ color: textMuted }}>
                                                    レア度を追加
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ━━━━━ ツールバー ━━━━━ */}
                    <div
                        className={`px-6 py-3 gap-3 max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 md:flex md:flex-wrap md:items-center ${showCostSimulator && activeTab === "chart" ? "hidden md:flex" : "max-md:grid md:flex"}`}
                        style={{ borderBottom: `1px solid ${borderColor}`, background: isLightMode ? "rgba(139,92,246,0.02)" : "rgba(139,92,246,0.05)" }}
                    >
                        {/* レア度フィルタ */}
                        <div className="flex items-center gap-2 max-md:min-w-0">
                            <span className="text-xs font-semibold shrink-0" style={{ color: textMuted }}>表示:</span>
                            <select
                                value={filterRarityId}
                                onChange={e => setFilterRarityId(e.target.value)}
                                className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
                                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
                            >
                                <option value="all" style={selectOptionStyle}>すべて</option>
                                {sortedRarities.map(r => (
                                    <option key={r.id} value={r.id} style={selectOptionStyle}>{r.name || "（名称なし）"}</option>
                                ))}
                            </select>
                        </div>

                        {/* 収益シミュレーション モードトグル */}
                        {onToggleCostSimulator && (
                            <button
                                type="button"
                                onClick={onToggleCostSimulator}
                                className={`flex items-center justify-center gap-1.5 min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer max-md:col-span-1`}
                                style={{
                                    background: showCostSimulator
                                        ? isLightMode
                                            ? "rgba(245,158,11,0.1)"
                                            : "rgba(245,158,11,0.2)"
                                        : inputBg,
                                    borderColor: showCostSimulator
                                        ? isLightMode
                                            ? "rgba(245,158,11,0.4)"
                                            : "rgba(245,158,11,0.5)"
                                        : inputBorder,
                                    color: showCostSimulator
                                        ? isLightMode
                                            ? "#b45309"
                                            : "#f59e0b"
                                        : textMuted
                                }}
                                title="原価と期待値ベースの収益シミュレーションを切り替えます"
                            >
                                <Coins size={13} className={showCostSimulator ? "animate-pulse" : ""} />
                                <span className="hidden sm:inline">収益シミュレーション</span>
                                <span className="sm:hidden">収益Sim</span>
                                {showCostSimulator && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                )}
                            </button>
                        )}

                        {/* 販売単価設定 (シミュレーションモードON時のみ表示) */}
                        {showCostSimulator && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-xl border transition-all max-md:col-span-2 max-md:w-full max-md:justify-between"
                                 style={{
                                     background: isLightMode ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.06)",
                                     borderColor: isLightMode ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.3)",
                                 }}>
                                <Coins size={13} className="text-amber-500 shrink-0" />
                                <span className="text-xs font-bold max-md:hidden" style={{ color: textPrimary }}>ガチャ1回の販売単価:</span>
                                <span className="text-xs font-bold md:hidden" style={{ color: textPrimary }}>販売単価:</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={pullPrice}
                                    onChange={e => {
                                        const n = parseInt(e.target.value, 10);
                                        setPullPrice(Number.isNaN(n) || n < 0 ? 0 : n);
                                    }}
                                    className="w-16 text-right font-bold text-xs bg-transparent border-none outline-none tabular-nums"
                                    style={{ color: textPrimary }}
                                />
                                <span className="text-[10px]" style={{ color: textMuted }}>円</span>
                            </div>
                        )}

                        {/* 均等割りアシスト */}
                        <div className="flex items-center gap-2 ml-auto max-md:col-span-2 max-md:ml-0 max-md:w-full max-md:justify-end">
                            <SplitSquareHorizontal size={13} className="shrink-0" style={{ color: textMuted }} />
                            <span className="text-xs shrink-0" style={{ color: textMuted }}>均等:</span>
                            <select
                                value={equalizeTarget}
                                onChange={e => setEqualizeTarget(e.target.value)}
                                className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
                                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
                            >
                                {sortedRarities.map(r => (
                                    <option key={r.id} value={r.id} style={selectOptionStyle}>{r.name || "（名称なし）"}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleEqualize}
                                className="min-h-11 text-xs px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                                style={{
                                    background: isLightMode ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.2)",
                                    color: isLightMode ? "#7c3aed" : "#c4b5fd",
                                    border: `1px solid ${isLightMode ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.35)"}`,
                                }}
                            >
                                実行
                            </button>
                        </div>
                    </div>

                    {/* ━━━━━ メインコンテンツエリア (2カラム/タブ切り替え対応) ━━━━━ */}
                    <div
                        className={`flex flex-col md:flex-row min-h-0 ${
                            showCostSimulator
                                ? "md:flex-1 md:overflow-hidden max-md:flex-1"
                                : ""
                        }`}
                    >
                        {/* 左カラム / テーブルエリア */}
                        <div
                            className={`flex-1 flex flex-col min-w-0 overflow-x-auto md:overflow-auto scroll-touch ${
                                showCostSimulator && activeTab === "chart" ? "hidden md:flex" : "flex"
                            }`}
                        >
                            {/* スマホ用簡易ステータスバー (モバイル表示＆グリッド選択中のみ) */}
                            {showCostSimulator && activeTab === "grid" && (
                                <div className="px-6 py-2.5 md:hidden border-b flex items-center justify-between text-[11px] font-bold"
                                     style={{ background: isLightMode ? "rgba(0,0,0,0.01)" : "rgba(255,255,255,0.01)", borderColor }}>
                                    <span style={{ color: textMuted }}>簡易ステータス:</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full ${
                                            simulatorData.expectedProfitMargin >= 0
                                                ? (isLightMode ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/10 text-emerald-400")
                                                : (isLightMode ? "bg-rose-100 text-rose-700" : "bg-rose-500/10 text-rose-400")
                                        }`}>
                                            期待利益: {simulatorData.expectedProfitMargin.toFixed(1)}%
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full ${
                                            simulatorData.deficitRisk > 20
                                                ? (isLightMode ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-rose-500/10 text-rose-400 animate-pulse")
                                                : (isLightMode ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/10 text-emerald-400")
                                        }`}>
                                            リスク: {simulatorData.deficitRisk.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* スマホ: 行カード */}
                            <div className="md:hidden px-4 py-3 space-y-3">
                                <AnimatePresence initial={false}>
                                    {displayRows.map((row, idx) => {
                                        const rarity = sortedRarities.find(r => r.id === row.rarityId);
                                        const total = validation.rarityTotals.get(row.rarityId) ?? 0;
                                        const totalOk = Math.abs(total - 100) < 0.5;
                                        const hasEmptyName = validation.emptyNames.has(row.id);
                                        const rarityProb = rarity?.defaultWeight ?? 0;
                                        const globalProb = (rarityProb * row.weight) / 100;

                                        return (
                                            <motion.div
                                                key={row.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <BulkSetupRowCard
                                                    row={row}
                                                    idx={idx}
                                                    rarity={rarity}
                                                    total={total}
                                                    totalOk={totalOk}
                                                    hasEmptyName={hasEmptyName}
                                                    globalProb={globalProb}
                                                    showCostSimulator={showCostSimulator}
                                                    pullPrice={pullPrice}
                                                    sortedRarities={sortedRarities}
                                                    isLightMode={isLightMode}
                                                    textPrimary={textPrimary}
                                                    textMuted={textMuted}
                                                    inputBg={inputBg}
                                                    inputBorder={inputBorder}
                                                    borderColor={borderColor}
                                                    selectOptionStyle={selectOptionStyle}
                                                    onRarityChange={handleRarityChange}
                                                    onNameChange={handleNameChange}
                                                    onToggleLock={handleToggleLock}
                                                    onWeightChange={handleWeightChange}
                                                    onCostChange={handleCostChange}
                                                    onMaxGlobalChange={handleMaxGlobalChange}
                                                    onMaxPlayerChange={handleMaxPlayerChange}
                                                    onDeleteRow={handleRequestDeleteRow}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                {displayRows.length === 0 && (
                                    <div className="py-12 text-center flex flex-col items-center gap-2" style={{ color: textMuted }}>
                                        <Sliders size={28} style={{ opacity: 0.4 }} />
                                        <p className="text-xs">
                                            {filterRarityId === "all"
                                                ? "景品がありません。「行を追加」で追加してください。"
                                                : "このレア度に景品がありません。"}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* md以上: テーブル */}
                            <div className="hidden md:block overflow-x-auto scroll-touch">
                            <table className={`w-full text-xs border-collapse ${showCostSimulator ? "min-w-[850px]" : "min-w-[700px]"}`}>
                                <thead className="sticky top-0 z-10" style={{ background: bgHeader }}>
                                    <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                                        <th className="sticky left-0 top-0 z-20 px-3 py-2.5 text-left font-semibold w-24" style={{ color: textMuted, background: bgHeader }}>レア度</th>
                                        <th className="sticky left-[96px] top-0 z-20 px-3 py-2.5 text-left font-semibold min-w-[160px] border-r" style={{ color: textMuted, background: bgHeader, borderColor }}>景品名</th>
                                         <th className="px-3 py-2.5 text-center font-semibold w-20" style={{ color: textMuted }} title="ガチャ全体での排出上限個数（空欄で無制限）">全体上限</th>
                                         <th className="px-3 py-2.5 text-center font-semibold w-20" style={{ color: textMuted }} title="1プレイヤーあたりの排出上限個数（空欄で無制限）">個人上限</th>
                                        <th className="px-3 py-2.5 text-center font-semibold w-8" style={{ color: textMuted }} title="ロック中は均等割り・比例配分から除外">
                                            <Lock size={10} />
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-semibold w-28" style={{ color: textMuted }}>
                                            確率（レア度内%）
                                        </th>
                                        <th className="hidden md:table-cell px-3 py-2.5 text-right font-semibold w-24" style={{ color: textMuted }}>
                                            全体確率
                                        </th>
                                        {showCostSimulator && (
                                            <>
                                                <th className="hidden md:table-cell px-3 py-2.5 text-right font-semibold w-28" style={{ color: textMuted }}>
                                                    原価
                                                </th>
                                                <th className="hidden md:table-cell px-3 py-2.5 text-right font-semibold w-24" style={{ color: textMuted }}>
                                                    期待原価
                                                </th>
                                                <th className="hidden lg:table-cell px-3 py-2.5 text-right font-semibold w-24" style={{ color: textMuted }}>
                                                    単体損益
                                                </th>
                                            </>
                                        )}
                                        <th className="px-3 py-2.5 text-center font-semibold w-10" style={{ color: textMuted }}>削除</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence initial={false}>
                                        {displayRows.map((row, idx) => {
                                            const rarity = sortedRarities.find(r => r.id === row.rarityId);
                                            const total = validation.rarityTotals.get(row.rarityId) ?? 0;
                                            const totalOk = Math.abs(total - 100) < 0.5;
                                            const hasEmptyName = validation.emptyNames.has(row.id);

                                            const rarityProb = rarity?.defaultWeight ?? 0;
                                            const globalProb = (rarityProb * row.weight) / 100;

                                            const baseRowBg = idx % 2 === 0
                                                ? bgMain
                                                : isLightMode ? "#f9fafb" : "#140f25";
                                            const hoverRowBg = isLightMode ? "#f8f5ff" : "#191230";

                                            return (
                                                <motion.tr
                                                    key={row.id}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="group"
                                                    style={{
                                                        borderBottom: `1px solid ${borderColor}`,
                                                        background: "var(--row-bg)",
                                                        ["--row-bg" as unknown as keyof React.CSSProperties]: baseRowBg,
                                                    } as React.CSSProperties}
                                                    onMouseOver={e => e.currentTarget.style.setProperty("--row-bg", hoverRowBg)}
                                                    onMouseOut={e => e.currentTarget.style.setProperty("--row-bg", baseRowBg)}
                                                >
                                                    {/* レア度プルダウン */}
                                                    <td className="sticky left-0 z-10 px-3 py-2 transition-colors w-24" style={{ background: "var(--row-bg)" }}>
                                                        <select
                                                            value={row.rarityId}
                                                            onChange={e => handleRarityChange(row.id, e.target.value)}
                                                            className="text-[11px] font-bold px-1.5 py-0.5 rounded cursor-pointer outline-none w-full"
                                                            style={{
                                                                color: rarity?.color ?? "#6b7280",
                                                                background: rarity?.bgColor ?? inputBg,
                                                                border: `1px solid ${rarity?.glowColor ?? "rgba(107,114,128,0.3)"}`,
                                                            }}
                                                        >
                                                            {sortedRarities.map(r => (
                                                                <option key={r.id} value={r.id} style={selectOptionStyle}>{r.name || "（名称なし）"}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* 景品名 */}
                                                    <td 
                                                        className="sticky left-[96px] z-10 px-3 py-2 min-w-[160px] transition-colors border-r"
                                                        style={{ 
                                                            background: "var(--row-bg)",
                                                            borderColor,
                                                            boxShadow: "4px 0 8px -4px rgba(0,0,0,0.15)",
                                                        }}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={row.name}
                                                            onChange={e => handleNameChange(row.id, e.target.value)}
                                                            placeholder="景品名を入力"
                                                            className="w-full px-2 py-1 rounded-lg outline-none text-xs transition-all"
                                                            style={{
                                                                background: inputBg,
                                                                border: `1px solid ${hasEmptyName ? "rgba(239,68,68,0.5)" : inputBorder}`,
                                                                color: textPrimary,
                                                            }}
                                                        />
                                                    </td>

                                                    {/* 全体上限 */}
                                                    <td className="px-2 py-2 w-20 text-center">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            placeholder="無制限"
                                                            value={row.maxGlobalCount ? String(row.maxGlobalCount) : ""}
                                                            onChange={e => handleMaxGlobalChange(row.id, e.target.value)}
                                                            className="w-full text-right text-xs px-2 py-1 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-purple-400"
                                                            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
                                                            title="ガチャ全体での排出上限個数（空欄で無制限）"
                                                        />
                                                    </td>

                                                    {/* 個人上限 */}
                                                    <td className="px-2 py-2 w-20 text-center">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            placeholder="無制限"
                                                            value={row.maxPerPlayerCount ? String(row.maxPerPlayerCount) : ""}
                                                            onChange={e => handleMaxPlayerChange(row.id, e.target.value)}
                                                            className="w-full text-right text-xs px-2 py-1 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-purple-400"
                                                            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
                                                            title="1プレイヤーあたりの排出上限個数（空欄で無制限）"
                                                        />
                                                    </td>

                                                    {/* ロックボタン */}
                                                    <td className="px-2 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleLock(row.id)}
                                                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded transition-all cursor-pointer"
                                                            style={{
                                                                color: row.locked
                                                                    ? (isLightMode ? "#d97706" : "#fbbf24")
                                                                    : textMuted,
                                                                background: row.locked
                                                                    ? (isLightMode ? "rgba(217,119,6,0.1)" : "rgba(251,191,36,0.1)")
                                                                    : "transparent",
                                                            }}
                                                            title={row.locked ? "ロック中（クリックして解除）" : "クリックしてロック"}
                                                            aria-pressed={row.locked}
                                                            aria-label={row.locked ? "確率ロックを解除" : "確率をロック"}
                                                        >
                                                            {row.locked ? <Lock size={10} /> : <Unlock size={10} />}
                                                        </button>
                                                    </td>

                                                    {/* 確率入力 */}
                                                    <td className="px-3 py-2">
                                                        <WeightCell
                                                            row={row}
                                                            totalOk={totalOk}
                                                            total={total}
                                                            isLightMode={isLightMode}
                                                            textPrimary={textPrimary}
                                                            textMuted={textMuted}
                                                            inputBg={inputBg}
                                                            inputBorder={inputBorder}
                                                            onWeightChange={handleWeightChange}
                                                        />
                                                    </td>

                                                    {/* 全体確率（md以上） */}
                                                    <td className="hidden md:table-cell px-3 py-2 text-right font-semibold tabular-nums text-xs" style={{ color: textMuted }}>
                                                        {fmtW(globalProb)}%
                                                    </td>

                                                    {/* 原価・期待原価・単体損益 */}
                                                    {showCostSimulator && (
                                                        <>
                                                            <td className="hidden md:table-cell px-3 py-2">
                                                                <CostCell
                                                                    row={row}
                                                                    textPrimary={textPrimary}
                                                                    textMuted={textMuted}
                                                                    inputBg={inputBg}
                                                                    inputBorder={inputBorder}
                                                                    onCostChange={handleCostChange}
                                                                />
                                                            </td>

                                                            <td className="hidden md:table-cell px-3 py-2 text-right font-semibold tabular-nums text-xs" style={{ color: textMuted }}>
                                                                {fmtPrice((globalProb * row.costPrice) / 100)}円
                                                            </td>

                                                            <td className={`hidden lg:table-cell px-3 py-2 text-right font-semibold tabular-nums text-xs ${
                                                                (pullPrice - row.costPrice) >= 0
                                                                    ? (isLightMode ? "text-emerald-600" : "text-emerald-400 font-semibold")
                                                                    : (isLightMode ? "text-rose-600" : "text-rose-400 font-semibold")
                                                            }`}>
                                                                {(pullPrice - row.costPrice) >= 0 ? "+" : ""}{fmtPrice(pullPrice - row.costPrice)}円
                                                            </td>
                                                        </>
                                                    )}

                                                    {/* 削除ボタン */}
                                                    <td className="px-2 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestDeleteRow(row.id)}
                                                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded transition-colors text-red-400 opacity-0 max-md:opacity-100 group-hover:opacity-100 cursor-pointer"
                                                            style={{ background: "transparent" }}
                                                            onMouseOver={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                                                            onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                                                            title="この行を削除"
                                                            aria-label="行を削除"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>

                                    {/* 空の場合のメッセージ */}
                                    {displayRows.length === 0 && (
                                        <tr>
                                            <td colSpan={showCostSimulator ? 9 : 6} className="px-6 py-12 text-center" style={{ color: textMuted }}>
                                                <div className="flex flex-col items-center gap-2">
                                                    <Sliders size={28} style={{ color: textMuted, opacity: 0.4 }} />
                                                    <p className="text-xs">
                                                        {filterRarityId === "all"
                                                            ? "景品がありません。「行を追加」で追加してください。"
                                                            : "このレア度に景品がありません。"}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {/* 右カラム / シミュレータグラフエリア */}
                        {showCostSimulator && (
                            <div
                                className={`w-full md:w-[420px] lg:w-[480px] shrink-0 border-t md:border-t-0 md:border-l p-6 overflow-y-auto flex flex-col min-h-[300px] max-md:min-h-[min(52dvh,420px)] max-md:flex-1 md:min-h-0 ${
                                    activeTab === "grid" ? "hidden md:flex" : "flex"
                                }`}
                                style={{
                                    borderColor,
                                    background: isLightMode ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.01)",
                                }}
                            >
                                <div className="mb-4">
                                    <h3 className="text-xs font-bold" style={{ color: textPrimary }}>
                                        収益シミュレーション
                                    </h3>
                                    <p className="text-[10px]" style={{ color: textMuted }}>
                                        確率と原価に基づき、ガチャ1回あたりの期待値をリアルタイム計算します
                                    </p>
                                </div>
                                <GachaProfitChart
                                    data={simulatorData.chartData}
                                    isLightMode={isLightMode}
                                    pullPrice={pullPrice}
                                    expectedCost={simulatorData.expectedCost}
                                    deficitRisk={simulatorData.deficitRisk}
                                    expectedProfitMargin={simulatorData.expectedProfitMargin}
                                />
                            </div>
                        )}
                    </div>

                    {/* ━━━━━ バリデーションサマリ ━━━━━ */}
                    <div
                        className="px-6 py-3 flex flex-wrap gap-2 items-center max-md:max-h-24 max-md:overflow-y-auto scroll-touch"
                        style={{ borderTop: `1px solid ${borderColor}`, background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)" }}
                    >
                        <span className="text-xs font-semibold shrink-0 max-md:w-full md:hidden" style={{ color: textMuted }}>
                            {validation.isValid ? (
                                <>合計チェック: <span className="text-emerald-500">OK</span></>
                            ) : (
                                <>合計チェック: <span className="text-red-500">要確認</span></>
                            )}
                            <span className="font-normal" style={{ color: textMuted }}>（下にスクロール）</span>
                        </span>
                        <span className="hidden md:inline text-xs font-semibold shrink-0" style={{ color: textMuted }}>レア度内合計:</span>
                        {sortedRarities.map(r => {
                            const total = validation.rarityTotals.get(r.id);
                            if (total === undefined) return null;
                            const ok = Math.abs(total - 100) < 0.5;
                            return (
                                <span
                                    key={r.id}
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold"
                                    style={{
                                        color: ok ? r.color : (isLightMode ? "#dc2626" : "#f87171"),
                                        background: ok ? r.bgColor : (isLightMode ? "rgba(220,38,38,0.08)" : "rgba(248,113,113,0.1)"),
                                        border: `1px solid ${ok ? r.glowColor : (isLightMode ? "rgba(220,38,38,0.2)" : "rgba(248,113,113,0.2)")}`,
                                    }}
                                >
                                    {ok ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                                    {(r.name || "（名称なし）")}: {fmtW(total)}%
                                </span>
                            );
                        })}
                        {validation.emptyNames.size > 0 && (
                            <span className="text-[10px] text-red-500 flex items-center gap-1">
                                <AlertCircle size={9} />
                                {validation.emptyNames.size}件の景品名が未入力です
                            </span>
                        )}
                        {!validation.isRaritiesSumOk && (
                            <span className="text-[10px] text-red-500 flex items-center gap-1">
                                <AlertCircle size={9} />
                                レア度確率の合計が100%になっていません（現在 {fmtW(validation.rarityWeightTotal)}%）
                            </span>
                        )}
                        {validation.hasEmptyRarityNames && (
                            <span className="text-[10px] text-red-500 flex items-center gap-1">
                                <AlertCircle size={9} />
                                レア度名が未入力のものがあります
                            </span>
                        )}
                        {canBulkFix && (
                            <button
                                type="button"
                                onClick={handleBulkFix}
                                className="ml-auto max-md:ml-0 max-md:w-full flex items-center justify-center gap-1.5 min-h-11 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0"
                                style={{
                                    background: isLightMode ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.22)",
                                    color: isLightMode ? "#6d28d9" : "#ddd6fe",
                                    border: `1px solid ${isLightMode ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.45)"}`,
                                }}
                            >
                                <Wand2 size={12} />
                                一括で修正
                            </button>
                        )}
                    </div>
                    </div>

                    {/* ━━━━━ 期待値シミュレーションの計算 ━━━━━ */}
                    {showCostSimulator && (
                        <div
                            className="hidden md:flex px-6 py-4 shrink-0 flex-wrap items-center justify-between gap-4 transition-all"
                            style={{
                                borderTop: `1px solid ${borderColor}`,
                                background: simulatorData.expectedCost > pullPrice
                                    ? (isLightMode ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.06)")
                                    : (isLightMode ? "rgba(16,185,129,0.02)" : "rgba(16,185,129,0.04)"),
                                borderColor: simulatorData.expectedCost > pullPrice
                                    ? (isLightMode ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.3)")
                                    : borderColor,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${simulatorData.expectedCost > pullPrice ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"}`}>
                                    <Coins size={14} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold" style={{ color: textPrimary }}>
                                        期待値シミュレーション
                                    </h3>
                                    <p className="text-[10px]" style={{ color: textMuted }}>
                                        確率と原価に基づき、ガチャ1回あたりの期待値をリアルタイム計算します
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                                {/* 平均期待原価 */}
                                <div className="flex flex-col">
                                    <span className="text-[10px]" style={{ color: textMuted }}>平均期待原価</span>
                                    <span className="text-base font-extrabold tabular-nums" style={{ color: textPrimary }}>
                                        {fmtPrice(simulatorData.expectedCost)} <span className="text-xs font-medium">円</span>
                                    </span>
                                </div>

                                {/* 期待利益率 */}
                                <div className="flex flex-col">
                                    <span className="text-[10px]" style={{ color: textMuted }}>期待利益率</span>
                                    <span className={`text-base font-extrabold tabular-nums flex items-center gap-1 ${
                                        simulatorData.expectedProfitMargin >= 0
                                            ? (isLightMode ? "text-emerald-600" : "text-emerald-400")
                                            : (isLightMode ? "text-rose-600" : "text-rose-400")
                                    }`}>
                                        {simulatorData.expectedProfitMargin >= 0 ? "+" : ""}{simulatorData.expectedProfitMargin.toFixed(1)}%
                                    </span>
                                </div>

                                {/* ステータスバッジ/警告アラート */}
                                {simulatorData.expectedCost > pullPrice ? (
                                    <motion.div
                                        animate={{ scale: [1, 1.02, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-500 font-bold text-xs"
                                    >
                                        <AlertCircle size={13} />
                                        <span>⚠️ 期待値赤字状態です。確率または原価を見直してください。</span>
                                    </motion.div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                                        <CheckCircle2 size={13} />
                                        <span>期待値黒字（安全）</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ━━━━━ フッター ━━━━━ */}
                    <div
                        className="flex items-center justify-between gap-3 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shrink-0"
                        style={{ borderTop: `1px solid ${borderColor}`, background: bgHeader }}
                    >
                        {/* 行追加ボタン */}
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="flex items-center gap-1.5 min-h-11 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                            style={{
                                background: isLightMode ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.15)",
                                color: isLightMode ? "#7c3aed" : "#c4b5fd",
                                border: `1px solid ${isLightMode ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.25)"}`,
                            }}
                        >
                            <Plus size={12} />
                            行を追加
                        </button>

                        <div className="flex items-center gap-3">
                            {/* キャンセル */}
                            <button
                                type="button"
                                onClick={handleRequestClose}
                                className="min-h-11 px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                style={{
                                    color: textMuted,
                                    background: "transparent",
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                キャンセル
                            </button>

                            {/* 適用 */}
                            <button
                                type="button"
                                onClick={handleRequestApply}
                                disabled={rows.length === 0}
                                className="flex items-center gap-2 min-h-11 px-6 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer"
                                style={{
                                    background: validation.isValid
                                        ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
                                        : "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)",
                                    color: "#ffffff",
                                    boxShadow: validation.isValid
                                        ? "0 4px 20px rgba(124,58,237,0.35)"
                                        : "none",
                                }}
                            >
                                <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />
                                {validation.isValid ? "設定を適用" : "警告を無視して適用"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);
}

