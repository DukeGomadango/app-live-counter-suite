"use client";

import { useState, useEffect, useCallback } from "react";

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
 * localStorage と同期する state。初回は lazy 初期化で同期的に読み取り、
 * hydration 用の useEffect を廃止して「複数キーが順番に hydrate される」ことによる
 * 連続再レンダー（ガチャ画面のチカチカ）を防ぐ。
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => readFromStorage(key, initialValue));

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

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                setStoredValue((prev) => {
                    const valueToStore = value instanceof Function ? value(prev) : value;
                    const prevString = JSON.stringify(prev);
                    const newString = JSON.stringify(valueToStore);

                    if (prevString !== newString) {
                        window.localStorage.setItem(key, newString);
                    }
                    return valueToStore;
                });
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key]
    );

    return [storedValue, setValue];
}
