"use client";

import { motion } from "framer-motion";
import { Monitor, Smartphone, ShieldCheck } from "lucide-react";

/* ───── Types & Constants ───── */

interface BenefitItem {
  id: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  colorClass: string;
  accentHex: string;
}

const BENEFITS: BenefitItem[] = [
  {
    id: "obs",
    title: "OBSブラウザソース完全透過",
    body: "専用URLを貼り付けるだけ。グリーンバック不要で、美しく滑らかなオーバーレイが配信画面に溶け込みます。",
    icon: Monitor,
    colorClass: "text-purple-400",
    accentHex: "#a855f7",
  },
  {
    id: "pwa",
    title: "スマホがコントローラーに",
    body: "PCでゲームや雑談をしながら、手元のスマホをPWAの「物理リモコン」化。直感的なサブ画面として完璧に連動操作できます。",
    icon: Smartphone,
    colorClass: "text-blue-400",
    accentHex: "#60a5fa",
  },
  {
    id: "secure",
    title: "100%ローカル＆セキュア",
    body: "面倒なログインやアカウント作成は不要。データ漏洩の心配なく、すべての設定はブラウザのLocalStorageに安全保管。",
    icon: ShieldCheck,
    colorClass: "text-emerald-400",
    accentHex: "#34d399",
  },
];

export default function BenefitCards({ isMobile = false }: { isMobile?: boolean }) {
  if (isMobile) {
    // Mobile layout: Stacked in 1 column, icon + content in flex-row for compactness
    return (
      <div className="w-full flex flex-col gap-3">
        {BENEFITS.map((benefit, idx) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={benefit.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="w-full p-4 rounded-2xl border border-white/10 bg-zinc-950/40 flex items-start gap-4"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: `${benefit.accentHex}15`,
                  color: benefit.accentHex,
                }}
              >
                <Icon size={20} />
              </span>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white font-[family-name:var(--font-syne)] mb-1">
                  {benefit.title}
                </h4>
                <p className="text-xs text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed font-medium">
                  {benefit.body}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // PC layout: 3 elegant side-by-side glass cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {BENEFITS.map((benefit, idx) => {
        const Icon = benefit.icon;
        return (
          <motion.div
            key={benefit.id}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="p-6 rounded-3xl border border-white/5 bg-zinc-950/30 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group"
          >
            {/* Top accent glow line */}
            <div
              className="absolute top-0 inset-x-6 h-[2px] transition-all duration-300 opacity-30 group-hover:opacity-100"
              style={{
                background: `linear-gradient(90deg, transparent, ${benefit.accentHex}, transparent)`,
              }}
            />

            <div>
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${benefit.accentHex}20, ${benefit.accentHex}02)`,
                  color: benefit.accentHex,
                  boxShadow: `0 0 20px ${benefit.accentHex}10`,
                }}
              >
                <Icon size={24} />
              </span>

              <h4 className="text-lg font-black text-white font-[family-name:var(--font-syne)] mb-3">
                {benefit.title}
              </h4>

              <p className="text-sm text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed font-medium">
                {benefit.body}
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Ready in 1 second</span>
              <span className="font-bold tracking-wider uppercase opacity-50 group-hover:opacity-100 group-hover:text-white transition-all">
                {benefit.id}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
