"use client";

import dynamic from "next/dynamic";
import CounterPage from "@/app/CounterPage";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const FlowChartPage = dynamic<{ isSplitMode?: boolean; isRightPane?: boolean }>(
  () => import("@/app/flowchart/FlowchartContent"),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[200px] text-white/60">読み込み中…</div> }
);
const GachaPage = dynamic<{ isSplitMode?: boolean; isRightPane?: boolean }>(
  () => import("@/app/gacha/GachaContent"),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[200px] text-white/60">読み込み中…</div> }
);
const RoulettePage = dynamic<{ isSplitMode?: boolean; isRightPane?: boolean }>(
  () => import("@/app/roulette/RouletteContent"),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[200px] text-white/60">読み込み中…</div> }
);
const CalculatorPage = dynamic<{ isSplitMode?: boolean; isRightPane?: boolean }>(
  () => import("@/app/calculator/CalculatorContent"),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[200px] text-white/60">読み込み中…</div> }
);
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSettings } from "@/components/SettingsModal";
import ModeSelector from "@/components/ModeSelector";
import { ChevronDown, LayoutGrid, PanelLeft, PanelRight } from "lucide-react";

export type ModuleType = "counter" | "flowchart" | "gacha" | "roulette" | "calculator";

const MODULE_OPTIONS: { value: ModuleType; label: string }[] = [
    { value: "counter", label: "Counter" },
    { value: "flowchart", label: "FlowChart" },
    { value: "gacha", label: "Gacha" },
    { value: "roulette", label: "Roulette" },
    { value: "calculator", label: "Calculator" },
];

