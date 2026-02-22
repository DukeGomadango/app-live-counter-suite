import JSZip from "jszip";
import type { Player, GachaPool, GachaItem } from "./gacha";

export interface ItemAttachment {
    itemId: string;
    itemName: string;
    url: string;
    kind: "image" | "audio";
}

/** プレイヤーが獲得した品目のうち、imageUrl/audioUrl が設定されているものを列挙 */
export function getPlayerItemAttachments(player: Player, pool: GachaPool): ItemAttachment[] {
    const itemIds = new Set<string>();
    const itemNames = new Map<string, string>();
    const runs = (player.runHistory ?? []).filter((r) => r.poolId === pool.id);
    for (const run of runs) {
        for (const it of run.items) {
            itemIds.add(it.itemId);
            if (!itemNames.has(it.itemId)) itemNames.set(it.itemId, it.itemName);
        }
    }
    const out: ItemAttachment[] = [];
    for (const itemId of itemIds) {
        const item = pool.items.find((i) => i.id === itemId);
        if (!item) continue;
        const name = itemNames.get(itemId) ?? item.name;
        if (item.imageUrl?.trim()) out.push({ itemId, itemName: name, url: item.imageUrl.trim(), kind: "image" });
        if (item.audioUrl?.trim()) out.push({ itemId, itemName: name, url: item.audioUrl.trim(), kind: "audio" });
    }
    return out;
}

/** ファイル名に使えない文字を除去・置換 */
function sanitizeFileName(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200) || "item";
}

/** 拡張子をURLや kind から推測 */
function extensionFor(url: string, kind: "image" | "audio"): string {
    try {
        const pathname = new URL(url).pathname;
        const ext = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
        if (/^\.(png|jpe?g|gif|webp|bmp|svg|ico)$/.test(ext)) return ext;
        if (/^\.(mp3|wav|ogg|m4a|aac|webm|flac)$/.test(ext)) return ext;
    } catch {
        // invalid URL
    }
    return kind === "image" ? ".png" : ".mp3";
}

/** プレイヤー獲得品目のURLを fetch し、成功分をZIPに追加・失敗分はマニフェストに列挙して Blob を返す */
export async function buildPlayerAttachmentsZip(player: Player, pool: GachaPool): Promise<Blob> {
    const attachments = getPlayerItemAttachments(player, pool);
    const zip = new JSZip();
    const usedNames = new Map<string, number>();
    const manifestLines: string[] = [];
    manifestLines.push("# 取得できなかったURL（CORS等）");
    manifestLines.push("# 品目名\t種別\tURL");
    manifestLines.push("");

    for (const att of attachments) {
        const ext = extensionFor(att.url, att.kind);
        const baseName = sanitizeFileName(att.itemName) + (att.kind === "audio" ? "_audio" : "");
        let count = usedNames.get(baseName) ?? 0;
        usedNames.set(baseName, count + 1);
        const fileName = count === 0 ? `${baseName}${ext}` : `${baseName}_${count}${ext}`;

        try {
            const res = await fetch(att.url, { mode: "cors" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            zip.file(fileName, blob);
        } catch {
            manifestLines.push(`${att.itemName}\t${att.kind}\t${att.url}`);
        }
    }

    if (manifestLines.length > 2) {
        zip.file("取得できなかったURL.txt", manifestLines.join("\r\n"));
    }

    return zip.generateAsync({ type: "blob" });
}
