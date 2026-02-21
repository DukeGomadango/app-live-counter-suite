"use client";

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Use microtask to avoid "setState synchronously within an effect" lint error
        Promise.resolve().then(() => {
            try {
                const item = window.localStorage.getItem(key);
                if (item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.warn(`Error reading localStorage key "${key}":`, error);
            }
            setIsHydrated(true);
        });
    }, [key]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent | CustomEvent) => {
            if ("detail" in e) {
                // Custom event dispatched within the same tab
                if (e.detail.key === key) {
                    setStoredValue(e.detail.newValue);
                }
            } else {
                // Storage event dispatched from other tabs
                if (e.key === key && e.newValue) {
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
                        window.dispatchEvent(
                            new CustomEvent("local-storage-sync", {
                                detail: { key, newValue: valueToStore },
                            })
                        );
                    }
                    return valueToStore;
                });
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key]
    );

    return [isHydrated ? storedValue : initialValue, setValue];
}
