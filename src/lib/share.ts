/**
 * 共有用ユーティリティ。ツイート用 URL などを共通化。
 */

export function generateShareUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/** iPad かどうか（iPadOS 13+ のデスクトップ表示も含む）。画像共有でツイートを先に開く判定に使用。 */
export function isIPad(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** 画像共有時にツイート画面をクリック直後に開くべきか（モバイル・iPadは先に開く）。 */
export function shouldOpenShareTweetFirst(isMobile: boolean): boolean {
  return isMobile || isIPad();
}
