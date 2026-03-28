import { describe, it, expect } from "vitest";
import { createDefaultClockSettings } from "./clock";

describe("clock", () => {
  it("createDefaultClockSettings", () => {
    const s = createDefaultClockSettings();
    expect(s.clockSize).toBeGreaterThanOrEqual(50);
    expect(s.showCentiseconds).toBe(true);
  });
});
