export interface CounterItem {
    id: string;
    label: string;
    emoji: string;
    color: string;
    count: number;
    target: number; // 0 = no target
    /** 地図レイアウト時の位置（％）。0–100 */
    x?: number;
    y?: number;
}

export interface Template {
    id: string;
    name: string;
    description: string;
    items: Omit<CounterItem, "count" | "target">[];
    /** "positioned" のとき背景画像の上に項目を絶対配置 */
    layout?: "grid" | "positioned";
    /** 地図レイアウト時の背景画像URL */
    backgroundImage?: string;
}

export const TEMPLATES: Template[] = [
    {
        id: "simple",
        name: "単純カウント",
        description: "自由にカウント項目を追加できます",
        items: [
            { id: "item-1", label: "項目1", emoji: "📊", color: "#a855f7" },
        ],
    },
    {
        id: "zodiac",
        name: "12星座",
        description: "12の星座でリスナーをカウント",
        items: [
            { id: "aries", label: "おひつじ座", emoji: "♈", color: "#ef4444" },
            { id: "taurus", label: "おうし座", emoji: "♉", color: "#22c55e" },
            { id: "gemini", label: "ふたご座", emoji: "♊", color: "#eab308" },
            { id: "cancer", label: "かに座", emoji: "♋", color: "#94a3b8" },
            { id: "leo", label: "しし座", emoji: "♌", color: "#f97316" },
            { id: "virgo", label: "おとめ座", emoji: "♍", color: "#a855f7" },
            { id: "libra", label: "てんびん座", emoji: "♎", color: "#ec4899" },
            { id: "scorpio", label: "さそり座", emoji: "♏", color: "#dc2626" },
            { id: "sagittarius", label: "いて座", emoji: "♐", color: "#3b82f6" },
            { id: "capricorn", label: "やぎ座", emoji: "♑", color: "#6b7280" },
            { id: "aquarius", label: "みずがめ座", emoji: "♒", color: "#06b6d4" },
            { id: "pisces", label: "うお座", emoji: "♓", color: "#8b5cf6" },
        ],
    },
    {
        id: "blood",
        name: "血液型",
        description: "4つの血液型でリスナーをカウント",
        items: [
            { id: "a", label: "A型", emoji: "🅰️", color: "#ef4444" },
            { id: "b", label: "B型", emoji: "🅱️", color: "#3b82f6" },
            { id: "o", label: "O型", emoji: "🅾️", color: "#22c55e" },
            { id: "ab", label: "AB型", emoji: "🆎", color: "#a855f7" },
        ],
    },
    {
        id: "prefectures",
        name: "47都道府県",
        description: "地図上で都道府県別にカウント",
        layout: "positioned",
        backgroundImage: "/images/japan-outline.svg",
        // 47都道府県：表示時に地方ブロック＋動的間隔で位置計算（prefecture-blocks）。x,y はフォールバック用。テンプレート選択時にカードサイズS・スケール50%に。
        items: [
            { id: "hokkaido", label: "北海道", emoji: "🗾", color: "#ef4444", x: 87.5, y: 5 },
            { id: "aomori", label: "青森県", emoji: "🗾", color: "#22c55e", x: 12.5, y: 13 },
            { id: "iwate", label: "岩手県", emoji: "🗾", color: "#eab308", x: 37.5, y: 13 },
            { id: "miyagi", label: "宮城県", emoji: "🗾", color: "#3b82f6", x: 62.5, y: 13 },
            { id: "akita", label: "秋田県", emoji: "🗾", color: "#a855f7", x: 12.5, y: 21 },
            { id: "yamagata", label: "山形県", emoji: "🗾", color: "#ec4899", x: 37.5, y: 21 },
            { id: "fukushima", label: "福島県", emoji: "🗾", color: "#06b6d4", x: 62.5, y: 21 },
            { id: "ibaraki", label: "茨城県", emoji: "🗾", color: "#f97316", x: 87.5, y: 13 },
            { id: "tochigi", label: "栃木県", emoji: "🗾", color: "#ef4444", x: 87.5, y: 21 },
            { id: "gunma", label: "群馬県", emoji: "🗾", color: "#22c55e", x: 12.5, y: 29 },
            { id: "saitama", label: "埼玉県", emoji: "🗾", color: "#eab308", x: 37.5, y: 29 },
            { id: "chiba", label: "千葉県", emoji: "🗾", color: "#3b82f6", x: 62.5, y: 29 },
            { id: "tokyo", label: "東京都", emoji: "🗾", color: "#a855f7", x: 87.5, y: 29 },
            { id: "kanagawa", label: "神奈川県", emoji: "🗾", color: "#ec4899", x: 12.5, y: 37 },
            { id: "niigata", label: "新潟県", emoji: "🗾", color: "#06b6d4", x: 37.5, y: 37 },
            { id: "toyama", label: "富山県", emoji: "🗾", color: "#f97316", x: 62.5, y: 37 },
            { id: "ishikawa", label: "石川県", emoji: "🗾", color: "#ef4444", x: 87.5, y: 37 },
            { id: "fukui", label: "福井県", emoji: "🗾", color: "#22c55e", x: 12.5, y: 45 },
            { id: "yamanashi", label: "山梨県", emoji: "🗾", color: "#eab308", x: 37.5, y: 45 },
            { id: "nagano", label: "長野県", emoji: "🗾", color: "#3b82f6", x: 62.5, y: 45 },
            { id: "gifu", label: "岐阜県", emoji: "🗾", color: "#a855f7", x: 87.5, y: 45 },
            { id: "shizuoka", label: "静岡県", emoji: "🗾", color: "#ec4899", x: 12.5, y: 53 },
            { id: "aichi", label: "愛知県", emoji: "🗾", color: "#06b6d4", x: 37.5, y: 53 },
            { id: "mie", label: "三重県", emoji: "🗾", color: "#f97316", x: 62.5, y: 53 },
            { id: "shiga", label: "滋賀県", emoji: "🗾", color: "#ef4444", x: 87.5, y: 53 },
            { id: "kyoto", label: "京都府", emoji: "🗾", color: "#22c55e", x: 12.5, y: 61 },
            { id: "osaka", label: "大阪府", emoji: "🗾", color: "#eab308", x: 37.5, y: 61 },
            { id: "hyogo", label: "兵庫県", emoji: "🗾", color: "#3b82f6", x: 62.5, y: 61 },
            { id: "nara", label: "奈良県", emoji: "🗾", color: "#a855f7", x: 87.5, y: 61 },
            { id: "wakayama", label: "和歌山県", emoji: "🗾", color: "#ec4899", x: 12.5, y: 69 },
            { id: "tottori", label: "鳥取県", emoji: "🗾", color: "#06b6d4", x: 37.5, y: 69 },
            { id: "shimane", label: "島根県", emoji: "🗾", color: "#f97316", x: 62.5, y: 69 },
            { id: "okayama", label: "岡山県", emoji: "🗾", color: "#ef4444", x: 62.5, y: 69 },
            { id: "hiroshima", label: "広島県", emoji: "🗾", color: "#22c55e", x: 87.5, y: 69 },
            { id: "yamaguchi", label: "山口県", emoji: "🗾", color: "#eab308", x: 87.5, y: 69 },
            { id: "tokushima", label: "徳島県", emoji: "🗾", color: "#3b82f6", x: 62.5, y: 77 },
            { id: "kagawa", label: "香川県", emoji: "🗾", color: "#a855f7", x: 87.5, y: 77 },
            { id: "ehime", label: "愛媛県", emoji: "🗾", color: "#ec4899", x: 12.5, y: 77 },
            { id: "kochi", label: "高知県", emoji: "🗾", color: "#06b6d4", x: 37.5, y: 77 },
            { id: "fukuoka", label: "福岡県", emoji: "🗾", color: "#f97316", x: 12.5, y: 85 },
            { id: "saga", label: "佐賀県", emoji: "🗾", color: "#ef4444", x: 37.5, y: 85 },
            { id: "nagasaki", label: "長崎県", emoji: "🗾", color: "#22c55e", x: 62.5, y: 85 },
            { id: "kumamoto", label: "熊本県", emoji: "🗾", color: "#eab308", x: 87.5, y: 85 },
            { id: "oita", label: "大分県", emoji: "🗾", color: "#3b82f6", x: 12.5, y: 93 },
            { id: "miyazaki", label: "宮崎県", emoji: "🗾", color: "#a855f7", x: 37.5, y: 93 },
            { id: "kagoshima", label: "鹿児島県", emoji: "🗾", color: "#ec4899", x: 62.5, y: 93 },
            { id: "okinawa", label: "沖縄県", emoji: "🗾", color: "#06b6d4", x: 87.5, y: 93 },
        ],
    },
];

export function createCounterItems(template: Template): CounterItem[] {
    return template.items.map((item) => ({ ...item, count: 0, target: 0 }));
}
