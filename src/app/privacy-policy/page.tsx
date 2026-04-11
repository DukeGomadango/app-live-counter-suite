import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "だんごツールのプライバシーポリシーです。取得する情報、利用目的、Cookie等の扱い、第三者提供の有無などを記載しています。",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const LAST_UPDATED = "2026-03-28";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-7">
        <h1 className="text-2xl font-black text-purple-400 sm:text-3xl">プライバシーポリシー</h1>
        <p className="mt-3 text-sm text-white/70">
          {SITE_CONFIG.name}
          （以下「本サービス」）は、利用者のプライバシーを尊重し、個人情報の保護に配慮してサービスを提供します。
        </p>
        <p className="mt-2 text-sm text-white/70">
          本サービスは原則として、氏名、住所、メールアドレスなど特定の個人を識別できる情報を取得しません。
        </p>
        <p className="mt-1 text-xs text-white/50">最終改定日: {LAST_UPDATED}</p>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-white">1. 取得する情報</h2>
          <p className="text-sm text-white/75">
            本サービスでは、アクセス解析や不正利用対策のために、IPアドレス、ブラウザ情報、参照元、閲覧ページ、アクセス日時などの情報を取得する場合があります。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">2. 利用目的</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
            <li>本サービスの提供、維持、改善のため</li>
            <li>利用状況の把握および機能改善のため</li>
            <li>不正利用やセキュリティ上の問題への対応のため</li>
            <li>重要なお知らせや仕様変更の案内のため</li>
          </ul>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">3. Cookie等の利用</h2>
          <p className="text-sm text-white/75">
            本サービスでは、利便性向上や利用状況の分析のため、Cookieまたはこれに類する技術を利用する場合があります。ブラウザ設定によりCookieを無効化できますが、一部機能が正しく動作しない場合があります。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">4. 外部送信について</h2>
          <p className="text-sm text-white/75">
            本サービスでは、利用状況の把握のため、以下の情報を外部に送信する場合があります。
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
            <li>送信先: 運営者が指定する分析用エンドポイント（NEXT_PUBLIC_ANALYTICS_ENDPOINT）</li>
            <li>送信される情報: 匿名ID、閲覧パス、ツールID、イベント種別（page_view / session_start）</li>
            <li>利用目的: 利用傾向の分析、不正利用対策、機能改善</li>
            <li>
              データ連携（任意）: 利用者が Google アカウントで認可した場合、ブラウザから Google の OAuth 2.0 および Google Drive
              API を利用し、本サービス専用のアプリケーションデータ領域（appDataFolder）に設定のバックアップファイルを保存できます。当該データは利用者の Google
              アカウント側に保存され、運営者のサーバーには保存されません。取り扱いは Google のポリシーに従います。
            </li>
          </ul>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">5. 第三者提供</h2>
          <p className="text-sm text-white/75">
            法令に基づく場合を除き、取得した情報を本人の同意なく第三者へ提供しません。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">6. 安全管理</h2>
          <p className="text-sm text-white/75">
            本サービスは、取得した情報の漏えい、滅失、毀損の防止その他安全管理のために、合理的な範囲で必要な措置を講じます。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">7. 保持期間</h2>
          <p className="text-sm text-white/75">
            取得した情報は、利用目的の達成に必要な期間、または法令で求められる期間の範囲で保持し、不要となった情報は適切な方法で削除します。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">8. ポリシーの変更</h2>
          <p className="text-sm text-white/75">
            本ポリシーは、法令改正やサービス変更に応じて見直すことがあります。変更後の内容は、本ページに掲載した時点から効力を生じます。
          </p>
        </section>

        <section id="operator-info" className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">9. 運営者情報</h2>
          <p className="text-sm text-white/75">
            運営者名: Dukegomadango（ごまだんご伯爵）
          </p>
          <p className="text-sm text-white/75">
            Xアカウント:{" "}
            <a
              href="https://x.com/dukegomadango"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 underline underline-offset-2 hover:text-purple-200"
            >
              https://x.com/dukegomadango
            </a>
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">10. お問い合わせ</h2>
          <p className="text-sm text-white/75">
            本ポリシーに関するお問い合わせは、Xアカウント（https://x.com/dukegomadango）への連絡により受け付けます。
          </p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm text-purple-300 underline underline-offset-2 hover:text-purple-200">
            LPへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
