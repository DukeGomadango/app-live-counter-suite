import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "時計 | だんごツール";
const description =
  "現在時刻・ストップウォッチ・タイマー。デジタルとアナログ表示に対応。配信や作業の時間管理に。";
const url = `${SITE_CONFIG.url}/clock`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/clock" },
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
  keywords: ["だんごツール", "時計", "ストップウォッチ", "タイマー", "デジタル時計", "アナログ時計", "配信", "ツール"],
};

export default function ClockLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
