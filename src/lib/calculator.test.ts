import { describe, it, expect } from "vitest";
import { createDefaultCalculatorSettings } from "./calculator";

describe("calculator", () => {
  it("createDefaultCalculatorSettings", () => {
    const s = createDefaultCalculatorSettings();
    expect(s.accentColor).toMatch(/^#/);
    expect(s.orbIntensity).toBeGreaterThanOrEqual(0);
    expect(s.orbIntensity).toBeLessThanOrEqual(100);
  });
});
