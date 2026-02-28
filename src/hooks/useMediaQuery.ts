"use client";

import { useSyncExternalStore, useState, useEffect } from "react";

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
 * メディアクエリにマッチするかどうかを返す。SSR・初回クライアント描画時は false でハイドレーション一致。
 */
export function useMediaQuery(query: string): boolean {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const matches = useSyncExternalStore(
        (cb) => subscribeMedia(query, cb),
        () => getMediaSnapshot(query),
        getMediaServerSnapshot
    );
    return mounted ? matches : false;
}
