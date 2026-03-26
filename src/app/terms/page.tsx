import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site";

export const metadata: Metadata = {
  title: "利用規約",
  description: "だんごツールの利用規約です。サービス利用時の注意事項、禁止事項、免責事項などを記載しています。",
  alternates: {
    canonical: "/terms",
  },
};

const LAST_UPDATED = "2026-03-26";

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-7">
        <h1 className="text-2xl font-black text-purple-400 sm:text-3xl">利用規約</h1>
        <p className="mt-3 text-sm text-white/70">
          この利用規約（以下「本規約」）は、{SITE_CONFIG.name}
          （以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただく方（以下「利用者」）は、本規約に同意したうえで本サービスを利用するものとします。
        </p>
        <p className="mt-1 text-xs text-white/50">最終改定日: {LAST_UPDATED}</p>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-white">第1条（適用）</h2>
          <p className="text-sm text-white/75">
            本規約は、利用者と本サービス運営者との間の本サービスの利用に関わる一切の関係に適用されます。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第2条（禁止事項）</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
            <li>法令または公序良俗に違反する行為</li>
            <li>本サービスまたは第三者の権利・利益を侵害する行為</li>
            <li>本サービスの運営を妨害する行為、またはそのおそれのある行為</li>
            <li>不正アクセスやシステムへ過度な負荷を与える行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第3条（サービス内容の変更・停止）</h2>
          <p className="text-sm text-white/75">
            運営者は、利用者への事前通知なく、本サービスの内容の変更・追加・停止・終了を行うことがあります。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第4条（知的財産権）</h2>
          <p className="text-sm text-white/75">
            本サービスに関するプログラム、文章、デザイン、その他のコンテンツに関する知的財産権は、運営者または正当な権利者に帰属します。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第5条（免責事項）</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
            <li>運営者は、本サービスの完全性・正確性・有用性・継続性を保証しません。</li>
            <li>
              本サービスの利用または利用不能により利用者に損害が生じた場合、運営者に故意または重大な過失がある場合を除き、運営者は責任を負わないものとします。
            </li>
            <li>
              利用者間または利用者と第三者との間で生じた取引、連絡、紛争等について、運営者に故意または重大な過失がある場合を除き、運営者は責任を負わないものとします。
            </li>
          </ul>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第6条（規約の変更）</h2>
          <p className="text-sm text-white/75">
            運営者は、法令の変更、本サービス内容の変更、その他必要がある場合に本規約を変更できるものとします。運営者は、変更後の本規約の内容および効力発生時期を、本サービス上への掲示その他適切な方法により周知します。
          </p>
          <p className="text-sm text-white/75">
            変更後の本規約は、周知した効力発生時期から効力を生じるものとします。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第7条（反社会的勢力の排除）</h2>
          <p className="text-sm text-white/75">
            利用者は、反社会的勢力等に該当しないこと、および将来にわたっても該当しないことを表明し保証するものとします。運営者は、利用者がこれに違反したと判断した場合、事前通知なく本サービスの利用を停止できるものとします。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第8条（準拠法・管轄）</h2>
          <p className="text-sm text-white/75">
            本規約の解釈にあたっては日本法を準拠法とし、本サービスに関して紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h2 className="text-lg font-bold text-white">第9条（お問い合わせ）</h2>
          <p className="text-sm text-white/75">
            本規約に関するお問い合わせは、運営者Xアカウント（@Dukegomadango）への連絡により受け付けます。
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
