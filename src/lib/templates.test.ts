import { describe, it, expect } from "vitest";
import { TEMPLATES } from "./templates";

describe("templates", () => {
  it("ids are unique", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template has at least one item", () => {
    for (const t of TEMPLATES) {
      expect(t.items.length).toBeGreaterThan(0);
    }
  });
});
