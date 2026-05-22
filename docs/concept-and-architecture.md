# だんごツール — コンセプトと実装概要

このドキュメントは、[だんごツール](https://dango-tool.vercel.app)（リポジトリ名: 人数カウントアプリ）の**プロダクトコンセプト**と**実装の骨格**を、図で追いやすくまとめたものです。ソースの正は `src/` および `my-worker/` です。

---

## 1. コンセプト

### 1.1 何をするサービスか

- **名称**: だんごツール（`src/lib/site.ts` の `SITE_CONFIG`）
- **一言**: 配信者・クリエイター向けの **Web ツールキット**。登録不要で、ブラウザからそのまま使える。
- **初期の核**: 人数カウンター。現在は **複数ツールを同一サイト・同一デザイン言語**で提供している。

### 1.2 設計上の方針（コードから読み取れるもの）

| 方針 | 実装での表れ |
|------|----------------|
| 単一の「ツール一覧」ソース | `src/lib/tools.ts` の `TOOLS` — LP・モード切替・sitemap・JsonLd で共有 |
| オフライン寄り・静的配信 | `next.config.ts` の `output: "export"`（静的エクスポート） |
| 本番の HTTP ヘッダ・リダイレクト | Vercel では [vercel.json](../vercel.json) の `headers` / `redirects`。`output: "export"` では `next.config` に `headers` を置かない |
| 誤記 URL `/gatcha` | [src/app/gatcha/page.tsx](../src/app/gatcha/page.tsx) で `/gacha` へ遷移。Vercel では `vercel.json` のリダイレクトも併用 |
| PWA | `public/manifest.json`、LP のインストール案内コンポーネント |
| ヘルプと実装の一致 | 各ルートの説明は `src/components/HelpModal.tsx` の `getContent()` が正 |
| 計測は任意 | `NEXT_PUBLIC_ANALYTICS_ENDPOINT` があるときだけ `AnalyticsSender` が送信 |

### 1.3 ツール一覧（カテゴリ）

`TOOLS` では **tools**（実用ツール）と **games**（ゲーム系）に分類されている。

```mermaid
flowchart LR
  subgraph tools["ツール（tools）"]
    C[人数カウンター /counter]
    CH[チャート /flowchart]
    P[パネル /panel]
    CAL[電卓 /calculator]
    CLK[時計 /clock]
    S[スプリットビュー /split]
  end
  subgraph games["ゲーム（games）"]
    G[ガチャシミュ /gacha]
    R[ルーレット /roulette]
    SL[スロット /slot]
  end
  LP[(LP /)]
  LP --> tools
  LP --> games
```

---

## 2. ルーティングと画面の関係

Next.js App Router 下の `src/app/*/page.tsx` が各ツールのエントリ。トップは LP。

```mermaid
flowchart TB
  root["/ src/app/page.tsx"]
  counter["/counter"]
  flowchart_route["/flowchart（チャート）"]
  panel["/panel"]
  calculator["/calculator"]
  clock["/clock"]
  split["/split"]
  gacha["/gacha"]
  gatcha["/gatcha"]
  roulette["/roulette"]
  slot["/slot"]
  admin["/admin"]
  privacy["/privacy-policy"]
  terms["/terms"]
  sync["/sync（データ連携）"]
  root --> counter
  root --> flowchart_route
  root --> panel
  root --> calculator
  root --> clock
  root --> split
  root --> gacha
  root --> roulette
  root --> slot
  root --> admin
  root --> privacy
  root --> terms
  root --> sync
  gatcha --> gacha
```

- **リダイレクト**: `/gatcha` → `/gacha`（[src/app/gatcha/page.tsx](../src/app/gatcha/page.tsx)。Vercel では [vercel.json](../vercel.json) の `redirects` も併用し `/gatcha/:path*` もサーバ側で寄せる）
- **法務**: `/privacy-policy`・`/terms` は [src/app/privacy-policy/page.tsx](../src/app/privacy-policy/page.tsx) 等の静的ページ（LP フッター等からリンク）。
- **管理画面** `/admin`: 利用状況などの内部向け。`AnalyticsSender` では計測対象外。
- **データ連携** `/sync`: ツール設定のバックアップ・復元（JSON ファイル、任意の Google ドライブ appDataFolder、QR、NFC）。実装は `src/lib/dataSync/`・`src/app/sync/`・`src/lib/googleDriveSync.ts`。公開用環境変数 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`（`.env.example` 参照）。

---

## 3. フロントエンド・アーキテクチャ

### 3.1 全体レイヤ（概念図）

```mermaid
flowchart TB
  subgraph browser["ブラウザ"]
    subgraph next_export["Next.js 静的ビルド成果物"]
      pages["各 page.tsx + クライアントコンポーネント"]
      shared["共通 UI: Header, HelpModal, ModeSelector など"]
      lib["lib/: site, tools, calculator, share, …"]
      ctx["SplitModuleProvider（スプリット連携）"]
    end
    storage[("localStorage / sessionStorage")]
    pages --> storage
    AnalyticsSender["AnalyticsSender（任意）"]
    AnalyticsSender --> worker_an["分析 Worker POST /api/events"]
  end
  subgraph cloud["Cloudflare Worker（別パッケージ）"]
    upload["ガチャ用: POST /upload, GET /u/:key（R2）"]
  end
  gacha_upload["ガチャの画像・音声アップロード"]
  gacha_upload --> upload
```

### 3.2 ルートレイアウトで常に載るもの

`src/app/layout.tsx` より:

- **JsonLd**: 構造化データ
- **SplitModuleProvider**: スプリット画面で「どのモジュールがアクティブか」を共有（`src/context/SplitModuleContext.tsx`）
- **AnalyticsSender**: パス変更時にページビュー送信（環境変数あり時のみ実質動作）
- **HelpButton**: ルートに応じたヘルプ

### 3.3 スプリットビューとの連携

`SplitModuleType` は `src/context/SplitModuleContext.tsx` より  
`"counter" | "chart" | "gacha" | "roulette" | "slot" | "calculator" | "clock" | "panel"`（チャートは URL が `/flowchart` で id は `chart`）。  
`/split` ではタブ等でモジュールを切り替え、コンテキスト経由で他画面と状態の扱いを揃えられる設計。

```text
  ┌──────────────────────────────────────┐
  │  RootLayout                          │
  │    SplitModuleProvider               │
  │      ┌─────────────┐  /split 上で     │
  │      │ activeModule│◄── タブ切替で更新 │
  │      └─────────────┘                  │
  └──────────────────────────────────────┘
```

### 3.4 主要ライブラリ（`package.json` より）

| 用途 | 依存 |
|------|------|
| UI・ルーティング | Next.js 16.2.x, React 19, Tailwind 4（正確な版は `package.json`） |
| アニメーション | framer-motion |
| フローチャート編集 | @xyflow/react |
| ドラッグ並べ替え | @dnd-kit/* |
| 画像出力 | html-to-image |
| ZIP | jszip |
| チャート | recharts |

---

## 4. ディレクトリの見方

| パス | 役割 |
|------|------|
| `src/app/` | ルート別ページ・レイアウト |
| `src/components/` | 共通・ツール別 UI（`flowchart/`, `gacha/`, `roulette/`, `slot/` など） |
| `src/lib/` | ドメインロジック・定数（`tools.ts`, `site.ts`, `calculator.ts`, `share.ts` 等） |
| `src/hooks/` | ローカルストレージやスタイル用フック |
| `src/context/` | React コンテキスト（スプリット） |
| `public/` | 静的アセット、PWA manifest、音声など |
| `my-worker/` | Cloudflare Worker（景品ファイルの R2 アップロード・`/u` プロキシ、任意の利用状況 API など。詳細は `my-worker/src/index.ts`） |
| `scripts/` | [scripts/capture-ogp.mjs](../scripts/capture-ogp.mjs)（OGP 画像生成）、[scripts/serve-out.mjs](../scripts/serve-out.mjs)（`output: "export"` の `out/` を Playwright E2E 用に配信。詳細は [docs/testing.md](./testing.md)） |

---

## 5. バックエンド・外部連携

### 5.1 静的サイト本体

- **ホスティング想定**: Vercel 等で **静的ファイル**として配信（`output: "export"`）。
- **サーバーサイド API は同梱しない**（Next の API Routes はこの構成では中心にならない）。
- **HTTP ヘッダ・リダイレクト**: 静的成果物だけでは付かないため、Vercel では `vercel.json` で指定。その他ホストでは同等のヘッダを CDN やサーバー設定で付与する。

### 5.2 Cloudflare Worker（`my-worker/`）

- **目的**: ガチャ向けに **画像・音声を R2 にアップロード**（`POST /upload`）し **GET /u/:key** でプロキシするほか、設定されている場合は **利用状況の記録・集計**（`POST /api/events`、`GET /api/stats`、管理者向けの visitors 系など。実装の一覧は `my-worker/src/index.ts`）を提供する。
- **CORS**: 本番ドメイン・ローカルホストを許可（`my-worker/src/index.ts` の `ALLOWED_ORIGINS`）。
- **フロントからの接続**: 本番の CSP は `vercel.json` の `Content-Security-Policy` において `connect-src` に Worker の URL（例: `https://my-worker.gacha-upload.workers.dev`）に加え、データ連携用に `https://www.googleapis.com`・`https://oauth2.googleapis.com`・`https://accounts.google.com` が含まれる。`script-src` に `https://accounts.google.com`・`https://apis.google.com`、`frame-src` に `https://accounts.google.com`（Google Identity Services 用）。Worker 側の許可オリジンは `my-worker/src/index.ts` の `ALLOWED_ORIGINS`。

```mermaid
sequenceDiagram
  participant U as ブラウザ（だんごツール）
  participant W as Cloudflare Worker
  participant R2 as R2
  U->>W: POST /upload (multipart)
  W->>R2: オブジェクト保存
  W-->>U: { url }
  U->>W: GET /u/:key
  W->>R2: 取得
  W-->>U: バイナリ（Content-Type 付き）
```

### 5.3 アクセス解析（任意）

- `src/lib/analytics.ts`: `NEXT_PUBLIC_ANALYTICS_ENDPOINT` が設定されているとき、`sendBeacon` / `fetch` で **ページビュー・セッション開始**を送信。
- 匿名 ID は `localStorage`（キー `dango_analytics_id`）。

---

## 6. セキュリティ・プライバシー（実装レベル）

- **CSP ほかセキュリティヘッダ**: Vercel デプロイ時は [vercel.json](../vercel.json) の `headers` で `/(.*)` に対し Content-Security-Policy、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` を付与。`sitemap.xml` / `robots.txt` 用の `Content-Type` も同ファイルで指定。
- **クリックジャッキング対策**: `X-Frame-Options: DENY` と CSP の `frame-ancestors 'none'`（いずれも `vercel.json`）。
- **個人データ**: アカウント登録なし。ツール設定は主にブラウザ側ストレージに保持する設計が多い（ツールごとにキーは各コンポーネント・フック側）。

---

## 7. 開発者向けメモ

- **直近のユーザー向け更新（`src/lib/lp-changelog.ts` と同期）**:
  - `2026-04-25`（minor）: パネルで参照中画像の保護と未使用画像データの自動整理を実施（保存データの安定化）。
  - `2026-04-19`（normal）: テンプレート管理 UI を統一。スロットではテンプレートの削除・上書きを追加。
  - `2026-04-16`（normal）: ガチャ画像アップロードの容量制約を緩和し、自動圧縮を導入。
  - `2026-04-12`（normal）: ガチャ確率入力時の自動補正を見直し、確率調整ロジックの不整合を修正。
  - `2026-04-11`（major）: ガチャをレア度＋アイテムの 2 段階抽選へ刷新し、% 直接編集＋自動再配分に対応。
- **品質ゲート・テスト**: [docs/testing.md](./testing.md)（CI ジョブ、`npm run test:*`、Worker 用 `wrangler.vitest.jsonc` と本番 `wrangler.jsonc` の役割、D1 は Vitest セットアップで `migrations/` を適用）。
- **ツール追加時**: `src/lib/tools.ts` の `TOOLS` に 1 件追加し、必要なら `HelpModal.tsx`・`SplitModuleType`・sitemap 連携を追随（`.cursor/rules` のヘルプ・更新履歴・**docs 同期**ルール参照）。あわせて `e2e/smoke-paths.ts` の `E2E_MIRROR_TOOL_PATHS` を `TOOLS` の `path` と一致させる（`routes-contract.test.ts` が検証）。
- **OGP 画像**: `public/ogp.png`。再生成は `npm run ogp:capture`（`scripts/capture-ogp.mjs`）。E2E の静的配信は `npm run start:static`（`scripts/serve-out.mjs`）。
- **既存の運用ドキュメント**: `docs/git-config-for-vercel.md`（Vercel 向け Git 設定）。
- **ガチャ × だんごリンクシェア連携**: [docs/gacha-share-link-integration.md](./gacha-share-link-integration.md)（API・冪等キー・同期方向）。

---

## 8. 図の凡例

- **Mermaid** は GitHub や多くの Markdown ビューアで表示可能です。
- ルート名・ファイルパスは実装時点のものです。変更した場合は本書と `tools.ts`・`vercel.json`・`next.config.ts` を突き合わせてください（`.cursor/rules/docs-sync.mdc`）。
