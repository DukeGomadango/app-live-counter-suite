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
import { useState, useCallback } from "react";
import { TEMPLATES, type Template, type CounterItem } from "@/lib/templates";
import { EMOJI_OPTIONS, COLOR_OPTIONS } from "@/lib/constants";

interface HamburgerMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    isLightMode: boolean;
    onToggleTheme: () => void;
    totalCount: number;
    totalTarget: number;
    onReset: () => void;
    items: CounterItem[];
    onSelectTemplate: (template: Template) => void;
    onAddItem: (label: string, emoji: string) => void;
    onEditItem: (id: string, label: string, emoji: string, target: number, color: string) => void;
    onDeleteItem: (id: string) => void;
    onSetTarget: (id: string, target: number) => void;
    onSetAllTargets: (target: number) => void;
    currentTemplateId: string;
    onSaveCustomTemplate: (name: string) => void;
    customTemplates: Template[];
    onDeleteCustomTemplate: (id: string) => void;
    onOpenSettings: () => void;
    accentColor: string;
}

// EMOJI_OPTIONS and COLOR_OPTIONS are now imported from @/lib/constants

type TabId = "templates" | "items" | "targets" | "custom";

export default function HamburgerMenu({
    isOpen,
    onToggle,
    isLightMode,
    onToggleTheme,
    totalCount,
    totalTarget,
    onReset,
    items,
    onSelectTemplate,
    onAddItem,
    onEditItem,
    onDeleteItem,
    onSetTarget,
    onSetAllTargets,
    currentTemplateId,
    onSaveCustomTemplate,
    customTemplates,
    onDeleteCustomTemplate,
    onOpenSettings,
    accentColor,
}: HamburgerMenuProps) {
    const [activeTab, setActiveTab] = useState<TabId>("templates");
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
        if (newLabel.trim()) {
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
        if (editingId && editLabel.trim()) {
            onEditItem(editingId, editLabel.trim(), editEmoji, Math.max(0, editTarget), editColor);
            setEditingId(null);
            setShowEditEmojiPicker(false);
        }
    };

    const handleSaveTemplate = () => {
        if (newTemplateName.trim()) {
            onSaveCustomTemplate(newTemplateName.trim());
            setNewTemplateName("");
        }
    };

    const handleBulkTarget = () => {
        const val = parseInt(bulkTarget, 10);
        if (!isNaN(val) && val >= 0) {
            onSetAllTargets(val);
            setBulkTarget("");
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

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: "templates", label: "テンプレ", icon: <LayoutGrid size={13} /> },
        { id: "items", label: "項目", icon: <Pencil size={13} /> },
        { id: "targets", label: "目標", icon: <Target size={13} /> },
        { id: "custom", label: "保存", icon: <FolderOpen size={13} /> },
    ];

    return (
        <>
            {/* Header bar */}
            <div
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2"
                style={{
                    background: isLightMode ? "rgba(255,255,255,0.5)" : "rgba(10,5,30,0.5)",
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${borderColor}`,
                }}
            >
                {/* Left: Hamburger + Title */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggle}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                    >
                        {isOpen ? (
                            <X size={18} className={isLightMode ? "text-gray-700" : "text-white/80"} />
                        ) : (
                            <Menu size={18} className={isLightMode ? "text-gray-700" : "text-white/80"} />
                        )}
                    </button>
                    <div className="flex items-center gap-2">
                        <Users size={15} className="text-purple-400" />
                        <span className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>
                            Counter
                        </span>
                    </div>
                </div>

                {/* Center: Total count with target */}
                <div className={`flex items-center gap-2 px-4 py-1 rounded-full ${bgSubtle} border ${borderSubtle}`}>
                    <span className={`text-sm ${textMuted}`}>合計</span>
                    <div className="flex items-baseline gap-0.5">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={totalCount}
                                initial={{ opacity: 0, y: -6, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="text-base font-bold tabular-nums"
                                style={{
                                    color: totalCount > 0 ? "#a855f7" : isLightMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)",
                                    textShadow: totalCount > 0 ? "0 0 10px rgba(168,85,247,0.4)" : "none",
                                }}
                            >
                                {totalCount}
                            </motion.span>
                        </AnimatePresence>
                        {totalTarget > 0 && (
                            <span className={`text-xs ${textMuted} tabular-nums`}>/{totalTarget}</span>
                        )}
                    </div>
                </div>

                {/* Right: Settings + Reset + Theme toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenSettings}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                        title="設定"
                    >
                        <Settings size={16} className={isLightMode ? "text-gray-500" : "text-white/50"} />
                    </button>
                    <button
                        onClick={handleReset}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 border ${confirmReset
                            ? "bg-red-500/20 border-red-500/30"
                            : `${bgSubtle} ${borderSubtle} ${bgSubtleHover}`
                            }`}
                        title={confirmReset ? "もう一度クリックで確定" : "カウントリセット"}
                    >
                        <RotateCcw size={16} className={confirmReset ? "text-red-400" : isLightMode ? "text-gray-500" : "text-white/50"} />
                    </button>
                    <button
                        onClick={onToggleTheme}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${bgSubtle} border ${borderSubtle} ${bgSubtleHover}`}
                        title={isLightMode ? "ダークモードに切替" : "ライトモードに切替"}
                    >
                        {isLightMode ? (
                            <Moon size={16} className="text-gray-600" />
                        ) : (
                            <Sun size={16} className="text-yellow-400" />
                        )}
                    </button>
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
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                            style={{ top: "52px" }}
                        />

                        <motion.div
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed left-0 bottom-0 w-[320px] z-50 overflow-y-auto"
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
                                                            onSelectTemplate(template);
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
                                                    onSelectTemplate({ id: `custom-new-${Date.now()}`, name: "新規カウンター", description: "一から自由に作成", items: [] });
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
                                                                    onClick={() => onDeleteItem(item.id)}
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
                                                                    onSetTarget(item.id, isNaN(val) ? 0 : val);
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
                                                                onClick={() => { onSelectTemplate(t); onToggle(); }}
                                                                className="flex-1 text-left"
                                                            >
                                                                <div className={`text-sm font-medium ${textPrimary}`}>{t.name}</div>
                                                                <div className={`text-xs ${textMuted} mt-0.5`}>
                                                                    {t.items.length}項目 · {t.items.map((i) => i.emoji).slice(0, 6).join(" ")}
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteCustomTemplate(t.id)}
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
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
