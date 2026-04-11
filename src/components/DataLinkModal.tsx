"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, CloudUpload, QrCode, Nfc } from "lucide-react";

type DataLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isLightMode: boolean;
};

export default function DataLinkModal({ isOpen, onClose, isLightMode }: DataLinkModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const textPrimary = isLightMode ? "text-gray-900" : "text-white";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";
  const panelBg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";

  const rowClass = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
    isLightMode ? "hover:bg-black/5 text-neutral-800" : "hover:bg-white/10 text-white"
  }`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-x-0 bottom-0 top-[56px] z-[100] bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 top-[56px] z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] rounded-3xl"
              style={{
                background: panelBg,
                backdropFilter: "blur(20px)",
                border: `1px solid ${borderColor}`,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor }}>
                <h2 className={`text-lg font-bold ${textPrimary}`}>データを連携</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${bgSubtle} hover:bg-black/10`}
                  aria-label="閉じる"
                >
                  <X size={18} className={textSecondary} />
                </button>
              </div>
              <div className="p-4 space-y-1">
                <p className={`text-xs px-1 pb-2 ${textSecondary}`}>
                  連携の詳細（範囲の選択・ログイン）は「データ連携」ページで行います。
                </p>
                <Link href="/sync?tab=google" onClick={onClose} className={rowClass}>
                  <CloudUpload className="text-emerald-400 shrink-0" size={22} />
                  <span>Googleで連携</span>
                </Link>
                <Link href="/sync?tab=qr" onClick={onClose} className={rowClass}>
                  <QrCode className="text-violet-400 shrink-0" size={22} />
                  <span>QRコードで連携</span>
                </Link>
                <Link href="/sync?tab=nfc" onClick={onClose} className={rowClass}>
                  <Nfc className="text-amber-400 shrink-0" size={22} />
                  <span>NFCで連携</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
