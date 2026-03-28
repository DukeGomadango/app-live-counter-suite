"use client";

import dynamic from "next/dynamic";

const ChartContent = dynamic(() => import("./ChartContent"), {
  ssr: true,
});

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
  /** Split など Next の page 以外から dynamic で渡すとき用 */
  isSplitMode?: boolean;
  isRightPane?: boolean;
};

export default function FlowChartPage(props: PageProps) {
  const { isSplitMode, isRightPane } = props;
  return <ChartContent isSplitMode={isSplitMode} isRightPane={isRightPane} />;
}
