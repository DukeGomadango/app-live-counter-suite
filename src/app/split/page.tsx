"use client";

import CounterPage from "@/app/CounterPage";
import FlowChartPage from "@/app/flowchart/page";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSettings } from "@/components/SettingsModal";

export default function SplitPage() {
    const [isLightMode] = useLocalStorage<boolean>("counter-light-mode", false);
    const [appSettings] = useLocalStorage<AppSettings>(
        "counter-app-settings",
        {
            cardSize: "L",
            showProjectName: false,
            projectName: "",
            projectNameSize: "M",
            projectNameColor: "#a855f7",
            accentColor: "#a855f7",
            orbIntensity: 50,
        } as AppSettings
    );
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

            <div className={`flex-1 min-w-0 min-h-0 relative border-b md:border-b-0 md:border-r ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                <CounterPage isSplitMode={true} />
            </div>
            <div className="flex-1 min-w-0 min-h-0 relative">
                <FlowChartPage isSplitMode={true} />
            </div>
        </div>
    );
}
