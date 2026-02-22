/**
 * ガチャ品目の画像・音声を IndexedDB に保存するストア。
 * 品目の imageUrl / audioUrl に local://${key} を保存し、ここで Blob を出し入れする。
 */

const DB_NAME = "gacha-prize-files";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

/** local:// で始まる URL かどうか */
export function isLocalUrl(url: string): boolean {
    return typeof url === "string" && url.startsWith("local://");
}

/** local:// のキー部分を取得（local://poolId-itemId-image → poolId-itemId-image） */
export function getLocalKey(localUrl: string): string | null {
    if (!isLocalUrl(localUrl)) return null;
    return localUrl.slice("local://".length).trim() || null;
}

/** 品目用の local:// URL を生成（put 時に品目に保存する値） */
export function toLocalUrl(poolId: string, itemId: string, kind: "image" | "audio"): string {
    return `local://${poolId}-${itemId}-${kind}`;
}

/** IndexedDB に Blob を保存する。キーは toLocalUrl(poolId, itemId, kind) のキー部分 */
export async function putGachaFile(
    poolId: string,
    itemId: string,
    kind: "image" | "audio",
    blob: Blob
): Promise<string> {
    const key = `${poolId}-${itemId}-${kind}`;
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(blob, key);
        req.onsuccess = () => {
            db.close();
            resolve(toLocalUrl(poolId, itemId, kind));
        };
        req.onerror = () => {
            db.close();
            reject(req.error);
        };
    });
}

/** local:// URL から IndexedDB 内の Blob を取得。存在しないか URL が無効なら null */
export async function getGachaFile(localUrl: string): Promise<Blob | null> {
    const key = getLocalKey(localUrl);
    if (!key) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
            db.close();
            const value = req.result;
            resolve(value instanceof Blob ? value : null);
        };
        req.onerror = () => {
            db.close();
            reject(req.error);
        };
    });
}
