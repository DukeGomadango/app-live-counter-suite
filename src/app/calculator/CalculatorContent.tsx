"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Settings } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import CalculatorSettingsPanel from "@/components/calculator/CalculatorSettingsPanel";
import {
    createDefaultCalculatorSettings,
    type CalculatorSettings,
} from "@/lib/calculator";
import { useGlassStyle } from "@/hooks/useGlassStyle";

type CalcTab = "four" | "fraction" | "probability";

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

function gcd(a: number, b: number): number {
    a = Math.abs(Math.floor(a));
    b = Math.abs(Math.floor(b));
    if (b === 0) return a || 1;
    return gcd(b, a % b);
}

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

export default function CalculatorContent({
    isSplitMode = false,
    isRightPane: _isRightPane = false,
}: {
    isSplitMode?: boolean;
    isRightPane?: boolean;
} = {}) {
    const [settings, setSettings] = useLocalStorage<CalculatorSettings>(
        "calculator-settings",
        createDefaultCalculatorSettings()
    );
    const [isLightMode, setIsLightMode] = useLocalStorage<boolean>("calculator-light-mode", false);
    const [tab, setTab] = useState<CalcTab>("four");
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);

    const { glassBorder } = useGlassStyle(isLightMode);
    const _headerBg = isLightMode ? "rgba(255,255,255,0.7)" : "rgba(20,10,40,0.6)";
    const _displayLight = isLightMode;
    const accentColor = settings.accentColor ?? "#06b6d4";
    const orbIntensity = settings.orbIntensity ?? 50;

    useEffect(() => {
        if (isSplitMode) return;
        if (isLightMode) document.body.classList.add("light-mode");
        else document.body.classList.remove("light-mode");
        return () => document.body.classList.remove("light-mode");
    }, [isLightMode, isSplitMode]);

    const headerBgStrong = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.92)";
    const iconColor = isLightMode ? "text-gray-800" : "text-white";
    const iconHover = isLightMode ? "hover:bg-gray-200" : "hover:bg-white/20";

    const splitPaneBg = isSplitMode ? (isLightMode ? undefined : "#0a051e") : undefined;
    const splitLightBg = "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";
    const splitTopBg = isSplitMode && isLightMode ? "#f8f9fa" : (splitPaneBg ?? headerBgStrong);

    return (
        <div
            className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}
            style={splitPaneBg ? { background: splitPaneBg } : undefined}
        >
            {/* Split時ライト: body.light-mode 相当のベース背景（通常版と同じ見た目） */}
            {isSplitMode && isLightMode && (
                <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{ background: splitLightBg }}
                />
            )}
            {/* 背景オーブ */}
            <div
                className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}
            >
                <motion.div
                    animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
                    style={{
                        background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                        opacity: (orbIntensity / 100) * (isLightMode ? 1.5 : 1),
                    }}
                />
                <motion.div
                    animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
                    style={{
                        background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`,
                        opacity: (orbIntensity / 100) * 0.8 * (isLightMode ? 1.5 : 1),
                    }}
                />
            </div>

            {/* ヘッダー（Split時は他モジュールと上端・高さを揃える） */}
            <div
                className={`shrink-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 ${isSplitMode ? "relative min-h-[56px]" : "fixed top-0"}`}
                style={{
                    background: isSplitMode ? splitTopBg : headerBgStrong,
                    backdropFilter: isSplitMode ? "none" : "blur(12px)",
                    borderBottom: isSplitMode ? "none" : `1px solid ${isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
                }}
            >
                <div className="flex items-center gap-2">
                    {!isSplitMode && <ModeSelector isLightMode={isLightMode} />}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettingsPanel(true)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
                        title="電卓設定"
                        aria-label="設定"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => setIsLightMode(!isLightMode)}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
                        title={isLightMode ? "ダークモード" : "ライトモード"}
                        aria-label={isLightMode ? "ダークモード" : "ライトモード"}
                    >
                        {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showSettingsPanel && (
                    <CalculatorSettingsPanel
                        settings={settings}
                        onSettingsChange={setSettings}
                        isLightMode={isLightMode}
                        onClose={() => setShowSettingsPanel(false)}
                        isSplitMode={isSplitMode}
                    />
                )}
            </AnimatePresence>

            <main
                className={`flex-1 min-h-0 flex flex-col overflow-auto scroll-touch ${!isSplitMode ? "pt-14 p-4" : "p-5"}`}
            >
                {/* タブ（背景・枠を強めてどの背景でも視認しやすく） */}
                <div
                    className="flex gap-1 p-1 rounded-xl mb-4 shrink-0 border overflow-x-auto"
                    style={{
                        background: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.12)",
                        borderColor: isLightMode ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
                    }}
                >
                    {(["four", "fraction", "probability"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                tab === t
                                    ? isLightMode
                                        ? "bg-white text-gray-900 shadow"
                                        : "bg-white/20 text-white"
                                    : isLightMode
                                        ? "text-gray-800 hover:bg-black/8"
                                        : "text-white/90 hover:bg-white/10"
                            }`}
                            style={tab === t ? { border: `1px solid ${isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)"}` } : undefined}
                        >
                            {t === "four" && "四則"}
                            {t === "fraction" && "分数"}
                            {t === "probability" && "確率"}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {tab === "four" && (
                        <FourOpsPanel key="four" isLightMode={isLightMode} glassBorder={glassBorder} accentColor={accentColor} />
                    )}
                    {tab === "fraction" && (
                        <FractionPanel key="fraction" isLightMode={isLightMode} glassBorder={glassBorder} accentColor={accentColor} />
                    )}
                    {tab === "probability" && (
                        <ProbabilityPanel key="probability" isLightMode={isLightMode} glassBorder={glassBorder} accentColor={accentColor} />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function FourOpsPanel({
    isLightMode,
    glassBorder: _glassBorder,
    accentColor,
}: {
    isLightMode: boolean;
    glassBorder: string;
    accentColor: string;
}) {
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
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4 max-w-sm mx-auto w-full"
        >
            <div
                className="p-4 rounded-2xl border text-right font-mono text-2xl min-h-[3rem] break-all"
                style={{
                    borderColor: isLightMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)",
                    background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)",
                }}
            >
                {display.replace(/\//g, "÷").replace(/\*/g, "×")}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={handleBackspace} className={`flex-1 py-2.5 rounded-xl border font-medium ${btnClass()}`} title="1文字消す">
                    ⌫
                </button>
                <button type="button" onClick={handleAC} className={`flex-1 py-2.5 rounded-xl border ${btnClass(true)}`}>
                    AC
                </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {["7", "8", "9"].map((c) => (
                    <button key={c} type="button" onClick={() => handleDigit(c)} className={`py-3 ${btnClass()}`}>
                        {c}
                    </button>
                ))}
                <button type="button" onClick={() => handleOp("/")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>
                    ÷
                </button>
                {["4", "5", "6"].map((c) => (
                    <button key={c} type="button" onClick={() => handleDigit(c)} className={`py-3 ${btnClass()}`}>
                        {c}
                    </button>
                ))}
                <button type="button" onClick={() => handleOp("*")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>
                    ×
                </button>
                {["1", "2", "3"].map((c) => (
                    <button key={c} type="button" onClick={() => handleDigit(c)} className={`py-3 ${btnClass()}`}>
                        {c}
                    </button>
                ))}
                <button type="button" onClick={() => handleOp("-")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>
                    −
                </button>
                <button type="button" onClick={() => handleDigit("0")} className={`py-3 ${btnClass()}`}>
                    0
                </button>
                <button type="button" onClick={() => handleDigit(".")} className={`py-3 ${btnClass()}`}>
                    .
                </button>
                <button
                    type="button"
                    onClick={handleEquals}
                    className="py-3 rounded-xl font-medium text-white border-0"
                    style={{ background: accentColor }}
                >
                    =
                </button>
                <button type="button" onClick={() => handleOp("+")} className={opBtnClass} style={{ borderColor: accentColor, background: `${accentColor}99` }}>
                    +
                </button>
            </div>
        </motion.div>
    );
}

type FracOp = "+" | "-" | "*" | "/";

function reduceFrac(n: number, d: number): [number, number] {
    if (d === 0) return [0, 1];
    if (d < 0) {
        n = -n;
        d = -d;
    }
    const g = gcd(n, d);
    return [Math.floor(n / g), Math.floor(d / g) || 1];
}

function applyFracOp(
    n1: number,
    d1: number,
    op: FracOp,
    n2: number,
    d2: number
): [number, number] {
    if (d1 === 0 || d2 === 0) return [0, 1];
    let n: number;
    let d: number;
    if (op === "+") {
        n = n1 * d2 + n2 * d1;
        d = d1 * d2;
    } else if (op === "-") {
        n = n1 * d2 - n2 * d1;
        d = d1 * d2;
    } else if (op === "*") {
        n = n1 * n2;
        d = d1 * d2;
    } else {
        n = n1 * d2;
        d = d1 * n2;
    }
    return reduceFrac(n, d);
}

/** 乗除を左から先に、その後加減を左から。 */
function computeFractionChain(
    fractions: { num: number; den: number }[],
    operators: FracOp[]
): [number, number] {
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

function FractionPanel({
    isLightMode,
    glassBorder,
    accentColor,
}: {
    isLightMode: boolean;
    glassBorder: string;
    accentColor: string;
}) {
    const [fractions, setFractions] = useState<{ num: number; den: number }[]>([
        { num: 1, den: 2 },
        { num: 1, den: 3 },
    ]);
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

    const FractionInputs = ({
        num,
        den,
        onNum,
        onDen,
        label,
    }: {
        num: number;
        den: number;
        onNum: (n: number) => void;
        onDen: (n: number) => void;
        label: string;
    }) => (
        <div className="flex flex-col items-center gap-0">
            <span className={`text-[10px] mb-0.5 ${labelClass}`}>{label}</span>
            <input
                type="number"
                value={num}
                onChange={(e) => onNum(Number(e.target.value) || 0)}
                className={inputClass}
                aria-label={`${label} 分子`}
            />
            <div
                className="w-14 border-b-2 mt-0.5 mb-0.5 shrink-0"
                style={{ borderColor: isLightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.4)" }}
                aria-hidden
            />
            <input
                type="number"
                value={den}
                onChange={(e) => onDen(Number(e.target.value) || 1)}
                className={inputClass}
                min={1}
                aria-label={`${label} 分母`}
            />
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-6 max-w-sm mx-auto w-full"
        >
            <p className={`text-sm ${labelClass}`}>
                分数と演算子を選んで計算（乗除→加減の順・左から。結果は既約分数）
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                {fractions.map((frac, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <FractionInputs
                            label={`${i + 1}つ目`}
                            num={frac.num}
                            den={frac.den}
                            onNum={(n) => setFraction(i, "num", n)}
                            onDen={(n) => setFraction(i, "den", n)}
                        />
                        {i < operators.length && (
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-[10px] ${labelClass}`}>演算子</span>
                                <div className="grid grid-cols-2 gap-1">
                                    {(["+", "-", "*", "/"] as const).map((o) => (
                                        <button
                                            key={o}
                                            type="button"
                                            onClick={() => setOperator(i, o)}
                                            className={`w-7 h-7 rounded-md font-mono font-bold text-xs ${operators[i] === o ? "text-white border-0" : "border"}`}
                                            style={{
                                                ...(operators[i] === o ? { background: accentColor } : { borderColor: glassBorder, background: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)" }),
                                            }}
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
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${isLightMode ? "text-gray-700 border-gray-300 hover:bg-gray-100" : "text-white/90 border-white/30 hover:bg-white/10"}`}
                >
                    分数を追加
                </button>
                {fractions.length > 2 && (
                    <button
                        type="button"
                        onClick={removeLastFraction}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${isLightMode ? "text-red-600 border-red-200 hover:bg-red-50" : "text-red-400 border-red-400/40 hover:bg-red-500/10"}`}
                    >
                        最後の分数を削除
                    </button>
                )}
            </div>
            <div
                className="p-4 rounded-2xl border text-center"
                style={{ borderColor: glassBorder, background: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.08)" }}
            >
                <span className={`text-xs ${labelClass}`}>結果（既約）</span>
                {resDen === 0 ? (
                    <p className={`font-mono text-xl mt-1 ${isLightMode ? "text-gray-900" : "text-white"}`}>—</p>
                ) : (
                    <div className="flex flex-col items-center gap-0 mt-2">
                        <span className={`font-mono text-xl ${isLightMode ? "text-gray-900" : "text-white"}`}>{resNum}</span>
                        <div
                            className="w-12 border-b-2 my-0.5"
                            style={{ borderColor: isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)" }}
                        />
                        <span className={`font-mono text-xl ${isLightMode ? "text-gray-900" : "text-white"}`}>{resDen}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ProbabilityPanel({
    isLightMode,
    glassBorder,
    accentColor: _accentColor,
}: {
    isLightMode: boolean;
    glassBorder: string;
    accentColor: string;
}) {
    const [pA, setPA] = useState(0.5);
    const [pB, setPB] = useState(0.5);
    const [n, setN] = useState(5);
    const [k, setK] = useState(2);

    const pAnd = pA * pB;
    const pOr = pA + pB - pAnd;
    const comb = nCk(n, k);

    const labelClass = isLightMode ? "text-gray-600" : "text-white/70";
    const cardStyle = {
        borderColor: glassBorder,
        background: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.08)",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-6 max-w-sm mx-auto w-full"
        >
            <p className={`text-sm ${labelClass}`}>シンプルな事象（独立）</p>
            <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>P(A) (0〜1)</label>
                    <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={pA}
                        onChange={(e) => setPA(Number(e.target.value))}
                        className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>P(B) (0〜1)</label>
                    <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={pB}
                        onChange={(e) => setPB(Number(e.target.value))}
                        className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`}
                    />
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
                    <input
                        type="number"
                        min={0}
                        value={n}
                        onChange={(e) => setN(Number(e.target.value) || 0)}
                        className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={`text-xs ${labelClass}`}>k</label>
                    <input
                        type="number"
                        min={0}
                        value={k}
                        onChange={(e) => setK(Number(e.target.value) || 0)}
                        className={`w-20 text-center rounded-lg border py-1 font-mono ${isLightMode ? "bg-white/80 text-gray-800 border-black/10" : "bg-white/10 text-white border-white/20"}`}
                    />
                </div>
            </div>
            <div className="p-4 rounded-2xl border" style={cardStyle}>
                <p className={`text-sm ${labelClass}`}>C(n,k) = n! / (k!(n-k)!)</p>
                <p className={`font-mono text-lg mt-1 ${isLightMode ? "text-gray-900" : "text-white"}`}>
                    {comb !== null ? comb : "—"}
                </p>
            </div>
        </motion.div>
    );
}
