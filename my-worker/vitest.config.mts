import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

/** CI・ローカルで STATS_SECRET を注入（本番はダッシュボードの Secret が優先） */
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.vitest.jsonc" },
        miniflare: {
          bindings: {
            STATS_SECRET: "vitest-stats-secret",
          },
        },
      },
    },
  },
});
