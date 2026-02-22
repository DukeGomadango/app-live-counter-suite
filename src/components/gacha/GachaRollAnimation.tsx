"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, SkipForward } from "lucide-react";
import type { GachaPool, GachaResult, RarityTier } from "@/lib/gacha";
import { sortResultsForPresentation, containsHighestRarity, organizeResults } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface GachaRollAnimationProps {
    pool: GachaPool;
    results: GachaResult[] | null;
    isRolling: boolean;
    onRollStart: () => void;
    onAnimationComplete: () => void;
    isLightMode: boolean;
    /** ダークモードで背景が明るいとき true。文字を暗くして視認性を確保 */
    textContrastLight?: boolean;
    disabled: boolean;
    pityCounter?: number;
    pityThreshold?: number;
    pityEnabled?: boolean;
    accentColor?: string;
    showTitle?: boolean;
    enableAnimation?: boolean;
    /** 誰が引くか（idle時に「〇〇のターン」表示） */
    activePlayerName?: string;
}

// パーティクル生成
function createParticles(count: number, color: string) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
        delay: Math.random() * 2,
        duration: Math.random() * 2 + 1,
        color,
    }));
}

// 紙吹雪パーティクル
function createConfetti(count: number) {
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f97316", "#06b6d4"];
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: Math.random() * 2 + 2,
        rotate: Math.random() * 720 - 360,
    }));
}

