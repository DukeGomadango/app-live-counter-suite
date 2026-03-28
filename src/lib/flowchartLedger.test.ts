import { describe, it, expect } from "vitest";
import { flowchartEffectiveCardScale, CHART_TOTAL_ID } from "./flowchartLedger";

describe("flowchartLedger re-exports", () => {
  it("exposes chartLedger API under flowchart names", () => {
    expect(CHART_TOTAL_ID).toBe("total");
    expect(typeof flowchartEffectiveCardScale).toBe("function");
  });
});
