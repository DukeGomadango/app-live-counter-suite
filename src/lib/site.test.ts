import { describe, it, expect } from "vitest";
import { SITE_CONFIG, DEFAULT_SHARE_HASHTAG } from "./site";

describe("site", () => {
  it("SITE_CONFIG has required fields", () => {
    expect(SITE_CONFIG.name).toBe("ライブカウンター Suite");
    expect(SITE_CONFIG.url).toMatch(/^https:\/\//);
    expect(SITE_CONFIG.description).toBeDefined();
    expect(SITE_CONFIG.ogImage).toMatch(/^https:\/\//);
  });

  it("DEFAULT_SHARE_HASHTAG is #だんごツール", () => {
    expect(DEFAULT_SHARE_HASHTAG).toBe("#だんごツール");
  });
});
