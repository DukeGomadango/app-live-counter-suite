"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    X,
    Sun,
    Moon,
    RotateCcw,
    Users,
    Plus,
    Trash2,
    Pencil,
    Check,
    Sparkles,
    LayoutGrid,
    Save,
    FolderOpen,
    Target,
    Settings,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { TEMPLATES, type Template, type CounterItem } from "@/lib/templates";
import { EMOJI_OPTIONS, COLOR_OPTIONS } from "@/lib/constants";
import ModeSelector from "@/components/ModeSelector";
import { Node, Edge } from "@xyflow/react";

export type SavedFlowChart = {
    id: string;
    name: string;
    notes?: string;
    nodes: Node[];
    edges: Edge[];
    updatedAt: number;
};

interface HamburgerMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    isLightMode: boolean;
    onToggleTheme: () => void;
    onReset: () => void;
    onOpenSettings: () => void;
    accentColor: string;
    viewMode: "counter" | "flowchart";
    hideThemeToggle?: boolean;
    /** Split表示時は上部バーにモード切替があるため非表示 */
    hideModeSelector?: boolean;

    // Counter specific
    totalCount?: number;
    totalTarget?: number;
    items?: CounterItem[];
    onSelectTemplate?: (template: Template) => void;
    onAddItem?: (label: string, emoji: string) => void;
    onEditItem?: (id: string, label: string, emoji: string, target: number, color: string) => void;
    onDeleteItem?: (id: string) => void;
    onSetTarget?: (id: string, target: number) => void;
    onSetAllTargets?: (target: number) => void;
    currentTemplateId?: string;
    onSaveCustomTemplate?: (name: string) => void;
    customTemplates?: Template[];
    onDeleteCustomTemplate?: (id: string) => void;

    // FlowChart specific
    savedCharts?: SavedFlowChart[];
    onSaveChart?: (name: string) => void;
    onLoadChart?: (chart: SavedFlowChart) => void;
    onDeleteChart?: (id: string) => void;
    globalTarget?: number;
    onSetGlobalTarget?: (t: number) => void;
    flowchartNodes?: Node[];
    onSetNodeTarget?: (id: string, target: number) => void;
}

// EMOJI_OPTIONS and COLOR_OPTIONS are now imported from @/lib/constants

type TabId = "templates" | "items" | "targets" | "custom" | "actions" | "save_load";

