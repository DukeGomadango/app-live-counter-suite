"use client";

import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";

export default function FloatingThemeToggle() {
  const pathname = usePathname();
  const { isLightMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // LP以外のページでは表示しない
  if (pathname !== "/") return null;
  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "96px",
        right: "24px",
        zIndex: 50,
        width: "48px",
        height: "48px",
      }}
    >
      <button
        onClick={toggleTheme}
        className={`w-full h-full rounded-full border flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          isLightMode
            ? "bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:text-purple-600 hover:border-purple-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
            : "bg-zinc-950/80 border-white/10 text-white hover:bg-zinc-900 hover:text-purple-400 hover:border-purple-900/50 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        aria-label="テーマ切り替え"
      >
        {isLightMode ? (
          <Sun size={20} className="text-yellow-500 animate-spin-slow" />
        ) : (
          <Moon size={20} className="text-purple-400" />
        )}
      </button>
    </div>
  );
}
