# Vercel 用に git のコミット作者を合わせる

Vercel の「No GitHub account was found matching the commit author email」を解消するには、  
**GitHub に登録しているメールアドレス**を git の `user.email` に設定します。

## 1. GitHub で使っているメールを確認

- GitHub → 右上のアイコン → **Settings** → 左の **Emails**
- 「Primary email address」または「Add email address」で登録しているアドレスを確認

## 2. グローバルに設定（この PC の全リポジトリで有効）

PowerShell で実行（`YOUR_GITHUB_EMAIL` を実際のメールに置き換え）:

```powershell
git config --global user.email "YOUR_GITHUB_EMAIL"
git config --global user.name "furuyaryuunosuke-link-i"
```

表示名を変えたい場合は `user.name` を好みの名前にしてください。

## 3. このリポジトリだけに設定する場合

```powershell
cd "c:\Users\ryuunosuke-furuya\Documents\dango-tools\app-live-counter-suite"
git config user.email "YOUR_GITHUB_EMAIL"
git config user.name "furuyaryuunosuke-link-i"
```

## 4. 設定の確認

```powershell
git config --global --get user.email
git config --global --get user.name
```

## 5. 今後のコミットから有効

設定を変えても、**すでに push 済みのコミットの作者は変わりません**。  
これから作るコミットから、新しいメールで記録され、Vercel のチェックが通るようになります。
