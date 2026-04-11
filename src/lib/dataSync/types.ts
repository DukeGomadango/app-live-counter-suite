import type { SyncGroupId } from "./storageKeys";

export type SyncScopeSnapshot = {
  /** 書き出し時にオンだったグループ ID */
  groups: SyncGroupId[];
  includeGachaMedia: boolean;
};

export type SyncBundle = {
  schemaVersion: number;
  /** ISO 8601 — LWW 比較に使用 */
  exportedAt: string;
  scope: SyncScopeSnapshot;
  localStorage: Record<string, string | null>;
  /** ガチャ IndexedDB。キーは gachaFileStore のストアキー（poolId-itemId-kind） */
  gachaPrizeFilesBase64?: Record<string, string>;
};

export type ImportMode = "partial" | "replace_scope";
