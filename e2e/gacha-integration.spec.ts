import { test, expect } from "@playwright/test";

const integrationBuild =
  process.env.NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION === "true";

test.describe("gacha × link-share integration", () => {
  test.skip(
    !integrationBuild,
    "NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION=true でビルドしたときのみ実行"
  );

  test("shows distribute tab when integration is enabled", async ({ page }) => {
    await page.goto("/gacha", { waitUntil: "load", timeout: 60_000 });
    await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "配布" }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("campaign_id deep link without token does not spam toasts", async ({
    page,
  }) => {
    const campaignId = "e557f90d-e633-4872-8e7c-174566e9854a";

    await page.addInitScript(() => {
      localStorage.removeItem("gacha-pool");
      localStorage.setItem(
        "gacha-integration-config",
        JSON.stringify({
          apiBaseUrl: "http://localhost:3000",
          integrationToken: "",
        })
      );
    });

    await page.goto(`/gacha?campaign_id=${campaignId}`, {
      waitUntil: "load",
      timeout: 60_000,
    });
    await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });

    await page.waitForTimeout(2000);
    const alertCount = await page.getByRole("alert").count();
    expect(alertCount).toBeLessThanOrEqual(1);
  });
});
