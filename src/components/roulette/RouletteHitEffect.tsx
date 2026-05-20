"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// パーティクル（紙吹雪・コイン）の物理シミュレーション用型定義
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: "paper" | "coin";
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  bounceCount: number;
}

interface RouletteHitEffectProps {
  show: boolean;
  onComplete?: () => void;
  accentColor: string;
  /** 当たった予想者の名前一覧（ルーレット用） */
  hitNames?: string[];
  /** 演出レベル（互換用）: high=派手（Jackpot相当） / low=通常 */
  effectLevel?: "high" | "low";
  /** 表示するテキスト（デフォルト: "当たり!"） */
  text?: string;
  /** 払い出し枚数（スロットカウントアップ用） */
  payout?: number;
  /** ボーナス役当選フラグ */
  isBonus?: boolean;
  /** リプレイ役当選フラグ */
  isReplay?: boolean;
}

export default function RouletteHitEffect({
  show,
  onComplete,
  accentColor,
  hitNames = [],
  effectLevel,
  text = "当たり!",
  payout = 0,
  isBonus = false,
  isReplay = false,
}: RouletteHitEffectProps) {
  // 1. 払い出し枚数、当選タイプ、または既存の effectLevel から報酬ティアを決定
  let tier: "regular" | "big" | "jackpot" = "regular";

  if (isBonus || payout >= 50 || effectLevel === "high") {
    tier = "jackpot";
  } else if (payout >= 10 || hitNames.length >= 3) {
    tier = "big";
  } else if (isReplay) {
    tier = "regular";
  } else if (effectLevel === "low") {
    tier = "regular";
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const [displayedPayout, setDisplayedPayout] = useState<number>(() => 
    tier === "regular" || payout <= 0 ? payout : 0
  );

  // 2. カウントアップアニメーション
  useEffect(() => {
    if (!show || payout <= 0 || tier === "regular") {
      return;
    }

    const duration = tier === "jackpot" ? 2000 : 1000; // ms
    const startTime = performance.now();

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // イージング（easeOutQuad）をかけて、最後はゆっくりカウントアップさせる
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * payout);
      setDisplayedPayout(current);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animateCount);
      }
    };

    requestRef.current = requestAnimationFrame(animateCount);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [show, payout, tier]);

  // 3. 画面シェイクのトリガー（Big Win / Jackpot で発生）
  useEffect(() => {
    if (show && (tier === "big" || tier === "jackpot")) {
      document.body.classList.add("screen-shake-active");
      const t = setTimeout(() => {
        document.body.classList.remove("screen-shake-active");
      }, 500); // 0.5秒でシェイク停止
      return () => {
        clearTimeout(t);
        document.body.classList.remove("screen-shake-active");
      };
    }
  }, [show, tier]);

  // 4. Canvas物理エンジン（紙吹雪 ＆ コイン噴出ループ）
  useEffect(() => {
    if (!show || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 高解像度対応 (Retina対応)
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const particles: Particle[] = [];
    const maxParticles = tier === "jackpot" ? 200 : tier === "big" ? 100 : 35;
    const colors = ["#ff5e62", "#ff9966", "#ffcc33", "#33ccff", "#33ffaa", "#cc33ff", "#ff33cc"];

    // パーティクルの新規生成ヘルパー
    const createParticle = (isInitial = false): Particle => {
      const type = (tier === "jackpot" && Math.random() > 0.4) || (tier === "big" && Math.random() > 0.65) ? "coin" : "paper";
      
      // ジャックポットやビッグウィンでは画面下部中央付近からコインや紙吹雪が噴水のように吹き上がる
      const fromBottom = !isInitial && (tier === "jackpot" || tier === "big");

      return {
        x: fromBottom ? width / 2 + (Math.random() * 80 - 40) : Math.random() * width,
        y: fromBottom ? height + 20 : isInitial ? Math.random() * height - height : -20,
        vx: fromBottom ? Math.random() * 12 - 6 : Math.random() * 4 - 2,
        vy: fromBottom ? -(Math.random() * 14 + 10) : Math.random() * 3 + 2, // 吹き上がり or 落下
        size: type === "coin" ? Math.random() * 8 + 12 : Math.random() * 6 + 8,
        color: type === "coin" ? "#ffd700" : colors[Math.floor(Math.random() * colors.length)]!,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.2 - 0.1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.05 + 0.02,
        opacity: 1,
        bounceCount: 0,
      };
    };

    // 初期パーティクルの充填
    for (let i = 0; i < maxParticles / 2; i++) {
      particles.push(createParticle(true));
    }

    let animationFrameId: number;
    const gravity = 0.4;
    const wind = 0.02;

    const updateAndRender = () => {
      ctx.clearRect(0, 0, width, height);

      // パーティクルの持続的生成
      if (particles.length < maxParticles && Math.random() > 0.2) {
        particles.push(createParticle(false));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;

        // 物理計算の更新
        p.vy += gravity;
        p.vx += Math.sin(p.wobble) * wind;
        p.wobble += p.wobbleSpeed;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // コイン用のバウンド判定（画面最下部で跳ね返る）
        if (p.type === "coin" && p.y > height - 10 && p.bounceCount < 2) {
          p.vy = -p.vy * 0.4; // 速度を減衰させて跳ね返り
          p.vx *= 0.6;
          p.y = height - 10;
          p.bounceCount++;
        }

        // 画面外に完全に外れたパーティクルの破棄
        if (p.y > height + 50 || p.x < -50 || p.x > width + 50) {
          particles.splice(i, 1);
          continue;
        }

        // 描画
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.type === "coin") {
          // コインの描画（金色の3D回転円盤）
          const cosScale = Math.abs(Math.cos(p.rotation * 1.5));
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * cosScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#ffd700";
          ctx.fill();
          
          // コインの縁取り
          ctx.strokeStyle = "#b8860b";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // コインの内同心円
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.6, p.size * 0.6 * cosScale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "#daa520";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // 紙吹雪の描画
          const cosScaleY = Math.cos(p.rotation * 2);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, (-p.size * 0.5 * cosScaleY) / 2, p.size, p.size * 0.5 * cosScaleY);
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(updateAndRender);
    };

    updateAndRender();

    // 演出終了タイマーの設定
    const totalDuration = tier === "jackpot" ? 5000 : tier === "big" ? 3500 : 2500;
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, totalDuration);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(completeTimer);
    };
  }, [show, tier, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
        {/* A. 視覚的焦点：背景の暗転 & ぼかし (Tier 2 & 3 のみ) */}
        {tier !== "regular" && (
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* B. シアトリカル効果：後方の回転ゴールドサンバースト放射光 (Tier 3 のみ) */}
        {tier === "jackpot" && (
          <motion.div
            className="absolute w-[180vmax] h-[180vmax] opacity-25"
            style={{
              background: `repeating-conic-gradient(from 0deg, #ffd700 0deg 15deg, transparent 15deg 30deg)`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, ease: "linear", repeat: Infinity }}
            initial={{ scale: 0.2, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.25 }}
            exit={{ scale: 1.5, opacity: 0 }}
          />
        )}

        {/* C. 物理エンジン用 Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* D. テキストと数字の劇的ポップアップエリア */}
        <motion.div
          className="absolute flex flex-col items-center justify-center gap-3 px-4 py-8 text-center"
          initial={{ scale: 0.3, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.3, opacity: 0, y: -50 }}
          transition={{
            type: "spring",
            damping: tier === "jackpot" ? 8 : 12,
            stiffness: tier === "jackpot" ? 150 : 200,
          }}
        >
          {/* 当たりテキスト */}
          <span
            className={`font-extrabold tracking-widest break-keep text-center leading-none ${
              tier === "jackpot"
                ? "text-5xl sm:text-7xl md:text-8xl drop-shadow-[0_0_35px_rgba(255,215,0,0.8)]"
                : tier === "big"
                ? "text-4xl sm:text-6xl md:text-7xl drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                : "text-3xl sm:text-5xl md:text-6xl"
            }`}
            style={{
              color: tier === "jackpot" ? "#ffd700" : accentColor,
              textShadow:
                tier === "jackpot"
                  ? "0 0 10px #ffffff, 0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 80px #ff8c00"
                  : tier === "big"
                  ? `0 0 10px #ffffff, 0 0 20px ${accentColor}, 0 0 40px ${accentColor}`
                  : `0 0 15px ${accentColor}`,
            }}
          >
            {text}
          </span>

          {/* E. 払い出し枚数の躍動的カウントアップ表示 (Tier 2 & 3 のみ) */}
          {tier !== "regular" && payout > 0 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
              className="flex items-baseline gap-1 bg-black/40 px-6 py-2 rounded-full border border-white/20 backdrop-blur-md shadow-2xl"
            >
              <span className="text-gray-300 font-bold text-sm sm:text-base uppercase tracking-wider">GET</span>
              <span className="text-yellow-400 font-black text-3xl sm:text-5xl tracking-normal tabular-nums drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
                {displayedPayout}
              </span>
              <span className="text-yellow-400 font-bold text-sm sm:text-base">枚</span>
            </motion.div>
          )}

          {/* 当たった人の名前表示（ルーレット用） */}
          {hitNames.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-bold text-white text-sm sm:text-base md:text-lg max-w-[280px] sm:max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed mt-2"
            >
              当選者: {hitNames.join("、")}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* F. 画面全体を揺らす物理的な振動（画面シェイク用CSSキーフレーム） */}
      <style dangerouslySetInnerHTML={{ __html: `
        body.screen-shake-active {
          animation: screen-rumble-shake 0.4s ease-in-out;
        }
        @keyframes screen-rumble-shake {
          0% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-2px, -1px) rotate(-0.5deg); }
          20% { transform: translate(-3px, 0px) rotate(0.5deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(2px, 1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-0.5deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-0.5deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}} />
    </AnimatePresence>
  );
}
