import { LOCAL_DRIVE_FILE_ID_KEY, SYNC_SCHEMA_VERSION } from "./constants";
import { ALL_SYNC_GROUP_IDS, getKeysForGroups, type SyncGroupId } from "./storageKeys";
import type { ImportMode, SyncBundle, SyncScopeSnapshot } from "./types";

const MAX_SYNC_VALUE_BYTES = 512 * 1024;
const MAX_SYNC_BUNDLE_BYTES = 5 * 1024 * 1024;

/** バンドルに含めない内部キー */
export const EXCLUDED_FROM_SYNC_EXPORT_KEYS = new Set<string>([
  LOCAL_DRIVE_FILE_ID_KEY,
  "dango-tool-last-exported-at",
]);

const LAST_EXPORT_META_KEY = "dango-tool-last-exported-at";

export function touchLastExportedAt(storage: Storage): void {
  try {
    storage.setItem(LAST_EXPORT_META_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function readLastExportedAt(storage: Storage): string | null {
  try {
    return storage.getItem(LAST_EXPORT_META_KEY);
  } catch {
    return null;
  }
}

export function parseExportedAtMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** true なら a の方が新しい（同時刻は false） */
export function isBundleANewerThanB(a: SyncBundle, b: SyncBundle): boolean {
  return parseExportedAtMs(a.exportedAt) > parseExportedAtMs(b.exportedAt);
}

export function buildScopeSnapshot(
  enabledGroups: Set<SyncGroupId>
): SyncScopeSnapshot {
  return {
    groups: [...enabledGroups].sort(),
  };
}

export function parseSyncBundleJson(text: string): SyncBundle {
  if (new TextEncoder().encode(text).length > MAX_SYNC_BUNDLE_BYTES) {
    throw new Error("バンドルのサイズが大きすぎます");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error("JSON の解析に失敗しました");
  }
  if (!raw || typeof raw !== "object") throw new Error("無効なバンドル形式です");
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new Error(`未対応の schemaVersion です（${String(o.schemaVersion)}）`);
  }
  if (typeof o.exportedAt !== "string") throw new Error("exportedAt がありません");
  if (!o.scope || typeof o.scope !== "object") throw new Error("scope がありません");
  const sc = o.scope as Record<string, unknown>;
  if (!Array.isArray(sc.groups)) throw new Error("scope.groups がありません");
  const validGroups = new Set<string>(ALL_SYNC_GROUP_IDS);
  const groups: SyncGroupId[] = [];
  for (const group of sc.groups) {
    if (typeof group !== "string" || !validGroups.has(group)) {
      throw new Error(`scope.groups に未対応の項目があります: ${String(group)}`);
    }
    groups.push(group as SyncGroupId);
  }
  if (typeof o.localStorage !== "object" || o.localStorage === null) {
    throw new Error("localStorage がありません");
  }
  const ls = o.localStorage as Record<string, unknown>;
  const allowedKeys = new Set(getKeysForGroups(groups));
  const localStorage: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(ls)) {
    if (!allowedKeys.has(k) || EXCLUDED_FROM_SYNC_EXPORT_KEYS.has(k)) {
      throw new Error(`localStorage に対象外のキーがあります: ${k}`);
    }
    if (v === null) localStorage[k] = null;
    else if (typeof v === "string") {
      if (new TextEncoder().encode(v).length > MAX_SYNC_VALUE_BYTES) {
        throw new Error(`localStorage の値が大きすぎます: ${k}`);
      }
      localStorage[k] = v;
    }
    else throw new Error(`localStorage の値が不正です: ${k}`);
  }
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: o.exportedAt,
    scope: {
      groups,
    },
    localStorage,
  };
}

export function serializeSyncBundle(bundle: SyncBundle): string {
  return JSON.stringify(bundle);
}

export async function buildSyncBundle(
  enabledGroups: Set<SyncGroupId>,
  storage: Storage
): Promise<SyncBundle> {
  const keys = getKeysForGroups(enabledGroups);
  const localStorage: Record<string, string | null> = {};
  for (const key of keys) {
    if (EXCLUDED_FROM_SYNC_EXPORT_KEYS.has(key)) continue;
    try {
      localStorage[key] = storage.getItem(key);
    } catch {
      localStorage[key] = null;
    }
  }

  const bundle: SyncBundle = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scope: buildScopeSnapshot(enabledGroups),
    localStorage,
  };
  return bundle;
}

/**
 * @param scopeForReplace mode=replace_scope のとき、クリアする範囲（現在の UI の選択）
 */
export async function applySyncBundle(
  bundle: SyncBundle,
  storage: Storage,
  options: {
    mode: ImportMode;
    scopeForReplace: { enabledGroups: Set<SyncGroupId> };
  }
): Promise<void> {
  if (options.mode === "replace_scope") {
    const keysToClear = getKeysForGroups(options.scopeForReplace.enabledGroups);
    for (const key of keysToClear) {
      if (EXCLUDED_FROM_SYNC_EXPORT_KEYS.has(key)) continue;
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }

  const allowedKeys = new Set(getKeysForGroups(bundle.scope.groups));
  for (const [key, value] of Object.entries(bundle.localStorage)) {
    if (!allowedKeys.has(key)) continue;
    if (EXCLUDED_FROM_SYNC_EXPORT_KEYS.has(key)) continue;
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      /* quota etc. */
    }
  }
}
