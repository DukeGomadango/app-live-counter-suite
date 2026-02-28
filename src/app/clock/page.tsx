"use client";

import dynamic from "next/dynamic";

const ClockContent = dynamic(() => import("./ClockContent"), {
  ssr: true,
});

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function ClockPage(props: PageProps) {
  const { isSplitMode, isRightPane } = props as PageProps & {
    isSplitMode?: boolean;
    isRightPane?: boolean;
  };
  return <ClockContent isSplitMode={isSplitMode} isRightPane={isRightPane} />;
}
