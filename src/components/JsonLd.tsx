"use client";

import Script from "next/script";

export default function JsonLd() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "ライブカウンター",
        "description": "登録不要・完全無料で使えるWeb人数カウンター。交通量調査、野鳥観察、イベントの入室管理、在庫管理など、スマホで簡単に複数項目の集計が可能です。",
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
        "featureList": [
            "複数項目の同時カウント",
            "項目の追加・削除・並べ替え",
            "テンプレート機能",
            "ローカルストレージへの自動保存",
            "モバイル対応のUI"
        ],
        "screenshot": [
            {
                "@type": "ImageObject",
                "url": "https://app-live-counter.vercel.app/screenshot-light.png",
                "caption": "ライトモードのカウンター画面"
            },
            {
                "@type": "ImageObject",
                "url": "https://app-live-counter.vercel.app/screenshot-dark.png",
                "caption": "ダークモードのカウンター画面"
            }
        ],
        "softwareVersion": "1.0.0"
    };

    return (
        <Script
            id="json-ld"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
