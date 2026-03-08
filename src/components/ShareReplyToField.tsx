"use client";

import { useState, useEffect, useCallback } from "react";
import { getShareReplyTo, setShareReplyTo } from "@/lib/share";
import { X } from "lucide-react";

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
  const [value, setValue] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !toolId || typeof getShareReplyTo !== "function") return;
    const stored = getShareReplyTo(toolId);
    setValue(stored ?? "");
  }, [mounted, toolId]);

  const save = useCallback((v: string) => {
    if (!toolId) return;
    const trimmed = v.trim();
    setShareReplyTo(toolId, trimmed || null);
    setValue(trimmed);
  }, [toolId]);

  const handleClear = useCallback(() => {
    if (!toolId) return;
    setShareReplyTo(toolId, null);
    setValue("");
  }, [toolId]);

  const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const inputBg = isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";

  if (!mounted || !toolId) {
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save(value)}
          placeholder="ツイートURL or ID（任意）"
          className={`flex-1 min-w-0 px-2 py-1 rounded text-xs ${textPrimary} outline-none`}
          style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          title="Xで共有するとき、このツイートへの返信として開きます。空なら新規ツイート"
        />
        {value ? (
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save(value)}
          placeholder="x.com/username/status/123... または ツイートID"
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm ${textPrimary} outline-none`}
          style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
          title="Xで共有するとき、このツイートへの返信として開きます。空なら新規ツイート"
        />
        {value ? (
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
