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
  getTimestampForFilename 
} from "@/lib/share";
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

  useEffect(() => {
    if (isOpen) {
      console.log("[ShareModal] Modal opened. Initializing...");
      setCopied(false);
      setIsXOpening(false);
      setCropRect(null);
      setAspectRatio("free");
    }
  }, [isOpen, initialText]);

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
    await handleDownload();
    setIsXOpening(true);
    window.open(generateShareUrl(shareText, { toolId }), "_blank", "noopener,noreferrer");
    setTimeout(() => setIsXOpening(false), 1000);
  }, [handleDownload, shareText, toolId]);

  if (!isOpen) return null;

  const bgClass = isLightMode ? "bg-white" : "bg-gray-900";
  const textPrimary = isLightMode ? "text-gray-900" : "text-white";
  const textSecondary = isLightMode ? "text-gray-500" : "text-white/50";
  const borderClass = isLightMode ? "border-black/10" : "border-white/10";
  const inputBg = isLightMode ? "bg-black/5" : "bg-white/5";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className={`relative w-full max-w-3xl rounded-[2.5rem] border ${borderClass} ${bgClass} shadow-2xl flex flex-col max-h-[98vh] overflow-hidden`}
          onClick={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative z-[70] flex items-center justify-between px-6 sm:px-8 py-4 border-b border-white/10 bg-inherit">
            <div>
              <h3 className={`text-base sm:text-lg font-black tracking-tighter ${textPrimary}`}>画像を切り抜いて共有</h3>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ${textPrimary}`}>Crop & Share</p>
            </div>
            <button onClick={onClose} className={`rounded-full p-2 ${textSecondary} hover:bg-black/5 transition-all active:scale-90`}><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-8">
            <div className="space-y-4">
              {/* Ratio Selectors */}
              <div className="relative z-[70] flex items-center justify-between">
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl gap-1">
                  {(["free", "16:9", "1:1"] as const).map(ratio => (
                    <button
                      key={ratio} onClick={() => initCrop(ratio)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        aspectRatio === ratio ? "bg-purple-600 text-white shadow-lg shadow-purple-500/40" : `hover:bg-black/5 dark:hover:bg-white/5 ${textSecondary}`
                      }`}
                    >
                      {ratio === "free" ? "自由" : ratio}
                    </button>
                  ))}
                </div>
                <button onClick={() => initCrop("free")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 ${textSecondary} hover:bg-black/5`}>
                  リセット
                </button>
              </div>
              
              {/* Main Cropper Area */}
              <div className="relative w-full overflow-hidden rounded-3xl border-2 border-white/10 bg-black/60 flex items-center justify-center min-h-[400px] select-none shadow-inner p-16">
                <div className="relative inline-block">
                  {initialDataUrl && <img ref={imageRef} src={initialDataUrl} alt="Crop" className="relative z-10 max-w-full max-h-[50vh] block shadow-2xl" onLoad={onImageLoad} />}
                  
                  {cropRect && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {/* Dark Overlay Mask */}
                      <div className="absolute inset-0 bg-black/70" style={{
                        clipPath: `polygon(0% 0%, 0% 100%, ${cropRect.x}px 100%, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px 100%, 100% 100%, 100% 0%)`
                      }} />
                      
                      {/* Interactive Layer */}
                      <div 
                        className="absolute z-30 pointer-events-auto cursor-move group"
                        style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                        onPointerDown={(e) => handlePointerDown(e, "move")} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                      >
                        {/* Outline Border */}
                        <div className="absolute inset-0 border-[3px] border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.8)] transition-colors group-hover:border-purple-400">
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                            {[...Array(4)].map((_, i) => <div key={i} className="border-purple-300 border-[0.5px]" />)}
                          </div>
                        </div>

                        {/* Edge Drag Areas */}
                        <div className="absolute -top-5 left-4 right-4 h-10 cursor-n-resize" onPointerDown={(e) => handlePointerDown(e, "n")} />
                        <div className="absolute -bottom-5 left-4 right-4 h-10 cursor-s-resize" onPointerDown={(e) => handlePointerDown(e, "s")} />
                        <div className="absolute top-4 bottom-4 -left-5 w-10 cursor-w-resize" onPointerDown={(e) => handlePointerDown(e, "w")} />
                        <div className="absolute top-4 bottom-4 -right-5 w-10 cursor-e-resize" onPointerDown={(e) => handlePointerDown(e, "e")} />

                        {/* Large Solid Handles */}
                        {[
                          { pos: "nw", style: "top-0 left-0 -translate-x-1/2 -translate-y-1/2" },
                          { pos: "ne", style: "top-0 right-0 translate-x-1/2 -translate-y-1/2" },
                          { pos: "sw", style: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2" },
                          { pos: "se", style: "bottom-0 right-0 translate-x-1/2 translate-y-1/2" }
                        ].map(({ pos, style }) => (
                          <div key={pos} className={`absolute w-12 h-12 flex items-center justify-center cursor-${pos}-resize z-40 ${style}`} onPointerDown={(e) => handlePointerDown(e, pos)}>
                            <div className="w-6 h-6 bg-purple-600 border-2 border-white rounded-full shadow-2xl scale-110" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-[80] flex gap-3 pt-4">
                <button onClick={handleCopyImage} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black tracking-widest transition-all transform active:scale-95 border ${copied ? "bg-green-500/20 text-green-500 border-green-500/30" : `${inputBg} ${textPrimary} border-white/10 hover:bg-black/10`}`}>
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "コピー完了" : "画像をコピー"}
                </button>
                <button onClick={handleDownload} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black tracking-widest transition-all transform active:scale-95 ${inputBg} ${textPrimary} border border-white/10 hover:bg-black/10`}>
                  <Download size={16} /> 画像を保存
                </button>
              </div>
            </div>

            <div className="h-px w-full border-b border-white/10 opacity-50" />

            <div className="relative z-[80] space-y-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white shadow-lg"><Twitter size={18} /></div>
                  <p className={`text-base font-black ${textPrimary}`}>X投稿メッセージ</p>
                </div>
                <div className={`text-[11px] font-black font-mono px-4 py-1.5 rounded-full ${shareText.length > 280 ? "bg-red-500 text-white" : `${inputBg} ${textSecondary}`}`}>{shareText.length} / 280</div>
              </div>

              <div className="space-y-4">
                <textarea
                  ref={textareaRef} value={shareText} onChange={(e) => setShareText(e.target.value)}
                  className={`w-full rounded-[1.5rem] border border-white/10 ${inputBg} p-5 text-sm ${textPrimary} outline-none focus:ring-4 ${shareText.length > 280 ? "focus:ring-red-500/20 border-red-500/30" : "focus:ring-purple-500/10"} transition-all resize-none min-h-[120px] leading-relaxed`}
                />
                <ShareReplyToField toolId={toolId} isLightMode={isLightMode} compact />
                <button
                  onClick={handleOpenX} disabled={isXOpening || shareText.length > 280}
                  className={`group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[1.5rem] py-5 text-sm font-black text-white transition-all shadow-2xl ${shareText.length > 280 ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:scale-[1.01] active:scale-[0.99] active:brightness-90 shadow-black/30"}`}
                >
                  <Download size={22} /> <span>切り抜いてXへ投稿</span> <ExternalLink size={14} className="opacity-40" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
