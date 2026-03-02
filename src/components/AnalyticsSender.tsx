"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendPageView, sendSessionStart } from "@/lib/analytics";
import { getToolIdFromPath } from "@/lib/tools";

const SESSION_SENT_KEY = "dango_session_sent";

/**
 * ルート変更時にページビューを Worker に送信する。タブごとにセッション開始を1回送信。
 * NEXT_PUBLIC_ANALYTICS_ENDPOINT が設定されている場合のみ動作。
 */
export default function AnalyticsSender() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return; // 管理画面は計測対象外
    const toolId = getToolIdFromPath(pathname);
    try {
      if (!sessionStorage.getItem(SESSION_SENT_KEY)) {
        sendSessionStart(pathname, toolId);
        sessionStorage.setItem(SESSION_SENT_KEY, "1");
      }
    } catch {
      // sessionStorage が使えない環境では無視
    }
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    sendPageView(pathname, toolId);
  }, [pathname]);

  return null;
}
