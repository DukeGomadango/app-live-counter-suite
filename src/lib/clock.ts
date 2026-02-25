/**
 * Clock 用の型・デフォルト設定
 */

export interface ClockSettings {
  accentColor: string;
  orbIntensity: number; // 0-100
  showCentiseconds: boolean;
  clockSize: number; // 50-150 表示サイズ（%）
}

export function createDefaultClockSettings(): ClockSettings {
  return {
    accentColor: "#f97316",
    orbIntensity: 50,
    showCentiseconds: true,
    clockSize: 100,
  };
}
