import { Suspense } from "react";
import type { Metadata } from "next";
import DataSyncPage from "./DataSyncPage";

export const metadata: Metadata = {
  title: "データ連携",
  description:
    "だんごツールの設定を JSON ファイル・Google ドライブ・QR・NFC でバックアップ・復元できます。",
};

export default function SyncRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white/70 bg-[#0a0520]">
          読み込み中…
        </div>
      }
    >
      <DataSyncPage />
    </Suspense>
  );
}
