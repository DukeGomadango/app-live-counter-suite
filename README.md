# だんごツール（Dango Tool）

配信者・クリエイター向けの無料 Web ツールキット。人数カウンター、フローチャート、ガチャシミュレーター、ルーレット、時計、パネル開けなど、登録不要で利用できます。

## 開発

### 必要な環境

- Node.js 20 以上
- npm

### スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動（[http://localhost:3000](http://localhost:3000)） |
| `npm run build` | 本番ビルド（静的エクスポート） |
| `npm run start` | ビルド済みアプリの起動（`build` 実行後） |
| `npm run lint` | ESLint でコードチェック |
| `npm run test` | Vitest で単体テスト実行 |

### デプロイ

`next.config.ts` で `output: "export"` を指定しているため、ビルド結果は静的ファイル（`out/`）として出力されます。Vercel や GitHub Pages など、静的ホスティングにそのままデプロイできます。

- [Next.js のデプロイドキュメント](https://nextjs.org/docs/app/building-your-application/deploying)

---

## 更新履歴の更新

ユーザー向けの変更（リリース・機能追加・機能改善・UI改善・バグ修正）を入れたら、LP の更新履歴を更新する。

- **ファイル**: [src/lib/lp-changelog.ts](src/lib/lp-changelog.ts)
- **やり方**: 配列の**先頭**に追加。同じ日・同テーマは既存エントリに追記してまとめる（1コミット1行にしない）。`date`、`importance`（major / normal / minor）、`title`、`items`（最大5件程度）を書く。
- **載せない**: lint・SEO・CI・セキュリティヘッダ・細かいコード修正など、ユーザーに直接関係ない変更。
- 直近の変更を確認するとき: `git log --format="%ad %s" --date=short -20`
