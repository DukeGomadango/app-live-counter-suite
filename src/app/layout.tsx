import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/JsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteConfig = {
  name: "ライブカウンター",
  description: "IRIAMやYouTube配信で役立つ登録不要・完全無料のWeb人数カウンター。ライバーとリスナーのための入室カウント、交通量調査、野鳥観察、イベント管理など、スマホで簡単に複数項目の集計が可能です。",
  url: "https://app-live-counter.vercel.app",
  ogImage: "https://app-live-counter.vercel.app/og-image.png",
  keywords: [
    "人数カウント",
    "入室カウント",
    "入室",
    "カウント",
    "カウンターアプリ",
    "IRIAM",
    "YouTube配信",
    "YouTube",
    "ツイキャス",
    "TikTok",
    "ライブ配信",
    "ライブ",
    "配信",
    "ライバー",
    "リスナー",
    "交通量調査",
    "野鳥観察",
    "入室管理",
    "無料カウンター",
    "Webツール",
    "在庫管理",
    "集計アプリ"
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | 無料のWeb人数カウンター・項目集計ツール`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "Dukegomadango" }],
  creator: "Dukegomadango",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@Dukegomadango",
  },
  alternates: {
    canonical: siteConfig.url,
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
