"use client";

import { useCallback, useRef } from "react";
import { type RouletteSettings } from "@/lib/roulette";

export function useRouletteDrag(
    settings: RouletteSettings,
    setSettings: (updater: (prev: RouletteSettings) => RouletteSettings) => void,
    wheelAreaRef: React.RefObject<HTMLDivElement | null>
) {
    const projectNameDragStartRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number } | null>(null);

    const handleProjectNamePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            const pos = settings.projectNamePosition ?? { x: 0, y: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
            projectNameDragStartRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                posX: pos.x,
                posY: pos.y,
            };
        },
        [settings.projectNamePosition]
    );

    const handleProjectNamePointerMove = useCallback(
        (e: React.PointerEvent) => {
            const start = projectNameDragStartRef.current;
            if (!start) return;
            const el = wheelAreaRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const maxX = Math.max(0, rect.width - 20);
            const maxY = Math.max(0, rect.height - 20);
            const newX = Math.max(0, Math.min(maxX, start.posX + (e.clientX - start.clientX)));
            const newY = Math.max(0, Math.min(maxY, start.posY + (e.clientY - start.clientY)));
            setSettings((prev) => ({ ...prev, projectNamePosition: { x: newX, y: newY } }));
        },
        [setSettings, wheelAreaRef]
    );

    const handleProjectNamePointerUp = useCallback((e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        projectNameDragStartRef.current = null;
    }, []);

    return {
        handleProjectNamePointerDown,
        handleProjectNamePointerMove,
        handleProjectNamePointerUp
    };
}
