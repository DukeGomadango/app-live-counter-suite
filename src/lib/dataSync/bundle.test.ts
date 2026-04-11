import { describe, it, expect, beforeEach } from "vitest";
import {
  applySyncBundle,
  buildSyncBundle,
  parseSyncBundleJson,
  isBundleANewerThanB,
  EXCLUDED_FROM_SYNC_EXPORT_KEYS,
} from "./bundle";
import { LOCAL_DRIVE_FILE_ID_KEY, SYNC_SCHEMA_VERSION } from "./constants";
import type { SyncBundle } from "./types";

function makeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => {
      m.delete(k);
    },
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  } as Storage;
}

describe("buildSyncBundle / applySyncBundle", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
    storage.setItem("counter-items", "[1]");
    storage.setItem("flowchart-nodes", "[2]");
    storage.setItem(LOCAL_DRIVE_FILE_ID_KEY, "secret-id");
  });

  it("exports only selected groups and excludes internal keys", async () => {
    const bundle = await buildSyncBundle(new Set(["counter"]), false, storage, {});
    expect(bundle.localStorage["counter-items"]).toBe("[1]");
    expect(bundle.localStorage["flowchart-nodes"]).toBeUndefined();
    expect(EXCLUDED_FROM_SYNC_EXPORT_KEYS.has(LOCAL_DRIVE_FILE_ID_KEY)).toBe(true);
    const raw = JSON.stringify(bundle);
    expect(raw).not.toContain("secret-id");
  });

  it("partial apply only overwrites keys present in bundle", async () => {
    const bundle: SyncBundle = {
      schemaVersion: SYNC_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      scope: { groups: ["counter"], includeGachaMedia: false },
      localStorage: { "counter-items": "[9]" },
    };
    await applySyncBundle(bundle, storage, {
      mode: "partial",
      scopeForReplace: { enabledGroups: new Set(), includeGachaMedia: false },
    });
    expect(storage.getItem("counter-items")).toBe("[9]");
    expect(storage.getItem("flowchart-nodes")).toBe("[2]");
  });

  it("replace_scope clears selected groups then applies", async () => {
    const bundle: SyncBundle = {
      schemaVersion: SYNC_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      scope: { groups: ["counter"], includeGachaMedia: false },
      localStorage: { "counter-items": "[3]" },
    };
    await applySyncBundle(bundle, storage, {
      mode: "replace_scope",
      scopeForReplace: { enabledGroups: new Set(["counter", "chart"]), includeGachaMedia: false },
    });
    expect(storage.getItem("counter-items")).toBe("[3]");
    expect(storage.getItem("flowchart-nodes")).toBeNull();
  });
});

describe("parseSyncBundleJson", () => {
  it("parses valid bundle", () => {
    const b: SyncBundle = {
      schemaVersion: SYNC_SCHEMA_VERSION,
      exportedAt: "2020-01-01T00:00:00.000Z",
      scope: { groups: ["lp"], includeGachaMedia: false },
      localStorage: { "lp-layout-mode": '"cards"' },
    };
    const parsed = parseSyncBundleJson(JSON.stringify(b));
    expect(parsed.exportedAt).toBe(b.exportedAt);
  });
});

describe("isBundleANewerThanB", () => {
  it("compares exportedAt", () => {
    const a: SyncBundle = {
      schemaVersion: 1,
      exportedAt: "2021-01-02T00:00:00.000Z",
      scope: { groups: [], includeGachaMedia: false },
      localStorage: {},
    };
    const b: SyncBundle = { ...a, exportedAt: "2021-01-01T00:00:00.000Z" };
    expect(isBundleANewerThanB(a, b)).toBe(true);
    expect(isBundleANewerThanB(b, a)).toBe(false);
  });
});
