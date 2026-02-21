"use client";

import CounterPage from "@/app/CounterPage";
import FlowChartPage from "@/app/flowchart/page";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSettings } from "@/components/SettingsModal";
import { ChevronDown, LayoutGrid } from "lucide-react";

export type ModuleType = "counter" | "flowchart";

const MODULE_OPTIONS: { value: ModuleType; label: string }[] = [
    { value: "counter", label: "Counter" },
    { value: "flowchart", label: "FlowChart" },
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
    const [isMounted, setIsMounted] = useState(false);

    const [leftModule, setLeftModule] = useLocalStorage<ModuleType>("split-pane-left", "counter");
    const [rightModule, setRightModule] = useLocalStorage<ModuleType>("split-pane-right", "flowchart");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const renderModule = (type: ModuleType) => {
        switch (type) {
            case "counter": return <CounterPage isSplitMode={true} />;
            case "flowchart": return <FlowChartPage isSplitMode={true} />;
            default: return null;
        }
    };

    if (!isMounted) return null;

    return (
        <div className={`h-screen w-screen flex flex-col md:flex-row overflow-hidden relative ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0a051e]'}`}>

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
                        className="absolute left-1/2 top-[72px] -translate-x-1/2 z-50 px-6 py-2 rounded-2xl backdrop-blur-md font-black cursor-grab active:cursor-grabbing border whitespace-nowrap shadow-xl pointer-events-auto"
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
                {/* Module Selector */}
                <div className="absolute top-4 left-4 z-40">
                    <div className="relative group">
                        <select
                            value={leftModule}
                            onChange={(e) => setLeftModule(e.target.value as ModuleType)}
                            className={`appearance-none pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium outline-none cursor-pointer transition-all border shadow-sm backdrop-blur-md ${isLightMode
                                ? "bg-white/70 border-black/10 text-gray-700 hover:bg-white/90"
                                : "bg-black/40 border-white/10 text-white/80 hover:bg-black/60"
                                }`}
                        >
                            {MODULE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className={isLightMode ? "text-gray-900 bg-white" : "text-white bg-slate-900"}>{opt.label}</option>
                            ))}
                        </select>
                        <LayoutGrid size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-500" : "text-white/50"}`} />
                        <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-500" : "text-white/50"}`} />
                    </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                    {renderModule(leftModule)}
                </div>
            </div>

            {/* Right Pane */}
            <div className="flex-1 min-w-0 min-h-0 relative flex flex-col">
                {/* Module Selector */}
                <div className="absolute top-4 left-4 z-40">
                    <div className="relative group">
                        <select
                            value={rightModule}
                            onChange={(e) => setRightModule(e.target.value as ModuleType)}
                            className={`appearance-none pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium outline-none cursor-pointer transition-all border shadow-sm backdrop-blur-md ${isLightMode
                                ? "bg-white/70 border-black/10 text-gray-700 hover:bg-white/90"
                                : "bg-black/40 border-white/10 text-white/80 hover:bg-black/60"
                                }`}
                        >
                            {MODULE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className={isLightMode ? "text-gray-900 bg-white" : "text-white bg-slate-900"}>{opt.label}</option>
                            ))}
                        </select>
                        <LayoutGrid size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-500" : "text-white/50"}`} />
                        <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? "text-gray-500" : "text-white/50"}`} />
                    </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                    {renderModule(rightModule)}
                </div>
            </div>
        </div>
    );
}
