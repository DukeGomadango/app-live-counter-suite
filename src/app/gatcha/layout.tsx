import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ガチャシミュレーター | ライブカウンター Suite",
    description: "配信やイベントで使えるガチャシミュレーター。レア度カスタマイズ、排出確率の細密調整、天井設定、プレイヤー別履歴管理、SNS共有機能を搭載。",
    keywords: [
        "ガチャ",
        "シミュレーター",
        "ガチャシミュレーター",
        "排出確率",
        "天井",
        "配信",
        "イベント",
        "ツール",
        "IRIAM",
        "YouTube",
    ],
};

export default function GatchaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
