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
    <button
      onClick={toggleTheme}
      className={`p-3.5 rounded-full border shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 dango-btn-tier3 ${
        isLightMode
          ? "bg-white/90 border-gray-200 text-gray-700 hover:bg-white"
          : "bg-black/80 border-white/10 text-white hover:bg-black"
      }`}
      style={{
        position: "fixed",
        bottom: "96px",
        right: "24px",
        zIndex: 40,
        width: "48px",
        height: "48px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        "--btn-glow-color": isLightMode ? "rgba(234,179,8,0.3)" : "rgba(168,85,247,0.3)"
      } as React.CSSProperties}
      aria-label="テーマ切り替え"
    >
      {isLightMode ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-purple-400" />
      )}
    </button>
  );
}
