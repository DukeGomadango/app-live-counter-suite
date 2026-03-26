import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "チャート・数値計算マップ | だんごツール";
const description = "リアルタイムで数値演算ができる直感的なノード式チャート。項目の加減算を視覚的に整理し、加算合計・減算合計・総合計を自動集計します。";
const url = `${SITE_CONFIG.url}/flowchart`;

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: "/flowchart" },
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
        "チャート",
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
