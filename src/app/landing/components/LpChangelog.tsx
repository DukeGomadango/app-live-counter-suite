"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LP_CHANGELOG, type ChangelogImportance } from "@/lib/lp-changelog";

interface LpChangelogProps {
  open: boolean;
  onToggle: () => void;
  effectiveLight: boolean;
  panelBg: string;
  panelBorder: string;
  panelShadow: string;
  accentColor: string;
}

function formatChangelogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function importanceLabel(importance: ChangelogImportance): string {
  switch (importance) {
    case "major": return "新機能";
    case "normal": return "改善";
    case "minor": return "バグ修正";
  }
}

export function LpChangelog({
  open,
  onToggle,
  effectiveLight,
  panelBg,
  panelBorder,
  panelShadow,
  accentColor,
}: LpChangelogProps) {
  return (
    <section
      className="w-full max-w-2xl mx-auto mt-4 mb-8 md:mb-10 rounded-2xl overflow-hidden shrink-0"
      style={{
        background: panelBg,
        backdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
        WebkitBackdropFilter: effectiveLight ? "blur(20px) saturate(1.2)" : "blur(16px)",
        border: panelBorder,
        boxShadow: panelShadow,
      }}
      aria-labelledby="lp-changelog-heading"
    >
      <div className="h-[2px] opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} aria-hidden />
      <button
        type="button" onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-3 text-left ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
        aria-expanded={open} aria-controls="lp-changelog-body"
      >
        {open ? <ChevronDown size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0" />}
        <h2 id="lp-changelog-heading" className="text-base font-bold" style={{ color: accentColor }}>更新履歴</h2>
      </button>
      <motion.div id="lp-changelog-body" initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className={`border-b ${effectiveLight ? "border-neutral-200" : "border-white/20"}`}>
                <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>日付</th>
                <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>種別</th>
                <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>タイトル</th>
                <th scope="col" className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}>主な変更</th>
              </tr>
            </thead>
            <tbody>
              {LP_CHANGELOG.map((entry, i) => (
                <tr key={i} className={`border-b ${effectiveLight ? "border-neutral-100" : "border-white/10"} ${entry.importance === "major" ? "bg-black/5" : ""}`}>
                  <td className={`py-2 pr-3 align-top whitespace-nowrap ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}>{formatChangelogDate(entry.date)}</td>
                  <td className="py-2 pr-3 align-top">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${entry.importance === "major" ? (effectiveLight ? "bg-purple-100 text-purple-800" : "bg-white/20 text-purple-200") : entry.importance === "minor" ? (effectiveLight ? "bg-neutral-100 text-neutral-600" : "bg-white/10 text-white/50") : (effectiveLight ? "text-neutral-600" : "text-white/70")}`}>
                      {importanceLabel(entry.importance)}
                    </span>
                  </td>
                  <td className={`py-2 pr-3 align-top font-medium ${entry.importance === "major" ? `font-semibold ${effectiveLight ? "text-neutral-900" : "text-white"}` : (effectiveLight ? "text-neutral-800" : "text-white/90")}`}>{entry.title}</td>
                  <td className={`py-2 pr-3 align-top ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>
                    <ul className="list-disc list-inside space-y-0.5">{entry.items.map((item, j) => (<li key={j}>{item}</li>))}</ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}
