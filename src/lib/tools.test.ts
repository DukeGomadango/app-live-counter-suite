import { describe, it, expect } from "vitest";
import { TOOLS, TOOL_PATHS, getToolIdFromPath, getToolLabelJa } from "./tools";

describe("tools", () => {
  it("TOOL_PATHS matches TOOLS order", () => {
    expect(TOOL_PATHS).toEqual(TOOLS.map((t) => t.path));
  });

  it("getToolIdFromPath", () => {
    expect(getToolIdFromPath("/")).toBe("top");
    expect(getToolIdFromPath("/counter")).toBe("counter");
    expect(getToolIdFromPath("/unknown-route")).toBe("unknown-route");
    expect(getToolIdFromPath("")).toBe("unknown");
  });

  it("getToolLabelJa", () => {
    expect(getToolLabelJa("/counter")).toBe("人数カウンター");
    expect(getToolLabelJa("/nope")).toBeNull();
  });
});
