"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { SITE_CONFIG } from "@/lib/site";
import { getToolLabelJa } from "@/lib/tools";
import { LP_FAQ_FLAT } from "@/lib/lp-faq";

export default function JsonLd() {
    const pathname = usePathname();

    let name: string = SITE_CONFIG.name;
    let description: string = "配信者・クリエイター向けWebツールキット「だんごツール」。完全無料で使える人数カウンターや、リアルタイム計算チャートなどを提供します。";
    let features = [
        "複数項目の同時カウント",
        "チャート＆ノード演算",
        "ガチャシミュレーター",
        "ローカルストレージへの自動保存",
    ];

    if (pathname === "/") {
        name = "だんごツール | 無料のWeb人数カウンター・項目集計ツールキット";
        description = "IRIAMやYouTube配信で役立つ登録不要・完全無料のWebツールキット。ライバーやリスナーのための入室カウント・退出管理、野鳥観察、交通量調査など、スマホやPCで簡単に複数項目の集計が可能です。";
        features = [
            "複数項目の同時カウント",
            "項目の追加・削除・並べ替え",
            "テンプレート機能",
            "ローカルストレージへの自動保存",
            "モバイル対応のUI"
        ];
    } else if (pathname === "/flowchart") {
        name = "チャート・数値計算マップ | だんごツール";
        description = "リアルタイムで数値演算ができる直感的なノード式チャート。項目の加減算を視覚的に整理し、加算合計・減算合計・総合計を自動集計します。";
        features = [
            "ドラッグ＆ドロップでの直感的なノード配置",
            "四則演算（＋、－、×、÷）のリアルタイム連鎖計算",
            "目標到達時の視覚的ハイライト・達成エフェクト",
            "作成したチャートのローカル保存・読み込み"
        ];
    } else if (pathname === "/gacha") {
        name = "オリジナルガチャシミュレーター | だんごツール";
        description = "配信やイベントで使える完全無料のガチャシミュレーター。設定した確率に基づいてランダムな結果をドロップし、配信画面を盛り上げます。";
        features = ["確率ベースのランダム排出", "配信上の演出効果"];
    } else if (pathname === "/split") {
        name = "スプリットビュー | だんごツール";
        description = "カウンター・チャート・ガチャを1画面で切り替え。配信やイベントで便利なスプリット表示。";
        features = ["カウンター・チャート・ガチャの切替", "1画面で複数ツールを利用"];
    } else if (pathname === "/counter") {
        name = "人数カウンター | だんごツール";
        description = "IRIAMやYouTube配信で役立つ登録不要・完全無料の人数カウンター。入室カウント・項目集計を複数同時に。テンプレートや目標値で配信・イベントをサポート。";
        features = ["複数項目の同時カウント", "項目の追加・削除・並べ替え", "テンプレート機能", "ローカルストレージへの自動保存", "モバイル対応のUI"];
    } else if (pathname === "/roulette") {
        name = "ルーレット | だんごツール";
        description = "スロットを回して抽選。配信やイベントで使えるルーレットツール。";
        features = ["スロット抽選", "予測・履歴"];
    } else if (pathname === "/slot") {
        name = "スロット | だんごツール";
        description = "順押し・目押し・BET・天井・リプレイ。図柄と確率をカスタマイズできるスロット。配信やイベントで。";
        features = ["順押し・目押し", "プレイヤー別BET", "天井・リプレイ", "図柄・確率設定"];
    } else if (pathname === "/clock") {
        name = "時計 | だんごツール";
        description = "現在時刻・ストップウォッチ・タイマー。デジタルとアナログ表示に対応。配信や作業の時間管理に。";
        features = ["現在時刻（デジタル・アナログ）", "ストップウォッチ", "タイマー", "0.01秒まで表示"];
    } else if (pathname === "/panel") {
        name = "パネル | だんごツール";
        description = "画像に覆いをかけてタップで開け。AI読み取り防止・目標達成で覆い解除。配信やイベントのパネル開けに。";
        features = ["画像アップロード", "AI読み取り防止フィルター（複数同時）", "覆い（丸・三角・四角）・目標・タップで達成", "編集モード/パネル開けモード", "保存・共有"];
    }

    const organizationId = `${SITE_CONFIG.url}/#organization`;
    const organizationLd = {
        "@type": "Organization",
        "@id": organizationId,
        "name": "Dukegomadango",
        "url": SITE_CONFIG.url,
    };

    const appLd = {
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
        "author": { "@id": organizationId },
        "featureList": features,
        "screenshot": [
            {
                "@type": "ImageObject",
                "url": SITE_CONFIG.screenshotLight,
                "caption": "ライトモードのアプリデザイン"
            },
            {
                "@type": "ImageObject",
                "url": SITE_CONFIG.screenshotDark,
                "caption": "ダークモードのアプリデザイン"
            }
        ],
        "softwareVersion": "2.0.0"
    };

    const breadcrumbItems: { position: number; name: string; item: string }[] = [
        { position: 1, name: "ホーム", item: SITE_CONFIG.url },
    ];
    const toolLabel = getToolLabelJa(pathname);
    if (toolLabel) {
        breadcrumbItems.push({ position: 2, name: toolLabel, item: `${SITE_CONFIG.url}${pathname}` });
    }
    const breadcrumbLd = {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems.map(({ position, name: n, item }) => ({
            "@type": "ListItem",
            "position": position,
            "name": n,
            "item": { "@id": item },
        })),
    };

    const graph: object[] = [organizationLd, appLd, breadcrumbLd];
    if (pathname === "/") {
        graph.push({
            "@type": "WebSite",
            "@id": `${SITE_CONFIG.url}/#website`,
            "name": SITE_CONFIG.name,
            "url": SITE_CONFIG.url,
            "description": SITE_CONFIG.description,
            "inLanguage": "ja",
            "publisher": { "@id": organizationId },
        });
        graph.push({
            "@type": "FAQPage",
            "mainEntity": LP_FAQ_FLAT.map(({ q, a }) => ({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": a,
                },
            })),
        });
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": graph,
    };

    // 中身は pathname と SITE_CONFIG のみ。ユーザー入力を渡さないこと。
    const safeJson = JSON.stringify(jsonLd);
    return (
        <Script
            id={`json-ld-${pathname}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJson }}
        />
    );
}
