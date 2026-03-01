"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { SITE_CONFIG } from "@/lib/site";

const STORAGE_KEY = "dango_admin_token";

const ADMIN_ACCENT = "#a855f7";

type Stats = {
  byTool: { tool_id: string; views: number; users: number }[];
  byDay: { day: string; views: number; users: number }[];
  days: number;
};

const TOOL_LABELS: Record<string, string> = Object.fromEntries([
  ["top", "トップ"],
  ["admin", "管理"],
  ...TOOLS.map((t) => [t.id, t.labelJa]),
]);

function formatDayShort(day: string): string {
  const [, m, d] = day.split("-").map(Number);
  return `${m}/${d}`;
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${y}/${m}/${d}`;
}

const panelBg = "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
const panelBorder = "1px solid rgba(255,255,255,0.1)";
const panelShadow = "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [inputPassword, setInputPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setToken(stored);
  }, [mounted]);

  const fetchStats = useCallback(
    async (secret: string, dayCount: number) => {
      const base = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
      if (!base) {
        setError("NEXT_PUBLIC_ANALYTICS_ENDPOINT が設定されていません");
        setStats(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const url = `${base.replace(/\/$/, "")}/api/stats?days=${dayCount}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const data = await res.json();
        if (!res.ok) {
          const err = data as { error?: string };
          setError(err.error ?? "取得に失敗しました");
          setStats(null);
          return;
        }
        setStats(data as Stats);
      } catch {
        setError("通信エラー");
        setStats(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!mounted || !token) return;
    fetchStats(token, days);
  }, [mounted, token, days, fetchStats]);

  const handleRefresh = () => {
    if (token) fetchStats(token, days);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const p = inputPassword.trim();
    if (!p) return;
    sessionStorage.setItem(STORAGE_KEY, p);
    setToken(p);
    setInputPassword("");
    setError(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setStats(null);
  };

  const totalViews = stats?.byDay.reduce((a, r) => a + r.views, 0) ?? 0;
  const totalUsers = stats?.byDay.reduce((a, r) => a + r.users, 0) ?? 0;
  const chartData =
    stats?.byDay.map((r) => ({
      day: formatDayShort(r.day),
      full: r.day,
      views: r.views,
      users: r.users,
    })).reverse() ?? [];

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white/80"
        style={{ background: "#0a051e" }}
      >
        <span>読み込み中...</span>
      </div>
    );
  }

  if (!token) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-white/80 p-4"
        style={{ background: "#0a051e" }}
      >
        <div
          className="w-full max-w-xs rounded-2xl p-6"
          style={{
            background: panelBg,
            backdropFilter: "blur(16px)",
            border: panelBorder,
            boxShadow: panelShadow,
          }}
        >
          <h1 className="text-xl font-bold mb-4 text-center">利用状況（管理者）</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="パスワード"
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoComplete="current-password"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl font-medium text-white transition-colors hover:opacity-90"
              style={{ background: ADMIN_ACCENT }}
            >
              表示
            </button>
          </form>
          {error && <p className="mt-2 text-red-400 text-sm text-center">{error}</p>}
        </div>
        <Link href="/" className="mt-6 text-white/50 hover:text-white/80 text-sm">
          ← {SITE_CONFIG.name} に戻る
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white/80 p-4 pb-20"
      style={{ background: "#0a051e" }}
    >
      <div className="max-w-3xl mx-auto">
        <header
          className="flex flex-wrap items-center justify-between gap-4 mb-6 rounded-2xl px-4 py-3"
          style={{
            background: panelBg,
            backdropFilter: "blur(12px)",
            border: panelBorder,
            boxShadow: panelShadow,
          }}
        >
          <h1 className="text-xl font-bold">利用状況</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value={7}>直近7日</option>
              <option value={30}>直近30日</option>
              <option value={90}>直近90日</option>
            </select>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50 text-sm"
              title="更新"
              aria-label="更新"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              更新
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-white/50 hover:text-white/80"
            >
              ログアウト
            </button>
            <Link href="/" className="text-sm text-white/50 hover:text-white/80">
              トップへ
            </Link>
          </div>
        </header>

        {error && (
          <div
            className="mb-4 p-3 rounded-xl border border-red-500/30 text-red-300 text-sm"
            style={{ background: "rgba(239,68,68,0.1)" }}
          >
            {error}
          </div>
        )}
        {loading && !stats && <p className="text-white/50">読み込み中...</p>}

        {stats && (
          <div className="space-y-6">
            {/* サマリ */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: panelBg,
                  backdropFilter: "blur(12px)",
                  border: panelBorder,
                  boxShadow: panelShadow,
                }}
              >
                <p className="text-white/50 text-sm">総表示回数</p>
                <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: ADMIN_ACCENT }}>
                  {totalViews.toLocaleString()}
                </p>
              </div>
              <div
                className="rounded-2xl p-4"
                style={{
                  background: panelBg,
                  backdropFilter: "blur(12px)",
                  border: panelBorder,
                  boxShadow: panelShadow,
                }}
              >
                <p className="text-white/50 text-sm">延べユーザー数</p>
                <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: ADMIN_ACCENT }}>
                  {totalUsers.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 折れ線グラフ */}
            <section
              className="rounded-2xl overflow-hidden"
              style={{
                background: panelBg,
                backdropFilter: "blur(12px)",
                border: panelBorder,
                boxShadow: panelShadow,
              }}
            >
              <h2 className="px-4 py-3 font-semibold border-b border-white/10">日別の推移</h2>
              <div className="p-4 h-64">
                {chartData.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">データがありません</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                        stroke="rgba(255,255,255,0.2)"
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                        stroke="rgba(255,255,255,0.2)"
                        tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15,8,35,0.95)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "12px",
                        }}
                        labelStyle={{ color: "rgba(255,255,255,0.8)" }}
                        formatter={(value) => [
                          value != null ? Number(value).toLocaleString() : "—",
                          "表示回数",
                        ]}
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload as { full?: string } | undefined;
                          return p?.full ? formatDay(p.full) : "";
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke={ADMIN_ACCENT}
                        strokeWidth={2}
                        dot={{ fill: ADMIN_ACCENT, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* 機能別テーブル */}
            <section
              className="rounded-2xl overflow-hidden"
              style={{
                background: panelBg,
                backdropFilter: "blur(12px)",
                border: panelBorder,
                boxShadow: panelShadow,
              }}
            >
              <h2 className="px-4 py-3 font-semibold border-b border-white/10">機能別</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/50 border-b border-white/10">
                      <th className="px-4 py-2">機能</th>
                      <th className="px-4 py-2 text-right">表示回数</th>
                      <th className="px-4 py-2 text-right">ユーザー数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byTool.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-white/40">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      stats.byTool.map((row) => (
                        <tr key={row.tool_id} className="border-b border-white/5">
                          <td className="px-4 py-2">
                            {TOOL_LABELS[row.tool_id] ?? row.tool_id}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{row.views}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{row.users}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 日別テーブル */}
            <section
              className="rounded-2xl overflow-hidden"
              style={{
                background: panelBg,
                backdropFilter: "blur(12px)",
                border: panelBorder,
                boxShadow: panelShadow,
              }}
            >
              <h2 className="px-4 py-3 font-semibold border-b border-white/10">日別（一覧）</h2>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/50 border-b border-white/10 sticky top-0 bg-[#0a051e]/95">
                      <th className="px-4 py-2">日付</th>
                      <th className="px-4 py-2 text-right">表示回数</th>
                      <th className="px-4 py-2 text-right">ユーザー数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byDay.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-white/40">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      stats.byDay.map((row) => (
                        <tr key={row.day} className="border-b border-white/5">
                          <td className="px-4 py-2">{formatDay(row.day)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{row.views}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{row.users}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
