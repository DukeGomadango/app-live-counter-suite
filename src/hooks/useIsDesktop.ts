"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * デスクトップ環境（幅 1024px 以上）かどうかを返す。
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
