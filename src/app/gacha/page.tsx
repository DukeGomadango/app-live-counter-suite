"use client";

import { Suspense } from "react";
import GachaContent from "./GachaContent";

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

function GachaDeepLinkFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-gray-500 dark:text-white/60">
      <p>ガチャを読み込んでいます…</p>
    </div>
  );
}

export default function GachaPage(props: PageProps) {
  const { isSplitMode, isRightPane } = props as PageProps & {
    isSplitMode?: boolean;
    isRightPane?: boolean;
  };
  return (
    <Suspense fallback={<GachaDeepLinkFallback />}>
      <GachaContent isSplitMode={isSplitMode} isRightPane={isRightPane} />
    </Suspense>
  );
}
