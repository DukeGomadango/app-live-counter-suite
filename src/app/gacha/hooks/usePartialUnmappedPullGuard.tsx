"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GachaPool } from "@/lib/gacha";
import PartialUnmappedPullDialog from "@/components/gacha/PartialUnmappedPullDialog";
import {
    clearPartialUnmappedPullDismissIfResolved,
    getPartialUnmappedPullConfirmInfo,
    setPartialUnmappedPullDismissed,
} from "@/lib/gachaPullGuard";
import type { MobileTab, SidebarTab } from "./useGachaSidebar";

type UsePartialUnmappedPullGuardOptions = {
    pool: GachaPool;
    integrationActive: boolean;
    onRoll: () => void;
    isMobile: boolean;
    setMobileTab: (tab: MobileTab) => void;
    setSidebarTab: (tab: SidebarTab) => void;
    setSidebarOpen: (open: boolean) => void;
};

export function usePartialUnmappedPullGuard({
    pool,
    integrationActive,
    onRoll,
    isMobile,
    setMobileTab,
    setSidebarTab,
    setSidebarOpen,
}: UsePartialUnmappedPullGuardOptions) {
    const [open, setOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [unmappedCount, setUnmappedCount] = useState(0);
    const [mappedCount, setMappedCount] = useState(0);
    const onRollRef = useRef(onRoll);
    useEffect(() => {
        onRollRef.current = onRoll;
    }, [onRoll]);

    useEffect(() => {
        clearPartialUnmappedPullDismissIfResolved(pool);
    }, [pool]);

    const openDistribution = useCallback(() => {
        setOpen(false);
        if (isMobile) {
            setMobileTab("distribute");
        } else {
            setSidebarTab("distribute");
            setSidebarOpen(true);
        }
    }, [isMobile, setMobileTab, setSidebarTab, setSidebarOpen]);

    const requestRoll = useCallback(() => {
        const info = getPartialUnmappedPullConfirmInfo(pool, integrationActive);
        if (!info.show) {
            onRollRef.current();
            return;
        }
        setUnmappedCount(info.unmappedCount);
        setMappedCount(info.mappedCount);
        setDontShowAgain(false);
        setOpen(true);
    }, [pool, integrationActive]);

    const confirmRoll = useCallback(() => {
        if (dontShowAgain) {
            setPartialUnmappedPullDismissed(pool.id, true);
        }
        setOpen(false);
        onRollRef.current();
    }, [dontShowAgain, pool.id]);

    const cancel = useCallback(() => {
        setOpen(false);
    }, []);

    const dialog = (
        <PartialUnmappedPullDialog
            open={open}
            unmappedCount={unmappedCount}
            mappedCount={mappedCount}
            dontShowAgain={dontShowAgain}
            onDontShowAgainChange={setDontShowAgain}
            onConfirmRoll={confirmRoll}
            onOpenDistribution={openDistribution}
            onCancel={cancel}
        />
    );

    return { requestRoll, dialog };
}
