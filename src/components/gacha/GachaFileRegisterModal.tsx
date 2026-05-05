"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Image as ImageIcon, Music } from "lucide-react";
import type { GachaItem } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { putGachaFile } from "@/lib/gachaFileStore";
import type { ExternalAsset } from "@/lib/gachaDistribution";
import EmojiGlyph from "../icons/EmojiGlyph";
import { Link2 } from "lucide-react";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB (音声などの制限)
const MAX_IMAGE_DIMENSION = 1024; // ガチャ画像は長辺1024pxに自動圧縮

/** 画像をリサイズ・JPEG圧縮してFileオブジェクトとして返す */
async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let w = img.width;
            let h = img.height;
            if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
                const scale = MAX_IMAGE_DIMENSION / Math.max(w, h);
                w = Math.floor(w * scale);
                h = Math.floor(h * scale);
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas ctx error"));
            ctx.drawImage(img, 0, 0, w, h);

            const isPng = file.type === "image/png";
            const mimeType = isPng ? "image/png" : "image/jpeg";
            const quality = isPng ? undefined : 0.85;

            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error("Blob creation failed"));
                // 拡張子を揃える（.jpeg 等）
                const ext = isPng ? "png" : "jpg";
                const newName = file.name.replace(/\.[^/.]+$/, "") + `_compressed.${ext}`;
                const newFile = new File([blob], newName, { type: mimeType });
                resolve(newFile);
            }, mimeType, quality);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Image load error"));
        };
        img.src = url;
    });
}

interface GachaFileRegisterModalProps {
    poolId: string;
    item: GachaItem;
    isLightMode: boolean;
    onClose: () => void;
    onUpdate: (updates: { imageUrl?: string; audioUrl?: string; linkedAssetId?: string }) => void;
    externalAssets?: ExternalAsset[];
}

type Kind = "image" | "audio" | "link";

