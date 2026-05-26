/** だんごシェアリンク管理画面 deep link（file-share-app と同名） */
export const FOCUS_EXTERNAL_TX_QUERY = "focus_external_tx";

/** 本番のだんごシェアリンク API ベース（カスタムドメイン未設定時） */
export const DEFAULT_SHARE_LINK_API_BASE_URL = "https://dango-share-link.vercel.app";
const LEGACY_SHARE_LINK_API_BASE_URLS = new Set([
    "https://share.dango.tools",
    "http://share.dango.tools",
]);
const PRODUCTION_SHARE_LINK_API_ORIGINS = new Set([
    DEFAULT_SHARE_LINK_API_BASE_URL,
]);
const LOCAL_SHARE_LINK_API_ORIGINS = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]);

export function resolveShareLinkApiBaseUrl(hostname?: string): string {
    if (isLocalhost(hostname)) {
        return "http://localhost:3000";
    }
    return DEFAULT_SHARE_LINK_API_BASE_URL;
}

export function isLocalhost(hostname?: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1";
}

/** 旧デフォルトや未許可 origin を、安全なだんごリンクシェア URL に正規化する */
export function normalizeShareLinkApiBaseUrl(
    url: string,
    options: { allowLocalhost?: boolean } = {}
): string {
    const trimmed = url.trim().replace(/\/$/, "");
    if (!trimmed || LEGACY_SHARE_LINK_API_BASE_URLS.has(trimmed)) {
        return DEFAULT_SHARE_LINK_API_BASE_URL;
    }

    try {
        const parsed = new URL(trimmed);
        const origin = parsed.origin;
        if (PRODUCTION_SHARE_LINK_API_ORIGINS.has(origin)) {
            return origin;
        }
        if (options.allowLocalhost && LOCAL_SHARE_LINK_API_ORIGINS.has(origin)) {
            return origin;
        }
    } catch {
        return DEFAULT_SHARE_LINK_API_BASE_URL;
    }

    return DEFAULT_SHARE_LINK_API_BASE_URL;
}
