"use client";

import React, { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Info,
    ArrowUpRight,
} from "lucide-react";

// ============================================================
// 型定義
// ============================================================

export interface SimDataPoint {
    pulls: number;
    revenue: number;
    expectedCost: number;
    simulatedCost: number;
    expectedProfit: number;
    simulatedProfit: number;
}

interface GachaProfitChartProps {
    data: SimDataPoint[];
    isLightMode: boolean;
    pullPrice: number;
    expectedCost: number;
    deficitRisk: number;
    expectedProfitMargin: number;
}

// ============================================================
// ユーティリティ
// ============================================================

function fmtPrice(val: number): string {
    if (Number.isInteger(val)) {
        return val.toLocaleString("ja-JP");
    }
    return val.toLocaleString("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

// ============================================================
// カスタムツールチップコンポーネント
// ============================================================

interface CustomTooltipProps {
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[];
    label?: string | number;
    isLightMode: boolean;
}

function CustomTooltip({ active, payload, label, isLightMode }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const bg = isLightMode ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 10, 30, 0.95)";
    const border = isLightMode ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.15)";
    const textPrimary = isLightMode ? "#111827" : "#f1f5f9";
    const textMuted = isLightMode ? "#6b7280" : "rgba(255, 255, 255, 0.5)";

    // payloadから各数値を取得
    const rawData = payload[0]?.payload as SimDataPoint | undefined;
    if (!rawData) return null;

    const { revenue, expectedProfit, simulatedProfit, simulatedCost } = rawData;

    return (
        <div
            className="p-3.5 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-1.5"
            style={{ background: bg, border, color: textPrimary }}
        >
            <p className="text-[10px] font-bold tracking-wider" style={{ color: textMuted }}>
                🎯 {label} 回目の試行時
            </p>
            <div className="h-[1px] w-full my-1" style={{ background: isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }} />
            
            <div className="flex items-center justify-between gap-6 text-xs font-medium">
                <span className="flex items-center gap-1.5" style={{ color: textMuted }}>
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    累積売上:
                </span>
                <span className="tabular-nums font-bold">{fmtPrice(revenue)}円</span>
            </div>

            <div className="flex items-center justify-between gap-6 text-xs font-medium">
                <span className="flex items-center gap-1.5" style={{ color: textMuted }}>
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    実積累積原価:
                </span>
                <span className="tabular-nums font-semibold">{fmtPrice(simulatedCost)}円</span>
            </div>

            <div className="flex items-center justify-between gap-6 text-xs font-medium">
                <span className="flex items-center gap-1.5" style={{ color: textMuted }}>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    期待利益 (理論値):
                </span>
                <span className={`tabular-nums font-extrabold ${expectedProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {expectedProfit >= 0 ? "+" : ""}{fmtPrice(expectedProfit)}円
                </span>
            </div>

            <div className="flex items-center justify-between gap-6 text-xs font-medium">
                <span className="flex items-center gap-1.5" style={{ color: textMuted }}>
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    シミュレート利益:
                </span>
                <span className={`tabular-nums font-black ${simulatedProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {simulatedProfit >= 0 ? "+" : ""}{fmtPrice(simulatedProfit)}円
                </span>
            </div>
        </div>
    );
}

// ============================================================
// メインコンポーネント
// ============================================================

export default function GachaProfitChart({
    data,
    isLightMode,
    pullPrice,
    expectedCost,
    deficitRisk,
    expectedProfitMargin,
}: GachaProfitChartProps) {
    const textPrimary = isLightMode ? "#111827" : "#f1f5f9";
    const textMuted = isLightMode ? "#6b7280" : "rgba(255, 255, 255, 0.4)";
    const borderColor = isLightMode ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.08)";
    const chartGridColor = isLightMode ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.04)";

    // 損益分岐点（累積期待利益 ≧ 0 になる最初の pulls）を計算
    const breakEvenPulls = useMemo(() => {
        if (pullPrice <= expectedCost) return null; // そもそも期待赤字状態なら分岐点はない
        const point = data.find((d) => d.expectedProfit >= 0);
        return point ? point.pulls : null;
    }, [data, pullPrice, expectedCost]);

    const isDeficit = pullPrice < expectedCost;
    const isRiskHigh = deficitRisk > 20;

    return (
        <div className="flex flex-col gap-5 h-full w-full">
            {/* ━━━━━ 財務指標サマリ ━━━━━ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 期待値ベース利益率 */}
                <div
                    className="p-3 rounded-2xl border flex flex-col gap-1 backdrop-blur-md hover:shadow-lg transition-all"
                    style={{
                        background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                        borderColor: borderColor,
                    }}
                >
                    <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: textMuted }}>
                        <span>期待利益率</span>
                        {expectedProfitMargin >= 0 ? (
                            <TrendingUp size={11} className="text-emerald-400" />
                        ) : (
                            <TrendingDown size={11} className="text-rose-400" />
                        )}
                    </div>
                    <span
                        className={`text-lg font-black tracking-tight tabular-nums mt-0.5 ${
                            expectedProfitMargin >= 0
                                ? isLightMode
                                    ? "text-emerald-600"
                                    : "text-emerald-400"
                                : isLightMode
                                    ? "text-rose-600"
                                    : "text-rose-400"
                        }`}
                    >
                        {expectedProfitMargin >= 0 ? "+" : ""}
                        {expectedProfitMargin.toFixed(1)}%
                    </span>
                    <span className="text-[9px]" style={{ color: textMuted }}>
                        1回300円あたり {fmtPrice(pullPrice - expectedCost)}円の利益
                    </span>
                </div>

                {/* モンテカルロ赤字リスク */}
                <div
                    className="p-3 rounded-2xl border flex flex-col gap-1 backdrop-blur-md hover:shadow-lg transition-all"
                    style={{
                        background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                        borderColor: isRiskHigh
                            ? isLightMode
                                ? "rgba(239,68,68,0.2)"
                                : "rgba(239,68,68,0.3)"
                            : borderColor,
                    }}
                >
                    <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: textMuted }}>
                        <span>赤字発生リスク (1000連時)</span>
                        <AlertCircle
                            size={11}
                            className={
                                isRiskHigh
                                    ? "text-rose-500 animate-pulse"
                                    : isDeficit
                                        ? "text-rose-500"
                                        : "text-emerald-400"
                            }
                        />
                    </div>
                    <span
                        className={`text-lg font-black tracking-tight tabular-nums mt-0.5 ${
                            isDeficit || isRiskHigh
                                ? isLightMode
                                    ? "text-rose-600"
                                    : "text-rose-400 font-bold"
                                : isLightMode
                                    ? "text-emerald-600"
                                    : "text-emerald-400"
                        }`}
                    >
                        {isDeficit ? "100.0" : deficitRisk.toFixed(1)}%
                    </span>
                    <span className="text-[9px]" style={{ color: textMuted }}>
                        {isDeficit
                            ? "期待値赤字のため必ず損失が発生します"
                            : deficitRisk > 0
                                ? `偏りにより約 ${Math.round(100 / deficitRisk)}回に1回は赤字化`
                                : "確率的下振れでも赤字リスク極小"}
                    </span>
                </div>

                {/* 損益分岐点 */}
                <div
                    className="p-3 rounded-2xl border flex flex-col gap-1 backdrop-blur-md hover:shadow-lg transition-all col-span-2 sm:col-span-1"
                    style={{
                        background: isLightMode ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                        borderColor: borderColor,
                    }}
                >
                    <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: textMuted }}>
                        <span>損益分岐点 (回収目標)</span>
                        <ArrowUpRight size={11} className="text-purple-400" />
                    </div>
                    <span className="text-lg font-black tracking-tight tabular-nums mt-0.5" style={{ color: textPrimary }}>
                        {breakEvenPulls !== null ? (
                            <>
                                {breakEvenPulls} <span className="text-xs font-semibold">回引時</span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-rose-500">回収不可 (期待赤字)</span>
                        )}
                    </span>
                    <span className="text-[9px]" style={{ color: textMuted }}>
                        {breakEvenPulls !== null
                            ? `売上累計が累積原価を上回る目安`
                            : "設定確率または単価の改善が必要です"}
                    </span>
                </div>
            </div>

            {/* ━━━━━ リアルタイムチャート ━━━━━ */}
            <div
                className="w-full p-4 rounded-3xl border relative min-h-[220px] h-[220px] md:flex-1 md:h-auto"
                style={{
                    background: isLightMode ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.01)",
                    borderColor: borderColor,
                }}
            >
                <div className="absolute top-3 left-4 flex items-center gap-1.5 pointer-events-none">
                    <Info size={11} className="text-purple-500" />
                    <span className="text-[10px] font-bold" style={{ color: textMuted }}>
                        ゴールド: 期待利益 (理論値) | パープル: モンテカルロ利益 (実際のブレ)
                    </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            {/* シミュレート利益の発光グラデーション */}
                            <linearGradient id="colorSimulatedProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#c084fc" stopOpacity={isLightMode ? 0.35 : 0.45} />
                                <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                            </linearGradient>
                            {/* 期待利益の発光グラデーション */}
                            <linearGradient id="colorExpectedProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fbbf24" stopOpacity={isLightMode ? 0.15 : 0.25} />
                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />

                        <XAxis
                            dataKey="pulls"
                            tick={{ fill: textMuted, fontSize: 10 }}
                            stroke={borderColor}
                            axisLine={false}
                        />

                        <YAxis
                            tick={{ fill: textMuted, fontSize: 10 }}
                            stroke={borderColor}
                            axisLine={false}
                            tickFormatter={(v: number) => {
                                if (v === 0) return "0";
                                const isNeg = v < 0;
                                const absV = Math.abs(v);
                                const fmt = absV >= 10000 ? `${(absV / 10000).toFixed(0)}万` : absV >= 1000 ? `${(absV / 1000).toFixed(0)}k` : String(absV);
                                return `${isNeg ? "-" : ""}${fmt}円`;
                            }}
                        />

                        <Tooltip
                            content={<CustomTooltip isLightMode={isLightMode} />}
                            cursor={{ stroke: "rgba(139, 92, 246, 0.2)", strokeWidth: 1 }}
                        />

                        {/* 損益分岐点リファレンス線 */}
                        {breakEvenPulls !== null && (
                            <ReferenceLine
                                x={breakEvenPulls}
                                stroke="#10b981"
                                strokeDasharray="3 3"
                                strokeWidth={1.5}
                                label={{
                                    value: "損益分岐点",
                                    fill: isLightMode ? "#059669" : "#34d399",
                                    fontSize: 9,
                                    position: "top",
                                    fontWeight: "bold",
                                }}
                            />
                        )}

                        {/* 収益ゼロリファレンス線 */}
                        <ReferenceLine
                            y={0}
                            stroke={isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}
                            strokeWidth={1}
                        />

                        {/* 期待累積利益 (Area) */}
                        <Area
                            type="monotone"
                            dataKey="expectedProfit"
                            stroke="#fbbf24"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorExpectedProfit)"
                            name="期待利益"
                        />

                        {/* 実際のシミュレーション利益 (Area) */}
                        <Area
                            type="monotone"
                            dataKey="simulatedProfit"
                            stroke="#c084fc"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSimulatedProfit)"
                            name="実積利益"
                            activeDot={{ r: 5, stroke: "#c084fc", strokeWidth: 1, fill: "#fff" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* ━━━━━ 赤字警告アラート（赤字時のみ表示） ━━━━━ */}
            {isDeficit && (
                <div
                    className="p-3 rounded-2xl border flex items-center gap-3 animate-pulse"
                    style={{
                        background: "rgba(239, 68, 68, 0.08)",
                        borderColor: "rgba(239, 68, 68, 0.25)",
                    }}
                >
                    <AlertCircle className="text-rose-500 shrink-0 animate-bounce" size={16} />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-rose-500">
                            期待値赤字警告
                        </span>
                        <span className="text-[10px] leading-relaxed" style={{ color: textPrimary }}>
                            現在の設定ではガチャ1回あたりの期待原価（{fmtPrice(expectedCost)}円）が販売価格（{fmtPrice(pullPrice)}円）を上回っているため、引けば引くほど高確率で赤字が累積します。確率を下げるか、景品原価を見直してください。
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
