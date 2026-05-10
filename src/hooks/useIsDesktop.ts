"use client";

import { useMediaQuery } from "./useMediaQuery";
import { BREAKPOINT_LG } from "@/lib/layoutConstants";

/**
 * デスクトップ環境（幅 BREAKPOINT_LG 以上）かどうかを返す。
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINT_LG}px)`);
}
