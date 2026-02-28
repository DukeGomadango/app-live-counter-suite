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

/**
 * Web Share API で画像とテキストをまとめて共有する。
 * 対応環境では共有シートが開き、画像＋文をSNSなどに渡せる。
 * @returns 共有が完了した場合 true。未対応・ユーザーキャンセル・失敗時は false（呼び出し元でダウンロード＋ツイートURL等にフォールバックすること）
 */
export async function shareImageWithText(
  dataUrl: string,
  text: string,
  filename: string
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    const shareData: ShareData = { text, files: [file] };
    await navigator.share(shareData);
    return true;
  } catch {
    return false;
  }
}
