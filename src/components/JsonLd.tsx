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
        name = "ライブカウンター | 無料のWeb人数カウンター・項目集計ツール";
        description = "IRIAMやYouTube配信で役立つ登録不要・完全無料のWeb人数カウンター。ライバーやリスナーのための入室カウント・退出管理、野鳥観察、交通量調査など、スマホやPCで簡単に複数項目の集計が可能です。";
        features = [
            "複数項目の同時カウント",
            "項目の追加・削除・並べ替え",
            "テンプレート機能",
            "ローカルストレージへの自動保存",
            "モバイル対応のUI"
        ];
    } else if (pathname === "/flowchart") {
        name = "フローチャート・数値計算マップ | ライブカウンター Suite";
        description = "リアルタイムで数値演算ができる直感的なノード式フローチャート・マインドマップ作成ツール。イベントの分岐、確率計算、アイテム集計などを視覚的に整理し、自動計算します。";
        features = [
            "ドラッグ＆ドロップでの直感的なノード配置",
            "四則演算（＋、－、×、÷）のリアルタイム連鎖計算",
            "目標到達時の視覚的ハイライト・達成エフェクト",
            "作成したチャートのローカル保存・読み込み"
        ];
    } else if (pathname === "/gatcha") {
        name = "オリジナルガチャシミュレーター | ライブカウンター Suite";
        description = "配信やイベントで使える完全無料のガチャシミュレーター機能（開発中）。設定した確率に基づいてランダムな結果をドロップし、配信画面を盛り上げます。";
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
