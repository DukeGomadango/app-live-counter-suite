"use client";

import GachaContent from "./GachaContent";

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function GachaPage(props: PageProps) {
  const { isSplitMode, isRightPane } = props as PageProps & {
    isSplitMode?: boolean;
    isRightPane?: boolean;
  };
  return <GachaContent isSplitMode={isSplitMode} isRightPane={isRightPane} />;
}
