"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { Z_INDEX } from "@/lib/layoutConstants";

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
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none`}
        style={{ zIndex: Z_INDEX.TOAST, maxWidth: "min(90vw, 420px)", width: "100%" }}
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

const THEME_MAP: Record<
  ToastType,
  {
    border: string;
    shadow: string;
    iconColor: string;
    iconShadow: string;
  }
> = {
  success: {
    border: "rgba(16, 185, 129, 0.35)",
    shadow: "0 8px 32px rgba(16, 185, 129, 0.12), 0 4px 12px rgba(0, 0, 0, 0.4)",
    iconColor: "#34d399",
    iconShadow: "drop-shadow(0 0 6px rgba(52, 211, 153, 0.7))",
  },
  info: {
    border: "rgba(59, 130, 246, 0.35)",
    shadow: "0 8px 32px rgba(59, 130, 246, 0.12), 0 4px 12px rgba(0, 0, 0, 0.4)",
    iconColor: "#60a5fa",
    iconShadow: "drop-shadow(0 0 6px rgba(96, 165, 250, 0.7))",
  },
  error: {
    border: "rgba(239, 68, 68, 0.35)",
    shadow: "0 8px 32px rgba(239, 68, 68, 0.12), 0 4px 12px rgba(0, 0, 0, 0.4)",
    iconColor: "#f87171",
    iconShadow: "drop-shadow(0 0 6px rgba(248, 113, 113, 0.7))",
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = ICON_MAP[item.type];
  const theme = THEME_MAP[item.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium pointer-events-auto select-none"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        minWidth: 260,
      }}
      role="alert"
    >
      <Icon
        size={18}
        className="shrink-0"
        style={{
          color: theme.iconColor,
          filter: theme.iconShadow,
        }}
      />
      <span className="flex-1 leading-snug font-medium text-white/95">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-1 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
        aria-label="閉じる"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
