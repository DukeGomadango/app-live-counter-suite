"use client";

import { useGlassStyle } from "@/hooks/useGlassStyle";
import React from "react";

interface GenericShareCardProps {
  isLightMode: boolean;
  /**
   * カードの最大幅（Tailwindクラス）。
   * デフォルトは "max-w-xl"。スロットなどは "max-w-sm" を指定すると綺麗に収まります。
   */
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * 画像共有（ShareSummary）用の汎用外枠コンポーネント。
 * 全ツールのシェア画像のデザイン（背景色、ガラス風の質感、余白）を統一します。
 */
export default function GenericShareCard({
  isLightMode,
  maxWidth = "max-w-xl",
  children,
}: GenericShareCardProps) {
  const { glassBg, glassBorder } = useGlassStyle(isLightMode);

  return (
    <div
      className="w-full min-h-0 flex justify-center px-4 py-6"
      style={{ background: isLightMode ? "#f5f3ff" : "#0f0a1e" }}
    >
      <div
        className={`w-full ${maxWidth} rounded-3xl shadow-xl px-5 py-4 flex flex-col gap-3`}
        style={{
          background: glassBg,
          border: `1px solid ${glassBorder}`,
          backdropFilter: "blur(18px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
