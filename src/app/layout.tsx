import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/JsonLd";
import HelpButton from "@/components/HelpButton";
import AnalyticsSender from "@/components/AnalyticsSender";
import { SplitModuleProvider } from "@/context/SplitModuleContext";
import { SITE_CONFIG } from "@/lib/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name} | 配信者・クリエイター向けWebツールキット`,
    template: `%s | ${SITE_CONFIG.name}`
  },
  description: SITE_CONFIG.description,
  authors: [{ name: "Dukegomadango" }],
  creator: "Dukegomadango",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_CONFIG.url,
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.ogImage],
    creator: "@Dukegomadango",
  },
  alternates: {
    canonical: SITE_CONFIG.url,
  },
  icons: {
    icon: "/3だんごツールファビコン.jpg",
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
  verification: {
    google: "7fPwEgVdd4XychUawn3dhUgNBMjppQA8NRHLVBVs__I",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${montserrat.variable} antialiased`}>
        <JsonLd />
        <SplitModuleProvider>
          <AnalyticsSender />
          <div className="h-screen overflow-y-auto scroll-touch">
            {children}
          </div>
          <HelpButton />
          <footer className="fixed bottom-2 right-2 pointer-events-none z-[5]">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600 opacity-70">
            ごまだんご伯爵
          </span>
        </footer>
        </SplitModuleProvider>
      </body>
    </html>
  );
}
