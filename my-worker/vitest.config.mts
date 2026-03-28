import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/** CI・ローカルで STATS_SECRET を注入（本番はダッシュボードの Secret が優先） */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.vitest.jsonc" },
      miniflare: {
        bindings: {
          STATS_SECRET: "vitest-stats-secret",
        },
      },
    }),
  ],
});
