export function distributionTheme(isLightMode: boolean) {
    return {
        textPrimary: isLightMode ? "text-gray-800" : "text-white/95",
        textSecondary: isLightMode ? "text-gray-500" : "text-white/60",
        bgCard: isLightMode ? "bg-white" : "bg-white/5",
        borderCard: isLightMode ? "border-gray-200" : "border-white/10",
    };
}

export type DistributionTheme = ReturnType<typeof distributionTheme>;
