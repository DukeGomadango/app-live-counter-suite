"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendPageView } from "@/lib/analytics";
import { getToolIdFromPath } from "@/lib/tools";

/**
 * ルート変更時にページビューを Worker に送信する。NEXT_PUBLIC_ANALYTICS_ENDPOINT が設定されている場合のみ動作。
 */
export default function AnalyticsSender() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // 初回マウント時と pathname 変更時のみ送信（二重送信を防ぐ）
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    const toolId = getToolIdFromPath(pathname);
    sendPageView(pathname, toolId);
  }, [pathname]);

  return null;
}
