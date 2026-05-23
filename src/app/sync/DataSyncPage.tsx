"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import ModeSelector from "@/components/ModeSelector";
import { useConfirm } from "@/context/ConfirmContext";
import { LOCAL_DRIVE_FILE_ID_KEY } from "@/lib/dataSync/constants";
import {
  applySyncBundle,
  buildSyncBundle,
  parseExportedAtMs,
  parseSyncBundleJson,
  readLastExportedAt,
  serializeSyncBundle,
  touchLastExportedAt,
} from "@/lib/dataSync/bundle";
import { encodeBundleForQr, decodeQrPayload } from "@/lib/dataSync/qrPayload";
import type { ImportMode, SyncBundle } from "@/lib/dataSync/types";
import {
  driveCreateSyncFileMeta,
  driveDownloadSyncBody,
  driveFindSyncFile,
  driveUploadSyncBody,
} from "@/lib/googleDriveSync";
import type { SyncGroupId } from "@/lib/dataSync/storageKeys";
import { SYNC_GROUPS } from "@/lib/dataSync/storageKeys";
import { createAllGroupsOn, SyncScopeSection, type GroupEnabledMap } from "./SyncScopeSection";
import { useTheme } from "@/context/ThemeContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (o?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

function enabledSetFromMap(m: GroupEnabledMap): Set<SyncGroupId> {
  return new Set((Object.keys(m) as SyncGroupId[]).filter((id) => m[id]));
}

function labelForGroups(ids: SyncGroupId[]): string {
  const set = new Set(ids);
  return SYNC_GROUPS.filter((g) => set.has(g.id))
    .map((g) => g.labelJa)
    .join("、");
}

function needsGachaReconnectAfterImport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pool = JSON.parse(window.localStorage.getItem("gacha-pool") || "null") as {
      linkedCampaignId?: string;
    } | null;
    const cfg = JSON.parse(
      window.localStorage.getItem("gacha-integration-config") || "null"
    ) as { integrationToken?: string } | null;
    return !!pool?.linkedCampaignId?.trim() && !cfg?.integrationToken?.trim();
  } catch {
    return false;
  }
}

