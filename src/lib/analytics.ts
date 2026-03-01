/**
 * 利用状況の送信（ページビュー）。Worker の POST /api/events に送る。
 * NEXT_PUBLIC_ANALYTICS_ENDPOINT が未設定の場合は何もしない。
 */
import { getToolIdFromPath } from "./tools";

const STORAGE_KEY = "dango_analytics_id";

function getEndpoint(): string | null {
  if (typeof window === "undefined") return null;
  const base = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  return typeof base === "string" && base.length > 0 ? base.replace(/\/$/, "") : null;
}

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function sendPageView(path: string, toolId?: string): void {
  const base = getEndpoint();
  if (!base) return;
  const anonymousId = getOrCreateAnonymousId();
  if (!anonymousId) return;
  const tid = toolId ?? getToolIdFromPath(path);
  const payload = JSON.stringify({
    anonymousId,
    path,
    toolId: tid,
  });
  try {
    navigator.sendBeacon(`${base}/api/events`, payload);
  } catch {
    // sendBeacon 失敗時は fetch で試す（ページ離脱時も送りたいため keepalive）
    fetch(`${base}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}
