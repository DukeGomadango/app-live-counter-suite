import { LOCAL_DRIVE_FILE_ID_KEY, SYNC_SCHEMA_VERSION } from "./constants";
import { getKeysForGroups, type SyncGroupId } from "./storageKeys";
import type { ImportMode, SyncBundle, SyncScopeSnapshot } from "./types";

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
  enabledGroups: Set<SyncGroupId>,
  includeGachaMedia: boolean
): SyncScopeSnapshot {
  return {
    groups: [...enabledGroups].sort(),
    includeGachaMedia,
  };
}

export function parseSyncBundleJson(text: string): SyncBundle {
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
  if (typeof sc.includeGachaMedia !== "boolean") throw new Error("scope.includeGachaMedia がありません");
  if (typeof o.localStorage !== "object" || o.localStorage === null) {
    throw new Error("localStorage がありません");
  }
  const ls = o.localStorage as Record<string, unknown>;
  const localStorage: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(ls)) {
    if (v === null) localStorage[k] = null;
    else if (typeof v === "string") localStorage[k] = v;
    else throw new Error(`localStorage の値が不正です: ${k}`);
  }
  let gachaPrizeFilesBase64: Record<string, string> | undefined;
  if (o.gachaPrizeFilesBase64 !== undefined) {
    if (typeof o.gachaPrizeFilesBase64 !== "object" || o.gachaPrizeFilesBase64 === null) {
      throw new Error("gachaPrizeFilesBase64 の形式が不正です");
    }
    gachaPrizeFilesBase64 = {};
    for (const [k, v] of Object.entries(o.gachaPrizeFilesBase64 as Record<string, unknown>)) {
      if (typeof v !== "string") throw new Error(`ガチャファイル ${k} が不正です`);
      gachaPrizeFilesBase64[k] = v;
    }
  }
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: o.exportedAt,
    scope: {
      groups: sc.groups as SyncGroupId[],
      includeGachaMedia: sc.includeGachaMedia,
    },
    localStorage,
    gachaPrizeFilesBase64,
  };
}

export function serializeSyncBundle(bundle: SyncBundle): string {
  return JSON.stringify(bundle);
}

export async function buildSyncBundle(
  enabledGroups: Set<SyncGroupId>,
  includeGachaMedia: boolean,
  storage: Storage,
  options?: {
    exportGachaFiles?: () => Promise<Record<string, string>>;
  }
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

  let gachaPrizeFilesBase64: Record<string, string> | undefined;
  if (includeGachaMedia && enabledGroups.has("gacha") && options?.exportGachaFiles) {
    gachaPrizeFilesBase64 = await options.exportGachaFiles();
  }

  const bundle: SyncBundle = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scope: buildScopeSnapshot(enabledGroups, includeGachaMedia),
    localStorage,
    ...(gachaPrizeFilesBase64 && Object.keys(gachaPrizeFilesBase64).length > 0
      ? { gachaPrizeFilesBase64 }
      : {}),
  };
  return bundle;
}

async function importGachaFromBase64(record: Record<string, string>): Promise<void> {
  const { importGachaFilesFromBase64Records } = await import("@/lib/gachaFileStore");
  await importGachaFilesFromBase64Records(record);
}

/**
 * @param scopeForReplace mode=replace_scope のとき、クリアする範囲（現在の UI の選択）
 */
export async function applySyncBundle(
  bundle: SyncBundle,
  storage: Storage,
  options: {
    mode: ImportMode;
    scopeForReplace: { enabledGroups: Set<SyncGroupId>; includeGachaMedia: boolean };
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
    if (
      options.scopeForReplace.enabledGroups.has("gacha") &&
      options.scopeForReplace.includeGachaMedia
    ) {
      const { clearAllGachaFiles } = await import("@/lib/gachaFileStore");
      await clearAllGachaFiles();
    }
  }

  for (const [key, value] of Object.entries(bundle.localStorage)) {
    if (EXCLUDED_FROM_SYNC_EXPORT_KEYS.has(key)) continue;
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      /* quota etc. */
    }
  }

  if (bundle.gachaPrizeFilesBase64 && Object.keys(bundle.gachaPrizeFilesBase64).length > 0) {
    await importGachaFromBase64(bundle.gachaPrizeFilesBase64);
  }
}
