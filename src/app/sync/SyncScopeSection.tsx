"use client";

import { useEffect } from "react";
import { ALL_SYNC_GROUP_IDS, SYNC_GROUPS, type SyncGroupId } from "@/lib/dataSync/storageKeys";

export type GroupEnabledMap = Record<SyncGroupId, boolean>;

export function createAllGroupsOn(): GroupEnabledMap {
  return Object.fromEntries(ALL_SYNC_GROUP_IDS.map((id) => [id, true])) as GroupEnabledMap;
}

type PresetId = "recommended" | "minimal" | "full";

export function SyncScopeSection({
  groupEnabled,
  setGroupEnabled,
  isLightMode,
}: {
  groupEnabled: GroupEnabledMap;
  setGroupEnabled: React.Dispatch<React.SetStateAction<GroupEnabledMap>>;
  isLightMode: boolean;
}) {
  const applyPreset = (preset: PresetId) => {
    if (preset === "minimal") {
      setGroupEnabled(() => {
        const m = createAllGroupsOn();
        for (const id of ALL_SYNC_GROUP_IDS) m[id] = id === "counter";
        return m;
      });
      return;
    }
    setGroupEnabled(createAllGroupsOn());
  };

  const toggleGroup = (id: SyncGroupId) => {
    setGroupEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const textPri = isLightMode ? "text-neutral-900" : "text-white";
  const textSec = isLightMode ? "text-neutral-600" : "text-white/70";
  const cardBg = isLightMode ? "bg-white/90 border-neutral-200" : "bg-white/5 border-white/10";
  const btnGhost = isLightMode
    ? "bg-black/5 hover:bg-black/10 text-neutral-800"
    : "bg-white/10 hover:bg-white/15 text-white";

  return (
    <section className={`rounded-2xl border p-4 ${cardBg}`}>
      <h2 className={`text-sm font-bold ${textPri}`}>書き出し・取り込みの範囲</h2>
      <p className={`mt-1 text-xs ${textSec}`}>
        チェックしたツールの設定データ（localStorage）が対象です。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${btnGhost}`} onClick={() => applyPreset("recommended")}>
          おすすめ（全設定）
        </button>
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${btnGhost}`} onClick={() => applyPreset("minimal")}>
          最小（カウンターのみ）
        </button>
      </div>

      <details className="mt-4" open>
        <summary className={`cursor-pointer text-xs font-semibold ${textPri}`}>詳細（ツールごと）</summary>
        <ul className="mt-2 space-y-2">
          {SYNC_GROUPS.map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              <input
                id={`sync-g-${g.id}`}
                type="checkbox"
                checked={groupEnabled[g.id]}
                onChange={() => toggleGroup(g.id)}
                className="rounded border-neutral-400"
              />
              <label htmlFor={`sync-g-${g.id}`} className={`text-sm ${textPri}`}>
                {g.labelJa}
              </label>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
