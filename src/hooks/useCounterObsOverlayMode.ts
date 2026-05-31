"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  COUNTER_OBS_OVERLAY_BODY_CLASS,
  parseCounterObsOverlay,
} from "@/lib/counterObsOverlay";

/** `/counter?obs=1` のとき body/html に透過用クラスを付与する */
export function useCounterObsOverlayMode(): boolean {
  const searchParams = useSearchParams();
  const enabled = parseCounterObsOverlay(searchParams);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add(COUNTER_OBS_OVERLAY_BODY_CLASS);
    document.body.classList.add(COUNTER_OBS_OVERLAY_BODY_CLASS);
    return () => {
      document.documentElement.classList.remove(COUNTER_OBS_OVERLAY_BODY_CLASS);
      document.body.classList.remove(COUNTER_OBS_OVERLAY_BODY_CLASS);
    };
  }, [enabled]);

  return enabled;
}
