export type HamburgerTabId =
    | "templates"
    | "items"
    | "targets"
    | "custom"
    | "actions"
    | "save_load";

/** ハンバーガー・サイドバー・Chart セクションで共有するテーマ用クラス／色 */
export type MenuThemeTokens = {
    panelBg: string;
    headerBarBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    bgSubtle: string;
    bgSubtleHover: string;
    borderSubtle: string;
    inputBg: string;
    inputBorder: string;
    popoverBg: string;
    popoverBorder: string;
};