export default function GachaFileRegisterModal({
    poolId,
    item,
    isLightMode,
    onClose,
    onUpdate,
    externalAssets,
}: GachaFileRegisterModalProps) {
    const { glassBg, glassBorder } = useGlassStyle(isLightMode);
    const textPrimary = isLightMode ? "text-gray-900" : "text-white/95";
    const textMuted = isLightMode ? "text-gray-600" : "text-white/65";
    const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
    const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    const [kind, setKind] = useState<Kind>("image");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [processing, setProcessing] = useState(false); // 画像圧縮中フラグ
    const inputRef = useRef<HTMLInputElement>(null);

    const accept = kind === "image" ? "image/*" : "audio/*";
    const currentUrl = kind === "image" ? item.imageUrl : item.audioUrl;

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // 種別切り替え時にファイル・URL入力をリセット
    useEffect(() => {
        setFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        setUrlInput("");
        setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kind 変更時のみリセットし、previewUrl を deps に含めない
    }, [kind]);

    const clearFile = useCallback(() => {
        setFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        setError(null);
    }, [previewUrl]);

    const validateAndSetFile = useCallback(
        async (f: File | null) => {
            if (processing) return;
            clearFile();
            if (!f) return;

            if (kind === "audio") {
                if (f.size > MAX_AUDIO_BYTES) {
                    setError("音声ファイルは5MB以下にしてください");
                    return;
                }
                setError(null);
                setFile(f);
                setPreviewUrl(null);
            } else {
                // 画像の場合は自動圧縮を試みる
                if (!f.type.startsWith("image/")) {
                    setError("画像ファイルを選択してください");
                    return;
                }
                try {
                    setProcessing(true);
                    setError(null);
                    const compressed = await compressImage(f);
                    setFile(compressed);
                    setPreviewUrl(URL.createObjectURL(compressed));
                } catch (err) {
                    console.warn("Failed to compress image:", err);
                    setError("画像の処理に失敗しました");
                } finally {
                    setProcessing(false);
                }
            }
        },
        [kind, clearFile, processing]
    );

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            validateAndSetFile(f ?? null);
            e.target.value = "";
        },
        [validateAndSetFile]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            validateAndSetFile(e.dataTransfer.files?.[0] ?? null);
        },
        [validateAndSetFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleRegister = useCallback(async () => {
        setError(null);
        if (file) {
            setSaving(true);
            try {
                const url = await putGachaFile(poolId, item.id, kind as "image" | "audio", file);
                onUpdate(kind === "image" ? { imageUrl: url } : { audioUrl: url });
                setFile(null);
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
            } catch {
                setError("登録に失敗しました");
            } finally {
                setSaving(false);
            }
        } else if (urlInput.trim()) {
            onUpdate(kind === "image" ? { imageUrl: urlInput.trim() } : { audioUrl: urlInput.trim() });
            setUrlInput("");
        } else {
            setError("ファイルを選択するかURLを入力してください");
        }
    }, [file, poolId, item.id, kind, urlInput, previewUrl, onUpdate]);

    const handleClear = useCallback(() => {
        onUpdate(kind === "image" ? { imageUrl: undefined } : { audioUrl: undefined });
        setFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        setUrlInput("");
        setError(null);
    }, [kind, onUpdate, previewUrl]);

    const hasContent = !!currentUrl || !!file || urlInput.trim();

    const _handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const modalContent = (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-md"
                onClick={onClose}
                aria-hidden
            />
            <div
                className="relative z-[71] w-full max-w-md flex flex-col rounded-2xl overflow-hidden max-h-[85vh] pointer-events-auto"
                style={{
                    background: glassBg,
                    border: `1px solid ${glassBorder}`,
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
                role="dialog"
                aria-labelledby="gacha-attachment-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="flex items-center justify-between gap-2 px-4 py-3 shrink-0 border-b"
                    style={{ borderColor: glassBorder }}
                >
                    <h2
                        id="gacha-attachment-modal-title"
                        className={`text-sm font-bold truncate min-w-0 ${textPrimary}`}
                    >
                        添付 — {item.name}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors shrink-0 ${isLightMode ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white/85"}`}
                        aria-label="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto scroll-touch flex flex-col gap-4">
                    {/* 登録済みステータス */}
                    <div className={`text-[10px] flex flex-wrap gap-x-4 gap-y-1 ${textMuted}`}>
                        <span className="flex items-center gap-1">画像: {item.imageUrl ? <span className="text-emerald-500 font-bold">登録済み</span> : "未設定"}</span>
                        <span className="flex items-center gap-1">音声: {item.audioUrl ? <span className="text-emerald-500 font-bold">登録済み</span> : "未設定"}</span>
                        <span className="flex items-center gap-1">配布: {item.linkedAssetId ? <span className="text-purple-500 font-bold">紐付け済み</span> : "未設定"}</span>
                    </div>

                    {/* 種別選択 */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setKind("image")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${kind === "image" ? "bg-purple-500/20 text-purple-400 border border-purple-400/50" : isLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                        >
                            <ImageIcon size={14} aria-hidden />
                            画像
                        </button>
                        <button
                            type="button"
                            onClick={() => setKind("audio")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${kind === "audio" ? "bg-purple-500/20 text-purple-400 border border-purple-400/50" : isLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                        >
                            <Music size={14} />
                            音声
                        </button>
                        <button
                            type="button"
                            onClick={() => setKind("link")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${kind === "link" ? "bg-purple-500/20 text-purple-400 border border-purple-400/50" : isLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                        >
                            <Link2 size={14} aria-hidden />
                            配布ファイル
                        </button>
                    </div>

                    {kind === "link" ? (
                        <div className="flex flex-col gap-3 py-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <EmojiGlyph emoji="📦" size={14} />
                                <span className={`text-[10px] font-bold ${isLightMode ? "text-gray-700" : "text-white/80"} uppercase tracking-wider`}>
                                    dango link share のアセットを選択
                                </span>
                            </div>
                            {externalAssets && externalAssets.length > 0 ? (
                                <select
                                    value={item.linkedAssetId || ""}
                                    onChange={(e) => onUpdate({ linkedAssetId: e.target.value || undefined })}
                                    className={`w-full text-xs px-3 py-2.5 rounded-xl ${textPrimary} outline-none cursor-pointer appearance-none`}
                                    style={{ 
                                        background: inputBg, 
                                        border: `1px solid ${inputBorder}`,
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(isLightMode ? "#6b7280" : "#9ca3af")}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: "no-repeat",
                                        backgroundPosition: "right 12px center",
                                    }}
                                >
                                    <option value="">-- 配布しない（枠のみ / 未設定） --</option>
                                    {externalAssets.map((asset) => (
                                        <option key={asset.id} value={asset.id} style={isLightMode ? { color: "#111827" } : { background: "#1a0a3e", color: "#f8fafc" }}>
                                            {asset.label || "無題のアセット"}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className={`p-6 rounded-2xl border-2 border-dashed ${isLightMode ? "border-gray-200 bg-gray-50/50" : "border-white/10 bg-white/5"} flex flex-col items-center gap-3`}>
                                    <EmojiGlyph emoji="⚠️" size={24} />
                                    <div className="text-center space-y-1">
                                        <p className={`text-[11px] font-bold ${textPrimary}`}>アセットが見つかりません</p>
                                        <p className={`text-[10px] ${textMuted} leading-relaxed`}>
                                            連携先のキャンペーンにファイルが登録されていないか、<br />
                                            連携設定（トークン）が有効ではありません。
                                        </p>
                                    </div>
                                </div>
                            )}
                            <p className={`text-[10px] ${textMuted} leading-relaxed mt-1 px-1`}>
                                ここでアセットを選択すると、プレイヤーがこの品目を獲得した際、<br />
                                対応するファイルが自動的に配布物としてリンクされます。
                            </p>
                        </div>
                    ) : (
                        <>
                            <input
                                ref={inputRef}
                                type="file"
                                accept={accept}
                                onChange={handleFileChange}
                                className="hidden"
                                aria-hidden
                            />
                            <div
                                onClick={() => { if (!processing) inputRef.current?.click(); }}
                                onDrop={processing ? undefined : handleDrop}
                                onDragOver={handleDragOver}
                                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors min-h-[100px] ${processing ? "opacity-50 pointer-events-none" : isLightMode ? "border-gray-300 hover:border-purple-400 hover:bg-purple-50/50" : "border-white/20 hover:border-purple-400/60 hover:bg-white/5"}`}
                            >
                                {processing ? (
                                    <>
                                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-1" />
                                        <span className={`text-[10px] ${textMuted}`}>画像を最適化しています…</span>
                                    </>
                                ) : previewUrl && kind === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- プレビュー用データURLのため img を使用
                                    <img src={previewUrl} alt="登録画像のプレビュー" className="max-h-20 max-w-full object-contain rounded" />
                                ) : (
                                    <Upload size={24} className={isLightMode ? "text-gray-400" : "text-white/50"} />
                                )}
                                {!processing && (
                                    <span className={`text-[10px] ${textMuted}`}>
                                        {file ? file.name : (kind === "image" ? "クリックまたはドロップで画像を選択（自動最適化）" : "クリックまたはドロップで音声を選択（5MB以下）")}
                                    </span>
                                )}
                            </div>
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="または URL を入力"
                                className={`w-full text-xs px-3 py-2 rounded-lg ${textPrimary} outline-none placeholder:opacity-60`}
                                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                            />
                        </>
                    )}
                    {kind !== "link" && currentUrl && (
                        <p className={`text-[10px] truncate ${textMuted}`} title={currentUrl}>
                            登録済み: {currentUrl.startsWith("local://") ? "ファイル" : currentUrl}
                        </p>
                    )}
                    {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
                    <div className="flex gap-2">
                        {kind !== "link" && (
                            <button
                                type="button"
                                onClick={handleRegister}
                                disabled={saving || processing || (!file && !urlInput.trim())}
                                className="px-3 py-2 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {saving ? "登録中…" : "登録"}
                            </button>
                        )}
                        {hasContent && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className={`px-3 py-2 rounded-lg text-xs font-medium ${isLightMode ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                            >
                                クリア
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") return null;
    return createPortal(modalContent, document.body);
}
