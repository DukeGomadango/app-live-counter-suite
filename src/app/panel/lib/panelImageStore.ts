/**
 * Panel 画像を IndexedDB に Blob で保存・取得するモジュール。
 * localStorage の 5MB 制限を回避し、メモリ効率も向上させる。
 *
 * キー     : "panel-img-<timestamp>-<random>"
 * 値       : Blob（画像バイナリ）
 * 表示用   : URL.createObjectURL(blob) で ObjectURL を生成
 * 参照形式 : panelState.imageDataUrl には "idb://<key>" を保存
 */

const DB_NAME = "panel-images";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

/** idb:// プレフィックス付きキーかどうか */
export function isIdbKey(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("idb://");
}

/** idb://key からキー部分を取り出す */
export function extractIdbKey(ref: string): string {
  return ref.replace(/^idb:\/\//, "");
}

/** 新しい画像キーを生成 */
export function generateImageKey(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `panel-img-${Date.now()}-${rand}`;
}

// ---------- DB 操作 ----------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Blob を IndexedDB に保存する */
export async function saveImageBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** IndexedDB から Blob を取得する */
export async function loadImageBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result instanceof Blob ? req.result : null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** IndexedDB から画像を削除する */
export async function deleteImageBlob(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ---------- 変換ユーティリティ ----------

/** Data URL → Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  if (!header || !base64) return new Blob();
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Blob → ObjectURL（表示用。不要になったら URL.revokeObjectURL で解放すること） */
export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Blob → Data URL （フォールバック用）*/
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ---------- 高レベル API ----------

/**
 * 画像を保存し idb:// 形式のキーを返す。
 * @param blob 保存する画像 Blob
 * @returns "idb://panel-img-..." 形式の参照文字列
 */
export async function saveImage(blob: Blob): Promise<string> {
  const key = generateImageKey();
  await saveImageBlob(key, blob);
  return `idb://${key}`;
}

/**
 * idb:// キーまたは data: URL から表示用の URL を取得する。
 * - idb:// → IndexedDB から Blob を取得し ObjectURL を返す
 * - data:  → そのまま返す（後方互換）
 * @returns ObjectURL または Data URL。Blob が見つからなければ null。
 */
export async function resolveImageUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (!isIdbKey(ref)) return ref; // data: URL 等はそのまま
  const key = extractIdbKey(ref);
  const blob = await loadImageBlob(key);
  if (!blob) return null;
  return blobToObjectUrl(blob);
}

/**
 * idb:// キーの画像を削除する。data: URL の場合は何もしない。
 */
export async function deleteImage(ref: string | null | undefined): Promise<void> {
  if (!ref || !isIdbKey(ref)) return;
  const key = extractIdbKey(ref);
  await deleteImageBlob(key);
}
