import { Metadata } from "next";
import CounterPage from "./CounterPage";

export const metadata: Metadata = {
    title: "ライブカウンター | 無料のWeb人数カウンター・項目集計ツール",
    description: "IRIAMやYouTube配信で役立つ登録不要・完全無料のWeb人数カウンター。ライバーとリスナーのための入室カウント、交通量調査、野鳥観察、イベント管理など、スマホで簡単に複数項目の集計が可能です。",
    alternates: { canonical: "/" },
    keywords: [
        "人数カウント",
        "入室カウント",
        "入室",
        "カウント",
        "カウンターアプリ",
        "IRIAM",
        "YouTube配信",
        "YouTube",
        "ツイキャス",
        "TikTok",
        "ライブ",
        "配信",
        "ライバー",
        "リスナー",
        "無料カウンター"
    ],
};

export default function Page() {
    return <CounterPage />;
}
