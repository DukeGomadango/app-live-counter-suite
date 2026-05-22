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
  if (emoji === "7") {
    return <LuckySevenIcon size={size} />;
  }
  if (emoji === "🍒") {
    return <CherryIcon size={size} />;
  }
  if (emoji === "🔔") {
    return <BellIcon size={size} />;
  }
  if (emoji === "🔄") {
    return <ReplayIcon size={size} />;
  }
  if (emoji === "⬜") {
    return <BlankIcon size={size} />;
  }
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

  // フォールバック：未知の絵文字キャラクタをそのままグラスオーブ内に描画。
  // 単一の英数字（"4","5","6"等）の場合は、カジノ風の金属グラデーションと立体感のある枠線・陰影を施す。
  const isNumberOrLetter = /^[a-zA-Z0-9]$/.test(emoji);
  let fillSpec = "currentColor";
  let strokeSpec = "none";
  let strokeWidthSpec = "0";
  let extraDefs = null;
  const gradientId = `num-grad-${emoji.charCodeAt(0)}`;

  if (isNumberOrLetter) {
    let gradColors = ["#ffffff", "#cbd5e1", "#64748b"]; // デフォルト：シルバー
    if (role === "bonus") {
      gradColors = ["#fef08a", "#fbbf24", "#b45309"];
    } else if (role === "replay") {
      gradColors = ["#c084fc", "#a855f7", "#581c87"];
    } else if (role === "small") {
      gradColors = ["#2dd4bf", "#0d9488", "#115e59"];
    } else if (role === "chance") {
      gradColors = ["#fda4af", "#e11d48", "#9f1239"];
    }

    fillSpec = `url(#${gradientId})`;
    strokeSpec = role === "bonus" ? "#78350f" : "#0f172a";
    strokeWidthSpec = "4";
    
    extraDefs = (
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={gradColors[0]} />
        <stop offset="50%" stopColor={gradColors[1]} />
        <stop offset="100%" stopColor={gradColors[2]} />
      </linearGradient>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {extraDefs && <defs>{extraDefs}</defs>}
      {/* 立体的な影 (3Dドロップシャドウ) */}
      {isNumberOrLetter && (
        <text
          x="50"
          y="58"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="56"
          fontWeight="900"
          fill="#000000"
          opacity="0.65"
          style={{
            fontFamily: "'Outfit', 'Montserrat', 'Inter', sans-serif",
          }}
        >
          {emoji}
        </text>
      )}
      {/* 太い縁取り境界線 */}
      {isNumberOrLetter && (
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="56"
          fontWeight="900"
          fill="none"
          stroke={strokeSpec}
          strokeWidth={strokeWidthSpec}
          strokeLinejoin="round"
          style={{
            fontFamily: "'Outfit', 'Montserrat', 'Inter', sans-serif",
          }}
        >
          {emoji}
        </text>
      )}
      {/* メイングラデーションテキスト */}
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={isNumberOrLetter ? "56" : "54"}
        fontWeight={isNumberOrLetter ? "900" : "bold"}
        fill={fillSpec}
        style={{
          fontFamily: isNumberOrLetter
            ? "'Outfit', 'Montserrat', 'Inter', sans-serif"
            : '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", sans-serif',
        }}
      >
        {emoji}
      </text>
    </svg>
  );
}

function isTextSymbol(emoji: string): boolean {
  // 1文字以下の場合は、絵文字・数字・アルファベットに関わらず、
  // すべて円形の UnifiedGlassOrb (グラスオーブ) 内に描画する方がスロット図柄として適しています。
  if (Array.from(emoji).length <= 1) {
    return false;
  }
  // キーキャップ絵文字（例：「7️⃣」など、1文字の数字＋異体字＋結合Enclosing Keycapで構成されるもの）
  // は実質的に1つの絵文字として機能するため、テキストバッジ（BAR等）ではなく円形オーブで描画します。
  if (emoji.includes("\u20E3")) {
    return false;
  }
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

  // 文字数に応じたフォントサイズとパディングの動的縮小
  const len = text.length;
  const fontScale = len <= 3 ? 0.45 : len <= 5 ? 0.36 : len <= 8 ? 0.28 : 0.22;
  
  const badgeWidth = size * 2.8;
  const badgeHeight = size * 1.3;
  const borderRadius = size * 0.3;
  const fontSize = size * fontScale;
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
        padding: "0 4px",
        boxSizing: "border-box",
      }}
    >
      {text}
    </div>
  );
}

