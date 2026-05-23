"use client";

import EmojiGlyph from "@/components/icons/EmojiGlyph";
import {
    getIntegrationSetupPrompt,
    type GachaIntegrationReadiness,
} from "@/lib/gachaIntegration";

export default function GachaIntegrationSetupPrompt({
    readiness,
    isLightMode,
    onOpenDistribution,
    compact = false,
}: {
    readiness: GachaIntegrationReadiness;
    isLightMode: boolean;
    onOpenDistribution?: () => void;
    compact?: boolean;
}) {
    const prompt = getIntegrationSetupPrompt(readiness);
    if (!prompt) return null;

    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";

    return (
        <div
            className={`flex flex-col items-center text-center gap-3 ${compact ? "py-4" : "py-6"}`}
        >
            <EmojiGlyph emoji="⚠️" size={compact ? 20 : 24} />
            <div className="space-y-1 max-w-sm">
                <p className={`text-xs font-bold ${textPrimary}`}>{prompt.title}</p>
                <p className={`text-[10px] ${textMuted} leading-relaxed`}>{prompt.body}</p>
            </div>
            {onOpenDistribution && prompt.actionLabel ? (
                <button
                    type="button"
                    onClick={onOpenDistribution}
                    className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-all active:scale-[0.98]"
                >
                    {prompt.actionLabel}
                </button>
            ) : null}
        </div>
    );
}
