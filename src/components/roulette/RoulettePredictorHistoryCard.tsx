"use client";

import { X } from "lucide-react";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { RoulettePredictor, RouletteHitHistoryEntry } from "@/lib/roulette";

interface RoulettePredictorHistoryCardProps {
    predictor: RoulettePredictor;
    hitHistory: RouletteHitHistoryEntry[];
    isLightMode: boolean;
    onClose: () => void;
}

export default function RoulettePredictorHistoryCard({
    predictor,
    hitHistory,
    isLightMode,
    onClose,
}: RoulettePredictorHistoryCardProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textSecondary = isLightMode ? "text-gray-700" : "text-white/75";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    const myHits = hitHistory.filter((e) => e.hitPredictorIds.includes(predictor.id));
    const hitCount = myHits.length;

    return (
        <div
            className="rounded-2xl overflow-hidden flex flex-col max-h-[85vh] w-full max-w-md mx-auto shadow-2xl"
            style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: "blur(12px)" }}
        >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${glassBorder}` }}>
                <h2 className={`text-sm font-bold ${textPrimary}`}>{predictor.name.trim() || "名前なし"} のあたり履歴</h2>
                <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-all ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                    title="閉じる"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scroll-touch p-4 space-y-4">
                <div>
                    <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>現在の予想</span>
                    <p className={`text-sm font-medium mt-0.5 ${textPrimary}`}>{predictor.prediction.trim() || "—"}</p>
                </div>
                <div>
                    <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>当たり回数</span>
                    <p className={`text-lg font-bold mt-0.5 ${textSecondary}`}>{hitCount}回</p>
                </div>
                {myHits.length > 0 ? (
                    <div className="rounded-xl overflow-hidden shrink-0" style={{ background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)", border: `1px solid ${glassBorder}` }}>
                        <div className={`px-3 py-2 border-b ${textMuted}`} style={{ borderColor: glassBorder }}>
                            <span className="text-xs font-semibold uppercase tracking-wider">過去のあたり</span>
                        </div>
                        <ul className="flex flex-col max-h-60 overflow-y-auto scroll-touch">
                            {myHits.map((entry, i) => (
                                <li
                                    key={`${entry.resultLabel}-${i}`}
                                    className={`px-3 py-2 border-b last:border-b-0 ${isLightMode ? "text-gray-800" : "text-white/90"}`}
                                    style={{ borderColor: glassBorder }}
                                >
                                    結果「{entry.resultLabel}」で当たり
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className={`text-sm ${textMuted}`}>まだあたり履歴はありません。</p>
                )}
            </div>
        </div>
    );
}
