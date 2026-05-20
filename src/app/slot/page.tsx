"use client";

import dynamic from "next/dynamic";

const SlotContent = dynamic(() => import("./SlotContent"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-500 dark:text-white/60">
      読み込み中…
    </div>
  ),
});

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function SlotPage(props: PageProps) {
  const { isSplitMode, isRightPane } = props as PageProps & { isSplitMode?: boolean; isRightPane?: boolean };
  return <SlotContent isSplitMode={isSplitMode} isRightPane={isRightPane} />;
}