export default function SplitPage() {
    const [isLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
    const [appSettings] = useLocalStorage<AppSettings>(
        "counter-app-settings",
        {
            cardSize: "L",
            showProjectName: false,
            projectName: "",
            projectNameSize: "M",
        } as AppSettings
    );
    const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
    const [isMobileView, setIsMobileView] = useState(false);
    const [mobileActivePane, setMobileActivePane] = useState<"left" | "right">("left");

    const [leftModule, setLeftModule] = useLocalStorage<ModuleType>("split-pane-left", "counter");
    const [rightModule, setRightModule] = useLocalStorage<ModuleType>("split-pane-right", "flowchart");

    useEffect(() => {
        const check = () => setIsMobileView(typeof window !== "undefined" && window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const renderModule = (type: ModuleType, isRight: boolean = false) => {
        switch (type) {
            case "counter": return <CounterPage isSplitMode={true} isRightPane={isRight} />;
            case "flowchart": return <FlowChartPage isSplitMode={true} isRightPane={isRight} />;
            case "gacha": return <GachaPage isSplitMode={true} isRightPane={isRight} />;
            case "roulette": return <RoulettePage isSplitMode={true} isRightPane={isRight} />;
            case "calculator": return <CalculatorPage isSplitMode={true} isRightPane={isRight} />;
            default: return null;
        }
    };

    if (!isMounted) return null;

    const paneSelectorStyle: React.CSSProperties = {
        background: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(20,10,40,0.6)",
        border: `1px solid ${isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
    };

    // モバイル: タブで1ペインずつフル表示（見切れ・メニュー問題を解消）
    if (isMobileView) {
        return (
            <div className={`h-screen w-screen flex flex-col overflow-hidden ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0a051e]'}`}>
                {/* 上部タブ: 左ペイン | 右ペイン */}
                <div
                    className="flex shrink-0 border-b z-50"
                    style={{ ...paneSelectorStyle, borderLeft: "none", borderRight: "none", borderTop: "none" }}
                >
                    <button
                        type="button"
                        onClick={() => setMobileActivePane("left")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${mobileActivePane === "left"
                            ? (isLightMode ? "bg-white text-purple-700 shadow-sm" : "bg-white/10 text-purple-300")
                            : (isLightMode ? "text-gray-500" : "text-white/40")
                            }`}
                    >
                        <PanelLeft size={18} />
                        <span>{MODULE_OPTIONS.find(o => o.value === leftModule)?.label ?? "左"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileActivePane("right")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${mobileActivePane === "right"
                            ? (isLightMode ? "bg-white text-purple-700 shadow-sm" : "bg-white/10 text-purple-300")
                            : (isLightMode ? "text-gray-500" : "text-white/40")
                            }`}
                    >
                        <PanelRight size={18} />
                        <span>{MODULE_OPTIONS.find(o => o.value === rightModule)?.label ?? "右"}</span>
                    </button>
                </div>
                {/* モジュール切り替え（表示中ペイン用） */}
                <div className="flex justify-center gap-2 py-2 px-2 shrink-0" style={{ background: isLightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)" }}>
                    <div className="relative flex items-center gap-1.5 p-1.5 rounded-xl shadow-md" style={paneSelectorStyle}>
                        <LayoutGrid size={14} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                        <select
                            value={mobileActivePane === "left" ? leftModule : rightModule}
                            onChange={(e) => {
                                const v = e.target.value as ModuleType;
                                if (mobileActivePane === "left") setLeftModule(v);
                                else setRightModule(v);
                            }}
                            className={`appearance-none pl-1 pr-6 py-1 rounded-lg text-xs font-bold outline-none cursor-pointer ${isLightMode ? "bg-white/90 text-gray-800" : "bg-black/40 text-white"}`}
                        >
                            {MODULE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>
                </div>
                <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {mobileActivePane === "left" ? (
                            <motion.div key="left" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full w-full">
                                {renderModule(leftModule, false)}
                            </motion.div>
                        ) : (
                            <motion.div key="right" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full w-full">
                                {renderModule(rightModule, true)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // デスクトップ: 上部メニューバー + 左右2ペイン
    return (
        <div className={`h-screen w-screen flex flex-col overflow-hidden relative ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0a051e]'}`}>
            {/* 上部メニューバー：モード切替（Counter/Split/Gacha等）＋ 左・右ペインの機能 */}
            <div
                className="flex items-center justify-between gap-3 shrink-0 py-1.5 px-3 border-b md:flex-row min-h-0"
                style={{ ...paneSelectorStyle, borderLeft: "none", borderRight: "none", borderTop: "none" }}
            >
                <div className="flex items-center shrink-0">
                    <ModeSelector isLightMode={isLightMode} />
                </div>
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <PanelLeft size={14} className={`shrink-0 ${isLightMode ? "text-gray-500" : "text-white/50"}`} aria-hidden />
                        <div className="flex items-center p-1 rounded-lg shadow-sm backdrop-blur-md" style={paneSelectorStyle}>
                            <div className="relative group">
                                <select
                                    value={leftModule}
                                    onChange={(e) => setLeftModule(e.target.value as ModuleType)}
                                    className={`appearance-none pl-7 pr-5 py-1 rounded-md text-[11px] font-bold outline-none cursor-pointer transition-all ${isLightMode ? "bg-white/80 text-gray-800 hover:bg-white" : "bg-black/40 text-white hover:bg-black/60"}`}
                                    aria-label="左ペインの機能"
                                >
                                    {MODULE_OPTIONS.map(opt => (
                                        <option key={`left-${opt.value}`} value={opt.value} className={isLightMode ? "text-gray-900 bg-white" : "text-white bg-slate-900"}>{opt.label}</option>
                                    ))}
                                </select>
                                <LayoutGrid size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-500" : "text-white/50"}`} />
                                <ChevronDown size={12} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-400" : "text-white/40"}`} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <PanelRight size={14} className={`shrink-0 ${isLightMode ? "text-gray-500" : "text-white/50"}`} aria-hidden />
                        <div className="flex items-center p-1 rounded-lg shadow-sm backdrop-blur-md" style={paneSelectorStyle}>
                            <div className="relative group">
                                <select
                                    value={rightModule}
                                    onChange={(e) => setRightModule(e.target.value as ModuleType)}
                                    className={`appearance-none pl-7 pr-5 py-1 rounded-md text-[11px] font-bold outline-none cursor-pointer transition-all ${isLightMode ? "bg-white/80 text-gray-800 hover:bg-white" : "bg-black/40 text-white hover:bg-black/60"}`}
                                    aria-label="右ペインの機能"
                                >
                                    {MODULE_OPTIONS.map(opt => (
                                        <option key={`right-${opt.value}`} value={opt.value} className={isLightMode ? "text-gray-900 bg-white" : "text-white bg-slate-900"}>{opt.label}</option>
                                    ))}
                                </select>
                                <LayoutGrid size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-500" : "text-white/50"}`} />
                                <ChevronDown size={12} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-400" : "text-white/40"}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* メイン：左右2ペイン */}
            <div className="flex-1 flex min-h-0 md:flex-row">
                {/* Global Project Name for Split View */}
                <AnimatePresence>
                    {appSettings.showProjectName && appSettings.projectName && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="absolute left-1/2 top-[44px] -translate-x-1/2 z-50 px-6 py-2 rounded-2xl backdrop-blur-md font-black cursor-grab active:cursor-grabbing border whitespace-nowrap shadow-xl pointer-events-auto"
                            style={{
                                color: appSettings.projectNameColor,
                                background: isLightMode ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.6)",
                                borderColor: isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
                                fontSize:
                                    appSettings.projectNameSize === "XL" ? "2.5rem" :
                                        appSettings.projectNameSize === "L" ? "1.75rem" :
                                            appSettings.projectNameSize === "S" ? "1rem" : "1.25rem",
                                writingMode: appSettings.projectNameOrientation === "vertical" ? "vertical-rl" : "horizontal-tb",
                                margin: appSettings.projectNameOrientation === "vertical" ? "0 auto" : undefined,
                            }}
                        >
                            {appSettings.projectName}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Left Pane */}
                <div className={`flex-1 min-w-0 min-h-0 relative border-b md:border-b-0 md:border-r flex flex-col ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
                        {renderModule(leftModule, false)}
                    </div>
                </div>

                {/* Right Pane */}
                <div className="flex-1 min-w-0 min-h-0 relative flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
                        {renderModule(rightModule, true)}
                    </div>
                </div>
            </div>
        </div>
    );
}
