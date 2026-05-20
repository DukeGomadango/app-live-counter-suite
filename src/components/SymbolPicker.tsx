"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { SYMBOL_CATEGORIES, SYMBOL_SEARCH_METADATA } from "@/lib/constants";
import EmojiGlyph from "@/components/icons/EmojiGlyph";

interface SymbolPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (symbol: string) => void;
    selectedSymbol: string;
    isLightMode: boolean;
}

export default function SymbolPicker({
    isOpen,
    onClose,
    onSelect,
    selectedSymbol,
    isLightMode,
}: SymbolPickerProps) {
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("casino");
    const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
    const [recents, setRecents] = useState<string[]>([]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Mount indicator for SSR compatibility in Next.js
    useEffect(() => {
        Promise.resolve().then(() => setMounted(true));
    }, []);

    // Responsive screen width detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Load recent symbols from localStorage when picker opens
    useEffect(() => {
        if (isOpen) {
            let recentCount = 0;
            let loadedRecents: string[] = [];
            try {
                const stored = localStorage.getItem("app-live-counter-recent-symbols");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        loadedRecents = parsed;
                        recentCount = parsed.length;
                    }
                }
            } catch (e) {
                console.error("Failed to load recent symbols", e);
            }

            Promise.resolve().then(() => {
                setRecents(loadedRecents);
                setSearchQuery("");
                setHoveredSymbol(null);
                setActiveCategory(recentCount > 0 ? "recents" : "casino");
            });
        }
    }, [isOpen]);

    // Handle selection and update recent symbols cache
    const handleSelect = (item: string) => {
        onSelect(item);

        // Update recently used symbols list (max 8 items, no duplicates)
        const updated = [item, ...recents.filter((x) => x !== item)].slice(0, 8);
        setRecents(updated);
        try {
            localStorage.setItem("app-live-counter-recent-symbols", JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save recent symbols", e);
        }

        onClose();
    };

    // Filter symbols based on search query
    const filteredSymbols = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];

        const allItems = new Set<string>();
        SYMBOL_CATEGORIES.forEach((cat) => {
            cat.items.forEach((item) => allItems.add(item));
        });

        return Array.from(allItems).filter((item) => {
            // Match the symbol string itself
            if (item.toLowerCase().includes(q)) return true;

            // Match metadata
            const meta = SYMBOL_SEARCH_METADATA[item];
            if (meta) {
                if (meta.name.toLowerCase().includes(q)) return true;
                if (meta.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
            }
            return false;
        });
    }, [searchQuery]);

    // Smooth scroll jump to selected category
    const scrollToCategory = (catId: string) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const element = container.querySelector(`#picker-cat-${catId}`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            setActiveCategory(catId);
        }
    };

    // Keep tabs highlighted based on scroll position
    const handleScroll = () => {
        if (searchQuery) return; // Disable sticky highlight change during search
        const container = scrollContainerRef.current;
        if (!container) return;

        const containerTop = container.getBoundingClientRect().top;
        const categories = recents.length > 0 ? ["recents", ...SYMBOL_CATEGORIES.map((c) => c.id)] : SYMBOL_CATEGORIES.map((c) => c.id);

        let currentActive = activeCategory;

        for (const catId of categories) {
            const el = container.querySelector(`#picker-cat-${catId}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                // If the element header has reached the top area of the scrolling box
                if (rect.top - containerTop < 45 && rect.bottom - containerTop > 10) {
                    currentActive = catId;
                    break;
                }
            }
        }

        if (currentActive !== activeCategory) {
            setActiveCategory(currentActive);
        }
    };

    // Live preview values
    const previewSymbol = hoveredSymbol || selectedSymbol || "⭐";
    const previewMetadata = useMemo(() => {
        return (
            SYMBOL_SEARCH_METADATA[previewSymbol] || {
                name: previewSymbol,
                keywords: ["シンボル"],
            }
        );
    }, [previewSymbol]);

    if (!mounted) return null;

    // Theme values
    const bgOverlay = "rgba(0,0,0,0.5)";
    const bgPanel = isLightMode ? "rgba(255,255,255,0.96)" : "rgba(20,12,45,0.96)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";
    const inputBg = isLightMode ? "bg-black/5" : "bg-white/5";
    const inputBorder = isLightMode ? "border-black/10" : "border-white/10";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";
    const bgSubtleHover = isLightMode ? "hover:bg-black/10" : "hover:bg-white/10";

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    className={`fixed inset-0 flex z-[120] select-none ${
                        isMobile ? "items-end justify-center" : "items-center justify-center p-4"
                    }`}
                    style={{ background: bgOverlay, backdropFilter: "blur(6px)" }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        className={`w-full flex flex-col relative ${
                            isMobile
                                ? "rounded-t-[2rem] border-t max-h-[82vh] overflow-hidden"
                                : "max-w-[420px] h-[550px] rounded-3xl border overflow-hidden"
                        }`}
                        style={{
                            background: bgPanel,
                            borderColor,
                            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                            height: isMobile ? "75vh" : undefined,
                        }}
                        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 15 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 15 }}
                        transition={
                            isMobile
                                ? { type: "spring", damping: 25, stiffness: 220 }
                                : { type: "spring", stiffness: 450, damping: 32 }
                        }
                        onClick={(e) => e.stopPropagation()}
                        // Enable drag-to-dismiss behavior on mobile devices
                        drag={isMobile ? "y" : false}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0.05, bottom: 0.85 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 120) {
                                onClose();
                            }
                        }}
                    >
                        {/* Drag indicator handle for mobile drawer */}
                        {isMobile && (
                            <div className="w-full flex justify-center py-3 shrink-0">
                                <div
                                    className={`w-12 h-1.5 rounded-full ${
                                        isLightMode ? "bg-black/10" : "bg-white/10"
                                    }`}
                                />
                            </div>
                        )}

                        {/* Title Header */}
                        <div className="flex items-center justify-between px-5 pt-3.5 pb-2 shrink-0">
                            <span className={`text-base font-bold ${textPrimary} flex items-center gap-2`}>
                                <span className="inline-flex animate-pulse">🎰</span>
                                シンボルを選択
                            </span>
                            <button
                                onClick={onClose}
                                className={`w-8 h-8 rounded-xl ${bgSubtle} ${bgSubtleHover} flex items-center justify-center transition-colors`}
                            >
                                <X size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-5 py-2 shrink-0">
                            <div className="relative flex items-center">
                                <Search size={16} className={`absolute left-3.5 ${textMuted}`} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="シンボル名やキーワードで検索..."
                                    className={`w-full ${inputBg} border ${inputBorder} rounded-xl pl-10 pr-9 py-2.5 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors placeholder:text-gray-400 dark:placeholder:text-white/20`}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className={`absolute right-3 w-5 h-5 rounded-full ${bgSubtle} ${bgSubtleHover} flex items-center justify-center`}
                                    >
                                        <X size={12} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Fast Navigation Tabs (Hidden when searching) */}
                        {!searchQuery && (
                            <div className="px-5 py-2 overflow-x-auto scrollbar-none flex gap-1.5 shrink-0 mask-image">
                                {recents.length > 0 && (
                                    <button
                                        onClick={() => scrollToCategory("recents")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                                            activeCategory === "recents"
                                                ? "bg-purple-500/20 text-purple-400 border-purple-500/30 font-bold scale-105"
                                                : `${bgSubtle} ${textSecondary} border-transparent ${bgSubtleHover}`
                                        }`}
                                    >
                                        <span>🕒</span>最近
                                    </button>
                                )}
                                {SYMBOL_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => scrollToCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                                            activeCategory === cat.id
                                                ? "bg-purple-500/20 text-purple-400 border-purple-500/30 font-bold scale-105"
                                                : `${bgSubtle} ${textSecondary} border-transparent ${bgSubtleHover}`
                                        }`}
                                    >
                                        <span>{cat.icon}</span>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Interactive Premium Preview Card */}
                        <div className="px-5 py-2 shrink-0">
                            <div
                                className="w-full rounded-2xl p-3 flex items-center gap-4 border transition-all duration-300"
                                style={{
                                    background: isLightMode
                                        ? "linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)"
                                        : "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)",
                                    borderColor: isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                                }}
                            >
                                <div className="shrink-0 flex items-center justify-center w-14 h-14 relative">
                                    <EmojiGlyph emoji={previewSymbol} size={30} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-black ${textPrimary} truncate`}>
                                        {previewMetadata.name}
                                    </div>
                                    <div className={`text-[10px] ${textSecondary} truncate mt-1 tracking-wide`}>
                                        {previewMetadata.keywords.join(" • ")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grid Scrollable Main Area */}
                        <div
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto px-5 py-2 scroll-touch space-y-5"
                        >
                            {searchQuery ? (
                                filteredSymbols.length > 0 ? (
                                    <div className="grid grid-cols-6 gap-2">
                                        {filteredSymbols.map((item) => (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => handleSelect(item)}
                                                onMouseEnter={() => setHoveredSymbol(item)}
                                                onMouseLeave={() => setHoveredSymbol(null)}
                                                className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-150 ${bgSubtleHover} ${
                                                    selectedSymbol === item
                                                        ? "ring-2 ring-purple-500 bg-purple-500/20 scale-105 shadow-md shadow-purple-500/10"
                                                        : bgSubtle
                                                }`}
                                            >
                                                <EmojiGlyph emoji={item} size={22} />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`py-12 text-center text-sm ${textMuted}`}>
                                        該当するシンボルが見つかりません
                                    </div>
                                )
                            ) : (
                                <>
                                    {/* History Cache (Recently Used) */}
                                    {recents.length > 0 && (
                                        <div
                                            id="picker-cat-recents"
                                            data-cat-id="recents"
                                            className="space-y-2 relative"
                                        >
                                            <h3
                                                className={`text-[10px] font-bold uppercase tracking-wider ${textMuted} sticky top-0 py-1.5 z-10 flex items-center gap-1.5`}
                                                style={{
                                                    background: bgPanel,
                                                }}
                                            >
                                                <span>🕒</span>
                                                最近使用したシンボル
                                            </h3>
                                            <div className="grid grid-cols-6 gap-2">
                                                {recents.map((item) => (
                                                    <button
                                                        key={`recent-${item}`}
                                                        type="button"
                                                        onClick={() => handleSelect(item)}
                                                        onMouseEnter={() => setHoveredSymbol(item)}
                                                        onMouseLeave={() => setHoveredSymbol(null)}
                                                        className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-150 ${bgSubtleHover} ${
                                                            selectedSymbol === item
                                                                ? "ring-2 ring-purple-500 bg-purple-500/20 scale-105 shadow-md shadow-purple-500/10"
                                                                : bgSubtle
                                                        }`}
                                                    >
                                                        <EmojiGlyph emoji={item} size={22} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Categorized Grids */}
                                    {SYMBOL_CATEGORIES.map((cat) => (
                                        <div
                                            key={cat.id}
                                            id={`picker-cat-${cat.id}`}
                                            data-cat-id={cat.id}
                                            className="space-y-2 relative"
                                        >
                                            <h3
                                                className={`text-[10px] font-black uppercase tracking-wider ${textMuted} sticky top-0 py-1.5 z-10 flex items-center gap-1.5 border-b border-transparent`}
                                                style={{
                                                    background: bgPanel,
                                                }}
                                            >
                                                <span>{cat.icon}</span>
                                                {cat.name}
                                            </h3>
                                            <div className="grid grid-cols-6 gap-2">
                                                {cat.items.map((item) => (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => handleSelect(item)}
                                                        onMouseEnter={() => setHoveredSymbol(item)}
                                                        onMouseLeave={() => setHoveredSymbol(null)}
                                                        className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-150 ${bgSubtleHover} ${
                                                            selectedSymbol === item
                                                                ? "ring-2 ring-purple-500 bg-purple-500/20 scale-105 shadow-md shadow-purple-500/10"
                                                                : bgSubtle
                                                        }`}
                                                    >
                                                        <EmojiGlyph emoji={item} size={22} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
