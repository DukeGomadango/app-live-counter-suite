"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Twitter, 
  Copy, 
  Download, 
  Check, 
  ExternalLink
} from "lucide-react";
import { 
  generateShareUrl, 
  copyImageToClipboard, 
  getTimestampForFilename,
  shareImageWithText,
  canShareImageFiles
} from "@/lib/share";
import { Z_INDEX } from "@/lib/layoutConstants";
import ShareReplyToField from "./ShareReplyToField";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataUrl: string | null;
  initialText: string;
  toolId: string;
  isLightMode: boolean;
}
export default function ShareModal({
  isOpen,
  onClose,
  dataUrl: initialDataUrl,
  initialText,
  toolId,
  isLightMode
}: ShareModalProps) {
  const [shareText, setShareText] = useState(initialText);
  const [copied, setCopied] = useState(false);
  const [isXOpening, setIsXOpening] = useState(false);
  
  // Crop states (Only things that can't be derived from the image itself)
  const [aspectRatio, setAspectRatio] = useState<"free" | "16:9" | "1:1">("free");
  const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const dragModeRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number, y: number, rx: number, ry: number, rw: number, rh: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [shareText, isOpen]);

  // Reset state when modal opens
  const lastIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !lastIsOpen.current) {
      setTimeout(() => {
        setCropRect(null);
        setAspectRatio("free");
        setCopied(false);
        setIsXOpening(false);
      }, 0);
    }
    lastIsOpen.current = isOpen;
  }, [isOpen]);

  const initCrop = useCallback((ratio: "free" | "16:9" | "1:1") => {
    const img = imageRef.current;
    if (!img || img.offsetWidth === 0) {
      console.warn("[ShareModal] initCrop: Image not ready yet");
      return;
    }

    const w = img.offsetWidth;
    const h = img.offsetHeight;
    let cw = w * 0.9;
    let ch = h * 0.9;

    if (ratio === "16:9") {
      ch = (cw * 9) / 16;
      if (ch > h * 0.9) {
        ch = h * 0.9;
        cw = (ch * 16) / 9;
      }
    } else if (ratio === "1:1") {
      const size = Math.min(w, h) * 0.9;
      cw = ch = size;
    }

    const newRect = { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
    console.log("[ShareModal] initCrop success:", ratio, newRect);
    setCropRect(newRect);
    setAspectRatio(ratio);
  }, []);

  const onImageLoad = () => {
    console.log("[ShareModal] Image loaded event fired");
    initCrop("free");
  };

  // Immediate check if image is already cached
  useEffect(() => {
    if (isOpen && imageRef.current?.complete) {
      console.log("[ShareModal] Image already complete on mount");
      initCrop("free");
    }
  }, [isOpen, initCrop]);

  const handlePointerDown = (e: React.PointerEvent, mode: string) => {
    e.stopPropagation();
    if (!cropRect) return;
    dragModeRef.current = mode;
    dragStartRef.current = { 
      x: e.clientX, y: e.clientY, 
      rx: cropRect.x, ry: cropRect.y, rw: cropRect.w, rh: cropRect.h 
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!dragModeRef.current || !dragStartRef.current || !cropRect || !imageRef.current) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const s = dragStartRef.current;
    const IW = imageRef.current.offsetWidth;
    const IH = imageRef.current.offsetHeight;
    
    let nx = s.rx, ny = s.ry, nw = s.rw, nh = s.rh;
    const mode = dragModeRef.current;
    
    if (mode === "move") {
      nx = Math.max(0, Math.min(IW - nw, s.rx + dx));
      ny = Math.max(0, Math.min(IH - nh, s.ry + dy));
    } else {
      if (mode.includes("n")) {
        const nextY = Math.max(0, Math.min(s.ry + s.rh - 30, s.ry + dy));
        nh = s.rh + (s.ry - nextY); ny = nextY;
      }
      if (mode.includes("s")) nh = Math.max(30, Math.min(IH - s.ry, s.rh + dy));
      if (mode.includes("w")) {
        const nextX = Math.max(0, Math.min(s.rx + s.rw - 30, s.rx + dx));
        nw = s.rw + (s.rx - nextX); nx = nextX;
      }
      if (mode.includes("e")) nw = Math.max(30, Math.min(IW - s.rx, s.rw + dx));
      
      if (aspectRatio === "16:9") {
        const targetH = (nw * 9) / 16;
        if (targetH > IH - ny) { nw = ((IH - ny) * 16) / 9; nh = IH - ny; }
        else { nh = targetH; }
        if (mode.includes("n")) ny = s.ry + s.rh - nh;
        if (mode.includes("w")) nx = s.rx + s.rw - nw;
      } else if (aspectRatio === "1:1") {
        const size = Math.min(nw, nh); nw = nh = size;
        if (mode.includes("n")) ny = s.ry + s.rh - nh;
        if (mode.includes("w")) nx = s.rx + s.rw - nw;
      }
    }
    
    if ([nx, ny, nw, nh].every(Number.isFinite)) {
      setCropRect({ x: nx, y: ny, w: nw, h: nh });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragModeRef.current = null;
    dragStartRef.current = null;
  };

  const getEditedCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const img = imageRef.current;
    if (!img || !cropRect || !img.naturalWidth) {
      console.warn("[ShareModal] getEditedCanvas: Image not ready", { img: !!img, cropRect: !!cropRect });
      return null;
    }

    const scale = img.naturalWidth / img.offsetWidth;
    console.log("[ShareModal] Generating canvas. OriginalWidth:", img.naturalWidth, "DisplayWidth:", img.offsetWidth, "Scale:", scale.toFixed(3));

    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(cropRect.w * scale);
      canvas.height = Math.floor(cropRect.h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, cropRect.x * scale, cropRect.y * scale, cropRect.w * scale, cropRect.h * scale, 0, 0, canvas.width, canvas.height);
      return canvas;
    } catch (err) {
      console.error("[ShareModal] Canvas failed:", err);
      return null;
    }
  }, [cropRect]);

  const handleCopyImage = useCallback(async () => {
    const canvas = await getEditedCanvas();
    if (!canvas) return;
    const success = await copyImageToClipboard(canvas.toDataURL("image/png"));
    if (success) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }, [getEditedCanvas]);

  const handleDownload = useCallback(async () => {
    const canvas = await getEditedCanvas();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${toolId}-${getTimestampForFilename()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [toolId, getEditedCanvas]);

  const handleOpenX = useCallback(async () => {
    const canvas = await getEditedCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const filename = `${toolId}-${getTimestampForFilename()}.png`;
    setIsXOpening(true);
    try {
      if (canShareImageFiles()) {
        const shared = await shareImageWithText(dataUrl, shareText, filename);
        if (shared) return;
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.open(generateShareUrl(shareText, { toolId }), "_blank", "noopener,noreferrer");
    } finally {
      setIsXOpening(false);
    }
  }, [getEditedCanvas, toolId, shareText]);

  if (!isOpen) return null;

  const bgOverlay = isLightMode ? "bg-white/40" : "bg-black/50";
  const modalBg = isLightMode ? "bg-white/80" : "bg-gray-900/80";
  const textPrimary = isLightMode ? "text-gray-900" : "text-white";
  const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
  const borderClass = isLightMode ? "border-black/5" : "border-white/10";
  const inputBg = isLightMode ? "bg-black/5" : "bg-white/5";

  return (
    <AnimatePresence>
      <div 
        className={`fixed inset-0 flex items-center justify-center p-2 sm:p-6 overflow-hidden`}
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        {/* Deep Glass Overlay */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
          onClick={onClose} 
          className={`absolute inset-0 ${bgOverlay} backdrop-blur-2xl`} 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className={`relative w-full max-w-5xl rounded-[2rem] border ${borderClass} ${modalBg} backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col max-h-[96vh] overflow-hidden`}
          onClick={(e) => e.stopPropagation()} 
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Top Accent Line */}
          <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

          {/* Header */}
          <div className="relative z-[70] flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
            <div>
              <h3 className={`text-base sm:text-xl font-black tracking-tight ${textPrimary}`}>画像を切り抜いて共有</h3>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ${textPrimary}`}>High-Resolution Crop & Share</p>
            </div>
            <button 
              onClick={onClose} 
              className={`rounded-full p-2.5 ${textSecondary} hover:bg-white/10 transition-all active:scale-90`}
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-10 space-y-8">
            <div className="space-y-6">
              {/* Ratio Selectors & Controls */}
              <div className="relative z-[70] flex items-center justify-between">
                <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-2xl gap-1">
                  {(["free", "16:9", "1:1"] as const).map(ratio => (
                    <button
                      key={ratio} onClick={() => initCrop(ratio)}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        aspectRatio === ratio 
                          ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
                          : `hover:bg-white/10 ${textSecondary}`
                      }`}
                    >
                      {ratio === "free" ? "自由" : ratio}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => initCrop("free")} 
                  className={`text-[10px] font-bold px-4 py-2 rounded-xl border ${borderClass} ${textSecondary} hover:bg-white/5 transition-colors`}
                >
                  リセット
                </button>
              </div>
              
              {/* Main Cropper Area - Optimized for maximum size */}
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 flex items-center justify-center min-h-[450px] select-none shadow-inner p-4 sm:p-8">
                <div className="relative inline-block">
                  {initialDataUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      ref={imageRef} 
                      src={initialDataUrl} 
                      alt="Crop" 
                      className="relative z-10 max-w-full max-h-[60vh] block shadow-2xl rounded-sm" 
                      onLoad={onImageLoad} 
                    />
                  )}
                  
                  {cropRect && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {/* Dark Overlay Mask */}
                      <div className="absolute inset-0 bg-black/60" style={{
                        clipPath: `polygon(0% 0%, 0% 100%, ${cropRect.x}px 100%, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px 100%, 100% 100%, 100% 0%)`
                      }} />
                      
                      {/* Interactive Layer */}
                      <div 
                        className="absolute z-30 pointer-events-auto cursor-move group"
                        style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                        onPointerDown={(e) => handlePointerDown(e, "move")} 
                        onPointerMove={handlePointerMove} 
                        onPointerUp={handlePointerUp}
                      >
                        {/* Outline Border with Glow */}
                        <div className="absolute inset-0 border-[2px] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all group-hover:border-purple-400 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]">
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                            {[...Array(4)].map((_, i) => <div key={i} className="border-purple-300/30 border-[0.5px]" />)}
                          </div>
                        </div>

                        {/* Edge Drag Areas */}
                        <div className="absolute -top-4 left-4 right-4 h-8 cursor-n-resize" onPointerDown={(e) => handlePointerDown(e, "n")} />
                        <div className="absolute -bottom-4 left-4 right-4 h-8 cursor-s-resize" onPointerDown={(e) => handlePointerDown(e, "s")} />
                        <div className="absolute top-4 bottom-4 -left-4 w-8 cursor-w-resize" onPointerDown={(e) => handlePointerDown(e, "w")} />
                        <div className="absolute top-4 bottom-4 -right-4 w-8 cursor-e-resize" onPointerDown={(e) => handlePointerDown(e, "e")} />

                        {/* Modern Glowing Handles */}
                        {[
                          { pos: "nw", style: "top-0 left-0 -translate-x-1/2 -translate-y-1/2" },
                          { pos: "ne", style: "top-0 right-0 translate-x-1/2 -translate-y-1/2" },
                          { pos: "sw", style: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2" },
                          { pos: "se", style: "bottom-0 right-0 translate-x-1/2 translate-y-1/2" }
                        ].map(({ pos, style }) => (
                          <div 
                            key={pos} 
                            className={`absolute w-10 h-10 flex items-center justify-center cursor-${pos}-resize z-40 ${style}`} 
                            onPointerDown={(e) => handlePointerDown(e, pos)}
                          >
                            <div className="w-5 h-5 bg-white border-4 border-purple-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-transform group-hover:scale-110" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-[80] flex gap-4 pt-2">
                <button 
                  onClick={handleCopyImage} 
                  className={`flex-1 flex items-center justify-center gap-3 rounded-2xl py-5 text-xs font-black tracking-widest dango-btn-tier1 border ${
                    copied 
                      ? "bg-green-500/20 text-green-500 border-green-500/30 btn-glow-green" 
                      : `${inputBg} ${textPrimary} ${borderClass} hover:bg-white/10 btn-glow-purple`
                  }`}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />} 
                  {copied ? "コピー完了" : "画像をクリップボードにコピー"}
                </button>
                <button 
                  onClick={handleDownload} 
                  className={`flex-1 flex items-center justify-center gap-3 rounded-2xl py-5 text-xs font-black tracking-widest dango-btn-tier1 btn-glow-purple ${inputBg} ${textPrimary} ${borderClass} hover:bg-white/10`}
                >
                  <Download size={18} /> ローカルに保存
                </button>
              </div>
            </div>

            <div className={`h-px w-full border-b ${borderClass} opacity-50`} />

            <div className="relative z-[80] space-y-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                    <Twitter size={20} />
                  </div>
                  <div>
                    <p className={`text-base font-black ${textPrimary}`}>X投稿メッセージ</p>
                    <p className={`text-[10px] font-bold ${textSecondary} uppercase tracking-tighter`}>Post your achievement</p>
                  </div>
                </div>
                <div className={`text-[11px] font-black font-mono px-5 py-2 rounded-full ${shareText.length > 280 ? "bg-red-500 text-white" : `${inputBg} ${textSecondary}`}`}>
                  {shareText.length} / 280
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  ref={textareaRef} value={shareText} onChange={(e) => setShareText(e.target.value)}
                  className={`w-full rounded-[2rem] border ${borderClass} ${inputBg} p-6 text-sm ${textPrimary} outline-none focus:ring-4 ${
                    shareText.length > 280 ? "focus:ring-red-500/20 border-red-500/30" : "focus:ring-purple-500/10"
                  } transition-all resize-none min-h-[140px] leading-relaxed backdrop-blur-md`}
                  placeholder="メッセージを入力してください..."
                />
                <ShareReplyToField toolId={toolId} isLightMode={isLightMode} compact />
                <button
                  onClick={handleOpenX} disabled={isXOpening || shareText.length > 280}
                  className={`group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[2rem] py-6 text-base font-black text-white dango-btn-tier1 ${
                    shareText.length > 280 ? "bg-gray-500 cursor-not-allowed" : "bg-black shadow-black/30 btn-glow-purple"
                  }`}
                >
                  <Download size={24} className="opacity-40" /> 
                  <span>{canShareImageFiles() ? "切り抜いて共有シートを開く" : "切り抜いてXへ投稿する"}</span> 
                  <ExternalLink size={16} className="opacity-40" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
