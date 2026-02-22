/**
 * Calculator 用の型・デフォルト設定
 */

export interface CalculatorSettings {
    accentColor: string;
    orbIntensity: number; // 0-100
}

export function createDefaultCalculatorSettings(): CalculatorSettings {
    return {
        accentColor: "#06b6d4",
        orbIntensity: 50,
    };
}