export default function HamburgerMenu({
    isOpen,
    onToggle,
    isLightMode,
    onToggleTheme,
    onReset,
    onOpenSettings,
    accentColor,
    viewMode,
    hideThemeToggle = false,
    hideModeSelector = false,

    // Counter
    totalCount = 0,
    totalTarget = 0,
    items = [],
    onSelectTemplate,
    onAddItem,
    onEditItem,
    onDeleteItem,
    onSetTarget,
    onSetAllTargets,
    currentTemplateId,
    onSaveCustomTemplate,
    customTemplates = [],
    onDeleteCustomTemplate,

    // FlowChart
    savedCharts = [],
    onSaveChart,
    onLoadChart,
    onDeleteChart,
    globalTarget = 0,
    onSetGlobalTarget,
    flowchartNodes = [],
    onSetNodeTarget,
}: HamburgerMenuProps) {
    const [activeTab, setActiveTab] = useState<TabId>(viewMode === "counter" ? "templates" : "actions");
    const [confirmReset, setConfirmReset] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newEmoji, setNewEmoji] = useState("⭐");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editEmoji, setEditEmoji] = useState("");
    const [editTarget, setEditTarget] = useState(0);
    const [editColor, setEditColor] = useState("");
    const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [bulkTarget, setBulkTarget] = useState("");

    // FlowChart specific local state
    const [isSaving, setIsSaving] = useState(false);
    const [newChartName, setNewChartName] = useState("");

    const handleReset = useCallback(() => {
        if (confirmReset) {
            onReset();
            setConfirmReset(false);
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
        }
    }, [confirmReset, onReset]);

    const handleAddItem = useCallback(() => {
        if (newLabel.trim() && onAddItem) {
            onAddItem(newLabel.trim(), newEmoji);
            setNewLabel("");
            setNewEmoji("⭐");
        }
    }, [newLabel, newEmoji, onAddItem]);

    const handleStartEdit = (item: CounterItem) => {
        setEditingId(item.id);
        setEditLabel(item.label);
        setEditEmoji(item.emoji);
        setEditTarget(item.target);
        setEditColor(item.color);
    };

    const handleSaveEdit = () => {
        if (editingId && editLabel.trim() && onEditItem) {
            onEditItem(editingId, editLabel.trim(), editEmoji, Math.max(0, editTarget), editColor);
            setEditingId(null);
            setShowEditEmojiPicker(false);
        }
    };

    const handleSaveTemplate = () => {
        if (newTemplateName.trim()) {
            onSaveCustomTemplate?.(newTemplateName.trim());
            setNewTemplateName("");
        }
    };

    const handleBulkTarget = () => {
        const val = parseInt(bulkTarget, 10);
        if (!isNaN(val) && val >= 0) {
            onSetAllTargets?.(val);
            setBulkTarget("");
        }
    };

    const handleSaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newChartName.trim() && onSaveChart) {
            onSaveChart(newChartName.trim());
            setNewChartName("");
            setIsSaving(false);
        }
    };

    // Theme-aware colors
    const bg = isLightMode ? "rgba(255,255,255,0.85)" : "rgba(15,8,35,0.95)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
    const textMuted = isLightMode ? "text-gray-400" : "text-white/30";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";
    const bgSubtleHover = isLightMode ? "hover:bg-black/10" : "hover:bg-white/10";
    const borderSubtle = isLightMode ? "border-black/10" : "border-white/10";
    const inputBg = isLightMode ? "bg-black/5" : "bg-white/5";
    const inputBorder = isLightMode ? "border-black/10" : "border-white/10";

    // FlowChart nodes grouped by operation for targets
    const groupedFlowchartNodes = useMemo(() => {
        if (viewMode !== "flowchart" || !flowchartNodes) return {} as Record<string, Node[]>;
        const counterNodes = flowchartNodes.filter(n => n.type === "counter" && !n.data.isGhost);
        const grouped: Record<string, Node[]> = { "+": [], "-": [], "*": [], "/": [] };
        counterNodes.forEach(n => {
            const op = String(n.data.operation);
            if (grouped[op]) grouped[op].push(n);
        });
        return grouped;
    }, [viewMode, flowchartNodes]);

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = viewMode === "counter" ? [
        { id: "templates", label: "テンプレ", icon: <LayoutGrid size={13} /> },
        { id: "items", label: "項目", icon: <Pencil size={13} /> },
        { id: "targets", label: "目標", icon: <Target size={13} /> },
        { id: "custom", label: "保存", icon: <FolderOpen size={13} /> },
    ] : [
        { id: "actions", label: "操作", icon: <LayoutGrid size={13} /> },
        { id: "save_load", label: "保存/読込", icon: <FolderOpen size={13} /> },
    ];

    return (
        <>
            {/* Header bar */}
            <div
                className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-1.5 sm:px-3 py-2"
                style={{
                    background: isLightMode ? "rgba(255,255,255,0.5)" : "rgba(10,5,30,0.5)",
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${borderColor}`,
                }}
            >
                {/* Left: Hamburger + Title */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                        onClick={onToggle}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                    >
                        {isOpen ? (
                            <X size={18} className={isLightMode ? "text-gray-700" : "text-white/80"} />
                        ) : (
                            <Menu size={18} className={isLightMode ? "text-gray-700" : "text-white/80"} />
                        )}
                    </button>
                    {!hideModeSelector && <ModeSelector isLightMode={isLightMode} />}
                </div>

                {/* Center: Total count with target */}
                {viewMode === "counter" && (
                    <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 rounded-full ${bgSubtle} border ${borderSubtle} mx-1 shrink min-w-0`}>
                        <span className={`text-[10px] sm:text-sm ${textMuted}`}>合計</span>
                        <div className="flex items-baseline gap-0.5 truncate">
                            <AnimatePresence mode="popLayout">
                                <motion.span
                                    key={totalCount}
                                    initial={{ opacity: 0, y: -6, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.8 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="text-sm sm:text-base font-bold tabular-nums"
                                    style={{
                                        color: totalCount > 0 ? "#a855f7" : isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)",
                                        textShadow: totalCount > 0 ? "0 0 10px rgba(168,85,247,0.4)" : "none",
                                    }}
                                >
                                    {totalCount}
                                </motion.span>
                            </AnimatePresence>
                            {totalTarget > 0 && (
                                <span className={`text-[10px] sm:text-xs ${textMuted} tabular-nums break-keep`}>/{totalTarget}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Right: Settings + Reset + Theme toggle */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                        onClick={onOpenSettings}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                        title="設定"
                    >
                        <Settings size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                    </button>
                    <button
                        onClick={handleReset}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 border ${confirmReset
                            ? "bg-red-500/20 border-red-500/30"
                            : `${bgSubtle} ${borderSubtle} ${bgSubtleHover}`
                            }`}
                        title={confirmReset ? "もう一度クリックで確定" : "カウントリセット"}
                    >
                        <RotateCcw size={16} className={confirmReset ? "text-red-400" : isLightMode ? "text-gray-500" : "text-white/50"} />
                    </button>
                    {!hideThemeToggle && (
                        <button
                            onClick={onToggleTheme}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                            title={isLightMode ? "ダークモードに切替" : "ライトモードに切替"}
                        >
                            {isLightMode ? (
                                <Moon size={16} className="text-gray-600" />
                            ) : (
                                <Sun size={16} className="text-yellow-400" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Sidebar menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onToggle}
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40"
                            style={{ top: "52px" }}
                        />

                        <motion.div
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute left-0 bottom-0 w-[320px] z-50 overflow-y-auto"
                            style={{
                                top: "52px",
                                background: bg,
                                backdropFilter: "blur(20px)",
                                borderRight: `1px solid ${borderColor}`,
                                boxShadow: "10px 0 40px rgba(0,0,0,0.3)",
                            }}
                        >
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles size={16} className="text-purple-400" />
                                    <h2 className={`text-base font-bold ${textPrimary}`}>メニュー</h2>
                                </div>

                                {/* Tabs */}
                                <div className={`flex gap-0.5 mb-4 p-1 rounded-xl ${bgSubtle}`}>
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === tab.id
                                                ? "bg-purple-500/20 text-purple-400 shadow-sm"
                                                : `${textSecondary} ${bgSubtleHover}`
                                                }`}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                <AnimatePresence mode="wait">
                                    {activeTab === "templates" && (
                                        <motion.div
                                            key="templates"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <p className={`text-xs ${textMuted} mb-3`}>
                                                テンプレートを選んで素早くカウンターを切り替え
                                            </p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[...TEMPLATES, ...customTemplates].map((template) => (
                                                    <button
                                                        key={template.id}
                                                        onClick={() => {
                                                            onSelectTemplate?.(template);
                                                            onToggle();
                                                        }}
                                                        className={`text-left p-3 rounded-xl transition-all duration-200 border ${currentTemplateId === template.id
                                                            ? "bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-500/10"
                                                            : `${bgSubtle} ${borderSubtle} ${bgSubtleHover}`
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className={`font-medium text-sm ${textPrimary}`}>
                                                                    {template.name}
                                                                </div>
                                                                <div className={`text-xs ${textMuted} mt-0.5`}>
                                                                    {template.description} ({template.items.length}項目)
                                                                </div>
                                                            </div>
                                                            {currentTemplateId === template.id && (
                                                                <Check size={14} className="text-purple-400" />
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    onSelectTemplate?.({ id: `custom-new-${Date.now()}`, name: "新規カウンター", description: "一から自由に作成", items: [] });
                                                    setActiveTab("items");
                                                    onToggle();
                                                }}
                                                className={`w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 border-2 border-dashed ${borderSubtle} hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-400 group`}
                                            >
                                                <div className="w-6 h-6 rounded-full border border-purple-400/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Plus size={14} />
                                                </div>
                                                <span className="text-sm font-medium text-[rgba(168,85,247,0.9)]">テンプレートを作成</span>
                                            </button>
                                        </motion.div>
                                    )}

                                    {activeTab === "items" && (
                                        <motion.div
                                            key="items"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {/* Add new item */}
                                            <div className="mb-4">
                                                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                                                    項目を追加
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                            className={`w-9 h-9 rounded-xl ${bgSubtle} border ${borderSubtle} flex items-center justify-center text-lg ${bgSubtleHover} transition-colors`}
                                                        >
                                                            {newEmoji}
                                                        </button>
                                                        {showEmojiPicker && (
                                                            <div
                                                                className="absolute top-full left-0 mt-1 p-2 rounded-xl border grid grid-cols-8 gap-1 z-50 w-64"
                                                                style={{
                                                                    background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15,8,35,0.95)",
                                                                    borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                                                                }}
                                                            >
                                                                {EMOJI_OPTIONS.map((e) => (
                                                                    <button
                                                                        key={e}
                                                                        onClick={() => { setNewEmoji(e); setShowEmojiPicker(false); }}
                                                                        className={`w-7 h-7 rounded ${bgSubtleHover} flex items-center justify-center text-sm`}
                                                                    >
                                                                        {e}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        value={newLabel}
                                                        onChange={(e) => setNewLabel(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                                                        placeholder="項目名を入力..."
                                                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors`}
                                                    />
                                                    <button
                                                        onClick={handleAddItem}
                                                        disabled={!newLabel.trim()}
                                                        className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus size={16} className="text-purple-400" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Current items list */}
                                            <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                                                項目一覧 ({items.length})
                                            </h3>
                                            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`flex items-center gap-2 p-2 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                                                    >
                                                        {editingId === item.id ? (
                                                            <div className="w-full space-y-2">
                                                                {/* Row 1: emoji + name */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                                                                            className={`w-8 h-8 rounded-lg ${bgSubtle} flex items-center justify-center text-base ${bgSubtleHover} transition-colors`}
                                                                        >
                                                                            {editEmoji}
                                                                        </button>
                                                                        {showEditEmojiPicker && (
                                                                            <div
                                                                                className="absolute top-full left-0 mt-1 p-2 rounded-xl border grid grid-cols-8 gap-1 z-50 w-64"
                                                                                style={{
                                                                                    background: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15,8,35,0.95)",
                                                                                    borderColor: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                                                                                }}
                                                                            >
                                                                                {EMOJI_OPTIONS.map((e) => (
                                                                                    <button
                                                                                        key={e}
                                                                                        onClick={() => { setEditEmoji(e); setShowEditEmojiPicker(false); }}
                                                                                        className={`w-7 h-7 rounded ${bgSubtleHover} flex items-center justify-center text-sm`}
                                                                                    >
                                                                                        {e}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <input
                                                                        value={editLabel}
                                                                        onChange={(e) => setEditLabel(e.target.value)}
                                                                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-lg px-2 py-1 text-sm ${textPrimary} outline-none focus:border-purple-500/50`}
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                                {/* Row 2: target + color */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs ${textMuted} shrink-0`}>目標:</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={editTarget || ""}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value, 10);
                                                                            setEditTarget(isNaN(val) ? 0 : val);
                                                                        }}
                                                                        placeholder="0"
                                                                        className={`w-14 ${inputBg} border ${inputBorder} rounded-lg px-1.5 py-0.5 text-xs text-center ${textPrimary} outline-none focus:border-purple-500/50 tabular-nums`}
                                                                    />
                                                                    <span className={`text-xs ${textMuted} shrink-0`}>色:</span>
                                                                    <div className="flex gap-1 flex-wrap flex-1">
                                                                        {COLOR_OPTIONS.map((c) => (
                                                                            <button
                                                                                key={c.value}
                                                                                onClick={() => setEditColor(c.value)}
                                                                                className="w-4 h-4 rounded-full transition-all"
                                                                                style={{
                                                                                    background: c.value,
                                                                                    boxShadow: editColor === c.value
                                                                                        ? `0 0 0 1.5px ${isLightMode ? "white" : "#140c2d"}, 0 0 0 3px ${c.value}`
                                                                                        : "none",
                                                                                }}
                                                                                title={c.label}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {/* Row 3: save / cancel */}
                                                                <div className="flex justify-end gap-1">
                                                                    <button
                                                                        onClick={() => { setEditingId(null); setShowEditEmojiPicker(false); }}
                                                                        className={`px-2 py-1 rounded-lg text-xs ${bgSubtle} border ${borderSubtle} ${textSecondary} ${bgSubtleHover} transition-colors`}
                                                                    >
                                                                        キャンセル
                                                                    </button>
                                                                    <button
                                                                        onClick={handleSaveEdit}
                                                                        className="px-2 py-1 rounded-lg text-xs bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-1"
                                                                    >
                                                                        <Check size={10} />
                                                                        保存
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-base w-7 text-center">{item.emoji}</span>
                                                                <span className={`flex-1 text-sm ${isLightMode ? "text-gray-700" : "text-white/80"}`}>
                                                                    {item.label}
                                                                </span>
                                                                <span
                                                                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                                                                    style={{ color: item.color, background: `${item.color}15` }}
                                                                >
                                                                    {item.count}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleStartEdit(item)}
                                                                    className={`w-6 h-6 rounded-lg ${bgSubtle} border ${borderSubtle} flex items-center justify-center ${bgSubtleHover} transition-colors`}
                                                                >
                                                                    <Pencil size={10} className={textMuted} />
                                                                </button>
                                                                <button
                                                                    onClick={() => onDeleteItem?.(item.id)}
                                                                    className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                                                >
                                                                    <Trash2 size={10} className="text-red-400/60" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === "targets" && (
                                        <motion.div
                                            key="targets"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {/* Bulk target setting */}
                                            <div className="mb-5">
                                                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                                                    一括目標設定
                                                </h3>
                                                <p className={`text-xs ${textMuted} mb-2`}>
                                                    全ての項目に同じ目標数値を設定します（0で目標解除）
                                                </p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={bulkTarget}
                                                        onChange={(e) => setBulkTarget(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleBulkTarget()}
                                                        placeholder="目標数..."
                                                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors tabular-nums`}
                                                    />
                                                    <button
                                                        onClick={handleBulkTarget}
                                                        disabled={!bulkTarget.trim()}
                                                        className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5 hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs text-purple-400 font-medium"
                                                    >
                                                        <Target size={13} />
                                                        設定
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Per-item targets */}
                                            <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                                                項目別の目標
                                            </h3>
                                            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`flex items-center gap-2 p-2 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                                                    >
                                                        <span className="text-base w-6 text-center">{item.emoji}</span>
                                                        <span className={`flex-1 text-sm ${isLightMode ? "text-gray-700" : "text-white/80"} truncate`}>
                                                            {item.label}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <span
                                                                className="text-xs font-mono tabular-nums"
                                                                style={{ color: item.color }}
                                                            >
                                                                {item.count}
                                                            </span>
                                                            <span className={`text-xs ${textMuted}`}>/</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.target || ""}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    onSetTarget?.(item.id, isNaN(val) ? 0 : val);
                                                                }}
                                                                placeholder="0"
                                                                className={`w-12 ${inputBg} border ${inputBorder} rounded-lg px-1.5 py-0.5 text-xs text-center ${textPrimary} outline-none focus:border-purple-500/40 tabular-nums`}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === "custom" && (
                                        <motion.div
                                            key="custom"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <div className="mb-4">
                                                <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                                                    現在の設定を保存
                                                </h3>
                                                <p className={`text-xs ${textMuted} mb-2`}>
                                                    現在の{items.length}個の項目をテンプレートとして保存
                                                </p>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={newTemplateName}
                                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                                                        placeholder="テンプレート名..."
                                                        className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/40 transition-colors`}
                                                    />
                                                    <button
                                                        onClick={handleSaveTemplate}
                                                        disabled={!newTemplateName.trim()}
                                                        className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5 hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs text-purple-400 font-medium"
                                                    >
                                                        <Save size={13} />
                                                        保存
                                                    </button>
                                                </div>
                                            </div>

                                            <h3 className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2`}>
                                                保存済みテンプレート
                                            </h3>
                                            {customTemplates.length === 0 ? (
                                                <div className={`text-center py-8 text-xs ${textMuted}`}>
                                                    まだ保存されたテンプレートはありません
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {customTemplates.map((t) => (
                                                        <div
                                                            key={t.id}
                                                            className={`flex items-center justify-between p-3 rounded-xl ${bgSubtle} border ${borderSubtle}`}
                                                        >
                                                            <button
                                                                onClick={() => { onSelectTemplate?.(t); onToggle(); }}
                                                                className="flex-1 text-left"
                                                            >
                                                                <div className={`text-sm font-medium ${textPrimary}`}>{t.name}</div>
                                                                <div className={`text-xs ${textMuted} mt-0.5`}>
                                                                    {t.items.length}項目 · {t.items.map((i) => i.emoji).slice(0, 6).join(" ")}
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteCustomTemplate?.(t.id)}
                                                                className="ml-2 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                                            >
                                                                <Trash2 size={12} className="text-red-400/60" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === "actions" && viewMode === "flowchart" && (
                                        <motion.div
                                            key="actions"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-4"
                                        >
                                            <div className="space-y-2">
                                                <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>
                                                    キャンバス操作
                                                </h3>

                                                <button
                                                    onClick={handleReset}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${confirmReset
                                                        ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                                                        : `border-transparent ${bgSubtle} ${bgSubtleHover} ${textPrimary}`
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${confirmReset ? "bg-red-500/20" : isLightMode ? "bg-black/5" : "bg-white/5"}`}>
                                                            <RotateCcw size={16} />
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {confirmReset ? "本当にリセットしますか？" : "キャンバスを全消去"}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${confirmReset ? "bg-red-500 text-white" : isLightMode ? "bg-black/10 text-gray-500" : "bg-white/10 text-white/50"}`}>
                                                        Reset
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>
                                                    総合計の目標
                                                </h3>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`}>
                                                            <Target size={16} />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={globalTarget || ""}
                                                            onChange={(e) => onSetGlobalTarget?.(Math.max(0, Number(e.target.value)))}
                                                            placeholder="目標値を入力 (例: 1000)"
                                                            className={`w-full ${inputBg} border ${inputBorder} rounded-xl pl-10 pr-3 py-2.5 text-sm ${textPrimary} outline-none focus:border-purple-500/50 transition-colors bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-bold`}
                                                        />
                                                    </div>
                                                </div>
                                                <p className={`text-[10px] ${textMuted} pl-1`}>
                                                    総合計ノードに進捗バーが表示されます。
                                                </p>
                                            </div>

                                            {/* Node-specific targets grouped by operation */}
                                            {viewMode === "flowchart" && Object.entries(groupedFlowchartNodes).some(([_, nodes]) => nodes.length > 0) && (
                                                <div className="space-y-4 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                                                    <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>
                                                        個別ノードの目標設定
                                                    </h3>
                                                    {["+", "-", "*", "/"].map((op) => {
                                                        const nodes = groupedFlowchartNodes[op];
                                                        if (!nodes || nodes.length === 0) return null;

                                                        return (
                                                            <div key={op} className="space-y-2">
                                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block backdrop-blur-md border ${isLightMode ? "bg-black/5 border-black/10 text-gray-600" : "bg-white/5 border-white/10 text-white/50"}`}>
                                                                    演算子: <span className="text-purple-500 font-mono text-xs">{op}</span>
                                                                </div>
                                                                <div className="space-y-1.5 pl-1">
                                                                    {nodes.map((node) => {
                                                                        const data = node.data as { emoji?: string; label?: string; color?: string; value?: number; target?: number; count?: number };
                                                                        return (
                                                                            <div key={node.id} className={`flex items-center gap-2 p-2 rounded-xl ${bgSubtle} border ${borderSubtle}`}>
                                                                                <span className="text-base w-6 text-center">{data.emoji}</span>
                                                                                <span className={`flex-1 text-sm ${isLightMode ? "text-gray-700" : "text-white/80"} truncate`}>
                                                                                    {data.label}
                                                                                </span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="text-xs font-mono tabular-nums" style={{ color: data.color }}>
                                                                                        {data.value}
                                                                                    </span>
                                                                                    <span className={`text-xs ${textMuted}`}>/</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        value={data.target || ""}
                                                                                        onChange={(e) => onSetNodeTarget?.(node.id, Math.max(0, Number(e.target.value)))}
                                                                                        placeholder="目標"
                                                                                        className={`w-16 text-right ${inputBg} border ${inputBorder} rounded-lg px-2 py-1 text-xs ${textPrimary} outline-none focus:border-purple-500/40 transition-colors tabular-nums focus:w-20`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === "save_load" && viewMode === "flowchart" && (
                                        <motion.div
                                            key="save_load"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-6 pb-2"
                                        >
                                            {/* Save Section */}
                                            <div className="space-y-3">
                                                <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>
                                                    現在の状態を保存
                                                </h3>

                                                {!isSaving ? (
                                                    <button
                                                        onClick={() => setIsSaving(true)}
                                                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all border border-dashed text-purple-600 bg-purple-500/10 hover:bg-purple-500/20`}
                                                        style={{ color: accentColor, borderColor: accentColor }}
                                                    >
                                                        <Save size={16} />
                                                        <span className="text-sm font-semibold">新しく保存する</span>
                                                    </button>
                                                ) : (
                                                    <form onSubmit={handleSaveSubmit} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newChartName}
                                                            onChange={(e) => setNewChartName(e.target.value)}
                                                            placeholder="名前を入力..."
                                                            className={`flex-1 ${inputBg} border ${inputBorder} rounded-xl px-3 py-2 text-sm ${textPrimary} outline-none focus:border-purple-500/50 transition-colors bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10`}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500 text-white shrink-0 shadow-md hover:brightness-110 transition-all"
                                                            style={{ backgroundColor: accentColor }}
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsSaving(false)}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-xl ${bgSubtle} ${textSecondary} ${bgSubtleHover} transition-colors border border-black/10 dark:border-white/10`}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </form>
                                                )}
                                            </div>

                                            {/* Load Section */}
                                            <div className="space-y-3">
                                                <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-wider pl-1`}>
                                                    保存したデータ
                                                </h3>

                                                {savedCharts.length === 0 ? (
                                                    <div className={`p-4 rounded-xl text-center text-sm ${textMuted} bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 border-dashed`}>
                                                        保存されたチャートはありません
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {savedCharts.map((chart) => (
                                                            <div
                                                                key={chart.id}
                                                                className={`group flex items-center justify-between p-3 rounded-xl border ${bgSubtleHover} transition-colors border-black/5 dark:border-white/5`}
                                                            >
                                                                <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => { onLoadChart?.(chart); onToggle(); }}>
                                                                    <div className={`text-sm font-bold ${textPrimary} truncate flex items-center gap-2`}>
                                                                        <FolderOpen size={14} className={textSecondary} />
                                                                        {chart.name}
                                                                    </div>
                                                                    <div className={`text-[10px] mt-1 ${textMuted} flex gap-2`}>
                                                                        <span>ノード: {chart.nodes.length}</span>
                                                                        <span>更新: {new Date(chart.updatedAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => onDeleteChart?.(chart.id)}
                                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100`}
                                                                    title="削除"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
