/**
 * サイト共通設定（OGP・sitemap・robots・JsonLd で共有）
 * OGP用画像: public/ogp.png（1200x630）。再生成は npm run ogp:capture（要 scripts/capture-ogp.mjs）。
 * screenshotLight / screenshotDark は JsonLd 用のアプリ画面スクショ。
 */
export const SITE_CONFIG = {
  name: "だんごツール",
  description:
    "配信者・クリエイター向けWebツールキット。完全無料で使える人数カウンターや、リアルタイム計算チャートなど、日々の活動を便利にする「だんごツール」を提供します。",
  url: "https://dango-tool.vercel.app",
  ogImage: "https://dango-tool.vercel.app/ogp.png",
  screenshotLight: "https://dango-tool.vercel.app/screenshot-light.png",
  screenshotDark: "https://dango-tool.vercel.app/screenshot-dark.png",
} as const;

/** 共有用デフォルトハッシュタグ（全ツール共通・常に付与） */
export const DEFAULT_SHARE_HASHTAG = "#だんごツール";

/** ガチャの「追加ハッシュタグ」の初期値（編集可能部分のデフォルト） */
export const DEFAULT_EXTRA_HASHTAG = "#ガチャ";
