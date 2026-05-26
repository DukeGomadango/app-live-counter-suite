import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHARE_LINK_API_BASE_URL,
  normalizeShareLinkApiBaseUrl,
  resolveShareLinkApiBaseUrl,
} from "./integrationConstants";

describe("integrationConstants", () => {
  it("keeps the production share link origin", () => {
    expect(
      normalizeShareLinkApiBaseUrl("https://dango-share-link.vercel.app/settings")
    ).toBe(DEFAULT_SHARE_LINK_API_BASE_URL);
  });

  it("falls back for arbitrary or dangerous api_base_url values", () => {
    expect(normalizeShareLinkApiBaseUrl("https://evil.example")).toBe(
      DEFAULT_SHARE_LINK_API_BASE_URL
    );
    expect(normalizeShareLinkApiBaseUrl("javascript:alert(1)")).toBe(
      DEFAULT_SHARE_LINK_API_BASE_URL
    );
  });

  it("allows localhost only when explicitly enabled", () => {
    expect(normalizeShareLinkApiBaseUrl("http://localhost:3000")).toBe(
      DEFAULT_SHARE_LINK_API_BASE_URL
    );
    expect(
      normalizeShareLinkApiBaseUrl("http://localhost:3000", {
        allowLocalhost: true,
      })
    ).toBe("http://localhost:3000");
  });

  it("resolves localhost defaults for development", () => {
    expect(resolveShareLinkApiBaseUrl("localhost")).toBe("http://localhost:3000");
    expect(resolveShareLinkApiBaseUrl("dango-tool.vercel.app")).toBe(
      DEFAULT_SHARE_LINK_API_BASE_URL
    );
  });
});
