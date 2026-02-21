"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, GitMerge, LayoutGrid, HelpCircle } from "lucide-react";
import { useEffect } from "react";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
    isLightMode: boolean;
}

export default function HelpModal({ isOpen, onClose, currentPath, isLightMode }: HelpModalProps) {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const bg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";

    const getContent = () => {
        if (currentPath.includes("flowchart")) {
            return {
                title: "FlowChart モード",
                icon: <GitMerge className="text-blue-400" size={24} />,
                description: "ノードを繋げて視覚的に計算を行うモードです。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "画面右下の「＋」ボタンをクリックして新しいイベント（ノード）を追加します",
                            "各ノードのハンドル（丸い点）をドラッグして線を繋ぎます",
                            "ノードの上下左右にある「＋」ボタンを押すと、自動的に線が繋がった状態で新しいノードを追加できます",
                            "線を繋ぐと自動的に計算が反映されます。演算（＋、－等）はノード内の設定で変更可能です",
                            "左メニューの「目標」から最終的な目標値を設定できます"
                        ]
                    },
                    {
                        title: "裏技",
                        items: [
                            "背景の何もない所をドラッグして全体をパン、スクロールでズームできます",
                            "ショートカット対応: Ctrl+Z (元に戻す) / Ctrl+C, Ctrl+V (コピー＆ペースト) / Backspace, Del (ノード削除)"
                        ]
                    }
                ]
            };
        } else if (currentPath.includes("split")) {
            return {
                title: "Split モード",
                icon: <LayoutGrid className="text-green-400" size={24} />,
                description: "画面を左右に分割し、複数の機能（カウンターやフローチャート）を同時に利用できます。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "左右のペイン上部にあるドロップダウンから表示したい機能を選択できます",
                            "「Counter」を選べば左右両方で異なるカウンターを使用できます",
                            "「FlowChart」を選んで複雑な計算とカウンターを同時に使えます",
                            "現在の画面構成は自動で保存され、次回も同じ状態で開きます"
                        ]
                    }
                ]
            };
        } else {
            // Default to Counter
            return {
                title: "Counter モード",
                icon: <Users className="text-purple-400" size={24} />,
                description: "シンプルで使いやすいオンラインカウンターです。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "画面中央の大きなボタンを押してカウントアップします",
                            "左上のメニュー（≡）からカウンタの項目名や目標値、色を変更できます",
                            "「テンプレート」を使って素早く構成を切り替えられます",
                            "右上の設定(歯車)アイコンから、カードサイズなどの見た目を変更できます"
                        ]
                    }
                ]
            };
        }
    };

    const content = getContent();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-x-0 bottom-0 top-[56px] z-[100] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <div className="fixed inset-x-0 bottom-0 top-[56px] z-[101] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-full max-w-lg overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] rounded-3xl"
                            style={{
                                background: isLightMode ? "rgba(255,255,255,0.7)" : "rgba(10,5,30,0.7)",
                                backdropFilter: "blur(20px)",
                                border: `1px solid ${borderColor}`,
                                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl" style={{ background: bgSubtle }}>
                                        {content.icon}
                                    </div>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>
                                        {content.title} の使い方
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${bgSubtle} hover:bg-black/10`}
                                >
                                    <X size={18} className={textSecondary} />
                                </button>
                            </div>

                            {/* Body (Scrollable) */}
                            <div className="p-6 overflow-y-auto" style={{
                                scrollbarWidth: "thin",
                                scrollbarColor: `${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'} transparent`
                            }}>
                                <p className={`mb-6 p-4 rounded-xl text-sm leading-relaxed ${textSecondary}`} style={{ background: bgSubtle }}>
                                    {content.description}
                                </p>

                                <div className="space-y-6">
                                    {content.sections.map((section, idx) => (
                                        <div key={idx}>
                                            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${textPrimary} flex items-center gap-2`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                {section.title}
                                            </h3>
                                            <ul className={`space-y-2.5 ${textSecondary} text-sm ml-1.5 border-l-2 p-1 pl-4`} style={{ borderColor }}>
                                                {section.items.map((item, itemIdx) => (
                                                    <li key={itemIdx} className="leading-relaxed relative before:content-[''] before:absolute before:-left-[21px] before:top-[8px] before:w-[6px] before:h-[2px] before:bg-purple-500/50">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t flex justify-center" style={{ borderColor }}>
                                <button
                                    onClick={onClose}
                                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 active:scale-95`}
                                    style={{
                                        background: isLightMode ? "#000" : "#fff",
                                        color: isLightMode ? "#fff" : "#000"
                                    }}
                                >
                                    理解した
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
