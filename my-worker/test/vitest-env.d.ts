/** Vitest 用: wrangler types の Env にマージ（cf-typegen で上書きされない） */
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS?: import("cloudflare:test").D1Migration[];
    }
  }
}

export {};
