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
  includeGachaMedia,
  setIncludeGachaMedia,
  isLightMode,
}: {
  groupEnabled: GroupEnabledMap;
  setGroupEnabled: React.Dispatch<React.SetStateAction<GroupEnabledMap>>;
  includeGachaMedia: boolean;
  setIncludeGachaMedia: (v: boolean) => void;
  isLightMode: boolean;
}) {
  useEffect(() => {
    if (!groupEnabled.gacha) setIncludeGachaMedia(false);
  }, [groupEnabled.gacha, setIncludeGachaMedia]);

  const applyPreset = (preset: PresetId) => {
    if (preset === "minimal") {
      setGroupEnabled(() => {
        const m = createAllGroupsOn();
        for (const id of ALL_SYNC_GROUP_IDS) m[id] = id === "counter";
        return m;
      });
      setIncludeGachaMedia(false);
      return;
    }
    if (preset === "recommended") {
      setGroupEnabled(createAllGroupsOn());
      setIncludeGachaMedia(false);
      return;
    }
    setGroupEnabled(createAllGroupsOn());
    setIncludeGachaMedia(true);
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
        チェックしたツールの localStorage が対象です。ガチャの画像・音声は別トグルで IndexedDB も含められます。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${btnGhost}`} onClick={() => applyPreset("recommended")}>
          おすすめ（設定のみ）
        </button>
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${btnGhost}`} onClick={() => applyPreset("minimal")}>
          最小（カウンターのみ）
        </button>
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${btnGhost}`} onClick={() => applyPreset("full")}>
          すべて（画像・音声含む）
        </button>
      </div>

      <details className="mt-4">
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

      <div className="mt-4 flex items-start gap-2 border-t border-white/10 pt-3">
        <input
          id="sync-gacha-media"
          type="checkbox"
          checked={includeGachaMedia}
          disabled={!groupEnabled.gacha}
          onChange={(e) => setIncludeGachaMedia(e.target.checked)}
          className="mt-1 rounded border-neutral-400"
        />
        <label htmlFor="sync-gacha-media" className={`text-sm ${groupEnabled.gacha ? textPri : textSec}`}>
          ガチャの画像・音声（IndexedDB）を含める
          <span className={`mt-0.5 block text-xs ${textSec}`}>容量が大きくなります。QR / NFC ではサイズ制限に注意してください。</span>
        </label>
      </div>
    </section>
  );
}
