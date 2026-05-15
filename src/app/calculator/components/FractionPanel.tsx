"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

type FracOp = "+" | "-" | "*" | "/";

function gcd(a: number, b: number): number {
    a = Math.abs(Math.floor(a));
    b = Math.abs(Math.floor(b));
    if (b === 0) return a || 1;
    return gcd(b, a % b);
}

function reduceFrac(n: number, d: number): [number, number] {
    if (d === 0) return [0, 1];
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return [Math.floor(n / g), Math.floor(d / g) || 1];
}

function applyFracOp(n1: number, d1: number, op: FracOp, n2: number, d2: number): [number, number] {
    if (d1 === 0 || d2 === 0) return [0, 1];
    let n: number; let d: number;
    if (op === "+") { n = n1 * d2 + n2 * d1; d = d1 * d2; }
    else if (op === "-") { n = n1 * d2 - n2 * d1; d = d1 * d2; }
    else if (op === "*") { n = n1 * n2; d = d1 * d2; }
    else { n = n1 * d2; d = d1 * n2; }
    return reduceFrac(n, d);
}

function computeFractionChain(fractions: { num: number; den: number }[], operators: FracOp[]): [number, number] {
    if (fractions.length === 0) return [0, 1];
    if (fractions.length === 1) return reduceFrac(fractions[0]!.num, fractions[0]!.den);
    const vals: [number, number][] = fractions.map((f) => [f.num, f.den]);
    const ops: FracOp[] = [...operators];
    while (ops.some((o) => o === "*" || o === "/")) {
        const i = ops.findIndex((o) => o === "*" || o === "/");
        if (i < 0 || !vals[i] || !vals[i + 1]) break;
        const [n, d] = applyFracOp(vals[i]![0], vals[i]![1], ops[i]!, vals[i + 1]![0], vals[i + 1]![1]);
        vals.splice(i, 2, [n, d]);
        ops.splice(i, 1);
    }
    while (vals.length > 1 && ops.length > 0) {
        const [n, d] = applyFracOp(vals[0]![0], vals[0]![1], ops[0]!, vals[1]![0], vals[1]![1]);
        vals.splice(0, 2, [n, d]);
        ops.splice(0, 1);
    }
    return vals[0]!;
}

interface FractionPanelProps {
  isLightMode: boolean;
  accentColor: string;
}

export function FractionPanel({ isLightMode, accentColor }: FractionPanelProps) {
    const [fractions, setFractions] = useState<{ num: number; den: number }[]>([{ num: 1, den: 2 }, { num: 1, den: 3 }]);
    const [operators, setOperators] = useState<FracOp[]>(["+"]);
    const [resNum, resDen] = computeFractionChain(fractions, operators);

    const inputClass = `w-14 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`;
    const labelClass = isLightMode ? "text-gray-600" : "text-white/70";

    const setFraction = (index: number, field: "num" | "den", value: number) => {
        setFractions((prev) => {
            const next = [...prev];
            if (!next[index]) return next;
            next[index] = { ...next[index]!, [field]: field === "den" ? (value || 1) : value };
            return next;
        });
    };

    const setOperator = (index: number, op: FracOp) => {
        setOperators((prev) => {
            const next = [...prev];
            next[index] = op;
            return next;
        });
    };

    const addFraction = () => {
        setFractions((prev) => [...prev, { num: 1, den: 1 }]);
        setOperators((prev) => [...prev, "+"]);
    };

    const removeLastFraction = () => {
        if (fractions.length <= 2) return;
        setFractions((prev) => prev.slice(0, -1));
        setOperators((prev) => prev.slice(0, -1));
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-6 max-w-sm mx-auto w-full">
            <p className={`text-sm ${labelClass}`}>分数と演算子を選んで計算（乗除→加減の順・左から。結果は既約分数）</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                {fractions.map((frac, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-0">
                            <span className={`text-[10px] mb-0.5 ${labelClass}`}>{i + 1}つ目</span>
                            <input type="number" value={frac.num} onChange={(e) => setFraction(i, "num", Number(e.target.value) || 0)} className={inputClass} aria-label={`${i+1}つ目 分子`} />
                            <div className="w-14 border-b-2 mt-0.5 mb-0.5 shrink-0" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.4)" }} aria-hidden />
                            <input type="number" value={frac.den} onChange={(e) => setFraction(i, "den", Number(e.target.value) || 1)} className={inputClass} min={1} aria-label={`${i+1}つ目 分母`} />
                        </div>
                        {i < operators.length && (
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-[10px] ${labelClass}`}>演算子</span>
                                <div className="grid grid-cols-2 gap-1">
                                    {(["+", "-", "*", "/"] as const).map((o) => (
                                        <button
                                            key={o}
                                            type="button"
                                            onClick={() => setOperator(i, o)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border dango-btn-tier3 ${
                                                operators[i] === o 
                                                    ? "text-white border-transparent shadow-lg" 
                                                    : isLightMode ? "text-gray-600 border-gray-200" : "text-white/60 border-white/10"
                                            }`}
                                            style={{ 
                                                ...(operators[i] === o ? { background: accentColor } : { borderColor: isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)", background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)" }),
                                                "--btn-glow-color": accentColor
                                            } as React.CSSProperties} 
                                            aria-label={`${i + 1}つ目と${i + 2}つ目の間の演算子 ${o}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                <button 
                    type="button" 
                    onClick={addFraction} 
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border dango-btn-tier3 ${isLightMode ? "text-gray-700 border-gray-300" : "text-white/90 border-white/30"}`}
                    style={{ "--btn-glow-color": accentColor } as React.CSSProperties}
                >
                    分数を追加
                </button>
                {fractions.length > 2 && (
                    <button 
                        type="button" 
                        onClick={removeLastFraction} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border dango-btn-tier3 ${isLightMode ? "text-red-600 border-red-200" : "text-red-400 border-red-400/40"}`}
                        style={{ "--btn-glow-color": "rgba(239,68,68,0.3)" } as React.CSSProperties}
                    >
                        最後の分数を削除
                    </button>
                )}
            </div>
            <div className="p-4 rounded-2xl border text-center" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)", background: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.08)" }}>
                <span className={`text-xs ${labelClass}`}>結果（既約）</span>
                {resDen === 0 ? (<p className={`font-mono text-xl mt-1 ${isLightMode ? "text-gray-900" : "text-white"}`}>—</p>) : (
                    <div className="flex flex-col items-center gap-0 mt-2">
                        <span className={`font-mono text-xl ${isLightMode ? "text-gray-900" : "text-white"}`}>{resNum}</span>
                        <div className="w-12 border-b-2 my-0.5" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)" }} />
                        <span className={`font-mono text-xl ${isLightMode ? "text-gray-900" : "text-white"}`}>{resDen}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
