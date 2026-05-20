/**
 * アプリ全体のレイアウトに関するマジックナンバーを管理する定数ファイル
 * 2026年時点の設計ガイドラインに基づき、構造的な一貫性を保つために使用します。
 */

/** ヘッダーの標準的な高さ (px) */
export const UI_HEADER_HEIGHT_PX = 52;
export const UI_HEADER_HEIGHT_CLS = "h-[52px]";

/**
 * ガチャモバイル上部ヘッダー（GachaContent）の見込み高さ。
 * デスクトップの min-h-[52px] / UI_HEADER_HEIGHT_PX と揃える。safe-area は別途加算。
 */
export const GACHA_MOBILE_HEADER_HEIGHT = "3.25rem";

/**
 * ガチャモバイル下部タブバー（GachaContent）の見込み高さ。
 * アイコン16px + ラベル + py。scroll-hint の bottom: 3.25rem と一致。safe-area は別途加算。
 */
export const GACHA_MOBILE_TAB_BAR_HEIGHT = "3.25rem";

/** ブレイクポイント (px) */
export const BREAKPOINT_SM = 640;
export const BREAKPOINT_MD = 768;
export const BREAKPOINT_LG = 1024;
export const BREAKPOINT_XL = 1280;

/** 
 * Z-Index マップ
 * 要素の重なり順を一元管理し、"z-index 戦争" を防ぎます。
 */
export const Z_INDEX = {
    BASE: 0,
    ORBS: 0,           // 背景装飾
    CONTENT: 10,       // メインコンテンツ
    SIDEBAR_BACKDROP: 60,
    SIDEBAR: 70,       // サイドバー
    HEADER: 80,        // ヘッダー
    MODAL_BACKDROP: 100,
    MODAL: 110,        // モダル
    DROPDOWN: 120,     // 降下メニュー
    TOOLTIP: 130,      // ツールチップ
    TOAST: 9999,       // 通知（最前面）
} as const;

/** アニメーション設定 */
export const UI_TRANSITION_DURATION = 300; // ms
export const UI_TRANSITION_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
