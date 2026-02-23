import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "スプリットビュー (Split) | だんごツール";
const description = "カウンターとフローチャートを1つの画面で同時に操作できる分割ビューモードです。配信画面の構築やリアルタイム計算をよりスムーズに行えます。";
const url = `${SITE_CONFIG.url}/split`;

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: "/split" },
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
        "だんごツール",
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
