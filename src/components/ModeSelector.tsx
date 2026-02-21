"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Network, Sparkles, ChevronDown } from "lucide-react";

interface ModeSelectorProps {
    isLightMode?: boolean;
}

const MODES = [
    {
        id: "counter",
        path: "/",
        label: "Counter",
        icon: Users,
        color: "text-purple-400",
        activeBg: "bg-purple-500/20",
        activeBorder: "border-purple-500/40",
    },
    {
        id: "flowchart",
        path: "/flowchart",
        label: "FlowChart",
        icon: Network,
        color: "text-blue-400",
        activeBg: "bg-blue-500/20",
        activeBorder: "border-blue-500/40",
    },
    {
        id: "gatcha",
        path: "/gatcha",
        label: "Gatcha",
        icon: Sparkles,
        color: "text-yellow-400",
        activeBg: "bg-yellow-500/20",
        activeBorder: "border-yellow-500/40",
    },
];

export default function ModeSelector({ isLightMode = false }: ModeSelectorProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find the current mode based on exact path match, default to counter if not found
    const currentMode = MODES.find((m) => m.path === pathname) || MODES[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const textColor = isLightMode ? "text-gray-700" : "text-white/80";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";
    const bgHover = isLightMode ? "hover:bg-black/10" : "hover:bg-white/10";
    const borderColor = isLightMode ? "border-black/10" : "border-white/10";
    const dropdownBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15,8,35,0.95)";

    const CurrentIcon = currentMode.icon;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 border ${isOpen ? currentMode.activeBorder : "border-transparent"} hover:${borderColor} ${isOpen ? currentMode.activeBg : bgHover}`}
            >
                <CurrentIcon size={16} className={currentMode.color} />
                <span className={`text-sm font-semibold uppercase tracking-wider ${textColor}`}>
                    {currentMode.label}
                </span>
                <ChevronDown
                    size={14}
                    className={`${textColor} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-48 rounded-xl border overflow-hidden z-[100] shadow-xl"
                        style={{
                            background: dropdownBg,
                            borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                            backdropFilter: "blur(12px)",
                        }}
                    >
                        <div className="flex flex-col p-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 ${isLightMode ? "text-gray-400" : "text-white/30"}`}>
                                Switch Mode
                            </span>
                            {MODES.map((mode) => {
                                const ModeIcon = mode.icon;
                                const isActive = currentMode.id === mode.id;

                                return (
                                    <Link
                                        href={mode.path}
                                        key={mode.id}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${isActive
                                            ? `${mode.activeBg} ${mode.color} font-medium`
                                            : `${textColor} ${bgHover}`
                                            }`}
                                    >
                                        <ModeIcon size={16} className={isActive ? mode.color : isLightMode ? "text-gray-400" : "text-white/40"} />
                                        {mode.label}
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-indicator"
                                                className={`ml-auto w-1.5 h-1.5 rounded-full`}
                                                style={{ backgroundColor: isActive ? 'currentColor' : 'transparent' }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
