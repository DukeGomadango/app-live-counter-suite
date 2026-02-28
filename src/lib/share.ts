/**
 * 共有用ユーティリティ。ツイート用 URL などを共通化。
 */

/** ダウンロードファイル名用のタイムスタンプ（YYYYMMDD-HHmmss）。同名上書き確認を避けるため。 */
export function getTimestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

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
 * data: URL (base64) を File に変換する。fetch(dataUrl) は CSP でブロックされやすいため使用しない。
 */
function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1]?.trim() || "image/png";
  const base64 = match[2];
  if (!base64) return null;
  try {
    const bin = atob(base64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return new File([blob], filename, { type: mime });
  } catch {
    return null;
  }
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
  const tag = "[share]";
  if (typeof navigator === "undefined") {
    console.log(tag, "navigator undefined (SSR?)");
    return false;
  }
  if (!navigator.share) {
    console.log(tag, "navigator.share not available");
    return false;
  }
  console.log(tag, "navigator.share OK, dataUrl length:", dataUrl?.length ?? 0);
  try {
    // data: URL は CSP の connect-src で fetch がブロックされやすいため、base64 を直接デコードして Blob 化する
    const file = dataUrlToFile(dataUrl, filename);
    if (!file) {
      console.warn(tag, "dataUrlToFile failed");
      return false;
    }
    const shareData: ShareData = { text, files: [file] };
    await navigator.share(shareData);
    console.log(tag, "share succeeded");
    return true;
  } catch (err) {
    const e = err as Error & { name?: string };
    console.warn(tag, "share failed:", e?.name, e?.message, e);
    return false;
  }
}
