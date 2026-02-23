import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "電卓 | だんごツール";
const description =
    "四則演算・分数・確率の簡易計算ができる電卓。配信やイベントのサポートツールとしても利用可能。";
const url = `${SITE_CONFIG.url}/calculator`;

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: "/calculator" },
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
    keywords: ["だんごツール", "電卓", "四則演算", "分数", "確率", "組み合わせ", "配信", "ツール"],
};

export default function CalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
