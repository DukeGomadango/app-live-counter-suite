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

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const s = r.result as string;
            const i = s.indexOf(",");
            resolve(i >= 0 ? s.slice(i + 1) : s);
        };
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
    });
}

function base64ToBlob(b64: string): Blob {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: "application/octet-stream" });
}

/** ストア内のすべてのキー（poolId-itemId-kind 形式） */
export async function listAllGachaFileKeys(): Promise<string[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => {
            db.close();
            resolve((req.result as IDBValidKey[]).map((k) => String(k)));
        };
        req.onerror = () => {
            db.close();
            reject(req.error);
        };
    });
}

/** 同期用: キー → base64（データ URL のペイロード部） */
export async function exportAllGachaFilesAsBase64Records(): Promise<Record<string, string>> {
    const db = await openDb();
    const blobs = await new Promise<Map<string, Blob>>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const m = new Map<string, Blob>();
        const req = tx.objectStore(STORE_NAME).openCursor();
        req.onsuccess = () => {
            const c = req.result;
            if (c) {
                if (c.value instanceof Blob) m.set(String(c.key), c.value);
                c.continue();
            }
        };
        tx.oncomplete = () => {
            db.close();
            resolve(m);
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
    const out: Record<string, string> = {};
    for (const [k, blob] of blobs) {
        out[k] = await blobToBase64(blob);
    }
    return out;
}

/** 同期用: base64 を Blob として書き込み */
export async function importGachaFilesFromBase64Records(record: Record<string, string>): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (const [key, b64] of Object.entries(record)) {
            store.put(base64ToBlob(b64), key);
        }
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

export async function clearAllGachaFiles(): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}
