"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Clock, Timer, Hourglass, Settings } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ModeSelector from "@/components/ModeSelector";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import ClockSettingsPanel from "@/components/clock/ClockSettingsPanel";
import { useTheme } from "@/context/ThemeContext";
import {
  createDefaultClockSettings,
  type ClockSettings,
} from "@/lib/clock";

type MainTab = "clock" | "stopwatch" | "timer";
type ClockDisplayMode = "digital" | "analog";

/** ミリ秒を HH:MM:SS.cc または HH:MM:SS（showCentiseconds で切り替え） */
function formatElapsed(ms: number, showCentiseconds: boolean): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (showCentiseconds) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const cc = cs.toString().padStart(2, "0");
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cc}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cc}`;
  }
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** 現在時刻を HH:MM:SS.cc または HH:MM:SS */
function formatTime(date: Date, showCentiseconds: boolean): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  if (showCentiseconds) {
    const cs = Math.floor(date.getMilliseconds() / 10);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  }
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** 角度（度）をラジアンに */
function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export default function ClockContent({
  isSplitMode = false,
  isRightPane: _isRightPane = false,
}: {
  isSplitMode?: boolean;
  isRightPane?: boolean;
} = {}) {
  const { isLightMode, toggleTheme } = useTheme();
  const [settings, setSettings] = useLocalStorage<ClockSettings>(
    "clock-settings",
    createDefaultClockSettings()
  );
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("clock");
  const [clockDisplayMode, setClockDisplayMode] = useState<ClockDisplayMode>("digital");

  const { glassBorder: _glassBorder } = useGlassStyle(isLightMode);
  const accentColor = settings.accentColor ?? "#f97316";
  const orbIntensity = settings.orbIntensity ?? 50;

  const headerBgStrong = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.92)";
  const iconColor = isLightMode ? "text-gray-800" : "text-white";
  const iconHover = isLightMode ? "hover:bg-gray-200" : "hover:bg-white/20";
  const splitPaneBg = isSplitMode ? (isLightMode ? undefined : "#0a051e") : undefined;
  const splitLightBg =
    "linear-gradient(135deg, #f0e6ff 0%, #e0ecff 30%, #dff0fa 50%, #f5e6f9 70%, #eee8ff 100%)";
  const splitTopBg = isSplitMode && isLightMode ? "#f8f9fa" : splitPaneBg ?? headerBgStrong;

  return (
    <div
      className={`flex flex-col overflow-hidden relative z-10 ${isSplitMode ? "h-full w-full min-w-0" : "h-screen w-screen"}`}
      style={splitPaneBg ? { background: splitPaneBg } : undefined}
    >
      {isSplitMode && isLightMode && (
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: splitLightBg }} />
      )}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${isLightMode ? "mix-blend-multiply opacity-20" : "opacity-80"}`}
      >
        <motion.div
          animate={{ x: [0, 100, -50, 0], y: [0, -100, 50, 0], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[5%] left-[5%] w-[50rem] h-[50rem] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            opacity: (orbIntensity / 100) * (isLightMode ? 0.5 : 0.6),
          }}
        />
        <motion.div
          animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[5%] right-[5%] w-[60rem] h-[60rem] rounded-full blur-[150px]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 60%)`,
            opacity: (orbIntensity / 100) * (isLightMode ? 0.4 : 0.5),
          }}
        />
      </div>

      <div
        className={`relative shrink-0 z-50 flex items-center justify-between px-3 py-2 min-h-[52px]`}
        style={{
          background: isSplitMode ? splitTopBg : headerBgStrong,
          backdropFilter: isSplitMode ? "none" : "blur(12px)",
          borderBottom: `1px solid ${isLightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {!isSplitMode && <ModeSelector isLightMode={isLightMode} accentColor={accentColor} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsPanel(true)}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title="時計設定"
            aria-label="設定"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${iconColor} ${iconHover}`}
            title={isLightMode ? "ダークモード" : "ライトモード"}
            aria-label={isLightMode ? "ダークモード" : "ライトモード"}
          >
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettingsPanel && (
          <ClockSettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            isLightMode={isLightMode}
            onClose={() => setShowSettingsPanel(false)}
            isSplitMode={isSplitMode}
          />
        )}
      </AnimatePresence>

      <main
        className={`relative z-10 flex-1 flex flex-col min-h-0 overflow-auto scroll-touch p-3 sm:p-4`}
      >
        {/* メインタブ: 時計 / ストップウォッチ / タイマー */}
        <div
          className={`shrink-0 flex gap-1 p-1.5 rounded-xl mx-3 mt-3 ${isLightMode ? "bg-black/6" : "bg-white/5"}`}
          role="tablist"
        >
          {(
            [
              { id: "clock" as const, label: "時計", icon: Clock },
              { id: "stopwatch" as const, label: "ストップウォッチ", icon: Timer },
              { id: "timer" as const, label: "タイマー", icon: Hourglass },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMainTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mainTab === id ? (isLightMode ? "bg-white text-neutral-800 shadow-sm" : "bg-white/15 text-white") : isLightMode ? "text-neutral-500 hover:bg-black/8" : "text-white/60 hover:bg-white/10"}`}
              style={mainTab === id ? { border: `1px solid ${accentColor}40` } : undefined}
              role="tab"
              aria-selected={mainTab === id}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
          <AnimatePresence mode="wait">
            {mainTab === "clock" && (
              <ClockPanel
                key="clock"
                isLightMode={isLightMode}
                displayMode={clockDisplayMode}
                onDisplayModeChange={setClockDisplayMode}
                accentColor={accentColor}
                showCentiseconds={settings.showCentiseconds ?? true}
                clockSize={settings.clockSize ?? 100}
              />
            )}
            {mainTab === "stopwatch" && (
              <StopwatchPanel
                key="stopwatch"
                isLightMode={isLightMode}
                accentColor={accentColor}
                showCentiseconds={settings.showCentiseconds ?? true}
                clockSize={settings.clockSize ?? 100}
              />
            )}
            {mainTab === "timer" && (
              <TimerPanel
                key="timer"
                isLightMode={isLightMode}
                accentColor={accentColor}
                showCentiseconds={settings.showCentiseconds ?? true}
                clockSize={settings.clockSize ?? 100}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ClockPanel({
  isLightMode,
  displayMode,
  onDisplayModeChange,
  accentColor,
  showCentiseconds,
  clockSize,
}: {
  isLightMode: boolean;
  displayMode: ClockDisplayMode;
  onDisplayModeChange: (m: ClockDisplayMode) => void;
  accentColor: string;
  showCentiseconds: boolean;
  clockSize: number;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalMs = showCentiseconds ? 10 : 1000;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [showCentiseconds]);

  const textPrimary = isLightMode ? "text-neutral-900" : "text-white";
  const textSecondary = isLightMode ? "text-neutral-500" : "text-white/60";
  const scale = clockSize / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-md flex flex-col items-center gap-4"
    >
      <div className={`flex gap-2 p-1 rounded-lg ${isLightMode ? "bg-black/6" : "bg-white/5"}`}>
        <button
          type="button"
          onClick={() => onDisplayModeChange("digital")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${displayMode === "digital" ? "bg-white/20" : ""}`}
          style={displayMode === "digital" ? { border: `1px solid ${accentColor}60` } : undefined}
        >
          デジタル
        </button>
        <button
          type="button"
          onClick={() => onDisplayModeChange("analog")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${displayMode === "analog" ? "bg-white/20" : ""}`}
          style={displayMode === "analog" ? { border: `1px solid ${accentColor}60` } : undefined}
        >
          アナログ
        </button>
      </div>

      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        {displayMode === "digital" ? (
          <>
            <p className={`text-4xl sm:text-5xl font-mono font-bold tabular-nums ${textPrimary}`}>
              {formatTime(now, showCentiseconds)}
            </p>
            <p className={`text-sm ${textSecondary}`}>
              {now.toLocaleDateString("ja-JP", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </>
        ) : (
          <AnalogFace date={now} isLightMode={isLightMode} accentColor={accentColor} />
        )}
      </div>
    </motion.div>
  );
}

function AnalogFace({
  date,
  isLightMode,
  accentColor,
}: {
  date: Date;
  isLightMode: boolean;
  accentColor: string;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const hour = date.getHours() % 12 + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const minute = date.getMinutes() + date.getSeconds() / 60;
  const second = date.getSeconds();
  const hourAngle = (hour / 12) * 360 - 90;
  const minuteAngle = (minute / 60) * 360 - 90;
  const secondAngle = (second / 60) * 360 - 90;

  const strokeStrong = isLightMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)";

  const hand = (angle: number, length: number, width: number, color: string) => {
    const x = cx + length * Math.cos(deg2rad(angle));
    const y = cy + length * Math.sin(deg2rad(angle));
    return (
      <line
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="shrink-0">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={strokeStrong}
          strokeWidth={2}
        />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 360 - 90;
          const x1 = cx + (r - 6) * Math.cos(deg2rad(a));
          const y1 = cy + (r - 6) * Math.sin(deg2rad(a));
          const x2 = cx + r * Math.cos(deg2rad(a));
          const y2 = cy + r * Math.sin(deg2rad(a));
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeStrong} strokeWidth={i % 3 === 0 ? 2 : 1} />
          );
        })}
        {hand(hourAngle, r * 0.45, 4, strokeStrong)}
        {hand(minuteAngle, r * 0.6, 3, strokeStrong)}
        {hand(secondAngle, r * 0.75, 2, accentColor)}
      </svg>
    </div>
  );
}

