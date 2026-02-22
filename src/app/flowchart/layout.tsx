import { Metadata } from "next";

export const metadata: Metadata = {
    title: "フローチャート・数値計算マップ | ライブカウンター Suite",
    description: "リアルタイムで数値演算ができる直感的なノード式フローチャート・マインドマップ作成ツール。イベントの分岐、確率計算、アイテム集計などを視覚的に整理し、自動計算します。",
    alternates: { canonical: "/flowchart" },
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
