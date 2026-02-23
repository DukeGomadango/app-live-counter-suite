"use client";

import { useGlassStyle } from "@/hooks/useGlassStyle";

interface RouletteStatsPanelProps {
    history: number[];
    slots: string[];
    onClear: () => void;
    isLightMode: boolean;
    accentColor: string;
    showBarChart?: boolean;
    showPieChart?: boolean;
}

export default function RouletteStatsPanel({
    history,
    slots,
    onClear,
    isLightMode,
    accentColor,
    showBarChart = true,
    showPieChart = false,
}: RouletteStatsPanelProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/60";

    const counts = slots.length > 0
        ? slots.map((_, i) => history.filter((idx) => idx === i).length)
        : [];
    const uniqueLabels = slots.length > 0 ? [...new Set(slots)] : [];
    const labelCounts = uniqueLabels.map((label) =>
        history.filter((idx) => slots[idx] === label).length
    );
    const maxCount = Math.max(1, ...labelCounts);

    return (
        <div
            className="rounded-2xl border flex flex-col overflow-hidden min-h-0 flex-1 w-full min-w-0"
            style={{ background: glassBg, borderColor: glassBorder, backdropFilter: "blur(16px)" }}
        >
            <div className="px-3 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: glassBorder }}>
                <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>統計</span>
                <button
                    type="button"
                    onClick={onClear}
                    className="px-2 py-1 rounded-lg text-sm border transition-colors"
                    style={{ borderColor: glassBorder }}
                >
                    記録をリセット
                </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
                {/* 一覧（新しい順） */}
                <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>出た数字</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {history.length === 0 ? (
                            <span className={`text-sm ${textSecondary}`}>まだ履歴がありません</span>
                        ) : (
                            [...history].reverse().slice(0, 100).map((idx, i) => (
                                <span
                                    key={`${idx}-${history.length - 1 - i}`}
                                    className="px-2 py-0.5 rounded text-sm font-medium"
                                    style={{ background: `${accentColor}20`, color: accentColor }}
                                >
                                    {slots[idx] ?? `#${idx}`}
                                </span>
                            ))
                        )}
                        {history.length > 100 && (
                            <span className={`text-xs ${textSecondary}`}>…他 {history.length - 100} 件</span>
                        )}
                    </div>
                </div>
                {/* バーチャート */}
                {showBarChart && (
                    <div>
                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>出現回数</h3>
                        {slots.length === 0 ? (
                            <span className={`text-sm ${textSecondary}`}>スロットがありません</span>
                        ) : (
                            <div className="space-y-1.5">
                                {uniqueLabels.map((label, i) => {
                                    const count = labelCounts[i] ?? 0;
                                    const w = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                    return (
                                        <div key={label} className="flex items-center gap-2">
                                            <span className={`w-8 shrink-0 text-xs truncate ${textPrimary}`} title={label}>
                                                {label.length > 4 ? label.slice(0, 4) + "…" : label}
                                            </span>
                                            <div className="flex-1 min-w-0 h-5 rounded overflow-hidden" style={{ background: isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }}>
                                                <div
                                                    className="h-full rounded transition-all duration-300"
                                                    style={{
                                                        width: `${w}%`,
                                                        background: count > 0 ? accentColor : "transparent",
                                                        opacity: count > 0 ? 0.85 : 0,
                                                    }}
                                                />
                                            </div>
                                            <span className={`w-6 text-right text-xs tabular-nums ${textSecondary}`}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                {/* 円グラフ */}
                {showPieChart && uniqueLabels.length > 0 && (() => {
                    const total = labelCounts.reduce((a, b) => a + b, 0);
                    if (total === 0) return <p className={`text-sm ${textSecondary}`}>データがありません</p>;
                    const cx = 60;
                    const cy = 60;
                    const r = 50;
                    const hueStep = 360 / Math.max(1, labelCounts.filter((c) => c > 0).length);
                    let acc = 0;
                    const segments = labelCounts
                        .map((count, i) => {
                            if (count === 0) return null;
                            const startAngle = (acc / total) * 360;
                            acc += count;
                            const endAngle = (acc / total) * 360;
                            const startRad = ((startAngle - 90) * Math.PI) / 180;
                            const endRad = ((endAngle - 90) * Math.PI) / 180;
                            const x1 = cx + r * Math.cos(startRad);
                            const y1 = cy + r * Math.sin(startRad);
                            const x2 = cx + r * Math.cos(endRad);
                            const y2 = cy + r * Math.sin(endRad);
                            const large = endAngle - startAngle > 180 ? 1 : 0;
                            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                            const hue = (i * hueStep) % 360;
                            const fill = `hsl(${hue}, 60%, 55%)`;
                            return { d, fill, label: uniqueLabels[i], count };
                        })
                        .filter(Boolean) as { d: string; fill: string; label: string; count: number }[];
                    return (
                        <div>
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>円グラフ</h3>
                            <div className="flex items-center gap-4">
                                <svg width={120} height={120} viewBox="0 0 120 120" className="shrink-0">
                                    {segments.map((seg, i) => (
                                        <path key={i} d={seg.d} fill={seg.fill} stroke={isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} strokeWidth="1" />
                                    ))}
                                </svg>
                                <ul className="flex-1 min-w-0 space-y-1 text-xs">
                                    {segments.map((seg, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.fill }} />
                                            <span className={`truncate ${textPrimary}`}>{seg.label}</span>
                                            <span className={`tabular-nums ${textSecondary}`}>{seg.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