function StopwatchPanel({
  isLightMode,
  accentColor,
  showCentiseconds,
  clockSize,
}: {
  isLightMode: boolean;
  accentColor: string;
  showCentiseconds: boolean;
  clockSize: number;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startRef = useRef<number>(0);
  const pausedRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setElapsedMs(pausedRef.current + (Date.now() - startRef.current));
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    startRef.current = Date.now();
    const intervalMs = showCentiseconds ? 10 : 1000;
    intervalRef.current = setInterval(tick, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, showCentiseconds, tick]);

  const handleStart = () => {
    if (isRunning) return;
    startRef.current = Date.now();
    pausedRef.current = elapsedMs;
    setIsRunning(true);
  };

  const handlePause = () => {
    if (!isRunning) return;
    pausedRef.current = elapsedMs;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    pausedRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const textPrimary = isLightMode ? "text-neutral-900" : "text-white";
  const scale = clockSize / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-md flex flex-col items-center gap-6"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <p className={`text-5xl sm:text-6xl font-mono font-bold tabular-nums ${textPrimary}`}>
          {formatElapsed(elapsedMs, showCentiseconds)}
        </p>
      </div>
      <div className="flex gap-3">
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ background: accentColor }}
          >
            開始
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="px-6 py-3 rounded-xl font-semibold transition-all border-2"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            一時停止
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          className={`px-6 py-3 rounded-xl font-semibold border-2 ${isLightMode ? "border-neutral-300 text-neutral-700" : "border-white/30 text-white/80"}`}
        >
          リセット
        </button>
      </div>
    </motion.div>
  );
}

