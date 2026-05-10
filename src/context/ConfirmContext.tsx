"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [dialogConfig, setDialogConfig] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setDialogConfig({ ...options, open: true });
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setDialogConfig(prev => prev ? { ...prev, open: false } : null);
        if (resolveRef.current) {
            resolveRef.current(true);
            resolveRef.current = null;
        }
    }, []);

    const handleCancel = useCallback(() => {
        setDialogConfig(prev => prev ? { ...prev, open: false } : null);
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {dialogConfig && (
                <ConfirmDialog
                    open={dialogConfig.open}
                    title={dialogConfig.title}
                    message={dialogConfig.message}
                    confirmLabel={dialogConfig.confirmLabel}
                    cancelLabel={dialogConfig.cancelLabel}
                    danger={dialogConfig.danger}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}
