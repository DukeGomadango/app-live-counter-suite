"use client";

import dynamic from "next/dynamic";

const GachaContent = dynamic(
  () => import("./GachaContent"),
  {
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-white/60">
        読み込み中…
      </div>
    ),
  }
);

export default function GachaPage(props: { isSplitMode?: boolean; isRightPane?: boolean }) {
  return <GachaContent {...props} />;
}
