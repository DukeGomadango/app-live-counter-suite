"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  LP_CHANGELOG,
  LP_CHANGELOG_INITIAL_VISIBLE,
  type ChangelogEntry,
  type ChangelogImportance,
} from "@/lib/lp-changelog";

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

function formatMonthLabel(isoMonth: string): string {
  const [y, m] = isoMonth.split("-").map(Number);
  return `${y}年${m}月`;
}

function importanceLabel(importance: ChangelogImportance): string {
  switch (importance) {
    case "major":
      return "新機能";
    case "normal":
      return "改善";
    case "minor":
      return "バグ修正";
  }
}

function groupByMonth(entries: ChangelogEntry[]): { month: string; entries: ChangelogEntry[] }[] {
  const map = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    const list = map.get(month) ?? [];
    list.push(entry);
    map.set(month, list);
  }
  return Array.from(map.entries()).map(([month, monthEntries]) => ({
    month,
    entries: monthEntries,
  }));
}

function ChangelogRow({
  entry,
  effectiveLight,
}: {
  entry: ChangelogEntry;
  effectiveLight: boolean;
}) {
  return (
    <tr
      className={`border-b ${effectiveLight ? "border-neutral-100" : "border-white/10"} ${entry.importance === "major" ? "bg-black/5" : ""}`}
    >
      <td
        className={`py-2 pr-3 align-top whitespace-nowrap ${effectiveLight ? "text-neutral-500" : "text-white/50"}`}
      >
        {formatChangelogDate(entry.date)}
      </td>
      <td className="py-2 pr-3 align-top">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
            entry.importance === "major"
              ? effectiveLight
                ? "bg-purple-100 text-purple-800"
                : "bg-white/20 text-purple-200"
              : entry.importance === "minor"
                ? effectiveLight
                  ? "bg-neutral-100 text-neutral-600"
                  : "bg-white/10 text-white/50"
                : effectiveLight
                  ? "text-neutral-600"
                  : "text-white/70"
          }`}
        >
          {importanceLabel(entry.importance)}
        </span>
      </td>
      <td
        className={`py-2 pr-3 align-top font-medium ${
          entry.importance === "major"
            ? `font-semibold ${effectiveLight ? "text-neutral-900" : "text-white"}`
            : effectiveLight
              ? "text-neutral-800"
              : "text-white/90"
        }`}
      >
        {entry.title}
      </td>
      <td className={`py-2 pr-3 align-top ${effectiveLight ? "text-neutral-600" : "text-white/70"}`}>
        <ul className="list-disc list-inside space-y-0.5">
          {entry.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      </td>
    </tr>
  );
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
  const [showAll, setShowAll] = useState(false);

  const visibleEntries = showAll ? LP_CHANGELOG : LP_CHANGELOG.slice(0, LP_CHANGELOG_INITIAL_VISIBLE);
  const hiddenCount = LP_CHANGELOG.length - LP_CHANGELOG_INITIAL_VISIBLE;
  const monthGroups = useMemo(() => groupByMonth(visibleEntries), [visibleEntries]);

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
      <div
        className="h-[2px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        aria-hidden
      />
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-3 text-left ${effectiveLight ? "text-neutral-800 hover:bg-black/5" : "text-white hover:bg-white/5"}`}
        aria-expanded={open}
        aria-controls="lp-changelog-body"
      >
        {open ? <ChevronDown size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0" />}
        <h2 id="lp-changelog-heading" className="text-base font-bold" style={{ color: accentColor }}>
          更新履歴
        </h2>
      </button>
      <motion.div
        id="lp-changelog-body"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className={`border-b ${effectiveLight ? "border-neutral-200" : "border-white/20"}`}>
                <th
                  scope="col"
                  className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}
                >
                  日付
                </th>
                <th
                  scope="col"
                  className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}
                >
                  種別
                </th>
                <th
                  scope="col"
                  className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}
                >
                  タイトル
                </th>
                <th
                  scope="col"
                  className={`py-2 pr-3 text-left font-semibold ${effectiveLight ? "text-neutral-600" : "text-white/60"}`}
                >
                  主な変更
                </th>
              </tr>
            </thead>
            <tbody>
              {monthGroups.map(({ month, entries }) => (
                <React.Fragment key={month}>
                  <tr>
                    <td
                      colSpan={4}
                      className={`pt-4 pb-1 text-xs font-semibold tracking-wide ${effectiveLight ? "text-neutral-400" : "text-white/40"}`}
                    >
                      {formatMonthLabel(month)}
                    </td>
                  </tr>
                  {entries.map((entry) => (
                    <ChangelogRow
                      key={`${entry.date}-${entry.title}`}
                      entry={entry}
                      effectiveLight={effectiveLight}
                    />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {!showAll && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={`mt-3 w-full py-2 text-sm rounded-lg border transition-colors ${
                effectiveLight
                  ? "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  : "border-white/15 text-white/60 hover:bg-white/5"
              }`}
            >
              過去の更新を表示（あと {hiddenCount} 件）
            </button>
          )}
        </div>
      </motion.div>
    </section>
  );
}
