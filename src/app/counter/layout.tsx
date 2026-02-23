import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "人数カウンター | だんごツール";
const description =
  "入室カウント・項目集計を複数同時に。テンプレートや目標値で配信・イベントをサポート。登録不要・無料。";
const url = `${SITE_CONFIG.url}/counter`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/counter" },
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
    "人数カウンター",
    "入室カウント",
    "項目集計",
    "配信",
    "IRIAM",
    "ツール",
  ],
};

export default function CounterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