function TimerPanel({
  isLightMode,
  accentColor,
  showCentiseconds,
  clockSize,
}: {
  isLightMode: boolean;
  accentColor: string;
  showCentiseconds: boolean;
  clockSize: number;
}) {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning || remainingMs === null) return;
    const tick = () => {
      const left = Math.max(0, endTimeRef.current - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        try {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("タイマー", { body: "時間になりました。" });
          } else {
            alert("時間になりました。");
          }
        } catch {
          alert("時間になりました。");
        }
      }
    };
    const intervalMs = showCentiseconds ? 10 : 1000;
    intervalRef.current = setInterval(tick, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- interval は isRunning/showCentiseconds で切り替え, remainingMs は tick 内で参照
  }, [isRunning, remainingMs === null, showCentiseconds]);

  const handleStart = () => {
    const totalMs =
      remainingMs !== null && remainingMs > 0 ? remainingMs : (minutes * 60 + seconds) * 1000;
    if (totalMs <= 0) return;
    endTimeRef.current = Date.now() + totalMs;
    setRemainingMs(totalMs);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingMs(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const setPreset = (mins: number) => {
    if (!isRunning) {
      setMinutes(mins);
      setSeconds(0);
    }
  };

  const displayMs = remainingMs !== null ? remainingMs : (minutes * 60 + seconds) * 1000;
  const textPrimary = isLightMode ? "text-neutral-900" : "text-white";
  const textSecondary = isLightMode ? "text-neutral-500" : "text-white/50";
  const scale = clockSize / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-md flex flex-col items-center gap-6"
    >
      {/* プリセット */}
      <div className="flex gap-2 flex-wrap justify-center">
        {[1, 5, 10].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setPreset(m)}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isLightMode ? "bg-black/8 hover:bg-black/12" : "bg-white/10 hover:bg-white/15"} disabled:opacity-50`}
          >
            {m}分
          </button>
        ))}
      </div>

      {/* 入力 */}
      {!isRunning && remainingMs === null && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            <span className={`text-sm ${textSecondary}`}>分</span>
            <input
              type="number"
              min={0}
              max={99}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)))}
              className={`w-16 px-2 py-2 rounded-lg text-center font-mono text-lg border ${isLightMode ? "bg-white border-neutral-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </label>
          <span className={textPrimary}>:</span>
          <label className="flex items-center gap-1">
            <span className={`text-sm ${textSecondary}`}>秒</span>
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
              className={`w-16 px-2 py-2 rounded-lg text-center font-mono text-lg border ${isLightMode ? "bg-white border-neutral-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </label>
        </div>
      )}

      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <p className={`text-5xl sm:text-6xl font-mono font-bold tabular-nums ${textPrimary}`}>
          {formatElapsed(displayMs, showCentiseconds)}
        </p>
      </div>

      <div className="flex gap-3">
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={minutes === 0 && seconds === 0}
            className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: accentColor }}
          >
            開始
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="px-6 py-3 rounded-xl font-semibold transition-all border-2"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            一時停止
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          className={`px-6 py-3 rounded-xl font-semibold border-2 ${isLightMode ? "border-neutral-300 text-neutral-700" : "border-white/30 text-white/80"}`}
        >
          リセット
        </button>
      </div>
    </motion.div>
  );
}
