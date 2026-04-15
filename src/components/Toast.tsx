"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

// ---------- 型定義 ----------

export type ToastType = "error" | "info" | "success";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ---------- Context ----------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ---------- Provider ----------

const AUTO_DISMISS_MS = 4000;
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* トースト表示レイヤー */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
        style={{ maxWidth: "min(90vw, 420px)", width: "100%" }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastCard key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ---------- Individual Toast ----------

const ICON_MAP: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle,
};

const BG_MAP: Record<ToastType, string> = {
  error: "rgba(239,68,68,0.95)",
  info: "rgba(59,130,246,0.92)",
  success: "rgba(34,197,94,0.92)",
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = ICON_MAP[item.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium pointer-events-auto select-none"
      style={{
        background: BG_MAP[item.type],
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.15)",
        minWidth: 240,
      }}
      role="alert"
    >
      <Icon size={18} className="shrink-0 opacity-90" />
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors"
        aria-label="閉じる"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
