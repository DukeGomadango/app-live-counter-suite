import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "ガチャシミュレーター | ライブカウンター Suite";
const description = "配信やイベントで使えるガチャシミュレーター。レア度カスタマイズ、排出確率の細密調整、天井設定、プレイヤー別履歴管理、SNS共有機能を搭載。";
const url = `${SITE_CONFIG.url}/gacha`;

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: "/gacha" },
    openGraph: {
        type: "website",
        locale: "ja_JP",
        url,
        title,
        description,
        siteName: SITE_CONFIG.name,
        images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: SITE_CONFIG.name }],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [SITE_CONFIG.ogImage],
        creator: "@Dukegomadango",
    },
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

export default function GachaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
