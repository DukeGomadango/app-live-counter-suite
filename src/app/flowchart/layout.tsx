import { Metadata } from "next";

export const metadata: Metadata = {
    title: "フローチャート・計算マップ | ライブカウンター Suite",
    description: "リアルタイムで数値演算ができるノード式フローチャート・マインドマップツール。イベントの分岐や確率計算を視覚的に整理できます。",
    keywords: [
        "フローチャート",
        "マインドマップ",
        "数値計算",
        "ノード演算",
        "確率計算",
        "分岐",
        "ツール",
        "作成機能"
    ],
};

export default function FlowchartLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
