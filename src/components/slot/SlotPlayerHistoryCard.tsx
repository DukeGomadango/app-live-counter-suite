"use client";

import { useState } from "react";
import { X, RotateCw, Coins, Percent, Trophy, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import type { SlotPlayer, SlotSpinRecord, SlotSymbol } from "@/lib/slot";

interface SlotPlayerHistoryCardProps {
  player: SlotPlayer;
  isLightMode: boolean;
  onClose: () => void;
  resolvedStrips?: SlotSymbol[][];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatTimeWithSeconds(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export default function SlotPlayerHistoryCard({
  player,
  isLightMode,
  onClose,
  resolvedStrips,
}: SlotPlayerHistoryCardProps) {
  const { glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";

  const history = (player.spinHistory ?? []).slice().reverse();
  const totalSpins = history.length;
  const totalBet = history.reduce((s, r) => s + r.bet, 0);
  const totalPayout = history.reduce((s, r) => s + r.payout, 0);
  const bonusCount = history.filter((r) => r.bonusTriggered).length;
  const replayCount = history.filter((r) => r.isReplay).length;
  const ceilingCount = history.filter((r) => r.ceilingTriggered).length;
  const actualPercent =
    totalBet > 0 ? ((totalPayout / totalBet) * 100).toFixed(1) : "—";
  
  const netProfit = totalPayout - totalBet;

  // 大当り・ニアミス集計
  const totalWins = history.filter((r) => r.payout > 0 || r.winLabels.length > 0).length;
  const nearMissCount = history.filter((r) => r.isNearMiss).length;
  const hitRate = totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(1) : "0.0";
  const nearMissRate = totalSpins > 0 ? ((nearMissCount / totalSpins) * 100).toFixed(1) : "0.0";

  // フィルタ・開閉・もっと見る状態
  const [filter, setFilter] = useState<"all" | "win" | "nearMiss">("all");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(15);

  // 履歴のフィルタリング
  const filteredHistory = history.filter((r) => {
    if (filter === "win") return r.payout > 0 || r.winLabels.length > 0;
    if (filter === "nearMiss") return r.isNearMiss;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedRecordId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${glassBorder}` }}
      >
        <h2 className={`text-base font-black tracking-wide ${textPrimary}`}>
          {player.name} <span className="text-xs font-normal opacity-60 ml-1">のプレイ履歴</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className={`p-2 rounded-xl transition-all border ${
            isLightMode 
              ? "hover:bg-gray-100 text-gray-600 border-black/5" 
              : "hover:bg-white/10 text-white/85 border-white/5"
          }`}
          title="閉じる"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {/* 1. Spins */}
          <div className={`p-4 rounded-2xl flex flex-col gap-1 border transition-all ${
            isLightMode ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5"
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-purple-400">
              <RotateCw size={12} className="animate-spin-slow" />
              <span>回転数</span>
            </div>
            <span className={`text-2xl font-black ${textPrimary}`}>
              {totalSpins} <span className="text-xs font-normal opacity-70">回</span>
            </span>
          </div>
          
          {/* 2. Net Profit */}
          <div className={`p-4 rounded-2xl flex flex-col gap-1 border transition-all ${
            netProfit > 0 
              ? (isLightMode ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]") 
              : netProfit < 0 
                ? (isLightMode ? "bg-rose-500/5 border-rose-500/20" : "bg-rose-500/5 border-rose-500/20")
                : (isLightMode ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5")
          }`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
              netProfit > 0 ? "text-emerald-400" : netProfit < 0 ? "text-rose-400" : "text-gray-400"
            }`}>
              <Coins size={12} />
              <span>純収支</span>
            </div>
            <span className={`text-2xl font-black ${
              netProfit > 0 ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]" : netProfit < 0 ? "text-rose-400" : textPrimary
            }`}>
              {netProfit > 0 ? `+${netProfit}` : netProfit} <span className="text-xs font-normal opacity-70">枚</span>
            </span>
          </div>

          {/* 3. RTP */}
          <div className={`p-4 rounded-2xl flex flex-col gap-1 border transition-all ${
            totalBet > 0 && parseFloat(actualPercent) >= 100
              ? (isLightMode ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]")
              : (isLightMode ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5")
          }`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
              totalBet > 0 && parseFloat(actualPercent) >= 100 ? "text-amber-400" : "text-cyan-400"
            }`}>
              <Percent size={12} />
              <span>実質機械割</span>
            </div>
            <span className={`text-2xl font-black ${
              totalBet > 0 && parseFloat(actualPercent) >= 100 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]" : textPrimary
            }`}>
              {actualPercent}<span className="text-xs font-normal opacity-70">%</span>
            </span>
          </div>

          {/* 4. Bonus Count */}
          <div className={`p-4 rounded-2xl flex flex-col gap-1 border transition-all ${
            bonusCount > 0
              ? (isLightMode ? "bg-purple-500/5 border-purple-500/20" : "bg-purple-500/5 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]")
              : (isLightMode ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5")
          }`}>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-purple-400">
              <Trophy size={12} />
              <span>ボーナス成立</span>
            </div>
            <span className={`text-2xl font-black ${bonusCount > 0 ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]" : textPrimary}`}>
              {bonusCount} <span className="text-xs font-normal opacity-70">回</span>
            </span>
          </div>
        </div>

        {/* Spin内訳セグメントバー */}
        {totalSpins > 0 && (
          <div className={`p-4 rounded-2xl border shrink-0 flex flex-col gap-2 transition-all ${
            isLightMode ? "bg-black/[0.01] border-black/5" : "bg-white/[0.01] border-white/5"
          }`}>
            <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-purple-400">
              <span className="flex items-center gap-1">📊 スピン内訳 (Hits & Near Misses)</span>
              <span>総プレイ: {totalSpins}回</span>
            </div>
            
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-200 dark:bg-white/5 border border-black/5 dark:border-white/5">
              {totalWins > 0 && (
                <div 
                  style={{ width: `${(totalWins / totalSpins) * 100}%` }} 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 ease-out" 
                  title={`大当り: ${totalWins}回`}
                />
              )}
              {nearMissCount > 0 && (
                <div 
                  style={{ width: `${(nearMissCount / totalSpins) * 100}%` }} 
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-500 ease-out animate-pulse" 
                  title={`惜しい！: ${nearMissCount}回`}
                />
              )}
              {totalSpins - totalWins - nearMissCount > 0 && (
                <div 
                  style={{ width: `${((totalSpins - totalWins - nearMissCount) / totalSpins) * 100}%` }} 
                  className="bg-gray-300 dark:bg-white/10 h-full transition-all duration-500 ease-out" 
                  title={`ハズレ: ${totalSpins - totalWins - nearMissCount}回`}
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className="flex flex-col items-center">
                <span className="text-emerald-400 font-extrabold">● 大当り ({hitRate}%)</span>
                <span className={`${textPrimary} font-mono mt-0.5 text-xs`}>{totalWins}回</span>
              </div>
              <div className="flex flex-col items-center border-x border-black/5 dark:border-white/5">
                <span className="text-amber-400 font-extrabold flex items-center gap-0.5">● 惜しい！ ({nearMissRate}%)</span>
                <span className={`${textPrimary} font-mono mt-0.5 text-xs`}>{nearMissCount}回</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-400 font-extrabold">● ハズレ ({totalSpins > 0 ? (((totalSpins - totalWins - nearMissCount) / totalSpins) * 100).toFixed(1) : "0.0"}%)</span>
                <span className={`${textPrimary} font-mono mt-0.5 text-xs`}>{totalSpins - totalWins - nearMissCount}回</span>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Detail Stats */}
        <div className={`p-4 rounded-2xl border shrink-0 ${
          isLightMode ? "bg-black/[0.01] border-black/5" : "bg-white/[0.01] border-white/5"
        }`}>
          <h3 className={`text-xs font-extrabold uppercase tracking-wider ${textSecondary} mb-3 flex items-center gap-2`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
            詳細集計 (最大100件)
          </h3>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-1">
              <dt className={textSecondary}>総BET</dt>
              <dd className={`font-semibold ${textPrimary}`}>{totalBet} 枚</dd>
            </div>
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-1">
              <dt className={textSecondary}>総払出</dt>
              <dd className={`font-semibold ${textPrimary}`}>{totalPayout} 枚</dd>
            </div>
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-1">
              <dt className={`${textSecondary} flex items-center gap-1`}>
                <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                大当り (勝率)
              </dt>
              <dd className="font-bold text-emerald-400">{totalWins}回 ({hitRate}%)</dd>
            </div>
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-1">
              <dt className={`${textSecondary} flex items-center gap-1`}>
                <Sparkles size={12} className="text-amber-400" />
                惜しい！ (リーチ率)
              </dt>
              <dd className="font-bold text-amber-400">{nearMissCount}回 ({nearMissRate}%)</dd>
            </div>
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-1">
              <dt className={textSecondary}>リプレイ</dt>
              <dd className={`font-semibold ${textPrimary}`}>{replayCount} 回</dd>
            </div>
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-1">
              <dt className={textSecondary}>天井発動</dt>
              <dd className={`font-semibold ${textPrimary}`}>{ceilingCount} 回</dd>
            </div>
          </dl>
        </div>

        {/* Spin History List */}
        <div className="flex-1 flex flex-col min-h-0 pt-4 border-t" style={{ borderColor: glassBorder }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 shrink-0">
            <h3 className={`text-xs font-extrabold uppercase tracking-wider ${textSecondary} flex items-center gap-2`}>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
              スピン履歴
            </h3>
            
            {/* Quick Filters */}
            <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl gap-1 self-start border border-black/5 dark:border-white/5">
              {(["all", "win", "nearMiss"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setFilter(mode);
                    setVisibleCount(15);
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    filter === mode
                      ? isLightMode ? "bg-white text-gray-800 shadow-sm" : "bg-white/10 text-white"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {mode === "all" ? "すべて" : mode === "win" ? "大当り" : "惜しい！"}
                </button>
              ))}
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar min-h-[220px]">
            {filteredHistory.length === 0 ? (
              <li className={`text-sm ${textSecondary} text-center py-8`}>履歴がありません</li>
            ) : (
              filteredHistory.slice(0, visibleCount).map((r: SlotSpinRecord) => {
                const spinDiff = r.payout - r.bet;
                const isExpanded = expandedRecordId === r.id;

                // 図柄オブジェクトの解決
                const symbols = resolvedStrips && r.reelResults.map((stopIndex, reelIdx) => {
                  const strip = resolvedStrips[reelIdx];
                  return strip ? strip[stopIndex] : null;
                });

                // ニアミス時の「外れリール」インデックスを特定
                let dimIndices: number[] = [];
                if (r.isNearMiss && symbols && symbols.length === 3) {
                  const s0 = symbols[0]?.id;
                  const s1 = symbols[1]?.id;
                  const s2 = symbols[2]?.id;
                  if (s0 === s1 && s0 !== s2) dimIndices = [2];
                  else if (s1 === s2 && s1 !== s0) dimIndices = [0];
                  else if (s0 === s2 && s0 !== s1) dimIndices = [1];
                }

                const hasPayout = r.payout > 0 || r.winLabels.length > 0;

                return (
                  <li
                    key={r.id}
                    className={`flex flex-col rounded-2xl overflow-hidden transition-all border ${
                      isExpanded
                        ? isLightMode 
                          ? "bg-purple-500/[0.03] border-purple-500/20 shadow-md"
                          : "bg-purple-500/[0.04] border-purple-500/30 shadow-lg shadow-purple-500/5"
                        : isLightMode
                          ? "bg-black/[0.02] border-black/5 hover:bg-black/[0.04]"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    {/* Collapsed Header */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(r.id)}
                      className="w-full flex items-center justify-between gap-3 text-xs py-3 px-4 outline-none text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* タイムスタンプ */}
                        <span className={`${textSecondary} font-mono text-[10px] shrink-0`}>
                          {formatTime(r.timestamp)}
                        </span>

                        {/* ミニリール表示 */}
                        {symbols && (
                          <div className="flex gap-1 items-center shrink-0 mx-1">
                            {symbols.map((sym, idx) => {
                              const isDimmed = dimIndices.includes(idx);
                              const isWin = hasPayout;
                              const isReplay = r.isReplay;
                              const isBonus = r.bonusTriggered;

                              let bgStyle = isLightMode ? "bg-white border-black/10 text-gray-800" : "bg-black/30 border-white/10 text-white";
                              let glowStyle = "";

                              if (isWin) {
                                if (isBonus) {
                                  bgStyle = "bg-amber-500/10 border-amber-500/30 text-amber-300";
                                  glowStyle = "shadow-[0_0_8px_rgba(245,158,11,0.4)]";
                                } else if (isReplay) {
                                  bgStyle = "bg-purple-500/10 border-purple-500/30 text-purple-300";
                                  glowStyle = "shadow-[0_0_8px_rgba(168,85,247,0.3)]";
                                } else {
                                  bgStyle = "bg-cyan-500/10 border-cyan-500/30 text-cyan-300";
                                  glowStyle = "shadow-[0_0_8px_rgba(6,182,212,0.3)]";
                                }
                              } else if (r.isNearMiss && !isDimmed) {
                                bgStyle = "bg-amber-500/5 border-amber-500/20 text-amber-400";
                                glowStyle = "shadow-[0_0_6px_rgba(245,158,11,0.2)]";
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold transition-all select-none ${bgStyle} ${glowStyle} ${
                                    isDimmed ? "opacity-30 blur-[0.3px] scale-90" : "opacity-100"
                                  } ${isWin && !isReplay && !isBonus ? "animate-pulse" : ""}`}
                                >
                                  {sym?.label.slice(0, 2) || "❓"}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <span className={`font-semibold ${textPrimary} hidden sm:inline truncate`}>
                          BET <span className="font-extrabold">{r.bet}</span>
                          <span className="mx-1.5 opacity-30">➔</span>
                          払出 <span className="font-extrabold text-emerald-400">{r.payout}</span>
                        </span>
                      </div>

                      {/* 右側要素 */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 大当たりタグ */}
                        {r.winLabels.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider hidden xs:inline">
                            WIN
                          </span>
                        )}

                        {/* 再遊技タグ */}
                        {r.isReplay && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 tracking-wider">
                            再遊技
                          </span>
                        )}

                        {/* ニアミスタグ */}
                        {r.isNearMiss && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border border-orange-500/20 tracking-wider">
                            惜しい！
                          </span>
                        )}

                        {/* 収支差分 */}
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs w-12 text-center border ${
                          spinDiff > 0 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
                            : spinDiff < 0 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        }`}>
                          {spinDiff > 0 ? `+${spinDiff}` : spinDiff}
                        </span>

                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-300 ${textSecondary} ${
                            isExpanded ? "rotate-180 text-purple-400" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* アコーディオン詳細展開表示 */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div
                            className="px-5 pb-4 pt-2 text-xs flex flex-col gap-3 font-medium"
                            style={{ borderTop: `1px solid ${glassBorder}` }}
                          >
                            {/* 詳細グリッド */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/10 dark:bg-white/[0.01] p-3.5 rounded-2xl border border-black/5 dark:border-white/5">
                              <div>
                                <span className={`${textSecondary} text-[10px] block font-bold mb-0.5`}>スピン日時</span>
                                <span className={`${textPrimary} font-mono`}>{formatTimeWithSeconds(r.timestamp)}</span>
                              </div>
                              <div>
                                <span className={`${textSecondary} text-[10px] block font-bold mb-0.5`}>状況 / 状態</span>
                                <span className={`${textPrimary}`}>
                                  {r.ceilingTriggered 
                                    ? "🚨 天井発動" 
                                    : r.inBonus 
                                      ? "🎰 ボーナス中" 
                                      : r.isReplay 
                                        ? "🔄 リプレイ無料" 
                                        : "通常プレイ"}
                                </span>
                              </div>
                              <div>
                                <span className={`${textSecondary} text-[10px] block font-bold mb-0.5`}>BET / 払出</span>
                                <span className={`${textPrimary} font-mono`}>{r.bet} 枚 / {r.payout} 枚</span>
                              </div>
                              <div>
                                <span className={`${textSecondary} text-[10px] block font-bold mb-0.5`}>停止出目インデックス</span>
                                <span className={`${textPrimary} font-mono`}>[{r.reelResults.join(", ")}]</span>
                              </div>
                            </div>

                            {/* 配当役詳細 */}
                            {r.winLabels.length > 0 && (
                              <div className="flex flex-col gap-1 p-3 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02]">
                                <span className="text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                  🏆 成立した配当役
                                </span>
                                <div className="flex gap-2 flex-wrap mt-1">
                                  {r.winLabels.map((lbl, idx) => (
                                    <span key={idx} className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-bold text-[11px] border border-amber-500/20">
                                      {lbl}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })
            )}
          </ul>

          {/* もっと見るボタン */}
          {filteredHistory.length > visibleCount && (
            <div className="flex justify-center mt-3 shrink-0 pt-2 relative">
              {/* 下部リストのグラデーション透過レイヤー */}
              <div className="absolute bottom-full left-0 w-full h-12 pointer-events-none bg-gradient-to-t from-bg-sidebar to-transparent opacity-80" />
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 15)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border dango-btn-tier3 flex items-center gap-2`}
                style={{ "--btn-glow-color": "#a855f7" } as React.CSSProperties}
              >
                もっと表示する (+15件)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
