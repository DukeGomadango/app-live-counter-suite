"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export default function JsonLd() {
    const pathname = usePathname();

    let name = "ライブカウンター Suite";
    let description = "配信者・クリエイター向けWebツールキット。完全無料で使える人数カウンターや、リアルタイム計算フローチャートを提供します。";
    let features = [
        "複数項目の同時カウント",
        "フローチャート＆ノード演算",
        "ガチャシミュレーター（開発中）",
        "ローカルストレージへの自動保存",
    ];

    if (pathname === "/") {
        name = "ライブカウンター";
        description = "IRIAMやYouTube配信で役立つ登録不要・完全無料のWeb人数カウンター。ライバーとリスナーのための入室カウントなど、スマホで簡単に複数項目の集計が可能です。";
        features = [
            "複数項目の同時カウント",
            "項目の追加・削除・並べ替え",
            "テンプレート機能",
            "ローカルストレージへの自動保存",
            "モバイル対応のUI"
        ];
    } else if (pathname === "/flowchart") {
        name = "フローチャート・計算マップ";
        description = "リアルタイムで数値演算ができるノード式フローチャート・マインドマップツール。イベントの分岐や確率計算を視覚的に整理できます。";
        features = [
            "ドラッグ＆ドロップでのノード配置",
            "四則演算（＋、－、×、÷）の連鎖計算",
            "目標到達のハイライト",
        ];
    } else if (pathname === "/gatcha") {
        name = "ガチャシミュレーター";
        description = "配信やイベントで使えるガチャシミュレーター機能（開発中）。確率に基づいてランダムな結果をドロップします。";
        features = ["確率ベースのランダム排出", "配信上の演出効果"];
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": name,
        "description": description,
        "applicationCategory": "UtilityApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "JPY"
        },
        "author": {
            "@type": "Person",
            "name": "Dukegomadango"
        },
        "featureList": features,
        "screenshot": [
            {
                "@type": "ImageObject",
                "url": "https://app-live-counter.vercel.app/screenshot-light.png",
                "caption": "ライトモードのアプリデザイン"
            },
            {
                "@type": "ImageObject",
                "url": "https://app-live-counter.vercel.app/screenshot-dark.png",
                "caption": "ダークモードのアプリデザイン"
            }
        ],
        "softwareVersion": "2.0.0"
    };

    return (
        <Script
            id={`json-ld-${pathname}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
