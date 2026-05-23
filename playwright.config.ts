import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // output: "export" のため next start は使えない。ビルド成果物 out を scripts/serve-out.mjs で配信する（拡張子なし URL → *.html）。
  // CI では直前に build 済みの out/ を使う（PLAYWRIGHT_PREBUILT）。ローカルは従来どおり build から起動。
  webServer: {
    command:
      process.env.PLAYWRIGHT_PREBUILT === "true"
        ? "npm run start:static"
        : "npm run build:e2e && npm run start:static",
    url: "http://127.0.0.1:3001",
    env: {
      PORT: "3001",
      NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION:
        process.env.NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION ?? "true",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
