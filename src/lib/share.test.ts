import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getToolIdFromPath,
  parseTweetId,
  generateShareUrl,
  getTimestampForFilename,
  setShareReplyTo,
  getShareReplyTo,
} from "./share";

describe("getToolIdFromPath (share)", () => {
  it("maps paths and activeModule", () => {
    expect(getToolIdFromPath("/gacha")).toBe("gacha");
    expect(getToolIdFromPath("/split", "clock")).toBe("clock");
    expect(getToolIdFromPath("/other")).toBeNull();
  });
});

describe("parseTweetId", () => {
  it("parses x.com status URL", () => {
    expect(parseTweetId("https://x.com/user/status/12345")).toBe("12345");
  });

  it("accepts numeric string", () => {
    expect(parseTweetId(" 999 ")).toBe("999");
  });

  it("returns null for invalid", () => {
    expect(parseTweetId("")).toBeNull();
    expect(parseTweetId("abc")).toBeNull();
  });
});

describe("generateShareUrl", () => {
  it("includes text param", () => {
    const u = generateShareUrl("hello");
    expect(u).toContain(encodeURIComponent("hello"));
    expect(u).toContain("x.com/intent/tweet");
  });

  it("adds in_reply_to when option id", () => {
    const u = generateShareUrl("x", { inReplyTo: "123" });
    expect(u).toContain("in_reply_to=123");
  });
});

describe("getTimestampForFilename", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T15:04:05.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats YYYYMMDD-HHmmss in local time", () => {
    const s = getTimestampForFilename();
    expect(s).toMatch(/^\d{8}-\d{6}$/);
  });
});

describe("share reply storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("roundtrips reply-to", () => {
    setShareReplyTo("gacha", "https://x.com/u/status/1");
    expect(getShareReplyTo("gacha")).toContain("x.com");
    setShareReplyTo("gacha", null);
    expect(getShareReplyTo("gacha")).toBeNull();
  });
});
