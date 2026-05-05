"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

function factorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
}

function nCk(n: number, k: number): number | null {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return null;
    if (n > 170) return null;
    return factorial(n) / (factorial(k) * factorial(n - k));
}

interface ProbabilityPanelProps {
  isLightMode: boolean;
  accentColor: string;
}

export function ProbabilityPanel({ isLightMode, accentColor: _accentColor }: ProbabilityPanelProps) {
    const [pA, setPA] = useState(0.5);
    const [pB, setPB] = useState(0.5);
    const [n, setN] = useState(5);
    const [k, setK] = useState(2);

    const pAnd = pA * pB;
    const pOr = pA + pB - pAnd;
    const comb = nCk(n, k);

    const labelClass = isLightMode ? "text-gray-600" : "text-white/70";
    const cardStyle = {
        borderColor: isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)",
        background: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.08)",
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-6 max-w-sm mx-auto w-full">
            <p className={`text-sm ${labelClass}`}>シンプルな事象（独立）</p>
            <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>P(A) (0〜1)</label>
                    <input type="number" min={0} max={1} step={0.01} value={pA} onChange={(e) => setPA(Number(e.target.value))} className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>P(B) (0〜1)</label>
                    <input type="number" min={0} max={1} step={0.01} value={pB} onChange={(e) => setPB(Number(e.target.value))} className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`} />
                </div>
            </div>
            <div className="p-4 rounded-2xl border flex flex-col gap-1" style={cardStyle}>
                <p className={`text-sm ${labelClass}`}>P(A and B) = P(A)×P(B)</p>
                <p className={`font-mono text-lg ${isLightMode ? "text-gray-900" : "text-white"}`}>{pAnd.toFixed(4)}</p>
                <p className={`text-sm ${labelClass} mt-2`}>P(A or B) = P(A)+P(B)-P(A and B)</p>
                <p className={`font-mono text-lg ${isLightMode ? "text-gray-900" : "text-white"}`}>{pOr.toFixed(4)}</p>
            </div>

            <p className={`text-sm ${labelClass} mt-4`}>組み合わせ nCk</p>
            <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>n</label>
                    <input type="number" min={0} value={n} onChange={(e) => setN(Number(e.target.value) || 0)} className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>k</label>
                    <input type="number" min={0} value={k} onChange={(e) => setK(Number(e.target.value) || 0)} className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`} />
                </div>
            </div>
            <div className="p-4 rounded-2xl border" style={cardStyle}>
                <p className={`text-sm ${labelClass}`}>C(n,k) = n! / (k!(n-k)!)</p>
                <p className={`font-mono text-lg mt-1 ${isLightMode ? "text-gray-900" : "text-white"}`}>{comb !== null ? comb : "—"}</p>
            </div>
        </motion.div>
    );
}
