import { Metadata } from "next";
import LandingPage from "./LandingPage";

export const metadata: Metadata = {
  title: "だんごツール | 無料のWebツールキット",
  description:
    "IRIAMやYouTube配信で役立つ登録不要・完全無料のWebツールキット「だんごツール」。人数カウンター、フローチャート、ガチャシミュレーターなど。スマホやPCで簡単に利用できます。",
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
    "ツールキット",
  ],
};

export default function Page() {
  return <LandingPage />;
}
