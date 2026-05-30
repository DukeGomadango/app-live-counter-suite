"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Users, Network, Sparkles, ArrowRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/* ───── Types & Constants ───── */

interface BentoCardProps {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  path: string;
  accentColor: string; // Tailwind color name like "purple-500", "blue-500", "yellow-500"
  glowColor: string; // Hex or rgba for neon glow shadow
  spanClass: string; // PC grid column/row span class
  isMobile: boolean;
}

function BentoCard({
  title,
  subtitle,
  description,
  icon: Icon,
  path,
  accentColor,
  glowColor,
  spanClass,
  isMobile,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { isLightMode } = useTheme();

  // Framer Motion values for PC 3D Tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { damping: 25, stiffness: 200 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { damping: 25, stiffness: 200 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const glowStyle = isHovered && !isMobile
    ? {
        boxShadow: isLightMode 
          ? `0 0 35px 2px ${glowColor}50, inset 0 1px 0 rgba(255,255,255,0.7)`
          : `0 0 35px 2px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.15)`,
        borderColor: glowColor,
      }
    : {};

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={isMobile ? {} : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileTap={isMobile ? { scale: 0.98 } : { scale: 0.99 }}
      className={`relative rounded-3xl overflow-hidden transition-all duration-300 border backdrop-blur-xl group flex flex-col justify-between ${spanClass} ${
        isLightMode
          ? isMobile
            ? "border-black/5 bg-white/45"
            : "border-black/5 bg-white/35 hover:border-black/10"
          : isMobile
            ? "border-white/10 bg-zinc-950/40"
            : "border-white/5 bg-zinc-950/30 hover:border-white/20"
      }`}
    >
      {/* Background glass shine / mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Active Glowing Border on PC */}
      {!isMobile && (
        <div
          className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: `radial-gradient(800px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${glowColor}15, transparent 40%)`,
          }}
        />
      )}

      {/* Border glow styling wrapper */}
      <div
        className="absolute inset-0 transition-all duration-300 pointer-events-none border border-transparent rounded-3xl"
        style={glowStyle}
      />

      <Link
        href={path}
        className="flex-1 p-6 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-3xl"
      >
        {/* Card Header */}
        <div style={isMobile ? {} : { transform: "translateZ(30px)" }}>
          <div className="flex items-center justify-between mb-4">
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
              style={{
                background: `linear-gradient(135deg, ${glowColor}25, ${glowColor}05)`,
                boxShadow: isHovered ? `0 0 20px ${glowColor}30` : "none",
              }}
            >
              <Icon className={`text-${accentColor}`} size={24} />
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest text-${accentColor} opacity-70`}>
              {subtitle}
            </span>
          </div>

          <h3 className={`text-xl sm:text-2xl font-black tracking-tight mb-2 font-[family-name:var(--font-plus-jakarta)] ${isLightMode ? "text-slate-900" : "text-white"}`}>
            {title}
          </h3>

          <p className={`text-sm font-[family-name:var(--font-outfit)] leading-relaxed font-medium ${isLightMode ? "text-slate-600" : "text-zinc-400"}`}>
            {description}
          </p>
        </div>

        {/* Card Footer / CTA */}
        <div
          className="mt-6 flex items-center justify-between"
          style={isMobile ? {} : { transform: "translateZ(20px)" }}
        >
          <span className={`text-xs font-bold text-zinc-500 transition-colors duration-300 flex items-center gap-1 ${isLightMode ? "group-hover:text-slate-900" : "group-hover:text-white"}`}>
            Explore Tool <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
          </span>
          <span
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
              isLightMode
                ? "border-black/10 group-hover:bg-slate-900 group-hover:text-white"
                : "border-white/10 group-hover:bg-white group-hover:text-black"
            }`}
          >
            <ArrowRight size={14} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function BentoGrid({ isMobile = false }: { isMobile?: boolean }) {
  const counterCard = {
    id: "counter",
    title: "人数カウンター",
    subtitle: "Multi-Counter",
    description: "加算・減算、目標値との連動、そしてOBS透過用URL発行。耐久配信や企画集計をスマートに完遂する最重要ツール。",
    icon: Users,
    path: "/counter",
    accentColor: "purple-400",
    glowColor: "rgba(168, 85, 247, 0.4)",
    spanClass: "md:col-span-2 md:row-span-2 min-h-[300px] md:min-h-[420px]",
  };

  const chartCard = {
    id: "chart",
    title: "チャート機能",
    subtitle: "Node Calculations",
    description: "ノードを繋いで確率計算や分岐数値をリアルタイム視覚化。複雑な集計ロジックを直感的画面で解決。",
    icon: Network,
    path: "/flowchart",
    accentColor: "blue-400",
    glowColor: "rgba(96, 165, 250, 0.4)",
    spanClass: "md:col-span-1 md:row-span-1 min-h-[200px]",
  };

  const gachaCard = {
    id: "gacha",
    title: "ガチャシミュレーター",
    subtitle: "3D Flip Gacha",
    description: "配信画面を劇的に盛り上げる3Dカードフリップ演出。確率とレアリティを自由にカスタム可能。",
    icon: Sparkles,
    path: "/gacha",
    accentColor: "yellow-400",
    glowColor: "rgba(250, 204, 21, 0.4)",
    spanClass: "md:col-span-1 md:row-span-1 min-h-[200px]",
  };

  if (isMobile) {
    return (
      <div className="w-full flex flex-col gap-4">
        {/* Counter (Full width) */}
        <BentoCard {...counterCard} isMobile={true} spanClass="w-full min-h-[280px]" />

        {/* Chart & Gacha side-by-side (2 columns compact) */}
        <div className="grid grid-cols-2 gap-4">
          <BentoCard
            {...chartCard}
            isMobile={true}
            spanClass="w-full min-h-[160px]"
            description="ノードで確率計算・集計。"
          />
          <BentoCard
            {...gachaCard}
            isMobile={true}
            spanClass="w-full min-h-[160px]"
            description="3D演出ガチャシム。"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[210px] w-full">
      <BentoCard {...counterCard} isMobile={false} />
      <BentoCard {...chartCard} isMobile={false} />
      <BentoCard {...gachaCard} isMobile={false} />
    </div>
  );
}
