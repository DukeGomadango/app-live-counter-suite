import { Metadata } from "next";

export const metadata: Metadata = {
    title: "スプリットビュー (Split) | ライブカウンター Suite",
    description: "カウンターとフローチャートを1つの画面で同時に操作できる分割ビューモードです。配信画面の構築やリアルタイム計算をよりスムーズに行えます。",
    keywords: [
        "スプリットビュー",
        "分割",
        "カウンター",
        "フローチャート",
        "連携",
        "リアルタイム"
    ],
};

export default function SplitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
