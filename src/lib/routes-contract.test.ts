import { existsSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { TOOLS } from "./tools";
import { E2E_MIRROR_TOOL_PATHS } from "../../e2e/smoke-paths";

describe("TOOLS ↔ app ルート契約", () => {
  it("E2E 用 smoke-paths が TOOLS.path と一致", () => {
    expect([...E2E_MIRROR_TOOL_PATHS]).toEqual(TOOLS.map((t) => t.path));
  });

  it.each(TOOLS)("$path に page.tsx（または page.ts）が存在する", (tool) => {
    const appDir = path.join(process.cwd(), "src", "app");
    const segment = tool.path.replace(/^\//, "");
    const pageTsx = path.join(appDir, segment, "page.tsx");
    const pageTs = path.join(appDir, segment, "page.ts");
    expect(existsSync(pageTsx) || existsSync(pageTs), `missing page for ${tool.path}`).toBe(true);
  });
});
