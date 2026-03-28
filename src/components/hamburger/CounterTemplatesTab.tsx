"use client";

import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { TEMPLATES, type Template } from "@/lib/templates";
import type { HamburgerTabId, MenuThemeTokens } from "./types";

type Props = {
    tokens: MenuThemeTokens;
    customTemplates: Template[];
    currentTemplateId?: string;
    onSelectTemplate?: (template: Template) => void;
    onToggle: () => void;
    setActiveTab: (id: HamburgerTabId) => void;
};

export function CounterTemplatesTab({
    tokens,
    customTemplates,
    currentTemplateId,
    onSelectTemplate,
    onToggle,
    setActiveTab,
}: Props) {
    const { textPrimary, textMuted, bgSubtle, borderSubtle, bgSubtleHover } = tokens;

    return (
        <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
        >
            <p className={`text-xs ${textMuted} mb-3`}>テンプレートを選んで素早くカウンターを切り替え</p>
            <div className="grid grid-cols-1 gap-2">
                {[...TEMPLATES, ...customTemplates].map((template) => (
                    <button
                        key={template.id}
                        onClick={() => {
                            onSelectTemplate?.(template);
                            onToggle();
                        }}
                        className={`text-left p-3 rounded-xl transition-all duration-200 border ${
                            currentTemplateId === template.id
                                ? "bg-purple-500/20 border-purple-500/40 shadow-lg shadow-purple-500/10"
                                : `${bgSubtle} ${borderSubtle} ${bgSubtleHover}`
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`font-medium text-sm ${textPrimary}`}>{template.name}</div>
                                <div className={`text-xs ${textMuted} mt-0.5`}>
                                    {template.description} ({template.items.length}項目)
                                </div>
                            </div>
                            {currentTemplateId === template.id && <Check size={14} className="text-purple-400" />}
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={() => {
                    onSelectTemplate?.({
                        id: `custom-new-${Date.now()}`,
                        name: "新規カウンター",
                        description: "一から自由に作成",
                        items: [],
                    });
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
    );
}
