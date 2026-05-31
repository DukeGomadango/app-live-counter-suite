/**
 * 共有用ユーティリティ。ツイート用 URL などを共通化。
 */

const SHARE_REPLY_TO_PREFIX = "share-in-reply-to-";

/** パス（と split 時の activeModule）からツールIDを取得。トップなど該当なしなら null */
export function getToolIdFromPath(path: string, activeModule?: string | null): string | null {
  const p = (path || "").toLowerCase();
  const m = (activeModule || "").toLowerCase();
  if (p.includes("gacha") || m === "gacha") return "gacha";
  if (p.includes("panel") || m === "panel") return "panel";
  if (p.includes("slot") || m === "slot") return "slot";
  if (p.includes("counter") || m === "counter") return "counter";
  if (p.includes("flowchart") || m === "chart" || m === "flowchart") return "chart";
  if (p.includes("roulette") || m === "roulette") return "roulette";
  if (p.includes("clock") || m === "clock") return "clock";
  if (p.includes("calculator") || m === "calculator") return "calculator";
  return null;
}

/** 保存されている共有時の返信先（ツイートURL or ID）。toolId ごとに別保存。未設定時は null */
export function getShareReplyTo(toolId: string): string | null {
  if (typeof localStorage === "undefined" || !toolId) return null;
  const v = localStorage.getItem(SHARE_REPLY_TO_PREFIX + toolId);
  if (v && v.trim()) return v.trim();
  if (toolId === "chart") {
    const legacy = localStorage.getItem(SHARE_REPLY_TO_PREFIX + "flowchart");
    return legacy && legacy.trim() ? legacy.trim() : null;
  }
  return null;
}

const replyToListeners = new Set<() => void>();

/** 返信先が変更されたときに呼ばれる（useSyncExternalStore 用） */
export function subscribeShareReplyTo(listener: () => void): () => void {
  replyToListeners.add(listener);
  return () => replyToListeners.delete(listener);
}

/** 共有時の返信先を保存（null でクリア）。toolId ごとに別保存 */
export function setShareReplyTo(toolId: string, value: string | null): void {
  if (typeof localStorage === "undefined" || !toolId) return;
  const key = SHARE_REPLY_TO_PREFIX + toolId;
  if (value === null || !value.trim()) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value.trim());
  }
  replyToListeners.forEach((f) => f());
}

/** ツイートURL または ID 文字列からツイートID（数値のみ）を取得。無効なら null */
export function parseTweetId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // status/1234567890 形式（x.com / twitter.com）
  const m = /(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i.exec(s);
  if (m?.[1]) return m[1];
  // 数値のみの場合はそのまま（ツイートID）
  if (/^\d+$/.test(s)) return s;
  return null;
}

/** ダウンロードファイル名用のタイムスタンプ（YYYYMMDD-HHmmss）。同名上書き確認を避けるため。 */
export function getTimestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export interface GenerateShareUrlOptions {
  /** 返信先ツイートのURL or ID。省略時は toolId の保存値を使用 */
  inReplyTo?: string | null;
  /** ツールID。指定時はそのツール用に保存した返信先を使用（counter / panel / gacha / slot など） */
  toolId?: string;
}

export function generateShareUrl(text: string, options?: GenerateShareUrlOptions): string {
  const raw = options?.inReplyTo ?? (options?.toolId ? getShareReplyTo(options.toolId) : null);
  const inReplyToId = raw ? parseTweetId(raw) : null;
  let url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  if (inReplyToId) {
    url += `&in_reply_to=${inReplyToId}`;
  }
  return url;
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
 * data: URL (base64) を Blob に変換する。
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
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
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * data: URL (base64) を File に変換する。fetch(dataUrl) は CSP でブロックされやすいため使用しない。
 */
function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  return new File([blob], filename, { type: blob.type });
}

/**
 * 画像をクリップボードにコピーする。
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  const tag = "[copy]";
  if (typeof navigator === "undefined" || !navigator.clipboard || !window.ClipboardItem) {
    console.warn(tag, "Clipboard API not available");
    return false;
  }
  try {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return false;
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.error(tag, "Failed to copy image:", err);
    return false;
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
    return false;
  }
  if (!navigator.share) {
    return false;
  }
  try {
    // data: URL は CSP の connect-src で fetch がブロックされやすいため、base64 を直接デコードして Blob 化する
    const file = dataUrlToFile(dataUrl, filename);
    if (!file) {
      console.warn(tag, "dataUrlToFile failed");
      return false;
    }
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    const shareData: ShareData = { text, files: [file] };
    await navigator.share(shareData);
    return true;
  } catch (err) {
    const e = err as Error & { name?: string };
    console.warn(tag, "share failed with text+file:", e?.name, e?.message, e);
    try {
      const file = dataUrlToFile(dataUrl, filename);
      if (!file) return false;
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        return false;
      }
      // iOS Safari の一部環境では text + files の同時共有に失敗する場合があるため、files のみでも再試行する
      await navigator.share({ files: [file] });
      return true;
    } catch (retryErr) {
      const retry = retryErr as Error & { name?: string };
      console.warn(tag, "share retry failed:", retry?.name, retry?.message, retry);
      return false;
    }
  }
}

/** 画像ファイル共有（Web Share files）が利用可能かどうかを判定する。 */
export function canShareImageFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const testFile = new File(["x"], "test.png", { type: "image/png" });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
