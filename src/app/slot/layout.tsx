import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "スロット | だんごツール";
const description = "配信やイベントで使えるスロット。順押し・目押し・BET・天井・リプレイ。図柄と確率をカスタマイズできます。";
const url = `${SITE_CONFIG.url}/slot`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/slot" },
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
    "スロット",
    "パチスロ",
    "目押し",
    "配信",
    "イベント",
    "ツール",
  ],
};

export default function SlotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
