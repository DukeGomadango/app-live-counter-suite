"use client";

import { LayoutGrid, Pencil, FolderOpen, Target } from "lucide-react";
import { useState, useCallback, type ReactNode } from "react";
import type { Template, CounterItem } from "@/lib/templates";
import ChartHamburgerSection from "@/components/ChartHamburgerSection";
import type { SavedChart, ChartNodeForMenu } from "@/lib/chartTypes";
import { getMenuThemeTokens } from "@/components/hamburger/menuTokens";
import { UI_HEADER_HEIGHT_PX } from "@/lib/layoutConstants";
import { HamburgerMenuHeader } from "@/components/hamburger/HamburgerMenuHeader";
import { CounterTemplatesTab } from "@/components/hamburger/CounterTemplatesTab";
import { CounterItemsTab } from "@/components/hamburger/CounterItemsTab";
import { CounterTargetsTab } from "@/components/hamburger/CounterTargetsTab";
import { CounterCustomTab } from "@/components/hamburger/CounterCustomTab";
import { useGroupedChartNodes } from "@/components/hamburger/useGroupedChartNodes";
import { HamburgerMenuSidebar } from "@/components/hamburger/HamburgerMenuSidebar";
import type { HamburgerTabId } from "@/components/hamburger/types";

/** @deprecated `SavedChart` を使ってください */
export type { SavedChart as SavedFlowChart } from "@/lib/chartTypes";

interface HamburgerMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    isLightMode: boolean;
    onToggleTheme: () => void;
    onReset: () => void;
    onOpenSettings: () => void;
    accentColor: string;
    viewMode: "counter" | "chart";
    hideThemeToggle?: boolean;
    hideModeSelector?: boolean;

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
    onOverwriteCustomTemplate?: (id: string) => void;

    savedCharts?: SavedChart[];
    onSaveChart?: (name: string) => void;
    onLoadChart?: (chart: SavedChart) => void;
    onDeleteChart?: (id: string) => void;
    globalTarget?: number;
    onSetGlobalTarget?: (t: number) => void;
    chartNodes?: ChartNodeForMenu[];
    onSetNodeTarget?: (id: string, target: number) => void;
    onRequestAchieveTarget?: (id: string) => void;
    onRequestAchieveAllTargets?: () => void;
    leftContent?: ReactNode;
    rightContent?: ReactNode;
}

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
    onOverwriteCustomTemplate,
    savedCharts = [],
    onSaveChart,
    onLoadChart,
    onDeleteChart,
    globalTarget = 0,
    onSetGlobalTarget,
    chartNodes = [],
    onSetNodeTarget,
    onRequestAchieveTarget,
    onRequestAchieveAllTargets,
    leftContent,
    rightContent,
}: HamburgerMenuProps) {
    const [activeTab, setActiveTab] = useState<HamburgerTabId>(viewMode === "counter" ? "templates" : "actions");
    const [confirmReset, setConfirmReset] = useState(false);

    const handleReset = useCallback(() => {
        if (viewMode === "chart" && !confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
            return;
        }
        onReset();
        setConfirmReset(false);
    }, [onReset, viewMode, confirmReset]);

    const tokens = getMenuThemeTokens(isLightMode);
    const groupedChartNodes = useGroupedChartNodes(viewMode, chartNodes);

    const tabs: { id: HamburgerTabId; label: string; icon: ReactNode }[] =
        viewMode === "counter"
            ? [
                  { id: "templates", label: "テンプレ", icon: <LayoutGrid size={13} /> },
                  { id: "items", label: "項目", icon: <Pencil size={13} /> },
                  { id: "targets", label: "目標", icon: <Target size={13} /> },
                  { id: "custom", label: "保存", icon: <FolderOpen size={13} /> },
              ]
            : [
                  { id: "actions", label: "操作", icon: <LayoutGrid size={13} /> },
                  { id: "save_load", label: "保存/読込", icon: <FolderOpen size={13} /> },
              ];

    const { borderColor, textPrimary, textSecondary, textMuted, bgSubtle, borderSubtle, inputBg, inputBorder, bgSubtleHover } =
        tokens;

    const chartMenuProps = {
        isLightMode,
        accentColor,
        textPrimary,
        textSecondary,
        textMuted,
        bgSubtle,
        borderSubtle,
        dividerBorderColor: borderColor,
        inputBg,
        inputBorder,
        bgSubtleHover,
        confirmReset,
        onResetClick: handleReset,
        globalTarget,
        onSetGlobalTarget,
        groupedChartNodes,
        onSetNodeTarget,
        savedCharts,
        onSaveChart,
        onLoadChart,
        onDeleteChart,
        onToggleMenu: onToggle,
    };

    return (
        <>
            <HamburgerMenuHeader
                tokens={tokens}
                isLightMode={isLightMode}
                isOpen={isOpen}
                onToggle={onToggle}
                hideModeSelector={!!hideModeSelector}
                viewMode={viewMode}
                totalCount={totalCount}
                totalTarget={totalTarget}
                onOpenSettings={onOpenSettings}
                onResetClick={handleReset}
                hideThemeToggle={!!hideThemeToggle}
                onToggleTheme={onToggleTheme}
                leftContent={leftContent}
                rightContent={rightContent}
                accentColor={accentColor}
            />

            <HamburgerMenuSidebar
                isOpen={isOpen}
                onToggle={onToggle}
                tokens={tokens}
                topPx={UI_HEADER_HEIGHT_PX}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                accentColor={accentColor}
            >
                {activeTab === "templates" && (
                    <CounterTemplatesTab
                        tokens={tokens}
                        customTemplates={customTemplates}
                        currentTemplateId={currentTemplateId}
                        onSelectTemplate={onSelectTemplate}
                        onToggle={onToggle}
                        setActiveTab={setActiveTab}
                    />
                )}
                {activeTab === "items" && (
                    <CounterItemsTab
                        tokens={tokens}
                        isLightMode={isLightMode}
                        items={items}
                        onAddItem={onAddItem}
                        onEditItem={onEditItem}
                        onDeleteItem={onDeleteItem}
                    />
                )}
                {activeTab === "targets" && (
                    <CounterTargetsTab
                        tokens={tokens}
                        isLightMode={isLightMode}
                        items={items}
                        onSetAllTargets={onSetAllTargets}
                        onSetTarget={onSetTarget}
                        onRequestAchieveTarget={onRequestAchieveTarget}
                        onRequestAchieveAllTargets={onRequestAchieveAllTargets}
                    />
                )}
                {activeTab === "custom" && (
                    <CounterCustomTab
                        tokens={tokens}
                        itemsCount={items.length}
                        customTemplates={customTemplates}
                        onSaveCustomTemplate={onSaveCustomTemplate}
                        onSelectTemplate={onSelectTemplate}
                        onToggle={onToggle}
                        onDeleteCustomTemplate={onDeleteCustomTemplate}
                        onOverwriteCustomTemplate={onOverwriteCustomTemplate}
                    />
                )}

                {viewMode === "chart" && activeTab === "actions" && (
                    <ChartHamburgerSection activeTab="actions" {...chartMenuProps} />
                )}
                {viewMode === "chart" && activeTab === "save_load" && (
                    <ChartHamburgerSection activeTab="save_load" {...chartMenuProps} />
                )}
            </HamburgerMenuSidebar>
        </>
    );
}
