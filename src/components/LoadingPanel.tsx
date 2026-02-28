/**
 * ルート読み込み中に表示するガラス風パネル。flowchart / clock の loading.tsx で使用。
 */
export default function LoadingPanel() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="glass-panel max-w-xs w-full px-6 py-6 text-center">
        <p className="panel-body text-sm">
          読み込み中…
        </p>
      </div>
    </div>
  );
}
