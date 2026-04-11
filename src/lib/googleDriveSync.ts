import { DANGO_SYNC_FILENAME } from "@/lib/dataSync/constants";

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function readErrorMessage(r: Response): Promise<string> {
  try {
    const j = (await r.json()) as { error?: { message?: string } };
    return j.error?.message ?? r.statusText;
  } catch {
    return r.statusText;
  }
}

/** appDataFolder 内の同期ファイルを検索（名前一致） */
export async function driveFindSyncFile(accessToken: string): Promise<{ id: string } | null> {
  const q = encodeURIComponent(`name='${DANGO_SYNC_FILENAME}' and trashed=false`);
  const url = `${DRIVE_FILES}?spaces=appDataFolder&q=${q}&fields=files(id,name)`;
  const r = await fetch(url, { headers: authHeader(accessToken) });
  if (!r.ok) throw new Error(await readErrorMessage(r));
  const j = (await r.json()) as { files?: { id: string }[] };
  return j.files?.[0] ?? null;
}

/** メタデータのみ作成（空ファイル） */
export async function driveCreateSyncFileMeta(accessToken: string): Promise<string> {
  const r = await fetch(`${DRIVE_FILES}?fields=id`, {
    method: "POST",
    headers: {
      ...authHeader(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: DANGO_SYNC_FILENAME,
      parents: ["appDataFolder"],
    }),
  });
  if (!r.ok) throw new Error(await readErrorMessage(r));
  const j = (await r.json()) as { id: string };
  return j.id;
}

/** JSON 本文を uploadType=media で上書き */
export async function driveUploadSyncBody(fileId: string, accessToken: string, jsonBody: string): Promise<void> {
  const url = `${DRIVE_UPLOAD}/${fileId}?uploadType=media`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: {
      ...authHeader(accessToken),
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: jsonBody,
  });
  if (!r.ok) throw new Error(await readErrorMessage(r));
}

export async function driveDownloadSyncBody(fileId: string, accessToken: string): Promise<string> {
  const url = `${DRIVE_FILES}/${fileId}?alt=media`;
  const r = await fetch(url, { headers: authHeader(accessToken) });
  if (!r.ok) throw new Error(await readErrorMessage(r));
  return r.text();
}
