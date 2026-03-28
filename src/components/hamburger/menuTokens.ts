import type { MenuThemeTokens } from "./types";

export function getMenuThemeTokens(isLightMode: boolean): MenuThemeTokens {
    return {
        panelBg: isLightMode ? "rgba(255,255,255,0.85)" : "rgba(15,8,35,0.95)",
        headerBarBg: isLightMode ? "rgba(255,255,255,0.5)" : "rgba(10,5,30,0.5)",
        borderColor: isLightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
        textPrimary: isLightMode ? "text-gray-900" : "text-white",
        textSecondary: isLightMode ? "text-gray-500" : "text-white/50",
        textMuted: isLightMode ? "text-gray-400" : "text-white/30",
        bgSubtle: isLightMode ? "bg-black/5" : "bg-white/5",
        bgSubtleHover: isLightMode ? "hover:bg-black/10" : "hover:bg-white/10",
        borderSubtle: isLightMode ? "border-black/10" : "border-white/10",
        inputBg: isLightMode ? "bg-black/5" : "bg-white/5",
        inputBorder: isLightMode ? "border-black/10" : "border-white/10",
        popoverBg: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(15,8,35,0.95)",
        popoverBorder: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
    };
}