export default function GachaRollAnimation({
    pool,
    results,
    isRolling,
    onRollStart,
    onAnimationComplete,
    isLightMode,
    textContrastLight = false,
    disabled,
    pityCounter = 0,
    pityThreshold = 100,
    pityEnabled = false,
    accentColor = "#a855f7",
    showTitle = true,
    enableAnimation = true,
    activePlayerName = "ゲスト",
}: GachaRollAnimationProps) {
    const BULK_THRESHOLD = 100;
    const [phase, setPhase] = useState<"idle" | "build-up" | "spinning" | "reveal-setup" | "revealing" | "bulk-reveal" | "summary" | "done">("idle");
    const [revealIndex, setRevealIndex] = useState(0);
    const [showConfirmedEffect, setShowConfirmedEffect] = useState(false);
    const [skipRequested, setSkipRequested] = useState(false);
    const [bulkDisplayCounts, setBulkDisplayCounts] = useState<number[]>([]);
    /** 大量連で「何行目まで表示したか」。レア度低い順に1行ずつ間を空けて表示する */
    const [bulkRevealVisibleUpTo, setBulkRevealVisibleUpTo] = useState(-1);
    const completedRef = useRef(false);

    const textLight = isLightMode || textContrastLight;
    const hasHighestRarity = results ? containsHighestRarity(results, pool.rarities) : false;
    const sortedResults = results ? sortResultsForPresentation(results, pool.rarities) : [];
    const isMassRoll = (results?.length || 0) > 20;
    const isBulkRoll = (results?.length || 0) >= BULK_THRESHOLD;
    const bulkOrganized = useMemo(
        () => (results && isBulkRoll ? organizeResults(results, pool.rarities, "rarity-asc", "all") : []),
        [results, isBulkRoll, pool.rarities]
    );

    const highestRarity = useMemo(
        () => [...pool.rarities].sort((a, b) => b.sortOrder - a.sortOrder)[0],
        [pool.rarities]
    );

    const particles = useMemo(
        () => createParticles(30, highestRarity?.color || "#ef4444"),
        [highestRarity]
    );

    const confetti = useMemo(() => createConfetti(40), []);

    // 最高レア結果の集計
    const highestRarityResults = useMemo(() => {
        if (!results || !highestRarity) return [];
        return results.filter(r => r.rarityId === highestRarity.id);
    }, [results, highestRarity]);

    // フェーズ管理: ロール開始 → タメ(0.6s) → スピン
    useEffect(() => {
        if (!isRolling || !results) return;

        if (!enableAnimation) {
            setPhase("done");
            return;
        }

        setPhase("build-up");
        setRevealIndex(0);
        setSkipRequested(false);
        setShowConfirmedEffect(false);

        const buildUpTimer = setTimeout(() => setPhase("spinning"), 600);
        return () => clearTimeout(buildUpTimer);
    }, [isRolling, results, enableAnimation]);

    // スピン開始後のタイマー（確定演出・リベールへ / 大量連は bulk-reveal）
    useEffect(() => {
        if (phase !== "spinning" || !results) return;

        const spinDuration = isMassRoll ? 2000 : 3500;
        const spinTimer = setTimeout(() => {
            if (isBulkRoll) {
                setPhase("bulk-reveal");
                setBulkDisplayCounts(bulkOrganized.map(() => 0));
                setBulkRevealVisibleUpTo(0);
            } else if (hasHighestRarity && !isMassRoll) {
                setShowConfirmedEffect(true);
                setTimeout(() => {
                    setPhase("reveal-setup");
                    setTimeout(() => setPhase("revealing"), 400);
                }, 2000);
            } else {
                setPhase(isMassRoll ? "summary" : "reveal-setup");
                if (!isMassRoll) {
                    setTimeout(() => setPhase("revealing"), 400);
                }
            }
        }, spinDuration);

        return () => clearTimeout(spinTimer);
    }, [phase, results, hasHighestRarity, isMassRoll, isBulkRoll, bulkOrganized]);

    // カード1枚ずつ表示（最後の1枚表示後は余韻を入れてから summary へ）
    useEffect(() => {
        if (phase !== "revealing" || skipRequested) return;
        if (revealIndex >= sortedResults.length) {
            const timer = setTimeout(() => setPhase("summary"), 1000);
            return () => clearTimeout(timer);
        }
        const delay = sortedResults.length > 50 ? 20 : sortedResults.length > 10 ? 50 : 150;
        const timer = setTimeout(() => setRevealIndex(prev => prev + 1), delay);
        return () => clearTimeout(timer);
    }, [phase, revealIndex, sortedResults.length, skipRequested]);

    // スキップ
    useEffect(() => {
        if (skipRequested && (phase === "revealing" || phase === "spinning" || phase === "build-up")) {
            setRevealIndex(sortedResults.length);
            setShowConfirmedEffect(false);
            setPhase("summary");
        }
        if (skipRequested && phase === "bulk-reveal" && bulkOrganized.length > 0) {
            setBulkDisplayCounts(bulkOrganized.map(o => o.count));
            setBulkRevealVisibleUpTo(-1);
            setPhase("summary");
        }
    }, [skipRequested, phase, sortedResults.length, bulkOrganized]);

    // bulk-reveal: 1行ずつ表示（1項目ごとに約1秒遅延）、各項目のカウントアップは表示と同時に開始（待ち合わせなし）
    const bulkRevealPhaseStartRef = useRef<number>(0);
    useEffect(() => {
        if (phase === "bulk-reveal" && bulkOrganized.length > 0) {
            bulkRevealPhaseStartRef.current = Date.now();
        }
    }, [phase, bulkOrganized.length]);

    useEffect(() => {
        if (phase !== "bulk-reveal" || bulkOrganized.length === 0 || bulkRevealVisibleUpTo < 0) return;
        if (bulkRevealVisibleUpTo >= bulkOrganized.length - 1) {
            const timer = setTimeout(() => {
                setBulkDisplayCounts(bulkOrganized.map(o => o.count));
                setPhase("summary");
            }, 800);
            return () => clearTimeout(timer);
        }
        const timer = setTimeout(() => setBulkRevealVisibleUpTo(prev => prev + 1), 1000);
        return () => clearTimeout(timer);
    }, [phase, bulkRevealVisibleUpTo, bulkOrganized]);

    useEffect(() => {
        if (phase !== "bulk-reveal" || bulkOrganized.length === 0) return;
        const targets = bulkOrganized.map(o => o.count);
        const durationMs = 1200;
        const tickMs = 40;
        const interval = setInterval(() => {
            const now = Date.now();
            const phaseStart = bulkRevealPhaseStartRef.current;
            setBulkDisplayCounts(prev => {
                if (prev.length !== targets.length) return prev;
                return prev.map((_, i) => {
                    if (i > bulkRevealVisibleUpTo) return 0;
                    const rowStart = phaseStart + i * 1000;
                    const elapsed = now - rowStart;
                    if (elapsed <= 0) return 0;
                    const t = Math.min(1, elapsed / durationMs);
                    const eased = 1 - (1 - t) * (1 - t);
                    return Math.min(targets[i], Math.round(targets[i] * eased));
                });
            });
        }, tickMs);
        return () => clearInterval(interval);
    }, [phase, bulkOrganized, bulkRevealVisibleUpTo]);

    useEffect(() => {
        if (phase !== "bulk-reveal") setBulkRevealVisibleUpTo(-1);
    }, [phase]);

    // summary → done（○○連の結果表示時間を長めに）
    useEffect(() => {
        if (phase === "summary") {
            const timer = setTimeout(() => setPhase("done"), 3800);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    // ロール開始時に完了フラグをリセット（二重呼び出し防止）
    useEffect(() => {
        if (isRolling && results) completedRef.current = false;
    }, [isRolling, results]);

    // done → 通知（1回だけ呼ぶ）
    useEffect(() => {
        if (phase !== "done" || completedRef.current) return;
        completedRef.current = true;
        const timer = setTimeout(() => {
            onAnimationComplete();
        }, 300);
        return () => clearTimeout(timer);
    }, [phase, onAnimationComplete]);

    const handleSkip = useCallback(() => setSkipRequested(true), []);

    const { glassBg, glassBorder } = useGlassStyle(isLightMode);

    const getRarityForResult = (result: GachaResult): RarityTier | undefined => {
        return pool.rarities.find(r => r.id === result.rarityId);
    };

    // IDLE: PULLボタン
    if (phase === "idle" && !isRolling) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
                {/* ガチャマシンモチーフ */}
                <motion.div
                    className="relative"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div
                        className="w-40 h-40 sm:w-56 sm:h-56 rounded-3xl flex items-center justify-center relative overflow-hidden"
                        style={{
                            background: textLight
                                ? `linear-gradient(135deg, ${accentColor}22, ${accentColor}18)`
                                : `linear-gradient(135deg, ${accentColor}33, ${accentColor}22)`,
                            border: `2px solid ${accentColor}55`,
                            backdropFilter: "blur(16px)",
                            boxShadow: `0 0 60px ${accentColor}25, inset 0 0 30px ${accentColor}10`,
                        }}
                    >
                        <Sparkles className="w-16 h-16 sm:w-24 sm:h-24" style={{ color: accentColor }} strokeWidth={1.5} />
                        {/* 装飾リング */}
                        <motion.div
                            className="absolute inset-2 rounded-2xl"
                            style={{ border: `1px solid ${accentColor}33` }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                            className="absolute inset-4 rounded-xl border border-cyan-500/15"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </motion.div>

                {/* 誰が引くか */}
                <p className={`text-sm font-medium ${textLight ? "text-gray-800" : "text-white/90"}`}>
                    {activePlayerName}のターン
                </p>

                {/* コンセプト名 */}
                {showTitle && pool.conceptName && (
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-lg sm:text-xl font-bold tracking-wider ${textLight ? "text-gray-900" : "text-white/95"}`}
                    >
                        {pool.conceptName}
                    </motion.h2>
                )}

                {/* 天井ゲージ */}
                {pityEnabled && (
                    <div className="w-48 sm:w-64">
                        <div className="flex justify-between mb-1">
                            <span className={`text-[10px] ${textLight ? "text-gray-700" : "text-white/70"}`}>天井</span>
                            <span className={`text-[10px] font-bold ${textLight ? "text-gray-800" : "text-white/90"}`}>
                                {pityCounter} / {pityThreshold}
                            </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${textLight ? "bg-gray-200" : "bg-white/10"}`}>
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    background: `linear-gradient(90deg, ${accentColor}, ${highestRarity?.color || accentColor})`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((pityCounter / pityThreshold) * 100, 100)}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                )}

                {/* PULLボタン */}
                <motion.button
                    onClick={onRollStart}
                    disabled={disabled}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <div
                        className="px-10 sm:px-16 py-3 sm:py-4 rounded-2xl font-bold text-lg sm:text-xl tracking-widest text-white relative z-10 flex items-center gap-3"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc, ${accentColor}99)`,
                            boxShadow: `0 0 30px ${accentColor}66, 0 4px 15px rgba(0,0,0,0.3)`,
                        }}
                    >
                        <Zap size={20} />
                        PULL ×{pool.pullCount.toLocaleString()}
                    </div>
                    <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                            filter: "blur(15px)",
                            transform: "translateY(5px)",
                        }}
                    />
                </motion.button>

                {pool.items.length === 0 && (
                    <p className={`text-xs ${textLight ? "text-red-500" : "text-red-300"}`}>
                        ※ 品目を追加してください
                    </p>
                )}
            </div>
        );
    }

    // タメ（0.6秒）
    if (phase === "build-up") {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-4 relative overflow-hidden">
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
                    }}
                />
                <motion.p
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.5, repeat: 1 }}
                    className={`text-lg font-bold ${textLight ? "text-gray-600" : "text-white/70"}`}
                >
                    ...
                </motion.p>
                <button
                    onClick={handleSkip}
                    className={`absolute bottom-6 right-16 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${textLight ? "bg-white/60 text-gray-800 hover:bg-white/70" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                >
                    <SkipForward size={12} /> スキップ
                </button>
            </div>
        );
    }

    // SPINNING
    if (phase === "spinning") {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-4 relative overflow-hidden">
                {/* 画面明滅エフェクト */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{
                        opacity: [0, 0.08, 0, 0.05, 0],
                        background: [
                            `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
                            `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
                        ],
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                />

                {/* 確定演出 */}
                <AnimatePresence>
                    {showConfirmedEffect && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 flex items-center justify-center"
                        >
                            {/* レインボーフラッシュ */}
                            <motion.div
                                className="absolute inset-0"
                                animate={{
                                    background: [
                                        "radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 60%)",
                                        "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 60%)",
                                        "radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 60%)",
                                        "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 60%)",
                                        "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 60%)",
                                    ],
                                }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                            />
                            {/* パーティクル */}
                            {particles.map(p => (
                                <motion.div
                                    key={p.id}
                                    className="absolute rounded-full"
                                    style={{
                                        width: p.size,
                                        height: p.size,
                                        left: `${p.x}%`,
                                        top: `${p.y}%`,
                                        background: p.color,
                                        boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                                    }}
                                    animate={{
                                        y: [0, -80, 0],
                                        opacity: [0, 1, 0],
                                        scale: [0, 2, 0],
                                    }}
                                    transition={{
                                        duration: p.duration,
                                        delay: p.delay,
                                        repeat: Infinity,
                                    }}
                                />
                            ))}
                            {/* 確定テキスト */}
                            <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: [0, 1.5, 1.2], rotate: [-10, 5, 0] }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="text-4xl sm:text-6xl font-black z-30"
                                style={{
                                    color: highestRarity?.color || "#ef4444",
                                    textShadow: `0 0 40px ${highestRarity?.glowColor || "rgba(239,68,68,0.6)"}, 0 0 80px ${highestRarity?.glowColor || "rgba(239,68,68,0.3)"}, 0 0 120px ${highestRarity?.glowColor || "rgba(239,68,68,0.15)"}`,
                                }}
                            >
                                ★ CONFIRMED ★
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* スパークル回転（枠とアイコン逆回転・徐々に加速） */}
                <motion.div
                    className="w-40 h-40 sm:w-56 sm:h-56 rounded-3xl flex items-center justify-center relative"
                    style={{
                        background: textLight
                            ? `linear-gradient(135deg, ${accentColor}22, ${accentColor}18)`
                            : `linear-gradient(135deg, ${accentColor}33, ${accentColor}22)`,
                        border: `2px solid ${accentColor}55`,
                        backdropFilter: "blur(16px)",
                        boxShadow: `0 0 60px ${accentColor}25, inset 0 0 30px ${accentColor}10`,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    <motion.div
                        className="flex items-center justify-center"
                        animate={{
                            rotate: -360,
                            color: [...[...pool.rarities].sort((a, b) => a.sortOrder - b.sortOrder).map(r => r.color), accentColor],
                        }}
                        transition={{
                            rotate: {
                                duration: 0.9,
                                repeat: Infinity,
                                ease: "linear",
                            },
                            color: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                            },
                        }}
                        style={{ color: pool.rarities[0]?.color ?? accentColor }}
                    >
                        <Sparkles className="w-20 h-20 sm:w-28 sm:h-28" strokeWidth={1.5} />
                    </motion.div>
                </motion.div>

                <motion.p
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`text-sm ${textLight ? "text-gray-700" : "text-white/80"}`}
                >
                    抽選中...
                </motion.p>

                {/* スキップボタン */}
                <button
                    onClick={handleSkip}
                    className={`absolute bottom-6 right-16 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${textLight ? "bg-white/60 text-gray-800 hover:bg-white/70" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                >
                    <SkipForward size={12} /> スキップ
                </button>
            </div>
        );
    }

    // BULK-REVEAL（大量連: レア度低い順に「品目名 × N」で数字だけカウントアップ）
    if (phase === "bulk-reveal" && bulkOrganized.length > 0) {
        const getRarityById = (rarityId: string) => pool.rarities.find(r => r.id === rarityId);
        return (
            <div className="flex flex-col h-full p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${textLight ? "text-gray-700" : "text-white/90"}`}>
                        🎲 {results!.length.toLocaleString()}連の結果
                    </span>
                    <button
                        onClick={handleSkip}
                        className={`flex items-center gap-1 text-xs px-3 py-1 rounded-lg transition-all ${textLight ? "bg-gray-100 text-gray-800 hover:bg-gray-200" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                    >
                        <SkipForward size={12} /> スキップ
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto rounded-xl px-3 py-2 min-h-0" style={{ background: glassBg, border: `1px solid ${glassBorder}` }}>
                    <div className="flex flex-col gap-1">
                        {bulkOrganized.slice(0, Math.max(0, bulkRevealVisibleUpTo + 1)).map((item, idx) => {
                            const rarity = getRarityById(item.rarityId);
                            const prevRarity = idx > 0 ? getRarityById(bulkOrganized[idx - 1].rarityId) : null;
                            const isRarityUp = idx > 0 && rarity && prevRarity && rarity.sortOrder > prevRarity.sortOrder;
                            const displayCount = bulkDisplayCounts[idx] ?? 0;
                            return (
                                <motion.div
                                    key={item.itemId}
                                    initial={{ opacity: 0, x: -16, scale: isRarityUp ? 1.15 : 0.98 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        scale: 1,
                                        boxShadow: isRarityUp
                                            ? [
                                                `0 0 0 0 ${rarity?.glowColor}`,
                                                `0 0 24px 2px ${rarity?.glowColor}, 0 0 40px ${rarity?.color}40`,
                                                `0 0 12px 1px ${rarity?.glowColor}`,
                                            ]
                                            : "none",
                                    }}
                                    transition={{
                                        duration: isRarityUp ? 0.5 : 0.25,
                                        scale: { type: "spring", stiffness: 400, damping: 28 },
                                        boxShadow: { duration: 0.6 },
                                    }}
                                    className="relative flex items-center gap-2 py-1.5 rounded-lg px-2 -mx-2"
                                >
                                    {/* レア度アップ時: 出現瞬間のフラッシュ */}
                                    <AnimatePresence>
                                        {isRarityUp && rarity && (
                                            <motion.div
                                                initial={{ opacity: 0.85, scale: 0.8 }}
                                                animate={{ opacity: 0, scale: 1.4 }}
                                                transition={{ duration: 0.5, ease: "easeOut" }}
                                                className="absolute inset-0 rounded-lg pointer-events-none"
                                                style={{
                                                    background: `radial-gradient(ellipse 80% 100% at 0% 50%, ${rarity.color}50, transparent 70%), linear-gradient(90deg, ${rarity.color}25, transparent 50%)`,
                                                    boxShadow: `inset 0 0 30px ${rarity.color}30`,
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                    {/* レア度アップ時: レア名バッジ（回りながら出現→一瞬キープ→フェード） */}
                                    <AnimatePresence>
                                        {isRarityUp && rarity && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.3, rotate: -180 }}
                                                animate={{
                                                    opacity: [0, 1, 1, 0],
                                                    scale: [0.3, 1, 1, 1],
                                                    rotate: [-180, 0, 0, 0],
                                                }}
                                                transition={{
                                                    duration: 1.2,
                                                    times: [0, 0.15, 0.5, 1],
                                                    rotate: { duration: 0.4, ease: "easeOut" },
                                                }}
                                                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10 whitespace-nowrap pointer-events-none"
                                                style={{
                                                    top: "-0.5rem",
                                                    color: rarity.color,
                                                    background: rarity.bgColor,
                                                    border: `3px solid ${rarity.glowColor}`,
                                                    boxShadow: `0 0 32px ${rarity.glowColor}`,
                                                    fontSize: "100px",
                                                    fontWeight: 900,
                                                    letterSpacing: "0.15em",
                                                    padding: "0.25em 0.5em",
                                                    borderRadius: "0.2em",
                                                }}
                                            >
                                                {rarity.name}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 relative z-10"
                                        style={{ color: rarity?.color, background: rarity?.bgColor }}
                                    >
                                        {rarity?.name || "?"}
                                    </span>
                                    <span className={`text-xs flex-1 relative z-10 ${textLight ? "text-gray-800" : "text-white/90"}`}>{item.itemName}</span>
                                    <span className={`text-sm font-black tabular-nums relative z-10 ${textLight ? "text-gray-900" : "text-white"}`}>
                                        ×{displayCount.toLocaleString()}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // REVEALING (1枚ずつ)
    if (phase === "revealing" || phase === "reveal-setup") {
        const visibleResults = sortedResults.slice(0, revealIndex);
        return (
            <div className="flex flex-col h-full p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs ${textLight ? "text-gray-700" : "text-white/75"}`}>
                        {revealIndex} / {sortedResults.length}
                    </span>
                    <button
                        onClick={handleSkip}
                        className={`flex items-center gap-1 text-xs px-3 py-1 rounded-lg transition-all ${textLight ? "bg-gray-100 text-gray-800 hover:bg-gray-200" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                    >
                        <SkipForward size={12} /> スキップ
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                        <AnimatePresence>
                            {visibleResults.map((result) => {
                                const rarity = getRarityForResult(result);
                                const isHighRarity = rarity && rarity.sortOrder >= (pool.rarities.length - 1);
                                return (
                                    <motion.div
                                        key={result.resultId}
                                        initial={{ rotateY: 90, opacity: 0, scale: 0.5 }}
                                        animate={{
                                            rotateY: 0,
                                            opacity: 1,
                                            scale: isHighRarity ? [0.5, 1.2, 1] : 1,
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                            scale: isHighRarity ? { duration: 0.4 } : undefined,
                                        }}
                                        className="px-2 py-1 rounded-lg text-[11px] font-bold relative"
                                        style={{
                                            color: rarity?.color,
                                            background: rarity?.bgColor,
                                            border: `1px solid ${rarity?.glowColor}`,
                                            boxShadow: isHighRarity
                                                ? `0 0 15px ${rarity?.glowColor}, 0 0 30px ${rarity?.glowColor}`
                                                : "none",
                                        }}
                                    >
                                        【{rarity?.name}】{result.itemName}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    // SUMMARY (余韻フェーズ)
    if (phase === "summary" && results) {
        // レア度ごとの集計
        const rarityCounts = new Map<string, number>();
        for (const r of results) {
            rarityCounts.set(r.rarityId, (rarityCounts.get(r.rarityId) || 0) + 1);
        }

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full p-4 gap-4 relative overflow-hidden"
            >
                {/* 紙吹雪 */}
                {hasHighestRarity && confetti.map(c => (
                    <motion.div
                        key={c.id}
                        className="absolute w-2 h-3 rounded-sm"
                        style={{
                            left: `${c.x}%`,
                            top: -10,
                            background: c.color,
                            width: c.size * 0.6,
                            height: c.size,
                        }}
                        animate={{
                            y: [0, 800],
                            x: [0, Math.random() * 100 - 50],
                            rotate: [0, c.rotate],
                            opacity: [1, 0],
                        }}
                        transition={{
                            duration: c.duration,
                            delay: c.delay,
                            ease: "easeIn",
                        }}
                    />
                ))}

                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className={`text-2xl sm:text-3xl font-black ${textLight ? "text-gray-900" : "text-white/90"}`}
                >
                    🎉 {results.length.toLocaleString()}連の結果
                </motion.div>

                {/* レア度別サマリ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-2 justify-center"
                >
                    {pool.rarities
                        .sort((a, b) => b.sortOrder - a.sortOrder)
                        .map(r => {
                            const count = rarityCounts.get(r.id) || 0;
                            if (count === 0) return null;
                            return (
                                <motion.span
                                    key={r.id}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5 + r.sortOrder * 0.1, type: "spring" }}
                                    className="px-3 py-1.5 rounded-xl text-sm font-bold"
                                    style={{
                                        color: r.color,
                                        background: r.bgColor,
                                        border: `1px solid ${r.glowColor}`,
                                        boxShadow: r.sortOrder >= pool.rarities.length - 1 ? `0 0 15px ${r.glowColor}` : "none",
                                    }}
                                >
                                    {r.name} ×{count}
                                </motion.span>
                            );
                        })}
                </motion.div>

                {/* 最高レアスポットライト */}
                {highestRarityResults.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex flex-col items-center gap-1 mt-2"
                    >
                        <span className={`text-xs font-bold uppercase tracking-wider`} style={{ color: highestRarity?.color }}>
                            ★ {highestRarity?.name} ★
                        </span>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                            {highestRarityResults.map(r => (
                                <motion.span
                                    key={r.resultId}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.3, 1] }}
                                    transition={{ delay: 1 }}
                                    className="px-2 py-1 rounded-lg text-xs font-bold"
                                    style={{
                                        color: highestRarity?.color,
                                        background: highestRarity?.bgColor,
                                        border: `1px solid ${highestRarity?.glowColor}`,
                                        boxShadow: `0 0 20px ${highestRarity?.glowColor}`,
                                    }}
                                >
                                    {r.itemName}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* スキップ */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    onClick={handleSkip}
                    className={`text-xs mt-2 ${textLight ? "text-gray-600" : "text-white/65"} hover:underline`}
                >
                    スキップ →
                </motion.button>
            </motion.div>
        );
    }

    // DONE
    if (phase === "done") {
        return null;
    }

    return null;
}
