import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site";

const title = "パネル | だんごツール";
const description =
  "画像に覆いをかけてタップで開け。AI読み取り防止・目標達成で覆い解除。配信やイベントのパネル開けに。";
const url = `${SITE_CONFIG.url}/panel`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/panel" },
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
  keywords: ["だんごツール", "パネル", "パネル開け", "AI読み取り防止", "配信", "ツール"],
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
