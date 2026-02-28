"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isLightMode] = useLocalStorage<boolean>("counter-light-mode", false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const titleClass = isLightMode ? "text-neutral-900" : "text-white/95";
  const bodyClass = isLightMode ? "text-neutral-600" : "text-white/70";
  const btnRetryClass = isLightMode
    ? "bg-[#a855f7]/15 hover:bg-[#a855f7]/25 text-neutral-900 border-[#a855f7]/30"
    : "bg-white/15 hover:bg-white/25 text-white border-white/20";
  const btnLinkClass = isLightMode
    ? "bg-[#a855f7]/20 hover:bg-[#a855f7]/35 text-neutral-900 border-[#a855f7]/40"
    : "bg-[#a855f7]/30 hover:bg-[#a855f7]/50 text-white border-[#a855f7]/40";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel max-w-sm w-full px-8 py-8 text-center">
        <h1 className={`text-lg font-bold ${titleClass}`}>
          問題が発生しました
        </h1>
        <p className={`mt-2 text-sm ${bodyClass}`}>
          しばらくしてからもう一度お試しください。
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${btnRetryClass}`}
          >
            再試行
          </button>
          <Link
            href="/"
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors text-center ${btnLinkClass}`}
          >
            トップへ
          </Link>
        </div>
      </div>
    </div>
  );
}
