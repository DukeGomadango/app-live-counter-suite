/** 人数カウンターの OBS ブラウザソース向け透過表示（クエリ `?obs=1`） */

export const COUNTER_OBS_OVERLAY_PARAM = "obs";

export const COUNTER_OBS_OVERLAY_BODY_CLASS = "counter-obs-overlay-mode";

export function parseCounterObsOverlay(searchParams: URLSearchParams | null): boolean {
  if (!searchParams) return false;
  const v = searchParams.get(COUNTER_OBS_OVERLAY_PARAM);
  if (v === null) return false;
  return v === "1" || v === "true" || v === "";
}

export function buildCounterObsOverlayPath(): string {
  return `/counter?${COUNTER_OBS_OVERLAY_PARAM}=1`;
}

export function buildCounterObsOverlayUrl(origin?: string): string {
  const base =
    origin?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${buildCounterObsOverlayPath()}`;
}
