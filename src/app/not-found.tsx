import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel max-w-sm w-full px-8 py-8 text-center">
        <h1 className="panel-title text-lg font-bold">
          ページが見つかりません
        </h1>
        <p className="panel-body mt-2 text-sm">
          URL を確認するか、トップへ戻ってください。
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="panel-link inline-block px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
          >
            トップへ
          </Link>
        </div>
      </div>
    </div>
  );
}
