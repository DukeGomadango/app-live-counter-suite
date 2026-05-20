import type { CSSProperties, ReactNode } from "react";
import * as LucideIcons from "lucide-react";

type SlotSymbolRole = "bonus" | "small" | "replay" | "chance";

interface EmojiGlyphProps {
  emoji: string;
  className?: string;
  style?: CSSProperties;
  size?: number;
  title?: string;
  ariaLabel?: string;
  role?: SlotSymbolRole;
}

/**
 * 絵文字を意味対応した SVG アイコンに変換して描画する。
 * 共有テキストは従来どおり Unicode を維持する。
 */
export default function EmojiGlyph({
  emoji,
  className,
  style,
  size,
  title,
  ariaLabel,
  role,
}: EmojiGlyphProps) {
  const glyph = (emoji ?? "").trim();
  if (!glyph) return null;
  const px = size ?? 24;
  const iconNode = renderIconNode(glyph, px, role);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes goldPulse {
          0% {
            box-shadow: 0 0 ${px * 0.4}px rgba(245, 158, 11, 0.45), inset 0 0 ${px * 0.2}px rgba(255, 255, 255, 0.05);
          }
          50% {
            box-shadow: 0 0 ${px * 0.9}px rgba(245, 158, 11, 0.85), inset 0 0 ${px * 0.4}px rgba(255, 255, 255, 0.15);
          }
          100% {
            box-shadow: 0 0 ${px * 0.4}px rgba(245, 158, 11, 0.45), inset 0 0 ${px * 0.2}px rgba(255, 255, 255, 0.05);
          }
        }
        @keyframes metalShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-gold-pulse {
          animation: goldPulse 2s infinite ease-in-out;
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: metalShimmer 4s infinite linear;
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 12s infinite linear;
        }
      `}} />
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, ...style }}
        title={title}
        aria-label={ariaLabel}
        role={ariaLabel ? "img" : undefined}
        aria-hidden={ariaLabel ? undefined : true}
      >
        {iconNode}
      </span>
    </>
  );
}

function LucideByName({ name, size }: { name: string; size: number }) {
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>>)[name];
  if (!IconComp) return <Badge text="?" size={size} />;
  return <IconComp size={size} strokeWidth={2} aria-hidden />;
}

function Badge({ text, size }: { text: string; size: number }) {
  // viewBox は 100x100 なので、fontSize はプロパティの size ではなく 100 に対する相対値にする
  const fontSize = text.length >= 2 ? 44 : 54;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15" />
      <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fill="currentColor" fontWeight="700">
        {text}
      </text>
    </svg>
  );
}

function UnifiedGlassOrb({
  children,
  emoji,
  role,
  size,
}: {
  children: ReactNode;
  emoji: string;
  role?: SlotSymbolRole;
  size: number;
}) {
  let glowColor = "rgba(56, 189, 248, 0.15)";
  let glowIntensity = "0px 0px 12px";
  let borderGrad = "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))";

  if (role === "bonus" || emoji === "🏆" || emoji === "👑" || emoji === "🎰") {
    glowColor = "rgba(245, 158, 11, 0.35)";
    glowIntensity = "0px 0px 18px";
    borderGrad = "linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.1))";
  } else if (role === "replay" || emoji === "🔄" || emoji === "🍀" || emoji === "🌈" || emoji === "⚡") {
    glowColor = "rgba(168, 85, 247, 0.3)";
    borderGrad = "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(99, 102, 241, 0.1))";
  } else if (emoji === "🍒" || emoji === "🍉" || emoji === "🍇" || emoji === "🍓" || emoji === "🍑" || emoji === "🍎") {
    glowColor = "rgba(244, 63, 94, 0.25)";
    borderGrad = "linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.1))";
  } else if (emoji === "🔔" || emoji === "💡" || emoji === "🍊" || emoji === "🍋") {
    glowColor = "rgba(234, 179, 8, 0.25)";
    borderGrad = "linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(202, 138, 4, 0.1))";
  } else if (emoji === "❤️" || emoji === "💜" || emoji === "💙" || emoji === "💚" || emoji === "💛" || emoji === "🧡") {
    glowColor = "rgba(236, 72, 153, 0.25)";
    borderGrad = "linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(219, 39, 119, 0.1))";
  } else if (role === "small") {
    glowColor = "rgba(20, 184, 166, 0.25)";
    borderGrad = "linear-gradient(135deg, rgba(20, 184, 166, 0.25), rgba(13, 148, 136, 0.1))";
  }

  const orbSize = size * 1.8;
  const padding = size * 0.4;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${orbSize}px`,
        height: `${orbSize}px`,
        background: "linear-gradient(135deg, rgba(24, 24, 27, 0.65), rgba(9, 9, 11, 0.85))",
        borderRadius: "50%",
        border: "1px solid transparent",
        backgroundImage: "linear-gradient(135deg, rgba(24, 24, 27, 0.65), rgba(9, 9, 11, 0.85)), " + borderGrad,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        boxShadow: `${glowIntensity} ${glowColor}, inset 0 0 ${size * 0.15}px rgba(255, 255, 255, 0.05)`,
        backdropFilter: "blur(6px)",
        padding: `${padding}px`,
        position: "relative",
        overflow: "visible",
      }}
    >
      <div 
        style={{ 
          width: "100%", 
          height: "100%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          color: "currentColor",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function renderIconNode(emoji: string, size: number, role?: SlotSymbolRole): ReactNode {
  if (isTextSymbol(emoji)) {
    return <NeonGlassBadge text={emoji} role={role} size={size} />;
  }
  const rawNode = getRawIconNode(emoji, size, role);
  return (
    <UnifiedGlassOrb emoji={emoji} role={role} size={size}>
      {rawNode}
    </UnifiedGlassOrb>
  );
}

function getRawIconNode(emoji: string, size: number, role?: SlotSymbolRole): ReactNode {
  if (emoji === "❤️" || emoji === "💜" || emoji === "💙" || emoji === "💚" || emoji === "💛" || emoji === "🧡") {
    return <HeartVariantIcon kind={emoji} size={size} />;
  }
  if (emoji === "⭐" || emoji === "🌟" || emoji === "💫" || emoji === "✨") {
    return <StarVariantIcon kind={emoji} size={size} />;
  }
  if (emoji === "😀" || emoji === "😎" || emoji === "🤩" || emoji === "🥳") {
    return <FaceVariantIcon kind={emoji} size={size} />;
  }
  if (emoji === "🍇" || emoji === "🍓" || emoji === "🍑") {
    return <BerryVariantIcon kind={emoji} size={size} />;
  }
  if (emoji === "🌸" || emoji === "🌺") {
    return <BlossomVariantIcon kind={emoji} size={size} />;
  }
  if (emoji === "🎰" || emoji === "🎪" || emoji === "👽") {
    return <EffectVariantIcon kind={emoji} size={size} />;
  }
  const iconMap: Record<string, string> = {
    "📊": "BarChart3",
    "🗾": "Map",
    "➖": "Minus",
    "🎯": "Target",
    "🎨": "Palette",
    "🎵": "Music",
    "🎮": "Gamepad2",
    "💎": "Gem",
    "🔥": "Flame",
    "🌸": "Flower2",
    "🌺": "Flower2",
    "🍀": "Leaf",
    "🌈": "Sparkles",
    "⚡": "Zap",
    "🎪": "Sparkles",
    "🎭": "Drama",
    "🎬": "Clapperboard",
    "🐱": "Cat",
    "🐶": "Dog",
    "🐸": "Smile",
    "🍎": "Apple",
    "🍇": "Cherry",
    "🍓": "Cherry",
    "🍑": "Cherry",
    "🍒": "Cherry",
    "🍌": "Banana",
    "☀️": "Sun",
    "🌙": "Moon",
    "⛅": "CloudSun",
    "❄️": "Snowflake",
    "🌊": "Waves",
    "🍂": "Leaf",
    "🏆": "Trophy",
    "🔔": "Bell",
    "💡": "Lightbulb",
    "🚀": "Rocket",
    "✈️": "Plane",
    "🚗": "Car",
    "🏠": "Home",
    "📱": "Smartphone",
    "💻": "Laptop",
    "📚": "BookOpen",
    "✏️": "Pencil",
    "😀": "Smile",
    "😎": "Smile",
    "🤩": "Sparkles",
    "🥳": "PartyPopper",
    "😺": "Cat",
    "👻": "Ghost",
    "🤖": "Bot",
    "👽": "Sparkles",
    "🎲": "CircleDot",
    "🎉": "PartyPopper",
    "⚙️": "Settings",
    "📦": "Package",
    "🛡️": "Shield",
    "🎰": "Target",
    "🔄": "RotateCw",
    "♠️": "Spade",
    "♥️": "Heart",
    "♦️": "Diamond",
    "♣️": "Club",
    "🎂": "Cake",
    "🎁": "Gift",
    "👑": "Crown",
    "🔘": "CircleDot",
    "⚪": "Circle",
  };
  if (emoji === "⬜") return <SquareIcon size={size} strokeWidth={2} />;
  if (emoji === "✓") return <CheckGlyph size={size} strokeWidth={2} />;
  const mapped = iconMap[emoji];
  if (mapped) return <LucideByName name={mapped} size={size} />;
  const zodiacMap: Record<string, string> = {
    "♈": "aries",
    "♉": "taurus",
    "♊": "gemini",
    "♋": "cancer",
    "♌": "leo",
    "♍": "virgo",
    "♎": "libra",
    "♏": "scorpio",
    "♐": "sagittarius",
    "♑": "capricorn",
    "♒": "aquarius",
    "♓": "pisces",
  };
  if (zodiacMap[emoji]) return <ZodiacIcon kind={zodiacMap[emoji]} size={size} />;
  if (emoji === "🅰️" || emoji === "🅱️" || emoji === "🅾️" || emoji === "🆎") {
    return <BloodTypeIcon code={emoji === "🆎" ? "AB" : emoji === "🅾️" ? "O" : emoji === "🅰️" ? "A" : "B"} size={size} />;
  }
  if (emoji === "🍉" || emoji === "🍊" || emoji === "🍋") return <FruitIcon kind={emoji} size={size} />;
  if (emoji === "🐠" || emoji === "🐦" || emoji === "🦊" || emoji === "🐻" || emoji === "🐼" || emoji === "🐯" || emoji === "🦁") {
    return <AnimalIcon kind={emoji} size={size} />;
  }
  if (emoji === "🌻" || emoji === "🌹") return <FlowerIcon kind={emoji} size={size} />;
  if (emoji === "⚽" || emoji === "🏀" || emoji === "🎾" || emoji === "🎳") return <SportIcon kind={emoji} size={size} />;
  if (emoji === "🎈" || emoji === "🎀") return <PartyIcon kind={emoji} size={size} />;
  if (emoji === "♡" || emoji === "☆") return <Badge text={emoji === "♡" ? "H" : "S"} size={size} />;

  // アルファベット、日本語、数字などのテキスト図柄の場合はプレミアムグラスネオンバッジを描画
  if (isTextSymbol(emoji)) {
    return <NeonGlassBadge text={emoji} role={role} size={size} />;
  }

  return <LucideByName name="Sparkles" size={size} />;
}

function isTextSymbol(emoji: string): boolean {
  // 英数字、日本語文字（ひらがな・カタカナ・漢字）を含むか判定
  return /[\w\d\u3040-\u30ff\u4e00-\u9faf]/.test(emoji);
}

function NeonGlassBadge({ text, role, size }: { text: string; role?: SlotSymbolRole; size: number }) {
  let glowColor = "rgba(168, 85, 247, 0.45)"; // デフォルト：パープル
  let textColor = "#f3e8ff";
  let borderGrad = "linear-gradient(135deg, #a855f7, #6366f1)";
  let bgGrad = "linear-gradient(135deg, rgba(24, 24, 27, 0.85), rgba(9, 9, 11, 0.95))";

  if (role === "bonus") {
    // ゴールド / アンバー発光
    glowColor = "rgba(245, 158, 11, 0.65)";
    textColor = "#fef3c7";
    borderGrad = "linear-gradient(135deg, #fbbf24, #d97706)";
    bgGrad = "linear-gradient(135deg, rgba(41, 37, 36, 0.9), rgba(28, 25, 23, 0.95))";
  } else if (role === "replay") {
    // ネオンパープル / ブルー発光
    glowColor = "rgba(139, 92, 246, 0.65)";
    textColor = "#ede9fe";
    borderGrad = "linear-gradient(135deg, #c084fc, #6366f1)";
    bgGrad = "linear-gradient(135deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.95))";
  } else if (role === "small") {
    // シャープなティール / シアン発光
    glowColor = "rgba(20, 184, 166, 0.65)";
    textColor = "#ccfbf1";
    borderGrad = "linear-gradient(135deg, #2dd4bf, #0891b2)";
    bgGrad = "linear-gradient(135deg, rgba(13, 31, 37, 0.9), rgba(8, 28, 36, 0.95))";
  } else if (role === "chance") {
    // 鮮やかなピンク / レッド発光
    glowColor = "rgba(244, 63, 94, 0.65)";
    textColor = "#ffe4e6";
    borderGrad = "linear-gradient(135deg, #fda4af, #e11d48)";
    bgGrad = "linear-gradient(135deg, rgba(67, 20, 30, 0.9), rgba(30, 10, 15, 0.95))";
  }

  // サイズに比例したレスポンシブなCSSデザイン
  const badgeWidth = size * 2.8;
  const badgeHeight = size * 1.3;
  const borderRadius = size * 0.3;
  const fontSize = size * 0.45;
  const borderWidth = Math.max(1, size * 0.05);

  const isBonus = role === "bonus";

  return (
    <div
      className={isBonus ? "animate-gold-pulse animate-shimmer" : ""}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${badgeWidth}px`,
        height: `${badgeHeight}px`,
        background: isBonus 
          ? "linear-gradient(90deg, rgba(41, 37, 36, 0.9), rgba(60, 48, 36, 0.95), rgba(41, 37, 36, 0.9))" 
          : bgGrad,
        borderRadius: `${borderRadius}px`,
        border: `${borderWidth}px solid transparent`,
        backgroundImage: isBonus 
          ? "linear-gradient(90deg, rgba(41, 37, 36, 0.9), rgba(60, 48, 36, 0.95), rgba(41, 37, 36, 0.9)), " + borderGrad
          : `${bgGrad}, ${borderGrad}`,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        boxShadow: isBonus 
          ? undefined 
          : `0 0 ${size * 0.5}px ${glowColor}, inset 0 0 ${size * 0.25}px rgba(255, 255, 255, 0.1)`,
        color: textColor,
        fontWeight: 900,
        fontSize: `${fontSize}px`,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        textAlign: "center",
        textShadow: `0 0 ${size * 0.2}px ${textColor}`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        backdropFilter: "blur(8px)",
      }}
    >
      {text}
    </div>
  );
}

function HeartVariantIcon({ kind, size }: { kind: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M50 82C22 64 14 49 14 36c0-10 8-18 18-18 8 0 14 4 18 10 4-6 10-10 18-10 10 0 18 8 18 18 0 13-8 28-36 46z" fill="currentColor" opacity="0.18" />
      <path d="M50 78C25 62 18 48 18 36c0-8 6-14 14-14 8 0 13 5 18 12 5-7 10-12 18-12 8 0 14 6 14 14 0 12-7 26-32 42z" fill="none" stroke="currentColor" strokeWidth="5" />
      {kind === "💜" && <path d="M50 44l6 6-6 6-6-6z" fill="currentColor" />}
      {kind === "💙" && <path d="M39 52c3-3 7-3 10 0s7 3 10 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />}
      {kind === "💚" && <path d="M50 43c6 0 10 4 10 10-6 0-10-4-10-10zM50 43c-6 0-10 4-10 10 6 0 10-4 10-10z" fill="none" stroke="currentColor" strokeWidth="3" />}
      {kind === "💛" && <path d="M50 40l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="currentColor" opacity="0.8" />}
      {kind === "🧡" && <path d="M50 41l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor" opacity="0.85" />}
    </svg>
  );
}

function StarVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "✨") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M50 16l6 22 22 6-22 6-6 22-6-22-22-6 22-6z" fill="none" stroke="currentColor" strokeWidth="5" />
      </svg>
    );
  }
  if (kind === "💫") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M38 30l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="currentColor" opacity="0.7" />
        <path d="M64 44l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "🌟") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M50 20l7 16 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2z" fill="currentColor" opacity="0.2" />
        <path d="M50 24l6 14 15 2-11 10 3 14-13-8-13 8 3-14-11-10 15-2z" fill="none" stroke="currentColor" strokeWidth="4.5" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M50 24l6 14 15 2-11 10 3 14-13-8-13 8 3-14-11-10 15-2z" fill="none" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}

function FaceVariantIcon({ kind, size }: { kind: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.18" />
      {kind === "😎" && <rect x="34" y="42" width="32" height="8" rx="2" fill="currentColor" opacity="0.8" />}
      {kind === "🤩" && <path d="M38 46l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1zM62 46l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="currentColor" />}
      {kind !== "🤩" && <circle cx="40" cy="48" r="2.8" fill="currentColor" />}
      {kind !== "🤩" && <circle cx="60" cy="48" r="2.8" fill="currentColor" />}
      {kind === "🥳" ? <path d="M30 40l40-8-18 24z" fill="none" stroke="currentColor" strokeWidth="4" /> : null}
      <path d="M40 62c6 5 14 5 20 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function BerryVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🍇") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {[ [44,44],[56,44],[38,56],[50,56],[62,56],[44,68],[56,68] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="8" fill="currentColor" opacity={0.18 + (i%2)*0.07} />)}
        <path d="M48 30c7-7 12-7 18-2" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "🍓") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M50 28c14 0 24 12 21 24-2 11-9 22-21 24-12-2-19-13-21-24-3-12 7-24 21-24z" fill="currentColor" opacity="0.18" />
        {[ [44,48],[50,52],[56,48],[47,58],[53,60] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="1.8" fill="currentColor" />)}
        <path d="M40 30l10 6 10-6" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M34 54c0-12 8-22 20-22s20 10 20 22-8 22-20 22-20-10-20-22z" fill="currentColor" opacity="0.18" />
      <path d="M46 34c4-8 12-11 18-7" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M40 60c6 4 14 4 20 0" fill="none" stroke="currentColor" strokeWidth="3.5" />
    </svg>
  );
}

function BlossomVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🌸") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="50" cy="50" r="8" fill="currentColor" />
        {[0,72,144,216,288].map((d)=><ellipse key={d} cx="50" cy="30" rx="8" ry="14" transform={`rotate(${d} 50 50)`} fill="currentColor" opacity="0.24" />)}
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="7" fill="currentColor" />
      {[0,60,120,180,240,300].map((d)=><ellipse key={d} cx="50" cy="28" rx="6.5" ry="12" transform={`rotate(${d} 50 50)`} fill="currentColor" opacity="0.24" />)}
    </svg>
  );
}

function EffectVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🎰") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="26" y="24" width="48" height="52" rx="8" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M34 38h32M34 52h32M34 66h32" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "🎪") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M20 68h60L50 28z" fill="currentColor" opacity="0.2" />
        <path d="M20 68h60L50 28zM32 68V50m12 18V44m12 24V50" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="50" cy="52" rx="26" ry="16" fill="currentColor" opacity="0.18" />
      <circle cx="42" cy="50" r="3" fill="currentColor" />
      <circle cx="58" cy="50" r="3" fill="currentColor" />
      <path d="M36 64c8-5 20-5 28 0" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

function ZodiacIcon({ kind, size }: { kind: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.45" />
      {kind === "aries" && <path d="M28 66c0-18 10-32 22-32 6 0 10 4 10 10v22M72 66c0-18-10-32-22-32-6 0-10 4-10 10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "taurus" && <path d="M30 34c8 10 14 14 20 14s12-4 20-14M34 56c0-9 7-16 16-16s16 7 16 16-7 16-16 16-16-7-16-16z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "gemini" && <path d="M34 30h32M34 70h32M40 30v40M60 30v40" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "cancer" && <path d="M34 44c0-8 6-14 14-14s14 6 14 14-6 14-14 14M66 56c0 8-6 14-14 14s-14-6-14-14 6-14 14-14" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "leo" && <path d="M34 64c12 0 20-8 20-20 0-6-4-10-10-10-5 0-9 4-9 9 0 4 3 7 7 7 9 0 18 6 22 14M68 66c3 0 6-3 6-6s-3-6-6-6-6 3-6 6 3 6 6 6z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "virgo" && <path d="M30 68V38M44 68V44c0-4 3-7 7-7s7 3 7 7v24M58 68V44c0-4 3-7 7-7 4 0 7 3 7 7v12c0 8-6 14-14 14" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "libra" && <path d="M26 66h48M36 54c0-8 6-14 14-14s14 6 14 14M18 74h64" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "scorpio" && <path d="M28 68V42M42 68V48c0-4 3-7 7-7s7 3 7 7v20M56 68V48c0-4 3-7 7-7s7 3 7 7v10l8 8M76 66l-10 2 2-10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "sagittarius" && <path d="M30 70l40-40M48 30h22v22M30 44V30h14" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "capricorn" && <path d="M30 68V46c0-5 4-9 9-9s9 4 9 9v12c0 6 5 11 11 11 6 0 11-5 11-11s-5-11-11-11h-4" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
      {kind === "aquarius" && <path d="M24 44l14-8 12 8 12-8 14 8M24 64l14-8 12 8 12-8 14 8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
      {kind === "pisces" && <path d="M30 36c10 0 20 10 20 20s-10 20-20 20M70 36c-10 0-20 10-20 20s10 20 20 20M30 56h40" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />}
    </svg>
  );
}

function BloodTypeIcon({ code, size }: { code: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="12" y="16" width="76" height="68" rx="16" fill="currentColor" opacity="0.12" />
      <rect x="18" y="22" width="64" height="56" rx="12" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="24" cy="50" r="2.8" fill="currentColor" opacity="0.55" />
      <circle cx="76" cy="50" r="2.8" fill="currentColor" opacity="0.55" />
      <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fontSize={code.length > 1 ? 24 : 31} fill="currentColor" fontWeight="800">{code}</text>
    </svg>
  );
}

function FruitIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🍉") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M18 58c10 18 54 18 64 0" fill="none" stroke="currentColor" strokeWidth="6" />
        <path d="M22 58c8 12 48 12 56 0" fill="currentColor" opacity="0.2" />
        <circle cx="40" cy="58" r="1.8" fill="currentColor" />
        <circle cx="50" cy="62" r="1.8" fill="currentColor" />
        <circle cx="60" cy="58" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "🍊") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="50" cy="56" r="24" fill="currentColor" opacity="0.2" />
        <circle cx="50" cy="56" r="19" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M50 37v38M31 56h38M37 43l26 26M63 43L37 69" stroke="currentColor" strokeWidth="3" opacity="0.35" />
        <path d="M46 26c6-6 12-6 17-1" fill="none" stroke="currentColor" strokeWidth="5" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="50" cy="58" rx="24" ry="15" fill="currentColor" opacity="0.2" />
      <ellipse cx="50" cy="58" rx="20" ry="12" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M47 26c6-6 12-6 17-1" fill="none" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}

function AnimalIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🐠") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="55" cy="56" rx="22" ry="14" fill="currentColor" opacity="0.2" />
        <path d="M24 56l12-10v20z" fill="currentColor" opacity="0.5" />
        <circle cx="62" cy="54" r="2" fill="currentColor" />
        <path d="M46 56h10" stroke="currentColor" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "🐦") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="48" cy="56" r="20" fill="currentColor" opacity="0.2" />
        <path d="M64 54l12 5-12 5z" fill="currentColor" />
        <circle cx="54" cy="52" r="2.2" fill="currentColor" />
        <path d="M36 60c6 5 14 5 20 0" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "🦊") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M30 36l10-16 10 14M70 36L60 20 50 34" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M28 56l22-22 22 22-22 22z" fill="currentColor" opacity="0.16" />
        <circle cx="42" cy="53" r="2.4" fill="currentColor" />
        <circle cx="58" cy="53" r="2.4" fill="currentColor" />
      </svg>
    );
  }
  const earPath = kind === "🦁"
    ? "M30 34l8-14 8 12M70 34l-8-14-8 12"
    : "M32 35l6-12 8 10M68 35l-6-12-8 10";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d={earPath} fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="50" cy="56" r={kind === "🦁" ? "30" : "28"} fill="currentColor" opacity={kind === "🐼" ? 0.1 : 0.16} />
      {kind === "🐼" && <circle cx="40" cy="53" r="6" fill="currentColor" opacity="0.3" />}
      {kind === "🐼" && <circle cx="60" cy="53" r="6" fill="currentColor" opacity="0.3" />}
      {kind === "🐯" && <path d="M34 46h6M60 46h6M36 62h28" stroke="currentColor" strokeWidth="3.5" opacity="0.45" />}
      {kind === "🐻" && <circle cx="50" cy="61" r="6" fill="currentColor" opacity="0.2" />}
      {kind === "🦁" && <circle cx="50" cy="56" r="20" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.45" />}
      <circle cx="41" cy="53" r="2.3" fill="currentColor" />
      <circle cx="59" cy="53" r="2.3" fill="currentColor" />
      <path d="M45 64c3 3 7 3 10 0" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

function FlowerIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🌻") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.7" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
          <ellipse key={d} cx="50" cy="30" rx="6" ry="12" transform={`rotate(${d} 50 50)`} fill="currentColor" opacity="0.24" />
        ))}
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="10" fill="currentColor" />
      {[0, 72, 144, 216, 288].map((d) => (
        <ellipse key={d} cx="50" cy="28" rx="8" ry="14" transform={`rotate(${d} 50 50)`} fill="currentColor" opacity="0.25" />
      ))}
      {kind === "🌹" && <path d="M48 68v16M48 82h8" stroke="currentColor" strokeWidth="4" fill="none" />}
    </svg>
  );
}

function SportIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🎳") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="38" cy="56" r="12" fill="currentColor" opacity="0.22" />
        <circle cx="34" cy="52" r="1.8" fill="currentColor" />
        <circle cx="40" cy="49" r="1.8" fill="currentColor" />
        <circle cx="42" cy="56" r="1.8" fill="currentColor" />
        <rect x="58" y="34" width="10" height="34" rx="4" fill="currentColor" opacity="0.28" />
        <circle cx="63" cy="28" r="6" fill="currentColor" opacity="0.28" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
      {kind === "⚽" && <path d="M30 44l20-12 20 12-8 22H38z" fill="currentColor" opacity="0.2" />}
      {kind === "🏀" && <path d="M20 50h60M50 20v60M32 28c10 8 10 36 0 44M68 28c-10 8-10 36 0 44" stroke="currentColor" strokeWidth="4" fill="none" />}
      {kind === "🎾" && <path d="M28 34c12-12 32-12 44 0M28 66c12 12 32 12 44 0" stroke="currentColor" strokeWidth="4" fill="none" />}
    </svg>
  );
}

function PartyIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🎀") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M22 50c10-14 24-14 34 0-10 14-24 14-34 0z" fill="currentColor" opacity="0.22" />
        <path d="M78 50c-10-14-24-14-34 0 10 14 24 14 34 0z" fill="currentColor" opacity="0.22" />
        <circle cx="50" cy="50" r="7" fill="currentColor" />
        <path d="M47 58l-7 16M53 58l7 16" stroke="currentColor" strokeWidth="4" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="50" cy="42" rx="20" ry="25" fill="currentColor" opacity="0.22" />
      <path d="M50 67v18" stroke="currentColor" strokeWidth="4" />
      <path d="M50 74l-4 5h8z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function SquareIcon(props: { size?: number; strokeWidth?: number; "aria-hidden"?: boolean }) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
    </svg>
  );
}

function CheckGlyph(props: { size?: number; strokeWidth?: number; "aria-hidden"?: boolean }) {
  const s = props.size ?? 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} aria-hidden>
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}
