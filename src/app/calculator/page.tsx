"use client";

import dynamic from "next/dynamic";

const CalculatorContent = dynamic(() => import("./CalculatorContent"), {
    ssr: true,
    loading: () => (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-white/60">
            読み込み中…
        </div>
    ),
});

type PageProps = { params?: Promise<Record<string, string | string[]>>; searchParams?: Promise<Record<string, string | string[]>> };

export default function CalculatorPage(props: PageProps) {
    const { isSplitMode, isRightPane } = (props as PageProps & { isSplitMode?: boolean; isRightPane?: boolean });
    return <CalculatorContent isSplitMode={isSplitMode} isRightPane={isRightPane} />;
}
