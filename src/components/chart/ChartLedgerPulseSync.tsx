"use client";

import { useEffect, useRef } from "react";
import { grandTotalFromLedgerSignature } from "@/lib/chartLedger";
import { useChartTotalPulse, type ChartTotalPulseKind } from "./ChartTotalPulseContext";

export function ChartLedgerPulseSync({ ledgerSig }: { ledgerSig: string }) {
    const { bump } = useChartTotalPulse();
    const prevGrandRef = useRef<number | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingKindRef = useRef<ChartTotalPulseKind | null>(null);

    useEffect(() => {
        const grand = grandTotalFromLedgerSignature(ledgerSig);
        if (prevGrandRef.current === null) {
            prevGrandRef.current = grand;
            return;
        }
        const prev = prevGrandRef.current;
        if (grand === prev) return;
        const delta = grand - prev;
        prevGrandRef.current = grand;
        if (delta === 0) return;

        pendingKindRef.current = delta > 0 ? "up" : "down";
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            const kind = pendingKindRef.current;
            pendingKindRef.current = null;
            if (kind) bump(kind);
        }, 48);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [ledgerSig, bump]);

    return null;
}
