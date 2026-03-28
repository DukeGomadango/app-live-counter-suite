import { test, expect } from "@playwright/test";
import { allSmokePaths } from "./smoke-paths";

test.describe.configure({ timeout: 120000 });

for (const pathname of allSmokePaths()) {
  test(`smoke: ${pathname} loads (HTTP + shell)`, async ({ page }) => {
    const res = await page.goto(pathname, { waitUntil: "load", timeout: 90000 });
    expect(res, `response for ${pathname}`).not.toBeNull();
    expect(res!.status(), `HTTP status for ${pathname}`).toBeLessThan(400);

    await expect(page.locator("body")).toBeVisible();

    const main = page.locator("main");
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeVisible({ timeout: 60000 });
    }
  });
}
