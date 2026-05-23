# 配布タブ UI 改訂（実装計画）

開発者向け。ユーザー向け操作は [HelpModal.tsx](../src/components/HelpModal.tsx)。

## 方針

- **API変更なし**（リンクシェア既存外部 API のみ）
- **ツール主導 / リンクシェア主導** の二フローを UI で明示
- 配布マッピング変更時は `PUT gacha-config` で LS のレア度表示を追従（プールの現状を送る）
- claim 再同期は並列上限・マッピング保存は1回バッチ

## フェーズ

| Phase | 内容 |
|-------|------|
| 1 | `gachaDistribution` マッチ関数・同期ペイロード・テスト |
| 0 | `useGachaDistribution`・未使用 Modal 削除 |
| 2 | `components/gacha/distribution/*`・Panel 再構成 |
| 3–4 | `GachaContent` ナビ・タブバッジ・`GachaSetup` 配布バッジ |
| 5 | Help・changelog・integration docs |

## 将来（API）

- 大量アップロード・大量 claim 再同期で 429 が続く場合のみ LS バッチ API を検討
