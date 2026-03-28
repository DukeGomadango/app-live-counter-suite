import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getOrCreateAnonymousId } from "./analytics";

describe("analytics", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid-analytics" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getOrCreateAnonymousId creates and persists id", () => {
    expect(getOrCreateAnonymousId()).toBe("test-uuid-analytics");
    expect(localStorage.getItem("dango_analytics_id")).toBe("test-uuid-analytics");
    expect(getOrCreateAnonymousId()).toBe("test-uuid-analytics");
  });
});
