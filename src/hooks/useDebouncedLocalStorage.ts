"use client";

import { useState, useEffect, useCallback, useRef } from "react";

function readFromStorage<T>(key: string, initialValue: T): T {
    if (typeof window === "undefined") return initialValue;
    try {
        const item = window.localStorage.getItem(key);
        if (item != null) return JSON.parse(item) as T;
    } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
}

/**
 * localStorage への書き込みを debounce する。メインスレッドの連続 stringify / setItem を抑える。
 * pagehide / beforeunload / visibility hidden / アンマウント時に未反映分を flush する。
 */
export function useDebouncedLocalStorage<T>(key: string, initialValue: T, debounceMs = 400): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const stateRef = useRef<T>(initialValue);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        stateRef.current = storedValue;
    }, [storedValue]);

    useEffect(() => {
        const id = setTimeout(() => {
            setStoredValue(readFromStorage(key, initialValue));
        }, 0);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue を deps に含めると参照で再実行されやすいため省略
    }, [key]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent | CustomEvent) => {
            if ("detail" in e) {
                if (e.detail.key === key) setStoredValue(e.detail.newValue);
            } else {
                if (e.key === key && e.newValue != null) {
                    try {
                        setStoredValue(JSON.parse(e.newValue));
                    } catch (error) {
                        console.warn(`Error parsing localStorage key "${key}":`, error);
                    }
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("local-storage-sync", handleStorageChange as EventListener);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("local-storage-sync", handleStorageChange as EventListener);
        };
    }, [key]);

    const persistNow = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        try {
            window.localStorage.setItem(key, JSON.stringify(stateRef.current));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key]);

    useEffect(() => {
        const flush = () => persistNow();
        window.addEventListener("pagehide", flush);
        window.addEventListener("beforeunload", flush);
        const onVis = () => {
            if (document.visibilityState === "hidden") flush();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            window.removeEventListener("pagehide", flush);
            window.removeEventListener("beforeunload", flush);
            document.removeEventListener("visibilitychange", onVis);
            flush();
        };
    }, [persistNow]);

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                setStoredValue((prev) => {
                    const valueToStore = value instanceof Function ? value(prev) : value;
                    const prevString = JSON.stringify(prev);
                    const newString = JSON.stringify(valueToStore);
                    if (prevString === newString) return prev;

                    stateRef.current = valueToStore;

                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        timerRef.current = null;
                        try {
                            window.localStorage.setItem(key, JSON.stringify(stateRef.current));
                        } catch (error) {
                            console.warn(`Error setting localStorage key "${key}":`, error);
                        }
                    }, debounceMs);

                    return valueToStore;
                });
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, debounceMs]
    );

    return [storedValue, setValue];
}
