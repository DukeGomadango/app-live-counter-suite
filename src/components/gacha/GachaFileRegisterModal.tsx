"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Image as ImageIcon, Music } from "lucide-react";
import type { GachaItem } from "@/lib/gacha";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import { putGachaFile } from "@/lib/gachaFileStore";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

interface GachaFileRegisterModalProps {
    poolId: string;
    item: GachaItem;
    isLightMode: boolean;
    onClose: () => void;
    onUpdate: (updates: { imageUrl?: string; audioUrl?: string }) => void;
}

type Kind = "image" | "audio";

export default function GachaFileRegisterModal({
    poolId,
    item,
    isLightMode,
    onClose,
    onUpdate,
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
        (f: File | null) => {
            clearFile();
            if (!f) return;
            if (f.size > MAX_FILE_BYTES) {
                setError("5MB以下にしてください");
                return;
            }
            setError(null);
            setFile(f);
            if (kind === "image" && f.type.startsWith("image/")) {
                setPreviewUrl(URL.createObjectURL(f));
            } else {
                setPreviewUrl(null);
            }
        },
        [kind, clearFile]
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
                const url = await putGachaFile(poolId, item.id, kind, file);
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

    const handleBackdropClick = useCallback(
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
                    <div className={`text-[10px] flex gap-3 ${textMuted}`}>
                        <span>画像: {item.imageUrl ? "登録済み" : "未設定"}</span>
                        <span>音声: {item.audioUrl ? "登録済み" : "未設定"}</span>
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
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleFileChange}
                        className="hidden"
                        aria-hidden
                    />
                    <div
                        onClick={() => inputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors min-h-[100px] ${isLightMode ? "border-gray-300 hover:border-purple-400 hover:bg-purple-50/50" : "border-white/20 hover:border-purple-400/60 hover:bg-white/5"}`}
                    >
                        {previewUrl && kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element -- プレビュー用データURLのため img を使用
                            <img src={previewUrl} alt="登録画像のプレビュー" className="max-h-20 max-w-full object-contain rounded" />
                        ) : (
                            <Upload size={24} className={isLightMode ? "text-gray-400" : "text-white/50"} />
                        )}
                        <span className={`text-[10px] ${textMuted}`}>
                            {file ? file.name : "クリックまたはドロップでファイル選択（5MB以下）"}
                        </span>
                    </div>
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="または URL を入力"
                        className={`w-full text-xs px-3 py-2 rounded-lg ${textPrimary} outline-none placeholder:opacity-60`}
                        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                    />
                    {currentUrl && (
                        <p className={`text-[10px] truncate ${textMuted}`} title={currentUrl}>
                            登録済み: {currentUrl.startsWith("local://") ? "ファイル" : currentUrl}
                        </p>
                    )}
                    {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleRegister}
                            disabled={saving || (!file && !urlInput.trim())}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {saving ? "登録中…" : "登録"}
                        </button>
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
