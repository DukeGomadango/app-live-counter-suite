/**
 * 共有用ユーティリティ。ツイート用 URL などを共通化。
 */

export function generateShareUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
