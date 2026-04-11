/** 新しい localStorage キーをツールに追加したら storageKeys.ts の該当グループにも必ず追加する */

export const SYNC_SCHEMA_VERSION = 1;

export const DANGO_SYNC_FILENAME = "dango-tool-sync.json";

/** Google Drive 連携で使用する fileId キャッシュ（エクスポートバンドルには含めない） */
export const LOCAL_DRIVE_FILE_ID_KEY = "dango-tool-drive-sync-file-id";

/** QR に載せる生文字列のおおよその上限（バイト）。超えたらファイル／Google を案内 */
export const QR_SAFE_BYTE_LENGTH = 2200;