export default function DataSyncPage() {
  const { isLightMode, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"file" | "google" | "qr" | "nfc">("file");
  const [groupEnabled, setGroupEnabled] = useState<GroupEnabledMap>(() => createAllGroupsOn());
  const [importMode, setImportMode] = useState<ImportMode>("partial");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrNote, setQrNote] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<SyncBundle | null>(null);
  const [showGachaReconnectHint, setShowGachaReconnectHint] = useState(false);
  const { confirm } = useConfirm();
  const [nfcSupported, setNfcSupported] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  useEffect(() => {
    if (tabParam === "google") setTab("google");
    else if (tabParam === "qr") setTab("qr");
    else if (tabParam === "nfc") setTab("nfc");
    else setTab("file");
  }, [tabParam]);

  useEffect(() => {
    setNfcSupported(typeof window !== "undefined" && "NDEFReader" in window);
  }, []);

  useEffect(() => {
    if (tab !== "google" || !clientId) return;
    if (typeof window === "undefined" || window.google?.accounts?.oauth2) {
      setGisReady(!!window.google?.accounts?.oauth2);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => setGisReady(!!window.google?.accounts?.oauth2);
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [tab, clientId]);

  const enabledGroups = useMemo(() => enabledSetFromMap(groupEnabled), [groupEnabled]);

  const runExportBundle = useCallback(async () => {
    return buildSyncBundle(enabledGroups, window.localStorage);
  }, [enabledGroups]);

  const clearMessages = () => {
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const requestGoogleToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!clientId) {
        reject(new Error("Google クライアント ID が未設定です"));
        return;
      }
      if (!window.google?.accounts?.oauth2) {
        reject(new Error("Google のスクリプトを読み込み中です。少し待ってから再度お試しください"));
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(resp.error));
            return;
          }
          if (!resp.access_token) {
            reject(new Error("Google への接続に失敗しました"));
            return;
          }
          resolve(resp.access_token);
        },
      });
      client.requestAccessToken();
    });
  }, [clientId]);

  const ensureToken = useCallback(async () => {
    if (accessToken) return accessToken;
    const t = await requestGoogleToken();
    setAccessToken(t);
    return t;
  }, [accessToken, requestGoogleToken]);

  const getOrCreateDriveFileId = useCallback(
    async (token: string): Promise<string> => {
      let id = (() => {
        try {
          return window.localStorage.getItem(LOCAL_DRIVE_FILE_ID_KEY);
        } catch {
          return null;
        }
      })();
      if (id) return id;
      const found = await driveFindSyncFile(token);
      if (found) {
        id = found.id;
        try {
          window.localStorage.setItem(LOCAL_DRIVE_FILE_ID_KEY, id);
        } catch {
          /* ignore */
        }
        return id;
      }
      const newId = await driveCreateSyncFileMeta(token);
      try {
        window.localStorage.setItem(LOCAL_DRIVE_FILE_ID_KEY, newId);
      } catch {
        /* ignore */
      }
      return newId;
    },
    []
  );

  const handleExportFile = async () => {
    clearMessages();
    try {
      const bundle = await runExportBundle();
      const json = serializeSyncBundle(bundle);
      touchLastExportedAt(window.localStorage);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = URL.createObjectURL(blob);
      a.download = `dango-tool-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatusMsg("JSON ファイルをダウンロードしました。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingImport) return;
    
    if (importMode === "replace_scope") {
      const ok = await confirm({
        title: "データ上書きの確認",
        message: "現在チェックしている範囲のデータをこのブラウザから消してから、バンドルを適用します。よろしいですか？（取り消せません）",
        confirmLabel: "削除して適用",
        danger: true
      });
      if (!ok) return;
    }

    clearMessages();
    try {
      await applySyncBundle(pendingImport, window.localStorage, {
        mode: importMode,
        scopeForReplace: {
          enabledGroups,
        },
      });
      setPendingImport(null);
      setShowGachaReconnectHint(needsGachaReconnectAfterImport());
      setStatusMsg("取り込みが完了しました。各ツールページを開き直すと反映されます。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const onPickImportFile = async (file: File | null) => {
    if (!file) return;
    clearMessages();
    try {
      const text = await file.text();
      const bundle = parseSyncBundleJson(text);
      setPendingImport(bundle);
      setStatusMsg("バンドルを読み込みました。内容を確認して取り込んでください。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGoogleSave = async () => {
    clearMessages();
    try {
      const token = await ensureToken();
      const bundle = await runExportBundle();
      const json = serializeSyncBundle(bundle);
      touchLastExportedAt(window.localStorage);
      const fileId = await getOrCreateDriveFileId(token);
      await driveUploadSyncBody(fileId, token, json);
      setStatusMsg("Google ドライブ（アプリデータ）に保存しました。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGoogleLoad = async () => {
    clearMessages();
    try {
      const token = await ensureToken();
      const found = await driveFindSyncFile(token);
      if (!found) {
        setErrorMsg("クラウドに同期ファイルがまだありません。");
        return;
      }
      const json = await driveDownloadSyncBody(found.id, token);
      const remote = parseSyncBundleJson(json);
      const localIso = readLastExportedAt(window.localStorage);
      if (localIso && parseExportedAtMs(localIso) > parseExportedAtMs(remote.exportedAt)) {
        setStatusMsg(
          `クラウドの更新日時は ${remote.exportedAt} です。この端末の直近の書き出し（${localIso}）の方が新しい可能性があります。取り込みは上書きになります。`
        );
      }
      setPendingImport(remote);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleBuildQr = async () => {
    clearMessages();
    setQrDataUrl(null);
    setQrNote(null);
    try {
      const bundle = await runExportBundle();
      touchLastExportedAt(window.localStorage);
      const enc = await encodeBundleForQr(bundle);
      if (enc.tooLarge) {
        setQrNote(
          `QR 用のサイズ上限（約 ${enc.byteLength} バイト）を超えています。スコープを絞るか、JSON ファイルまたは Google ドライブを使ってください。`
        );
        return;
      }
      const url = await QRCode.toDataURL(enc.payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 280,
      });
      setQrDataUrl(url);
      setStatusMsg(enc.kind === "gzip" ? "gzip 圧縮して QR を生成しました。" : "QR を生成しました。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleQrImageFile = async (file: File | null) => {
    if (!file) return;
    clearMessages();
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas を使えません");
      ctx.drawImage(bmp, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code?.data) throw new Error("QR を読み取れませんでした");
      const bundle = await decodeQrPayload(code.data);
      setPendingImport(bundle);
      setStatusMsg("QR からバンドルを読み取りました。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleNfcWrite = async () => {
    clearMessages();
    if (!nfcSupported) return;
    try {
      const bundle = await runExportBundle();
      touchLastExportedAt(window.localStorage);
      const enc = await encodeBundleForQr(bundle);
      if (enc.tooLarge) {
        setErrorMsg("データが大きすぎて NFC に書き込めません。スコープを絞ってください。");
        return;
      }
      const NDEFReaderCtor = (window as unknown as { NDEFReader: new () => { write: (o: unknown) => Promise<void> } }).NDEFReader;
      const reader = new NDEFReaderCtor();
      await reader.write({
        records: [{ recordType: "text", data: enc.payload, encoding: "utf-8", lang: "ja" }],
      });
      setStatusMsg("NFC タグに書き込みました。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleNfcRead = async () => {
    clearMessages();
    if (!nfcSupported) return;
    try {
      const NDEFReaderCtor = (window as unknown as {
        NDEFReader: new () => EventTarget & { scan: () => Promise<void> };
      }).NDEFReader;
      const reader = new NDEFReaderCtor();
      const text = await new Promise<string>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("タイムアウトしました")), 30_000);
        reader.addEventListener("reading", (ev: Event) => {
          window.clearTimeout(timer);
          try {
            const { message } = ev as unknown as {
              message: { records: Iterable<{ data?: DataView | ArrayBuffer }> };
            };
            const first = [...message.records][0];
            const d = first?.data;
            if (d instanceof DataView) {
              resolve(new TextDecoder().decode(new Uint8Array(d.buffer, d.byteOffset, d.byteLength)));
              return;
            }
            if (d instanceof ArrayBuffer) {
              resolve(new TextDecoder().decode(d));
              return;
            }
            reject(new Error("テキストレコードを解釈できませんでした"));
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        });
        reader.scan().catch(reject);
      });
      const bundle = await decodeQrPayload(text);
      setPendingImport(bundle);
      setStatusMsg("NFC からバンドルを読み取りました。");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const bg = isLightMode ? "bg-gradient-to-b from-slate-50 to-slate-100" : "bg-[#0a0520] min-h-screen";
  const textPri = isLightMode ? "text-neutral-900" : "text-white";
  const textSec = isLightMode ? "text-neutral-600" : "text-white/70";
  const tabBtn = (active: boolean) =>
    `rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
      active
        ? isLightMode
          ? "bg-purple-600 text-white"
          : "bg-purple-500 text-white"
        : isLightMode
          ? "bg-black/5 text-neutral-700 hover:bg-black/10"
          : "bg-white/10 text-white/80 hover:bg-white/15"
    }`;

  return (
    <div className={`min-h-screen ${bg}`}>
      <header
        className={`sticky top-0 z-50 flex items-center justify-between gap-2 px-3 py-2 border-b ${
          isLightMode ? "border-black/10 bg-white/80 backdrop-blur-md" : "border-white/10 bg-[#0a0520]/85 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ModeSelector isLightMode={isLightMode} accentColor="#10b981" />
          <Link
            href="/"
            className={`text-xs font-medium shrink-0 ${textSec} hover:underline`}
          >
            トップへ
          </Link>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-xl ${isLightMode ? "bg-black/5 text-amber-600" : "bg-white/10 text-amber-200"}`}
          aria-label="テーマ切替"
        >
          {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">
        <div>
          <h1 className={`text-xl font-black ${textPri}`}>データ連携</h1>
          <p className={`mt-1 text-sm ${textSec}`}>
            バックアップは上書きのみ（マージしません）。取り込み前に JSON 書き出しを推奨します。
          </p>
        </div>

        <SyncScopeSection
          groupEnabled={groupEnabled}
          setGroupEnabled={setGroupEnabled}
          isLightMode={isLightMode}
        />

        {showGachaReconnectHint ? (
          <div
            className={`rounded-2xl border p-4 text-sm leading-relaxed ${
              isLightMode
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : "bg-amber-500/10 border-amber-500/25 text-amber-50"
            }`}
          >
            <p className="font-bold mb-1">ガチャのだんごシェアリンク再接続</p>
            <p className={isLightMode ? "text-amber-900/90" : "text-amber-50/90"}>
              配布キャンペーンの設定は復元されましたが、だんごシェアリンクへの接続はデータ連携に含まれません。
            </p>
            <Link
              href="/gacha"
              className="inline-block mt-2 text-xs font-bold underline"
            >
              ガチャの配布タブで連携を開始する
            </Link>
          </div>
        ) : null}

        <section className={`rounded-2xl border p-4 ${isLightMode ? "bg-white/90 border-neutral-200" : "bg-white/5 border-white/10"}`}>
          <h2 className={`text-sm font-bold ${textPri}`}>取り込みモード</h2>
          <label className={`mt-2 flex items-center gap-2 text-sm ${textPri}`}>
            <input
              type="radio"
              name="importMode"
              checked={importMode === "partial"}
              onChange={() => setImportMode("partial")}
            />
            バンドルに含まれるキーだけ上書き（ほかはそのまま）
          </label>
          <label className={`mt-2 flex items-center gap-2 text-sm ${textPri}`}>
            <input
              type="radio"
              name="importMode"
              checked={importMode === "replace_scope"}
              onChange={() => setImportMode("replace_scope")}
            />
            今チェックしている範囲を先にクリアしてから適用
          </label>
        </section>

        {errorMsg && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-200">{errorMsg}</div>
        )}
        {statusMsg && (
          <div className={`rounded-xl px-3 py-2 text-sm ${isLightMode ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-emerald-500/15 text-emerald-100 border border-emerald-500/30"}`}>
            {statusMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(["file", "google", "qr", "nfc"] as const).map((t) => (
            <button key={t} type="button" className={tabBtn(tab === t)} onClick={() => setTab(t)}>
              {t === "file" && "ファイル"}
              {t === "google" && "Google"}
              {t === "qr" && "QR"}
              {t === "nfc" && "NFC"}
            </button>
          ))}
        </div>

        {tab === "file" && (
          <section className={`rounded-2xl border p-4 space-y-3 ${isLightMode ? "bg-white/90 border-neutral-200" : "bg-white/5 border-white/10"}`}>
            <button
              type="button"
              onClick={handleExportFile}
              className={`w-full rounded-xl py-3 text-sm font-bold ${isLightMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white"}`}
            >
              JSON ファイルに書き出す
            </button>
            <label className={`block w-full rounded-xl border border-dashed py-8 text-center text-sm cursor-pointer ${textSec}`}>
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => onPickImportFile(e.target.files?.[0] ?? null)} />
              JSON ファイルを選んで取り込む準備をする
            </label>
          </section>
        )}

        {tab === "google" && (
          <section className={`rounded-2xl border p-4 space-y-3 ${isLightMode ? "bg-white/90 border-neutral-200" : "bg-white/5 border-white/10"}`}>
            {!clientId && (
              <p className={`text-sm ${textSec}`}>
                本番で Google 連携を使うには環境変数 NEXT_PUBLIC_GOOGLE_CLIENT_ID を設定してください（.env.example を参照）。
              </p>
            )}
            {clientId && !gisReady && <p className={`text-sm ${textSec}`}>Google ログイン用スクリプトを読み込み中…</p>}
            <p className={`text-xs ${textSec}`}>
              マイドライブは開きません。アプリ専用領域（appDataFolder）に 1 ファイル保存します。初回のみ Google で許可が必要です。
            </p>
            <button
              type="button"
              disabled={!clientId || !gisReady}
              onClick={handleGoogleSave}
              className={`w-full rounded-xl py-3 text-sm font-bold disabled:opacity-40 ${isLightMode ? "bg-emerald-600 text-white" : "bg-emerald-500 text-white"}`}
            >
              クラウドに保存
            </button>
            <button
              type="button"
              disabled={!clientId || !gisReady}
              onClick={handleGoogleLoad}
              className={`w-full rounded-xl py-3 text-sm font-bold border ${isLightMode ? "border-neutral-300 text-neutral-800" : "border-white/20 text-white"}`}
            >
              クラウドから読み込む（確認画面へ）
            </button>
          </section>
        )}

        {tab === "qr" && (
          <section className={`rounded-2xl border p-4 space-y-3 ${isLightMode ? "bg-white/90 border-neutral-200" : "bg-white/5 border-white/10"}`}>
            <button
              type="button"
              onClick={handleBuildQr}
              className={`w-full rounded-xl py-3 text-sm font-bold ${isLightMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white"}`}
            >
              QR を生成
            </button>
            {qrNote && <p className="text-sm text-amber-300">{qrNote}</p>}
            {qrDataUrl && <Image src={qrDataUrl} alt="同期用 QR" width={280} height={280} className="mx-auto rounded-lg border border-white/10" unoptimized />}
            <label className={`block w-full rounded-xl border border-dashed py-6 text-center text-sm cursor-pointer ${textSec}`}>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQrImageFile(e.target.files?.[0] ?? null)} />
              QR 画像をアップロードして読み取る
            </label>
          </section>
        )}

        {tab === "nfc" && (
          <section className={`rounded-2xl border p-4 space-y-3 ${isLightMode ? "bg-white/90 border-neutral-200" : "bg-white/5 border-white/10"}`}>
            {!nfcSupported && (
              <p className={`text-sm ${textSec}`}>このブラウザまたは端末では Web NFC に対応していません。Android の Chrome でお試しください。</p>
            )}
            {nfcSupported && (
              <>
                <button
                  type="button"
                  onClick={handleNfcWrite}
                  className={`w-full rounded-xl py-3 text-sm font-bold ${isLightMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white"}`}
                >
                  NFC タグに書き込む
                </button>
                <button
                  type="button"
                  onClick={handleNfcRead}
                  className={`w-full rounded-xl py-3 text-sm font-bold border ${isLightMode ? "border-neutral-300 text-neutral-800" : "border-white/20 text-white"}`}
                >
                  NFC タグを読み取る
                </button>
              </>
            )}
          </section>
        )}

        {pendingImport && (
          <section className={`rounded-2xl border p-4 space-y-3 ${isLightMode ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-400/30"}`}>
            <h3 className={`text-sm font-bold ${textPri}`}>取り込み確認</h3>
            <p className={`text-xs ${textSec}`}>
              書き出し日時: {pendingImport.exportedAt}
              <br />
              含まれるツール: {labelForGroups(pendingImport.scope.groups)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleImportConfirm}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-red-600 text-white"
              >
                この内容で取り込む
              </button>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold border ${isLightMode ? "border-neutral-300" : "border-white/20 text-white"}`}
              >
                キャンセル
              </button>
            </div>
          </section>
        )}


      </main>
    </div>
  );
}
