"use client";

import { useMemo } from "react";

/**
 * ガラスモーフィズム用の背景・ボーダー色（ライト/ダークで共通利用）。
 * 戻り値をメモ化して参照のブレで子が再レンダーし続けるのを防ぐ。
 */
export function useGlassStyle(isLightMode: boolean) {
    return useMemo(
        () => ({
            glassBg: isLightMode ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.05)",
            glassBorder: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
        }),
        [isLightMode]
    );
}
