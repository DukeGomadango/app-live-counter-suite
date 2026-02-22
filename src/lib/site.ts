/**
 * サイト共通設定（OGP・sitemap・robots・JsonLd で共有）
 */
export const SITE_CONFIG = {
  name: "ライブカウンター Suite",
  description:
    "配信者・クリエイター向けWebツールキット。完全無料で使える人数カウンターや、リアルタイム計算フローチャートなど、日々の活動を便利にするツール群を提供します。",
  url: "https://app-live-counter.vercel.app",
  ogImage: "https://app-live-counter.vercel.app/screenshot-light.png",
  screenshotLight: "https://app-live-counter.vercel.app/screenshot-light.png",
  screenshotDark: "https://app-live-counter.vercel.app/screenshot-dark.png",
} as const;

/** 共有用デフォルトハッシュタグ（全ツール共通・常に付与） */
export const DEFAULT_SHARE_HASHTAG = "#だんごツール";

/** ガチャの「追加ハッシュタグ」の初期値（編集可能部分のデフォルト） */
export const DEFAULT_EXTRA_HASHTAG = "#ガチャ";
