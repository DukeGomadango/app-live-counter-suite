import { applyD1Migrations, env } from "cloudflare:test";

// セットアップはストレージ分離の外で実行され、複数回呼ばれることがある。
// applyD1Migrations は未適用分だけ適用するため、ここで毎回呼んでも安全。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
