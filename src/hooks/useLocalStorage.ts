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
 * localStorage と同期する state。
 * サーバー・クライアント初回描画では必ず initialValue を返しハイドレーション不一致を防ぐ。
 * マウント後に setTimeout(0) で localStorage を読み、あれば 1 回だけ setState する。
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    // 初回は initialValue のまま。マウント後に localStorage を読んで 1 回だけ更新（ハイドレーション一致のため）
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

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            // state 更新と localStorage 書き込みを分離することで、
            // QuotaExceededError が投げられても React state は正常に更新される。
            setStoredValue((prev) => {
                const valueToStore = value instanceof Function ? value(prev) : value;
                const newString = JSON.stringify(valueToStore);

                // localStorage 書き込み (非同期的に分離)
                try {
                    const prevString = JSON.stringify(prev);
                    if (prevString !== newString) {
                        window.localStorage.setItem(key, newString);
                    }
                } catch (error) {
                    console.warn(`Error setting localStorage key "${key}":`, error);
                    // QuotaExceededError をキャッチしてUIに通知
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(
                            new CustomEvent("storage-quota-exceeded", {
                                detail: { key, error },
                            })
                        );
                    }
                }

                return valueToStore;
            });
        },
        [key]
    );

    return [storedValue, setValue];
}
