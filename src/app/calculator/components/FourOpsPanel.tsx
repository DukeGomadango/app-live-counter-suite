"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

/** 四則のみの簡易パース・計算（* / を + - より先に評価） */
function evalExpr(expr: string): number | null {
    const s = expr.replace(/\s/g, "");
    if (!s) return null;
    const tokens: (number | string)[] = [];
    let i = 0;
    while (i < s.length) {
        if (/[0-9.]/.test(s[i]!)) {
            let num = "";
            while (i < s.length && /[0-9.]/.test(s[i]!)) num += s[i++];
            const n = parseFloat(num);
            if (!Number.isFinite(n)) return null;
            tokens.push(n);
            continue;
        }
        if ("+-*/".includes(s[i]!)) {
            tokens.push(s[i]!);
            i++;
            continue;
        }
        return null;
    }
    if (tokens.length === 0 || typeof tokens[0] !== "number") return null;

    const apply = (a: number, op: string, b: number): number => {
        if (op === "+") return a + b;
        if (op === "-") return a - b;
        if (op === "*") return a * b;
        if (op === "/") return b === 0 ? NaN : a / b;
        return NaN;
    };

    const vals: number[] = [tokens[0] as number];
    const ops: string[] = [];
    for (let j = 1; j < tokens.length; j += 2) {
        const op = tokens[j] as string;
        const next = tokens[j + 1];
        if (typeof next !== "number") return null;
        if (op === "*" || op === "/") {
            const prev = vals.pop();
            if (prev === undefined) return null;
            const v = apply(prev, op, next);
            if (!Number.isFinite(v)) return null;
            vals.push(v);
        } else {
            ops.push(op);
            vals.push(next);
        }
    }
    let acc = vals[0];
    if (acc === undefined) return null;
    for (let k = 0; k < ops.length; k++) {
        const b = vals[k + 1];
        if (b === undefined) return null;
        acc = apply(acc, ops[k]!, b);
        if (!Number.isFinite(acc)) return null;
    }
    return acc;
}

interface FourOpsPanelProps {
  isLightMode: boolean;
  accentColor: string;
}

export function FourOpsPanel({ isLightMode, accentColor }: FourOpsPanelProps) {
    const [display, setDisplay] = useState("0");

    const handleDigit = (d: string) => {
        setDisplay((prev) => {
            if (prev === "0" && d !== ".") return d;
            if (prev.includes(".") && d === ".") return prev;
            return prev + d;
        });
    };
    const handleOp = (op: string) => {
        setDisplay((prev) => {
            const last = prev.slice(-1);
            if ("+-*/".includes(last)) return prev.slice(0, -1) + op;
            return prev + op;
        });
    };
    const handleEquals = () => {
        const result = evalExpr(display);
        if (result !== null && Number.isFinite(result)) {
            const str = Number.isInteger(result) ? String(result) : String(Math.round(result * 1e10) / 1e10);
            setDisplay(str);
        }
    };
    const handleAC = () => setDisplay("0");
    const handleBackspace = () => {
        setDisplay((prev) => {
            if (prev.length <= 1) return "0";
            const next = prev.slice(0, -1);
            return next === "" ? "0" : next;
        });
    };

    const btnClass = (active?: boolean) =>
        `rounded-xl border transition-all font-mono text-lg ${isLightMode ? "bg-white/95 text-gray-900 border-gray-300/80 hover:bg-gray-50" : "bg-white/15 text-white border-white/20 hover:bg-white/20"} ${active ? "ring-2 ring-offset-2 border-transparent" : ""}`;

    const opBtnClass = `rounded-xl border-2 transition-all font-mono text-lg font-semibold text-white py-3`;

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4 max-w-sm mx-auto w-full">
            <div className="p-4 rounded-2xl border text-right font-mono text-2xl min-h-[3rem] break-all" style={{ borderColor: isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)", background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)" }}>
                {display.replace(/\//g, "÷").replace(/\*/g, "×")}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={handleBackspace} className={`flex-1 py-2.5 rounded-xl border font-medium ${btnClass()}`} title="1文字消す">⌫</button>
                <button type="button" onClick={handleAC} className={`flex-1 py-2.5 rounded-xl border ${btnClass(true)}`}>AC</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {["7", "8", "9"].map((c) => (<button key={c} type="button" onClick={() => handleDigit(c)} className={`py-3 ${btnClass()}`}>{c}</button>))}
                <button type="button" onClick={() => handleOp("/")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>÷</button>
                {["4", "5", "6"].map((c) => (<button key={c} type="button" onClick={() => handleDigit(c)} className={`py-3 ${btnClass()}`}>{c}</button>))}
                <button type="button" onClick={() => handleOp("*")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>×</button>
                {["1", "2", "3"].map((c) => (<button key={c} type="button" onClick={() => handleDigit(c)} className={`py-3 ${btnClass()}`}>{c}</button>))}
                <button type="button" onClick={() => handleOp("-")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>−</button>
                <button type="button" onClick={() => handleDigit("0")} className={`py-3 ${btnClass()}`}>0</button>
                <button type="button" onClick={() => handleDigit(".")} className={`py-3 ${btnClass()}`}>.</button>
                <button type="button" onClick={handleEquals} className="py-3 rounded-xl font-medium text-white border-0" style={{ background: accentColor }}>=</button>
                <button type="button" onClick={() => handleOp("+")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>+</button>
            </div>
        </motion.div>
    );
}
