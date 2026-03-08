"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { getShareReplyTo, setShareReplyTo, subscribeShareReplyTo } from "@/lib/share";
import { X } from "lucide-react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface ShareReplyToFieldProps {
  /** ツールID（counter / panel / gacha / slot など）。このツール用の返信先のみ保存・参照 */
  toolId: string;
  isLightMode?: boolean;
  /** コンパクト表示（1行・ラベル短め）。省略時は false */
  compact?: boolean;
  className?: string;
}

/**
 * X共有時の返信先（ツイートURL or ID）を入力・保存するフィールド。
 * toolId ごとに localStorage に保存され、そのツールの generateShareUrl で参照される。
 */
export default function ShareReplyToField({
  toolId,
  isLightMode = false,
  compact = false,
  className = "",
}: ShareReplyToFieldProps) {
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const storedValue = useSyncExternalStore(
    subscribeShareReplyTo,
    () => (toolId ? getShareReplyTo(toolId) ?? "" : ""),
    () => ""
  );
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = isEditing ? draft : storedValue;

  const save = useCallback((v: string) => {
    if (!toolId) return;
    const trimmed = v.trim();
    setShareReplyTo(toolId, trimmed || null);
    setIsEditing(false);
    setDraft("");
  }, [toolId]);

  const handleClear = useCallback(() => {
    if (!toolId) return;
    setShareReplyTo(toolId, null);
    setIsEditing(false);
    setDraft("");
  }, [toolId]);

  const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const inputBg = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";

  if (!isClient || !toolId) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`text-sm ${textSecondary}`}>返信先（任意）</span>
        <input
          type="text"
          readOnly
          placeholder="ツイートURL or ID"
          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm bg-transparent border opacity-50"
          style={{ borderColor: inputBorder }}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`text-xs shrink-0 ${textSecondary}`}>返信先:</span>
        <input
          type="text"
          value={displayValue}
          onFocus={() => { setIsEditing(true); setDraft(storedValue); }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { save(isEditing ? draft : storedValue); }}
          placeholder="ツイートURL or ID（任意）"
          className={`flex-1 min-w-0 px-2 py-1 rounded text-xs ${textPrimary} outline-none`}
          style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          title="Xで共有するとき、このツイートへの返信として開きます。空なら新規ツイート"
        />
        {displayValue ? (
          <button
            type="button"
            onClick={handleClear}
            className={`p-1 rounded shrink-0 ${textSecondary} hover:opacity-80`}
            title="返信先をクリア"
            aria-label="返信先をクリア"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className={`text-sm font-medium ${textPrimary}`}>
        X共有時の返信先（任意）
      </label>
      <p className={`text-xs ${textSecondary}`}>
        設定すると、このツールで共有時にそのツイートへの返信として投稿画面が開きます。x.com/.../status/... のURLをそのまま貼ってOK。空なら新規ツイートです。
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={displayValue}
          onFocus={() => { setIsEditing(true); setDraft(storedValue); }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { save(isEditing ? draft : storedValue); }}
          placeholder="x.com/username/status/123... または ツイートID"
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm ${textPrimary} outline-none`}
          style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          title="Xで共有するとき、このツイートへの返信として開きます。空なら新規ツイート"
        />
        {displayValue ? (
          <button
            type="button"
            onClick={handleClear}
            className={`px-2 py-2 rounded-lg shrink-0 ${textSecondary} hover:opacity-80 transition-opacity`}
            title="返信先をクリア"
            aria-label="返信先をクリア"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
