"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 静的 export では config の redirects が効かないため /gatcha を /gacha へ寄せる（Vercel は vercel.json 併用）。 */
export default function GatchaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gacha");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <p>
        ガチャのページへ移動しています…
        <br />
        <a href="/gacha" className="text-foreground underline">
          移動しない場合はこちら
        </a>
      </p>
    </div>
  );
}