function HeartVariantIcon({ kind, size }: { kind: string; size: number }) {
  // Define fill colors based on kind
  let fillUrl = "url(#heart-red)";
  let strokeUrl = "url(#heart-red-stroke)";
  
  if (kind === "💜") { fillUrl = "url(#heart-purple)"; strokeUrl = "url(#heart-purple-stroke)"; }
  else if (kind === "💙") { fillUrl = "url(#heart-blue)"; strokeUrl = "url(#heart-blue-stroke)"; }
  else if (kind === "💚") { fillUrl = "url(#heart-green)"; strokeUrl = "url(#heart-green-stroke)"; }
  else if (kind === "💛") { fillUrl = "url(#heart-yellow)"; strokeUrl = "url(#heart-yellow-stroke)"; }
  else if (kind === "🧡") { fillUrl = "url(#heart-orange)"; strokeUrl = "url(#heart-orange-stroke)"; }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="heart-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id="heart-red-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="heart-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>
        <linearGradient id="heart-purple-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="heart-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="heart-blue-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="heart-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="heart-green-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="heart-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="heart-yellow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="heart-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="heart-orange-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffedd5" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <path d="M50 82C22 64 14 49 14 36c0-10 8-18 18-18 8 0 14 4 18 10 4-6 10-10 18-10 10 0 18 8 18 18 0 13-8 28-36 46z" fill={fillUrl} opacity="0.3" />
      <path d="M50 78C25 62 18 48 18 36c0-8 6-14 14-14 8 0 13 5 18 12 5-7 10-12 18-12 8 0 14 6 14 14 0 12-7 26-32 42z" fill="none" stroke={strokeUrl} strokeWidth="5" />
      {kind === "💜" && <path d="M50 44l6 6-6 6-6-6z" fill="#f5f3ff" />}
      {kind === "💙" && <path d="M39 52c3-3 7-3 10 0s7 3 10 0" fill="none" stroke="#f0f9ff" strokeWidth="4" strokeLinecap="round" />}
      {kind === "💚" && <path d="M50 43c6 0 10 4 10 10-6 0-10-4-10-10zM50 43c-6 0-10 4-10 10 6 0 10-4 10-10z" fill="none" stroke="#f0fdf4" strokeWidth="3" />}
      {kind === "💛" && <path d="M50 40l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fffbeb" opacity="0.9" />}
      {kind === "🧡" && <path d="M50 41l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff7ed" opacity="0.95" />}
    </svg>
  );
}

