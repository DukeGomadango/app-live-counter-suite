import type { IntegrationConfig } from "@/lib/gacha";

import { IntegrationApiError, testConnection } from "@/lib/gachaDistribution";



const GACHA_OAUTH_CLIENT_ID = "dango-tools-gacha";



export const OAUTH_ERROR_ACCESS_DENIED = "access_denied";



export type OAuthCallbackNotice = "success" | "access_denied";



/** リンクシェアの OAuth 同意画面 URL */

export function buildIntegrationAuthorizeUrl(

    apiBaseUrl: string,

    pathname: string,

    stateSearch: string

): string {

    const base = apiBaseUrl.replace(/\/$/, "");

    const authUrl = new URL(`${base}/settings/integrations/authorize`);

    authUrl.searchParams.set("client_id", GACHA_OAUTH_CLIENT_ID);

    authUrl.searchParams.set(

        "redirect_uri",

        typeof window !== "undefined" ? `${window.location.origin}${pathname}` : pathname

    );

    if (stateSearch) {

        authUrl.searchParams.set("state", stateSearch);

    }

    return authUrl.toString();

}



/** OAuth 戻り URL からトークン・拒否・state を読み取り、クエリを除去したパスを返す */

export function consumeOAuthReturnFromUrl(url: URL): {

    apiBaseUrl: string | null;

    integrationToken: string | null;

    notice: OAuthCallbackNotice | null;

    cleanedPath: string;

} {

    const apiBaseUrl = url.searchParams.get("api_base_url");

    const token = url.searchParams.get("integration_token");

    const oauthError = url.searchParams.get("error");

    const state = url.searchParams.get("state");



    let notice: OAuthCallbackNotice | null = null;

    if (oauthError === OAUTH_ERROR_ACCESS_DENIED) {

        notice = "access_denied";

    } else if (token) {

        notice = "success";

    }



    if (apiBaseUrl) {

        url.searchParams.delete("api_base_url");

    }

    if (token) {

        url.searchParams.delete("integration_token");

    }

    if (oauthError) {

        url.searchParams.delete("error");

    }

    if (url.searchParams.has("state")) {

        url.searchParams.delete("state");

    }



    let cleanedPath = url.pathname;

    if (token && state && state.startsWith("?")) {

        cleanedPath += state;

    } else {

        cleanedPath += url.search;

    }



    return {

        apiBaseUrl,

        integrationToken: token,

        notice,

        cleanedPath,

    };

}



/** 失効トークンを localStorage から除去 */

export function clearStoredIntegrationToken(): IntegrationConfig | null {

    if (typeof window === "undefined") return null;

    try {

        const raw = window.localStorage.getItem("gacha-integration-config");

        if (!raw) return null;

        const parsed = JSON.parse(raw) as IntegrationConfig;

        const next = { ...parsed, integrationToken: "" };

        window.localStorage.setItem("gacha-integration-config", JSON.stringify(next));

        return next;

    } catch {

        return null;

    }

}



export function isIntegrationAuthFailure(err: unknown): boolean {

    return (

        err instanceof IntegrationApiError &&

        (err.status === 401 || err.code === "unauthorized")

    );

}

/** 保存済み Bearer がリンクシェアでまだ有効か（同期前の軽い確認） */
export async function isIntegrationTokenValid(
    config: IntegrationConfig
): Promise<boolean> {
    if (!config.integrationToken?.trim() || !config.apiBaseUrl?.trim()) {
        return false;
    }
    return testConnection(config);
}

