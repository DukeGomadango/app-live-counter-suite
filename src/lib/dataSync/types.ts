import type { SyncGroupId } from "./storageKeys";

export type SyncScopeSnapshot = {
  /** 書き出し時にオンだったグループ ID */
  groups: SyncGroupId[];
};

export type SyncBundle = {
  schemaVersion: number;
  /** ISO 8601 — LWW 比較に使用 */
  exportedAt: string;
  scope: SyncScopeSnapshot;
  localStorage: Record<string, string | null>;
};

export type ImportMode = "partial" | "replace_scope";