function StarVariantIcon({ kind, size }: { kind: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="star-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="star-gold-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {kind === "✨" && (
        <path d="M50 16l6 22 22 6-22 6-6 22-6-22-22-6 22-6z" fill="url(#star-gold)" stroke="url(#star-gold-stroke)" strokeWidth="4" />
      )}
      {kind === "💫" && (
        <>
          <path d="M38 30l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="url(#star-gold)" opacity="0.75" />
          <path d="M64 44l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="url(#star-gold)" stroke="url(#star-gold-stroke)" strokeWidth="3.5" />
        </>
      )}
      {kind === "🌟" && (
        <>
          <path d="M50 20l7 16 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2z" fill="url(#star-gold)" opacity="0.4" />
          <path d="M50 24l6 14 15 2-11 10 3 14-13-8-13 8 3-14-11-10 15-2z" fill="none" stroke="url(#star-gold-stroke)" strokeWidth="4.5" />
        </>
      )}
      {kind !== "✨" && kind !== "💫" && kind !== "🌟" && (
        <path d="M50 24l6 14 15 2-11 10 3 14-13-8-13 8 3-14-11-10 15-2z" fill="url(#star-gold)" stroke="url(#star-gold-stroke)" strokeWidth="4" />
      )}
    </svg>
  );
}

function FaceVariantIcon({ kind, size }: { kind: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="face-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="glass-lens" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="30" fill="url(#face-yellow)" stroke="#ca8a04" strokeWidth="2.5" />
      {kind === "😎" && <rect x="34" y="42" width="32" height="8" rx="2" fill="url(#glass-lens)" stroke="#ffffff" strokeWidth="1" />}
      {kind === "🤩" && <path d="M38 46l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1zM62 46l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="#dc2626" />}
      {kind !== "🤩" && <circle cx="40" cy="48" r="3" fill="#1e293b" />}
      {kind !== "🤩" && <circle cx="60" cy="48" r="3" fill="#1e293b" />}
      {kind === "🥳" ? <path d="M30 40l40-8-18 24z" fill="none" stroke="#f43f5e" strokeWidth="4" /> : null}
      <path d="M40 62c6 5 14 5 20 0" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function BerryVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🍇") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="grape-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>
          <linearGradient id="stem-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
        </defs>
        {[ [44,44],[56,44],[38,56],[50,56],[62,56],[44,68],[56,68] ].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="8.5" fill="url(#grape-purple)" stroke="#3b0764" strokeWidth="1" />
        ))}
        <path d="M48 30c7-7 12-7 18-2" fill="none" stroke="url(#stem-green)" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "🍓") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="strawberry-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>
          <linearGradient id="leaf-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <path d="M50 28c14 0 24 12 21 24-2 11-9 22-21 24-12-2-19-13-21-24-3-12 7-24 21-24z" fill="url(#strawberry-red)" stroke="#4c0519" strokeWidth="2" />
        {[ [44,48],[50,52],[56,48],[47,58],[53,60] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2" fill="#fef08a" />)}
        <path d="M40 30l10 6 10-6" fill="none" stroke="url(#leaf-green)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="peach-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="40%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <path d="M34 54c0-12 8-22 20-22s20 10 20 22-8 22-20 22-20-10-20-22z" fill="url(#peach-orange)" stroke="#be123c" strokeWidth="2" />
      <path d="M46 34c4-8 12-11 18-7" fill="none" stroke="#059669" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M40 60c6 4 14 4 20 0" fill="none" stroke="#be123c" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function BlossomVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🌸") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="cherry-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {[0,72,144,216,288].map((d)=><ellipse key={d} cx="50" cy="30" rx="8.5" ry="15" transform={`rotate(${d} 50 50)`} fill="url(#cherry-pink)" stroke="#be185d" strokeWidth="1" />)}
        <circle cx="50" cy="50" r="9.5" fill="#fdf2f8" stroke="#be185d" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="hibiscus-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {[0,60,120,180,240,300].map((d)=><ellipse key={d} cx="50" cy="28" rx="7" ry="13.5" transform={`rotate(${d} 50 50)`} fill="url(#hibiscus-red)" stroke="#991b1b" strokeWidth="1" />)}
      <circle cx="50" cy="50" r="8" fill="#fef2f2" stroke="#991b1b" strokeWidth="1.5" />
    </svg>
  );
}

function EffectVariantIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🎰") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="slot-steel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        <rect x="26" y="24" width="48" height="52" rx="8" fill="url(#slot-steel)" stroke="#1e293b" strokeWidth="5" />
        <rect x="32" y="32" width="36" height="36" rx="4" fill="#0f172a" />
        <path d="M34 38h32M34 50h32M34 62h32" stroke="#10b981" strokeWidth="3" />
        <circle cx="80" cy="40" r="5" fill="#ef4444" />
        <path d="M74 54l6-14" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "🎪") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="circus-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
        </defs>
        <path d="M20 68h60L50 28z" fill="url(#circus-red)" stroke="#7f1d1d" strokeWidth="3" />
        <path d="M35 68V48l15-20 15 20v20" fill="none" stroke="#ffffff" strokeWidth="4" />
        <circle cx="50" cy="22" r="4" fill="#fbbf24" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="alien-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="26" ry="18" fill="url(#alien-green)" stroke="#064e3b" strokeWidth="3.5" />
      <ellipse cx="40" cy="48" rx="8" ry="4" transform="rotate(-15 40 48)" fill="#09090b" />
      <ellipse cx="60" cy="48" rx="8" ry="4" transform="rotate(15 60 48)" fill="#09090b" />
      <path d="M42 66c4 2 12 2 16 0" fill="none" stroke="#064e3b" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function ZodiacIcon({ kind, size }: { kind: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="zodiac-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#zodiac-blue)" strokeWidth="5" opacity="0.8" />
      <g stroke="#60a5fa" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {kind === "aries" && <path d="M28 66c0-18 10-32 22-32 6 0 10 4 10 10v22M72 66c0-18-10-32-22-32-6 0-10 4-10 10" />}
        {kind === "taurus" && <path d="M30 34c8 10 14 14 20 14s12-4 20-14M34 56c0-9 7-16 16-16s16 7 16 16-7 16-16 16-16-7-16-16z" />}
        {kind === "gemini" && <path d="M34 30h32M34 70h32M40 30v40M60 30v40" />}
        {kind === "cancer" && <path d="M34 44c0-8 6-14 14-14s14 6 14 14-6 14-14 14M66 56c0 8-6 14-14 14s-14-6-14-14 6-14 14-14" />}
        {kind === "leo" && <path d="M34 64c12 0 20-8 20-20 0-6-4-10-10-10-5 0-9 4-9 9 0 4 3 7 7 7 9 0 18 6 22 14M68 66c3 0 6-3 6-6s-3-6-6-6-6 3-6 6 3 6 6 6z" />}
        {kind === "virgo" && <path d="M30 68V38M44 68V44c0-4 3-7 7-7s7 3 7 7v24M58 68V44c0-4 3-7 7-7 4 0 7 3 7 7v12c0 8-6 14-14 14" />}
        {kind === "libra" && <path d="M26 66h48M36 54c0-8 6-14 14-14s14 6 14 14M18 74h64" />}
        {kind === "scorpio" && <path d="M28 68V42M42 68V48c0-4 3-7 7-7s7 3 7 7v20M56 68V48c0-4 3-7 7-7s7 3 7 7v10l8 8M76 66l-10 2 2-10" />}
        {kind === "sagittarius" && <path d="M30 70l40-40M48 30h22v22M30 44V30h14" />}
        {kind === "capricorn" && <path d="M30 68V46c0-5 4-9 9-9s9 4 9 9v12c0 6 5 11 11 11 6 0 11-5 11-11s-5-11-11-11h-4" />}
        {kind === "aquarius" && <path d="M24 44l14-8 12 8 12-8 14 8M24 64l14-8 12 8 12-8 14 8" />}
        {kind === "pisces" && <path d="M30 36c10 0 20 10 20 20s-10 20-20 20M70 36c-10 0-20 10-20 20s10 20 20 20M30 56h40" />}
      </g>
    </svg>
  );
}

function BloodTypeIcon({ code, size }: { code: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="blood-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      <rect x="12" y="16" width="76" height="68" rx="16" fill="url(#blood-red)" stroke="#7f1d1d" strokeWidth="3" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize={code.length > 1 ? 28 : 36} fill="#ffffff" fontWeight="900" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>{code}</text>
    </svg>
  );
}

function FruitIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🍉") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="wm-rind-outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="wm-rind-inner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <radialGradient id="wm-flesh" cx="50%" cy="40%" r="50%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="#ff4d7a" />
            <stop offset="70%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </radialGradient>
          <linearGradient id="wm-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="85" rx="30" ry="6" fill="#000000" opacity="0.3" filter="blur(2px)" />
        <path d="M12 42 L88 42 A 38 38 0 0 1 12 42 Z" fill="url(#wm-rind-outer)" stroke="#064e3b" strokeWidth="1" />
        <path d="M15 42 L85 42 A 35 35 0 0 1 15 42 Z" fill="url(#wm-rind-inner)" />
        <path d="M18 42 L82 42 A 32 32 0 0 1 18 42 Z" fill="#ecfdf5" />
        <path d="M21 42 L79 42 A 29 29 0 0 1 21 42 Z" fill="url(#wm-flesh)" />
        <path d="M 34 50 C 35 48.5, 36.5 48.5, 37.5 50.5 C 38 51.5, 37.5 53, 36.5 53.5 C 35.5 54, 34 52.5, 34 50 Z" fill="#1e1b4b" />
        <circle cx="35.5" cy="50" r="0.6" fill="#ffffff" opacity="0.8" />
        <path d="M 43 59 C 44 57.5, 45.5 57.5, 46.5 59.5 C 47 60.5, 46.5 62, 45.5 62.5 C 44.5 63, 43 61.5, 43 59 Z" fill="#1e1b4b" />
        <circle cx="44.5" cy="59" r="0.6" fill="#ffffff" opacity="0.8" />
        <path d="M 50 64 C 50 62, 51.5 61, 52 63 C 52.5 64.5, 52 66, 50.5 66.5 C 49 67, 49.5 65.5, 50 64 Z" fill="#1e1b4b" />
        <circle cx="50.8" cy="63.5" r="0.6" fill="#ffffff" opacity="0.8" />
        <path d="M 57 59 C 57 57.5, 58.5 57.5, 59.5 59.5 C 60 60.5, 59.5 62, 58.5 62.5 C 57.5 63, 56 61.5, 57 59 Z" fill="#1e1b4b" />
        <circle cx="57.5" cy="59" r="0.6" fill="#ffffff" opacity="0.8" />
        <path d="M 66 50 C 66 48.5, 67.5 48.5, 68.5 50.5 C 69 51.5, 68.5 53, 67.5 53.5 C 66.5 54, 65 52.5, 66 50 Z" fill="#1e1b4b" />
        <circle cx="66.5" cy="50" r="0.6" fill="#ffffff" opacity="0.8" />
        <path d="M 24 42 L 76 42 A 26 26 0 0 1 24 42 Z" fill="url(#wm-gloss)" />
        <path d="M 23 43 A 27 27 0 0 1 77 43" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
      </svg>
    );
  }
  if (kind === "🍊") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="56" r="23" fill="url(#orange-grad)" stroke="#9a3412" strokeWidth="2.5" />
        <path d="M50 37v38M31 56h38" stroke="#ea580c" strokeWidth="2.5" opacity="0.4" />
        <path d="M46 26c6-6 12-6 17-1" fill="none" stroke="url(#leaf-grad)" strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="lemon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="58" rx="23" ry="16" fill="url(#lemon-grad)" stroke="#ca8a04" strokeWidth="2.5" />
      <path d="M47 26c6-6 12-6 17-1" fill="none" stroke="url(#leaf-grad)" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

function AnimalIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🐠") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="fish-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <path d="M24 56l12-10v20z" fill="#f97316" stroke="#9a3412" strokeWidth="1.5" />
        <ellipse cx="55" cy="56" rx="22" ry="14" fill="url(#fish-orange)" stroke="#9a3412" strokeWidth="2.5" />
        <circle cx="62" cy="52" r="2.5" fill="#0f172a" />
        <path d="M46 56h10" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "🐦") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="bird-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="56" r="20" fill="url(#bird-blue)" stroke="#0369a1" strokeWidth="2.5" />
        <path d="M64 54l12 5-12 5z" fill="#fb923c" stroke="#c2410c" strokeWidth="1.5" />
        <circle cx="54" cy="52" r="2.5" fill="#0f172a" />
        <path d="M36 60c6 5 14 5 20 0" fill="none" stroke="#0369a1" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "🦊") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="fox-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        <path d="M30 36l10-16 10 14M70 36L60 20 50 34" fill="none" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />
        <path d="M28 56l22-22 22 22-22 22z" fill="url(#fox-orange)" stroke="#7c2d12" strokeWidth="2.5" />
        <circle cx="42" cy="53" r="2.5" fill="#0f172a" />
        <circle cx="58" cy="53" r="2.5" fill="#0f172a" />
      </svg>
    );
  }
  const earPath = kind === "🦁"
    ? "M30 34l8-14 8 12M70 34l-8-14-8 12"
    : "M32 35l6-12 8 10M68 35l-6-12-8 10";

  let bodyColor = "url(#bear-brown)";
  let strokeColor = "#78350f";

  if (kind === "🐼") {
    bodyColor = "url(#panda-white)";
    strokeColor = "#1e293b";
  } else if (kind === "🦁") {
    bodyColor = "url(#lion-gold)";
    strokeColor = "#b45309";
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="bear-brown" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="panda-white" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="lion-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d={earPath} fill="none" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="56" r={kind === "🦁" ? "30" : "28"} fill={bodyColor} stroke={strokeColor} strokeWidth="2.5" />
      {kind === "🐼" && <circle cx="39" cy="53" r="6" fill="#1e293b" opacity="0.8" />}
      {kind === "🐼" && <circle cx="61" cy="53" r="6" fill="#1e293b" opacity="0.8" />}
      {kind === "🐯" && <path d="M34 46h6M60 46h6M36 62h28" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />}
      {kind === "🐻" && <circle cx="50" cy="61" r="6" fill="#fef3c7" opacity="0.3" />}
      {kind === "🦁" && <circle cx="50" cy="56" r="20" fill="none" stroke="#f59e0b" strokeWidth="4.5" opacity="0.8" />}
      <circle cx="41" cy="53" r="2.5" fill="#0f172a" />
      <circle cx="59" cy="53" r="2.5" fill="#0f172a" />
      <path d="M45 64c3 3 7 3 10 0" fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function FlowerIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🌻") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="sun-petal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
          <ellipse key={d} cx="50" cy="30" rx="6" ry="13.5" transform={`rotate(${d} 50 50)`} fill="url(#sun-petal)" stroke="#d97706" strokeWidth="0.5" />
        ))}
        <circle cx="50" cy="50" r="11" fill="#78350f" stroke="#451a03" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="rose-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
      </defs>
      {[0, 72, 144, 216, 288].map((d) => (
        <ellipse key={d} cx="50" cy="28" rx="8.5" ry="15" transform={`rotate(${d} 50 50)`} fill="url(#rose-red)" stroke="#9f1239" strokeWidth="0.5" />
      ))}
      <circle cx="50" cy="50" r="11" fill="#ffe4e6" stroke="#9f1239" strokeWidth="1" />
      {kind === "🌹" && <path d="M48 68v16M48 82h8" stroke="#059669" strokeWidth="4.5" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

function SportIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🎳") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="pin-white" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="ball-slate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <circle cx="38" cy="56" r="13" fill="url(#ball-slate)" stroke="#09090b" strokeWidth="1.5" />
        <circle cx="34" cy="50" r="2" fill="#ffffff" />
        <circle cx="41" cy="48" r="2" fill="#ffffff" />
        <circle cx="43" cy="55" r="2" fill="#ffffff" />
        <rect x="58" y="34" width="11" height="35" rx="4" fill="url(#pin-white)" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="63.5" cy="28" r="6.5" fill="url(#pin-white)" stroke="#94a3b8" strokeWidth="1" />
        <rect x="58" y="38" width="11" height="4" fill="#ef4444" />
      </svg>
    );
  }
  if (kind === "⚽") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="50" cy="50" r="30" fill="#ffffff" stroke="#1e293b" strokeWidth="5.5" />
        <path d="M50 38l7 5-3 8-8 .5-2.5-6.5z" fill="#0f172a" />
        <path d="M50 20l-5 8M69 31l-12 12M62 68l-8-12M38 68l6-12M31 31l14 7" stroke="#1e293b" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === "🏀") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="basket-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="30" fill="url(#basket-orange)" stroke="#7c2d12" strokeWidth="5.5" />
        <path d="M20 50h60M50 20v60M32 28c10 8 10 36 0 44M68 28c-10 8-10 36 0 44" stroke="#7c2d12" strokeWidth="3.5" fill="none" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="tennis-neon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ccff00" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="30" fill="url(#tennis-neon)" stroke="#4d7c0f" strokeWidth="5.5" />
      <path d="M28 34c12-12 32-12 44 0M28 66c12 12 32 12 44 0" stroke="#ffffff" strokeWidth="3.5" fill="none" />
    </svg>
  );
}

