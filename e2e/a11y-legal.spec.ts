import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * ツール画面全体の WCAG 準拠は未整理のため、まず本文中心の法務ページのみ axe をゲートに載せる。
 * 他ルートへの拡大はアクセシビリティ改善とセットで行う。
 */
test.describe.configure({ timeout: 60000 });

for (const pathname of ["/privacy-policy", "/terms"] as const) {
  test(`a11y: ${pathname} has no critical/serious violations`, async ({ page }) => {
    await page.goto(pathname, { waitUntil: "load", timeout: 60000 });
    await expect(page.locator("main")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(
      serious,
      `a11y on ${pathname}: ${serious.map((v) => `${v.id}(${v.impact})`).join(", ")}`,
    ).toEqual([]);
  });
}
