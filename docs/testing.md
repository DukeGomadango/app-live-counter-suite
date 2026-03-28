# テストと品質ゲート

だんごツール（フロント `src/` と `my-worker/`）の自動テスト方針と CI です。

## npm scripts（テストの分割）

| コマンド | 内容 |
|----------|------|
| `npm test` / `npm run test:unit` | Vitest（`src/**/*.{test,spec}.{ts,tsx}`） |
| `npm run test:unit:coverage` | 上記 + `@vitest/coverage-v8`。閾値は `vitest.config.ts` の `coverage.thresholds` |
| `npm run test:e2e` | Playwright（`e2e/`）。初回は `npx playwright install chromium` が必要な場合あり |
| `npm run test:worker` | `my-worker` で `vitest run` |

Vitest の `test.projects` 分割は、テスト規模がさらに増えた段階で検討する。

## CI（GitHub Actions）

[.github/workflows/ci.yml](../.github/workflows/ci.yml) は **並列ジョブ**です。

| ジョブ | 呼ぶスクリプト |
|--------|----------------|
| `lint` | `npm run lint` |
| `audit` | `npm audit --audit-level=high` |
| `unit` | `npm run test:unit:coverage` |
| `e2e` | `npx playwright install chromium --with-deps` のあと `npm run test:e2e`（`webServer` は `build` + `start:static`＝`node scripts/serve-out.mjs` で `out/` を配信） |
| `worker` | `my-worker` で `npm ci` と `npx vitest run` |

`e2e` が失敗したとき、`test-results/` と `playwright-report/` を artifact `playwright-output` としてアップロードします（7 日保持）。

## 何を担保しているか

- **単体・コンポーネント**: `src/lib` のロジック、`HelpModal` の一部、JsonLd、サイト設定、チャート台帳、`TOOLS` と `e2e/smoke-paths.ts`・`src/app/*/page.tsx` の整合（`routes-contract.test.ts`）。
- **E2E**: 主要 URL の表示・HTTP ステータス（`e2e/smoke.spec.ts`）。**axe** は現状ツール画面に未整理の指摘が多いため、ゲートは法務ページのみ（`e2e/a11y-legal.spec.ts` の `/privacy-policy`・`/terms`）。クリティカル操作の薄いシナリオは `e2e/critical.spec.ts`。
- **Worker**: CORS、`/api/events`、`/api/stats` 系、`/upload`、`/u/:key`、レガシー `/message`・`/random`（`my-worker/test/index.spec.ts`）。テスト用設定は [my-worker/wrangler.vitest.jsonc](../my-worker/wrangler.vitest.jsonc)（**remote D1/R2 を使わない**）。本番デプロイは従来どおり [my-worker/wrangler.jsonc](../my-worker/wrangler.jsonc)。

## ローカルでの注意（Worker）

リポジトリのフルパスに **非 ASCII 文字**が含まれる環境（例: 一部の Windows ユーザーフォルダ）では、`@cloudflare/vitest-pool-workers` が `cloudflare:test-internal` の解決に失敗することがあります。その場合は WSL・ASCII パスへの clone、または CI 上での検証に頼ってください。

## E2E の path 一覧

`e2e/smoke-paths.ts` の `E2E_MIRROR_TOOL_PATHS` は `src/lib/tools.ts` の `TOOLS` の `path` と **一致必須**です。`routes-contract.test.ts` が両者を突き合わせます。
