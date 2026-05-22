import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 60000 });

test("calculator: digit buttons update display", async ({ page }) => {
  await page.goto("/calculator", { waitUntil: "load" });
  await expect(page.locator("main")).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(page.locator("main")).toContainText("123");
});

test("gacha page renders main shell", async ({ page }) => {
  page.on("console", (msg) => console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`BROWSER ERROR: ${err.message}\n${err.stack}`));
  await page.goto("/gacha", { waitUntil: "load" });
  await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
});

test("clock page renders main shell", async ({ page }) => {
  await page.goto("/clock", { waitUntil: "load" });
  await expect(page.locator("main")).toBeVisible({ timeout: 60000 });
});
