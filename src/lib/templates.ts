export interface CounterItem {
    id: string;
    label: string;
    emoji: string;
    color: string;
    count: number;
    target: number; // 0 = no target
}

export interface Template {
    id: string;
    name: string;
    description: string;
    items: Omit<CounterItem, "count" | "target">[];
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
];

export function createCounterItems(template: Template): CounterItem[] {
    return template.items.map((item) => ({ ...item, count: 0, target: 0 }));
}
