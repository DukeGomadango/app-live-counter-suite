This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 更新履歴の更新

ユーザー向けの変更（リリース・機能追加・機能改善・UI改善・バグ修正）を入れたら、LP の更新履歴を更新する。

- **ファイル**: [src/lib/lp-changelog.ts](src/lib/lp-changelog.ts)
- **やり方**: 配列の**先頭**に 1 エントリ追加。`date`（YYYY-MM-DD）、`importance`（major / normal / minor）、`title`、`items`（箇条書き）を書く。
- **載せない**: lint・SEO・細かいコード修正など、ユーザーに直接関係ない変更。
- 直近の変更を確認するとき: `git log --format="%ad %s" --date=short -20`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
