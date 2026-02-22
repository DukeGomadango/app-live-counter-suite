"use client";

import dynamic from "next/dynamic";

const FlowchartContent = dynamic(
  () => import("./FlowchartContent"),
  {
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-white/60">
        読み込み中…
      </div>
    ),
  }
);

type PageProps = { params?: Promise<Record<string, string | string[]>>; searchParams?: Promise<Record<string, string | string[]>> };

export default function FlowChartPage(props: PageProps) {
  const { isSplitMode, isRightPane } = (props as PageProps & { isSplitMode?: boolean; isRightPane?: boolean });
  return <FlowchartContent isSplitMode={isSplitMode} isRightPane={isRightPane} />;
}
