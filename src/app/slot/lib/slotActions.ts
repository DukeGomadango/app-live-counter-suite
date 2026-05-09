"use client";

import { toPng } from "html-to-image";
import { 
  getTimestampForFilename, 
  shareImageWithText, 
  generateShareUrl 
} from "@/lib/share";
import { 
  getNumbers17Preset, 
  getDefaultSymbolsPreset, 
  createSlotTemplate,
  normalizeReelStripsForLoad,
  type SlotSymbol,
  type SlotTemplate,
  type SlotSettings
} from "@/lib/slot";

/** スロット結果を画像として書き出し・共有する */
export async function handleExportSlotResultAsImage(
  lastWin: any, 
  playerName: string
) {
  const el = document.querySelector(".slot-reel-container") as HTMLElement;
  if (!el) return;

  try {
    const dataUrl = await toPng(el, { 
      backgroundColor: "transparent",
      pixelRatio: 2,
      skipFonts: true
    });
    
    const text = `🎰 ${playerName}の結果: ${lastWin.label || "WIN!"}\n#だんごツール`;
    const filename = `slot-result-${getTimestampForFilename()}.png`;
    
    const shared = await shareImageWithText(dataUrl, text, filename);
    if (!shared) {
      // フォールバック: ダウンロードとツイート画面
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
      window.open(generateShareUrl(text, { toolId: "slot" }), "_blank", "noopener,noreferrer");
    }
  } catch (err) {
    console.error("Failed to export slot image:", err);
  }
}

/** 数字スロット（1-7）プリセットを適用 */
export function handleApplyNumbers17Preset(
  setSymbolMaster: (master: SlotSymbol[]) => void,
  setReelStrips: (strips: string[][]) => void
) {
  const { symbolMaster, reelStrips } = getNumbers17Preset();
  setSymbolMaster(symbolMaster);
  setReelStrips(reelStrips);
}

/** デフォルト図柄プリセットを適用 */
export function handleApplyDefaultSymbolsPreset(
  setSymbolMaster: (master: SlotSymbol[]) => void,
  setReelStrips: (strips: string[][]) => void
) {
  const { symbolMaster, reelStrips } = getDefaultSymbolsPreset();
  setSymbolMaster(symbolMaster);
  setReelStrips(reelStrips);
}

/** テンプレートを保存 */
export function handleSaveSlotTemplate(
  name: string,
  symbolMaster: SlotSymbol[],
  reelStrips: string[][],
  settings: SlotSettings,
  setTemplates: (updater: (prev: SlotTemplate[]) => SlotTemplate[]) => void
) {
  const newTemplate = createSlotTemplate(
    name,
    settings.reelCount,
    settings.ceilingSpins,
    symbolMaster,
    reelStrips
  );
  setTemplates(prev => [...prev, newTemplate]);
}

/** テンプレートを上書き保存 */
export function handleOverwriteSlotTemplate(
  id: string,
  name: string,
  symbolMaster: SlotSymbol[],
  reelStrips: string[][],
  settings: SlotSettings,
  setTemplates: (updater: (prev: SlotTemplate[]) => SlotTemplate[]) => void
) {
  setTemplates(prev => prev.map(t => {
    if (t.id === id) {
      return {
        ...t,
        name: name.trim() || t.name,
        savedAt: Date.now(),
        reelCount: settings.reelCount,
        ceilingSpins: settings.ceilingSpins,
        symbolMaster: symbolMaster.map(s => ({ ...s })),
        reelStrips: reelStrips.map(row => [...row])
      };
    }
    return t;
  }));
}

/** テンプレートを削除 */
export function handleDeleteSlotTemplate(
  id: string,
  setTemplates: (updater: (prev: SlotTemplate[]) => SlotTemplate[]) => void
) {
  setTemplates(prev => prev.filter(t => t.id !== id));
}

/** テンプレートを読み込む */
export function handleLoadSlotTemplate(
  id: string,
  templates: SlotTemplate[],
  setSymbolMaster: (master: SlotSymbol[]) => void,
  setReelStrips: (strips: string[][]) => void,
  setSettings: (updater: (prev: SlotSettings) => SlotSettings) => void
) {
  const template = templates.find(t => t.id === id);
  if (!template) return;

  setSymbolMaster(template.symbolMaster);
  setSettings(prev => ({
    ...prev,
    reelCount: template.reelCount,
    ceilingSpins: template.ceilingSpins
  }));
  
  // リール数を考慮してリール配列を調整
  const normalized = normalizeReelStripsForLoad(
    template.reelStrips,
    template.reelCount,
    template.symbolMaster
  );
  setReelStrips(normalized);
}
