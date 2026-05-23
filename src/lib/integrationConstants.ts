/** だんごシェアリンク管理画面 deep link（file-share-app と同名） */
export const FOCUS_EXTERNAL_TX_QUERY = "focus_external_tx";

/** 本番のだんごシェアリンク API ベース（カスタムドメイン未設定時） */
export const DEFAULT_SHARE_LINK_API_BASE_URL = "https://dango-share-link.vercel.app";

export function resolveShareLinkApiBaseUrl(hostname?: string): string {
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:3000";
    }
    return DEFAULT_SHARE_LINK_API_BASE_URL;
}

/** 旧デフォルト（未設定 DNS）を本番 Vercel URL に置き換える */
export function normalizeShareLinkApiBaseUrl(url: string): string {
    const trimmed = url.replace(/\/$/, "");
    if (trimmed === "https://share.dango.tools" || trimmed === "http://share.dango.tools") {
        return DEFAULT_SHARE_LINK_API_BASE_URL;
    }
    return trimmed;
}
