import { Metadata } from "next";
import CounterPage from "./CounterPage";

export const metadata: Metadata = {
    title: "だんごツール | 無料のWeb人数カウンター・項目集計ツールキット",
    description: "IRIAMやYouTube配信で役立つ登録不要・完全無料のWebツールキット「だんごツール」。ライバーとリスナーのための入室カウント・人数カウンター、フローチャート、ガチャシミュレーターなど複数のツールを統合。スマホやPCで簡単に利用できます。",
    alternates: { canonical: "/" },
    keywords: [
        "だんごツール",
        "Dango Tool",
        "人数カウント",
        "入室カウント",
        "カウンターアプリ",
        "IRIAM",
        "YouTube配信",
        "ツイキャス",
        "TikTok",
        "ライブ",
        "配信",
        "ライバー",
        "無料カウンター",
        "ツールキット"
    ],
};

export default function Page() {
    return <CounterPage />;
}