function PartyIcon({ kind, size }: { kind: string; size: number }) {
  if (kind === "🎀") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="ribbon-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
        <path d="M22 50c10-14 24-14 34 0-10 14-24 14-34 0z" fill="url(#ribbon-pink)" stroke="#9d174d" strokeWidth="2.5" />
        <path d="M78 50c-10-14-24-14-34 0 10 14 24 14 34 0z" fill="url(#ribbon-pink)" stroke="#9d174d" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="7.5" fill="#fdf2f8" stroke="#9d174d" strokeWidth="2" />
        <path d="M47 58l-7 16M53 58l7 16" stroke="#9d174d" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="balloon-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="42" rx="21" ry="26" fill="url(#balloon-red)" stroke="#881337" strokeWidth="2.5" />
      <path d="M50 67v18" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 68l-4 5h8z" fill="#be123c" stroke="#881337" strokeWidth="1" />
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

function CherryIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="cherry-grad-left" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff4d7a" />
          <stop offset="35%" stopColor="#e11d48" />
          <stop offset="75%" stopColor="#880825" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>
        <radialGradient id="cherry-grad-right" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff5e8c" />
          <stop offset="35%" stopColor="#f43f5e" />
          <stop offset="75%" stopColor="#9f1239" />
          <stop offset="100%" stopColor="#5c061e" />
        </radialGradient>
        <linearGradient id="stem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="cherry-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <ellipse cx="37" cy="78" rx="14" ry="4.5" fill="#000000" opacity="0.35" filter="blur(1.5px)" />
      <ellipse cx="65" cy="74" rx="13" ry="4" fill="#000000" opacity="0.3" filter="blur(1.5px)" />
      <path d="M52 24 C50 35, 38 48, 37 60" fill="none" stroke="url(#stem-grad)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M52 24 C54 35, 62 45, 65 56" fill="none" stroke="url(#stem-grad)" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="52" cy="24" rx="3.5" ry="2.5" fill="#15803d" />
      <path d="M52 24 C 54 12, 68 15, 70 24 C 66 32, 54 28, 52 24 Z" fill="url(#leaf-grad)" stroke="#14532d" strokeWidth="1" />
      <path d="M52 24 C 58 21, 64 21, 70 24" fill="none" stroke="#bbf7d0" strokeWidth="1.2" opacity="0.7" />
      <circle cx="37" cy="65" r="17" fill="url(#cherry-grad-left)" stroke="#4c0519" strokeWidth="1" />
      <path d="M34 50 C36 52, 38 52, 40 50" fill="none" stroke="#31020f" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="31" cy="58" rx="5" ry="3.5" transform="rotate(-30 31 58)" fill="url(#cherry-highlight)" />
      <ellipse cx="29" cy="62" rx="2.5" ry="1.5" transform="rotate(-30 29 62)" fill="#ffffff" opacity="0.4" />
      <circle cx="65" cy="61" r="15.5" fill="url(#cherry-grad-right)" stroke="#4c0519" strokeWidth="1" />
      <path d="M62 47.5 C64 49.5, 66 49.5, 68 47.5" fill="none" stroke="#31020f" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="59.5" cy="54.5" rx="4.5" ry="3" transform="rotate(-30 59.5 54.5)" fill="url(#cherry-highlight)" />
      <ellipse cx="57.5" cy="58" rx="2" ry="1" transform="rotate(-30 57.5 58)" fill="#ffffff" opacity="0.4" />
    </svg>
  );
}

function BellIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="bell-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="85%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="bell-rim-gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="30%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="75%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="clapper-gold" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <linearGradient id="bell-shine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="84" rx="28" ry="6" fill="#000000" opacity="0.35" filter="blur(2px)" />
      <circle cx="50" cy="74" r="10" fill="url(#clapper-gold)" stroke="#78350f" strokeWidth="1" />
      <circle cx="48" cy="72" r="2" fill="#ffffff" opacity="0.6" />
      <path d="M42 22 C42 14, 58 14, 58 22" fill="none" stroke="url(#bell-gold)" strokeWidth="6" strokeLinecap="round" />
      <path d="M42 22 C42 14, 58 14, 58 22" fill="none" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M50 22 C42 22, 38 32, 35 44 C32 56, 22 66, 22 70 L78 70 C78 66, 68 56, 65 44 C62 32, 58 22, 50 22 Z" fill="url(#bell-gold)" stroke="#78350f" strokeWidth="1.5" />
      <path d="M50 23 C43 23, 40 32, 37 44 C34 56, 25 66, 25 69 L75 69 C75 66, 66 56, 63 44 C60 32, 57 23, 50 23 Z" fill="none" stroke="url(#bell-shine)" strokeWidth="2.5" opacity="0.6" />
      <rect x="18" y="68" width="64" height="7" rx="3.5" fill="url(#bell-rim-gold)" stroke="#78350f" strokeWidth="1.5" />
      <rect x="22" y="69.5" width="56" height="2" rx="1" fill="#ffffff" opacity="0.45" />
      <path d="M32 46 C34 56, 26 64, 26 67" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <path d="M48 26 C46 38, 44 50, 42 64" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}

function ReplayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="neon-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="neon-cyan" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="32" fill="none" stroke="#a855f7" strokeWidth="12" opacity="0.1" filter="url(#neon-glow)" />
      <path d="M 50 18 A 32 32 0 0 1 82 50 A 32 32 0 0 1 68 74" fill="none" stroke="url(#neon-purple)" strokeWidth="7" strokeLinecap="round" filter="url(#neon-glow)" />
      <path d="M 50 18 A 32 32 0 0 1 82 50 A 32 32 0 0 1 68 74" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M 45 24 L 54 15 L 43 9" fill="none" stroke="url(#neon-purple)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#neon-glow)" />
      <path d="M 45 24 L 54 15 L 43 9" fill="none" stroke="#ffffff" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <path d="M 50 82 A 32 32 0 0 1 18 50 A 32 32 0 0 1 32 26" fill="none" stroke="url(#neon-cyan)" strokeWidth="7" strokeLinecap="round" filter="url(#neon-glow)" />
      <path d="M 50 82 A 32 32 0 0 1 18 50 A 32 32 0 0 1 32 26" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M 55 76 L 46 85 L 57 91" fill="none" stroke="url(#neon-cyan)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#neon-glow)" />
      <path d="M 55 76 L 46 85 L 57 91" fill="none" stroke="#ffffff" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="50" cy="50" r="3" fill="#ffffff" filter="url(#neon-glow)" />
      <path d="M 50 42 L 50 58 M 42 50 L 58 50" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function BlankIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="blank-neon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="glass-specular" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="31%" stopColor="#ffffff" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
        <filter id="cyber-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="22" y="22" width="56" height="56" rx="12" fill="#000000" opacity="0.45" filter="blur(2.5px)" />
      <rect x="20" y="20" width="60" height="60" rx="12" fill="none" stroke="url(#blank-neon)" strokeWidth="3" filter="url(#cyber-glow)" />
      <path d="M 28 20 L 28 26 M 72 20 L 72 26 M 28 80 L 28 74 M 72 80 L 72 74" stroke="url(#blank-neon)" strokeWidth="2.5" opacity="0.8" />
      <path d="M 20 28 L 26 28 M 20 72 L 26 72 M 80 28 L 74 28 M 80 72 L 74 72" stroke="url(#blank-neon)" strokeWidth="2.5" opacity="0.8" />
      <rect x="22" y="22" width="56" height="56" rx="10" fill="url(#glass-specular)" />
      <rect x="42" y="42" width="16" height="16" rx="4" fill="none" stroke="url(#blank-neon)" strokeWidth="2.0" opacity="0.4" />
      <circle cx="50" cy="50" r="3" fill="#ffffff" filter="url(#cyber-glow)" />
    </svg>
  );
}

function LuckySevenIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="seven-red" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="35%" stopColor="#dc2626" />
          <stop offset="85%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#4c0519" />
        </linearGradient>
        <linearGradient id="seven-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="80%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <filter id="star-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M 28 26 L 76 26 L 46 82 L 34 82 L 60 38 L 28 38 Z" fill="#000000" opacity="0.5" filter="blur(3px)" />
      <g filter="url(#star-glow)" opacity="0.9">
        <path d="M 24 64 L 28 68 L 24 72 L 20 68 Z" fill="#fbbf24" />
        <circle cx="24" cy="68" r="1.5" fill="#ffffff" />
        <path d="M 76 28 L 81 33 L 76 38 L 71 33 Z" fill="#fbbf24" />
        <circle cx="76" cy="33" r="2" fill="#ffffff" />
      </g>
      <path d="M 24 22 L 78 22 L 44 84 L 30 84 L 59 34 L 24 34 Z" fill="url(#seven-gold)" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 28 26 L 72 26 L 41 80 L 35 80 L 62 30 L 28 30 Z" fill="url(#seven-red)" stroke="#4c0519" strokeWidth="1" strokeLinejoin="miter" />
      <path d="M 30 27 L 70 27 L 66 31 L 30 31 Z" fill="#ffffff" opacity="0.45" />
      <path d="M 62 30 L 37 77 L 35 80 L 37 77 Z" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <polygon points="76,24 78,22 80,24 78,26" fill="#ffffff" />
      <polygon points="26,34 28,32 30,34 28,36" fill="#ffffff" />
    </svg>
  );
}
