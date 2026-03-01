# Gacha Prize Upload Worker

景品ファイルをアップロードし、R2 に保存して URL を返す API。Next アプリの `NEXT_PUBLIC_UPLOAD_API_URL` にこの Worker の URL を設定して利用する。あわせて利用状況（分析）を D1 に保存し、管理画面から参照できる。

## エンドポイント

- **POST /upload** … `multipart/form-data` で `file`（必須）と `kind`（任意: `image` | `audio`）を送信。R2 に保存し `{ "url": "https://.../u/uploads/xxx.png" }` を返す。最大 5MB。画像・音声の MIME タイプのみ許可。
- **GET /u/:key** … R2 のオブジェクトをそのまま返す（ZIP 用 fetch や img/audio の src 用）。
- **POST /api/events** … 利用状況（ページビュー）。body: `{ "anonymousId", "path", "toolId" }`。CORS はアプリのオリジンのみ。
- **GET /api/stats** … 集計結果（機能別・日別）。ヘッダー `X-Stats-Secret` または `Authorization: Bearer <STATS_SECRET>` 必須。

## 初回セットアップ

1. **D1 データベースを作成（分析用）**:
   ```bash
   npx wrangler d1 create app-analytics
   ```
   表示された `database_id` を `wrangler.jsonc` の `d1_databases[].database_id` に設定する。

2. **マイグレーション適用**:
   ```bash
   npx wrangler d1 migrations apply app-analytics --remote
   ```
   ローカルのみなら `--local`。

3. **STATS_SECRET を設定**（管理画面で利用状況を見るためのパスワード）:
   ```bash
   npx wrangler secret put STATS_SECRET
   ```
   本番では空にしないこと。Next アプリの環境変数 `STATS_SECRET` と `ANALYTICS_ENDPOINT` も同じ値・Worker の URL に設定する。

4. **R2 バケットを作成**（まだの場合）:
   ```bash
   npx wrangler r2 bucket create gacha-prize-files
   ```

5. **ローカルで動作確認**（オプション）:
   ```bash
   npm run dev
   ```
   http://localhost:8787 で Worker が起動する。

6. **デプロイ**:
   ```bash
   npm run deploy
   ```
   表示される URL（例: `https://my-worker.xxxx.workers.dev`）を控える。

7. **Next アプリ側**で、Vercel の環境変数または `.env.local` に:
   - `NEXT_PUBLIC_UPLOAD_API_URL` … Worker の URL（ガチャアップロード用）
   - `NEXT_PUBLIC_ANALYTICS_ENDPOINT` … 同上（利用状況送信用。未設定なら送信しない）
   - `ANALYTICS_ENDPOINT` … 同上（管理画面の API が Worker を叩く用）
   - `STATS_SECRET` … 管理画面ログイン用パスワード（Worker の `STATS_SECRET` と同一）

## 注意

- R2 は Cloudflare ダッシュボードで「R2」→「オブジェクトストレージ」から有効化し、請求情報を登録しないとバケット作成ができない場合がある（無料枠内は課金されない）。
