import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ガチャシミュレーター | ライブカウンター Suite",
    description: "配信やイベントで使えるガチャシミュレーター機能（開発中）。確率に基づいてランダムな結果をドロップします。",
    keywords: [
        "ガチャ",
        "シミュレーター",
        "乱数調整",
        "配信",
        "イベント",
        "ツール"
    ],
};

export default function GatchaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
