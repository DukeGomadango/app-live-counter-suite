import { parseSyncBundleJson, serializeSyncBundle } from "./bundle";
import { QR_SAFE_BYTE_LENGTH } from "./constants";
import type { SyncBundle } from "./types";

const GZIP_PREFIX = "DANGO_GZIP1:";

function byteLengthUtf8(s: string): number {
  return new TextEncoder().encode(s).length;
}

export async function gzipStringToBase64(json: string): Promise<string> {
  const cs = new CompressionStream("gzip");
  const stream = new Blob([json]).stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  const u8 = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return btoa(bin);
}

export async function gunzipBase64ToString(b64: string): Promise<string> {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const ds = new DecompressionStream("gzip");
  const stream = new Response(u8).body;
  if (!stream) throw new Error("デコードに失敗しました");
  const text = await new Response(stream.pipeThrough(ds)).text();
  return text;
}

export type QrEncodeResult = { kind: "plain" | "gzip"; payload: string; byteLength: number; tooLarge: boolean };

/** ブラウザが CompressionStream に対応していない場合は gzip 分岐をスキップ */
export async function encodeBundleForQr(bundle: SyncBundle): Promise<QrEncodeResult> {
  const plain = serializeSyncBundle(bundle);
  const plainBytes = byteLengthUtf8(plain);
  if (plainBytes <= QR_SAFE_BYTE_LENGTH) {
    return { kind: "plain", payload: plain, byteLength: plainBytes, tooLarge: false };
  }
  if (typeof CompressionStream === "undefined") {
    return { kind: "plain", payload: plain, byteLength: plainBytes, tooLarge: true };
  }
  const b64 = await gzipStringToBase64(plain);
  const payload = `${GZIP_PREFIX}${b64}`;
  const bl = byteLengthUtf8(payload);
  return { kind: "gzip", payload, byteLength: bl, tooLarge: bl > QR_SAFE_BYTE_LENGTH };
}

export async function decodeQrPayload(data: string): Promise<SyncBundle> {
  const trimmed = data.trim();
  if (trimmed.startsWith(GZIP_PREFIX)) {
    const b64 = trimmed.slice(GZIP_PREFIX.length);
    const json = await gunzipBase64ToString(b64);
    return parseSyncBundleJson(json);
  }
  return parseSyncBundleJson(trimmed);
}
