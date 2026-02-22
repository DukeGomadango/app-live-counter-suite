"use client";

import { useSyncExternalStore } from "react";

function subscribeMedia(query: string, callback: () => void) {
    const m = window.matchMedia(query);
    m.addEventListener("change", callback);
    return () => m.removeEventListener("change", callback);
}

function getMediaSnapshot(query: string): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
}

function getMediaServerSnapshot(): boolean {
    return false;
}

/**
 * メディアクエリにマッチするかどうかを返す。SSR 時は false。
 */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (cb) => subscribeMedia(query, cb),
        () => getMediaSnapshot(query),
        getMediaServerSnapshot
    );
}
