"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

export default function ConfirmDialog({
    open,
    title = "確認",
    message,
    confirmLabel = "削除する",
    cancelLabel = "キャンセル",
    onConfirm,
    onCancel,
    danger = true,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [open, onCancel]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="confirm-dialog"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onCancel}
                        aria-hidden
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative rounded-2xl shadow-2xl max-w-sm w-full p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                    >
                                <h2 id="confirm-dialog-title" className="text-sm font-bold text-gray-800 dark:text-white/90 mb-1">
                                    {title}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-white/70 mb-5">{message}</p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                    >
                                        {cancelLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onConfirm}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                            danger
                                                ? "bg-red-500 hover:bg-red-600"
                                                : "bg-purple-500 hover:bg-purple-600"
                                        }`}
                                    >
                                        {confirmLabel}
                                    </button>
                                </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
