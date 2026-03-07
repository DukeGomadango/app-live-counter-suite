"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, GitMerge, LayoutGrid, Sparkles, Calculator, Home, CircleDot, Clock, PanelTopOpen, Dices } from "lucide-react";
import { useEffect } from "react";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
    isLightMode: boolean;
    /** Split 表示中にどのモジュールを表示しているか。Clock 選択時に Clock 用ヘルプを出すために使用 */
    activeModule?: string | null;
}

export default function HelpModal({ isOpen, onClose, currentPath, isLightMode, activeModule = null }: HelpModalProps) {
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

    const _bg = isLightMode ? "rgba(255,255,255,0.95)" : "rgba(10,5,30,0.95)";
    const borderColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
    const textPrimary = isLightMode ? "text-gray-900" : "text-white";
    const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
    const bgSubtle = isLightMode ? "bg-black/5" : "bg-white/5";

    const getContent = () => {
        const path = currentPath || "/";
        const showClockHelp = path.includes("clock") || (path.includes("split") && activeModule === "clock");
        const showPanelHelp = path.includes("panel") || (path.includes("split") && activeModule === "panel");
        if (showClockHelp) {
            return {
                title: "Clock モード",
                icon: <Clock className="text-orange-400" size={24} />,
                description: "現在時刻・ストップウォッチ・タイマーを切り替えて使えます。デジタル表示は0.01秒まで表示できます。",
                sections: [
                    {
                        title: "時計",
                        items: [
                            "「デジタル」で現在時刻を時:分:秒で表示できます",
                            "「アナログ」で文字盤と針の表示に切り替えられます",
                            "太陽・月アイコンでライト/ダークテーマを切り替えられます",
                        ],
                    },
                    {
                        title: "ストップウォッチ",
                        items: [
                            "「開始」で計測を開始できます",
                            "「一時停止」で止め、「開始」で再開できます",
                            "「リセット」で経過時間を0に戻せます",
                        ],
                    },
                    {
                        title: "タイマー",
                        items: [
                            "分・秒を入力するか、1分・5分・10分のプリセットで時間を設定できます",
                            "「開始」でカウントダウンを開始できます",
                            "0になると通知または音で知らせます。ブラウザの通知許可があると通知が表示されます",
                        ],
                    },
                    {
                        title: "設定",
                        items: [
                            "右上の歯車アイコンから設定モーダルを開けます",
                            "オーブの色・オーブの濃さを変更できます",
                            "「0.01秒単位で表示」のオン/オフで、時計・ストップウォッチ・タイマーの表示精度を切り替えられます",
                            "「表示サイズ」のバーで時計の表示の大きさを調節できます",
                        ],
                    },
                ],
            };
        }
        if (path === "/" || path === "") {
            return {
                title: "だんごツール（トップ）",
                icon: <Home className="text-purple-400" size={24} />,
                description: "各ツールの入口です。カードから使いたいツールを選ぶか、上部のメニューでモードを切り替えて利用できます。",
                sections: [
                    {
                        title: "ツール一覧",
                        items: [
                            "人数カウンター: 入室カウント・項目集計を複数同時に。テンプレートや目標値で配信をサポート",
                            "フローチャート: ノードを繋いで数値演算。分岐・確率・集計を視覚的に整理",
                            "ガチャシミュレーター: 確率・レア度・天井をカスタマイズして配信やイベントで使用",
                            "ルーレット: スロットを回して抽選。予測や履歴で盛り上げる",
                            "時計: 現在時刻・ストップウォッチ・タイマー。デジタルとアナログ表示に対応",
                            "スプリットビュー: カウンター・フローチャート・ガチャなどを1画面で切り替え",
                            "パネル: 画像に覆いをかけてタップで開け。AI読み取り防止・目標達成で覆い解除",
                            "電卓: 四則演算・分数・確率の簡易計算",
                        ]
                    },
                    {
                        title: "操作",
                        items: [
                            "上部のドロップダウン（Top / Counter / FlowChart …）でツールを切り替えられます",
                            "太陽・月アイコンでライト/ダークテーマを切り替えられます",
                        ]
                    },
                    {
                        title: "アプリのように使う",
                        items: [
                            "iPhone・iPad: Safari で共有ボタン（□↑）をタップし、「ホーム画面に追加」を選ぶと、アプリのように起動できます",
                            "Android: Chrome などではメニュー（⋮）から「アプリをインストール」や「ホーム画面に追加」を選べます。インストールの案内が表示される場合もあります",
                        ]
                    }
                ]
            };
        }
        if (showPanelHelp) {
            return {
                title: "Panel モード",
                icon: <PanelTopOpen className="text-violet-400" size={24} />,
                description: "画像に覆いをかけてタップで開けるパネル機能です。AI読み取り防止フィルターや目標達成で覆いを外せます。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "ここをクリックするか、画像をドラッグ＆ドロップしてアップロードできます。アップロード後、トリミング画面で白い枠をドラッグして移動・四隅と辺の中央のハンドルをドラッグしてリサイズし「この範囲で使う」で確定すると、パネルの枠がその画像に合わせて表示され余白（黒い背景）が消えます",
                            "画像の上にAI読み取り防止フィルターを複数パターン同時に選んでかけられます。強さスライダーでフィルターの強弱を調節できます",
                            "画像の上に丸・三角・四角・カスタム・自由描画の覆いを付けられ、各覆いに「何を」（ラベル）と「いくつ」（目標・数字）を表示・編集できます。四角/丸/三角ボタンを押すと画像の中央付近に覆いが1つ追加されます",
                            "「カスタム」を押すと図形編集モーダルが開き、四角・丸・三角を組み合わせて1つの図形を作れます。組み合わせた図形の重心に文字が表示されます",
                            "「自由」を選んで画像上をドラッグすると自由な形の覆いを描けます",
                            "「画像を追加」で図形のほかに画像オーバーレイを載せられます。画像オーバーレイも移動・リサイズ・回転できます",
                            "目標を数値で設定した覆いはタップでカウントが加算され、目標達成で「達成しますか？」→ はいで覆いが消えます",
                            "目標を日本語で入力した覆いは、タップしたら「達成しますか？」がすぐ出て、はいで覆いが消えます",
                            "編集モードとパネル明けモードを切り替えられます（編集モードで配置・設定、パネル明けモードでタップのみ）",
                        ]
                    },
                    {
                        title: "図形の編集",
                        items: [
                            "編集モードで図形を選択すると、覆いの上に削除ボタンが表示され、クリックで削除できます",
                            "ドラッグで移動・角と辺のハンドルで拡大縮小・上端のハンドルまたは編集パネルの円形ダイアルで回転・編集パネルで色・ラベル・透明度・回転（度）を変更できます",
                            "選択時には円形ガイドが表示され、その円に沿ってハンドルをドラッグすると傾きを直感的に調整できます",
                            "各覆いの透明度をスライダーで0〜100%に変更できます（デフォルトは100%。100%なら背景画像を完全に隠せます）",
                            "Ctrl+C（コピー）・Ctrl+X（切り取り）・Ctrl+V（貼り付け）・Ctrl+D（複製）・Ctrl+Z（元に戻す）・Backspace/Del（選択中の覆いを削除）が使えます",
                            "スマホ・タブレットでは、選択した図形に二本指でピンチすると拡大縮小、二本指で回転すると傾きを変更できます",
                            "カスタム図形を選択したときは「図形を編集」で組み合わせを編集でき、編集モーダル内で「テンプレートに保存」すると名前を付けて保存し、後から読み込んで再利用できます",
                        ]
                    },
                    {
                        title: "カスタム図形",
                        items: [
                            "図形編集モーダルでは、四角・丸・三角をキャンバスに追加し、ドラッグで移動・ハンドルでリサイズして1つの図形に組み合わせられます",
                            "プリセット（♡ハート・☆星・台形・ひし形）を選ぶとその形がキャンバスに読み込まれ、編集してから「保存して閉じる」でパネルに1枚の覆いとして追加できます",
                            "「テンプレートに保存」で名前を付けて保存すると、保存済み一覧から読み込んで同じ形を何度でも使えます",
                        ]
                    },
                    {
                        title: "MECEアシスト",
                        items: [
                            "覆いの配置はグリッドにスナップし、隙間やずれを減らせます",
                            "「四角2×2」「四角3×3」ボタンで、画像サイズに合わせて等分割した四角の覆いを一括で追加できます",
                            "「三角3段」ボタンで、画像サイズに合わせて1列×n段の各段を対角線で2枚の三角に分割し、隙間なく埋めるMECEレイアウトを一括で追加できます",
                        ]
                    },
                    {
                        title: "保存・共有",
                        items: [
                            "ヘッダー右側（ヘルプの左）の「画像を保存して X で共有」ボタンで画像を保存し、X の投稿画面を開けます。キャプチャはトリミングした枠に合わせて出力されるため、余白なしで共有できます",
                            "メニュー（≡）から現在のパネルを保存し、保存したパネル一覧で切り替えられます",
                            "保存したパネルは名前の横のアイコンで名前変更・削除できます。削除時は確認ダイアログが表示されます",
                            "AI読み取り防止ラベルの表示・非表示を設定で切り替えられます",
                        ]
                    }
                ]
            };
        }
        if (path.includes("flowchart")) {
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
        } else if (path.includes("split")) {
            return {
                title: "Split モード",
                icon: <LayoutGrid className="text-green-400" size={24} />,
                description: "画面を左右に分割し、複数の機能（カウンターやフローチャート・パネルなど）を同時に利用できます。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "左右のペイン上部にあるドロップダウンから表示したい機能を選択できます",
                            "「Counter」を選べば左右両方で異なるカウンターを使用できます",
                            "「FlowChart」を選んで複雑な計算とカウンターを同時に使えます",
                            "「Panel」を選んで左右でパネルを表示できます",
                            "現在の画面構成は自動で保存され、次回も同じ状態で開きます"
                        ]
                    }
                ]
            };
        } else if (path.includes("calculator")) {
            return {
                title: "Calculator モード",
                icon: <Calculator className="text-cyan-400" size={24} />,
                description: "四則演算・分数・確率の簡易計算ができる電卓です。配信やメモ用のサポートツールとしてお使いいただけます。",
                sections: [
                    {
                        title: "四則",
                        items: [
                            "数字と演算子（＋、−、×、÷）を押して式を入力し、「＝」で計算します。×と÷は＋と−より先に計算されます",
                            "「⌫」で末尾1文字を消し、「AC」で表示をすべてクリア（0にリセット）します",
                            "小数にも対応しています",
                        ]
                    },
                    {
                        title: "分数",
                        items: [
                            "2つの分数（分子・分母）と演算子を選ぶと、結果を既約分数で表示します",
                        ]
                    },
                    {
                        title: "確率",
                        items: [
                            "P(A)・P(B)を0〜1で入力すると、独立とみなして P(A and B)・P(A or B) を表示します",
                            "n と k を入力すると、組み合わせ nCk を計算します",
                        ]
                    },
                    {
                        title: "設定",
                        items: [
                            "右上の歯車アイコンから、アクセント色や背景オーブの濃さを変更できます",
                            "太陽・月アイコンでライト/ダークを切り替えられます",
                        ]
                    }
                ]
            };
        } else if (path.includes("gacha")) {
            return {
                title: "Gacha モード",
                icon: <Sparkles className="text-purple-400" size={24} />,
                description: "カスタマイズ可能なガチャシミュレーターです。配信やイベントでの抽選にお使いいただけます。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "左サイドバーの『設定』タブで排出品目・レア度・天井を設定します",
                            "品目追加時の初期確率は1%です",
                            "複数品目をチェックし、一括で確率(%)をそろえられます。先頭の「残り%」は選択できません",
                            "2番目以降の合計が100%を超えると、按分され先頭が0%になります。その旨のメッセージが表示されます。「今後表示しない」にチェックすると、以降は表示されません",
                            "品目には画像・音声ファイルを登録し、プレイヤーごとにZip化することもできます",
                            "品目名をクリックすると名前を編集、レア度バッジをクリックするとレア度を変更できます",
                            "複数品目を選択した状態でいずれかをドラッグすると、選択した品目がまとめて移動できます（選択内の並びはそのままです）",
                            "「並べ替え」でレア度順（低→高/高→低）・確率順・名前順に並べ替えできます",
                            "『プレイヤー』タブでプレイヤーを追加・選択してからPULLボタンを押します",
                            "右上の歯車アイコンからガチャ配色・オーブの色・オーブの濃さ・タイトル表示・演出ON/OFF・共有ハッシュタグを設定できます",
                        ]
                    },
                    {
                        title: "結果と共有",
                        items: [
                            "結果画面ではソート（レア度/名前/個数）やフィルタで整理できます",
                            "Xで共有ボタンから結果（選択中のプレイヤー名付き）を投稿、コピーボタンでテキストをコピーできます",
                            "「結果を画像で共有」ボタンで、現在の結果をテンプレートに合わせた画像として保存し、Xの投稿画面を開けます",
                            "プレイヤーの履歴画面では、このガチャの累計一覧と、各回ごとの結果をタブで切り替えて確認・共有できます",
                            "各回の結果カードにも「結果を画像で共有」ボタンがあり、その回の結果だけをテンプレート画像として保存・共有できます",
                            "『品目別』タブでは排出品ごとにどのプレイヤーが何個当てたかを確認できます",
                            "全データはブラウザに自動保存されます（ページを閉じても消えません）",
                        ]
                    }
                ]
            };
        } else if (path.includes("roulette")) {
            return {
                title: "Roulette モード",
                icon: <CircleDot className="text-amber-400" size={24} />,
                description: "スロットを回して抽選するルーレットです。配信やイベントで誰が当たるか盛り上げるツールとして使えます。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "スロット（項目）を編集して、抽選の候補を設定します",
                            "回転ボタンでルーレットを回し、止まった位置が結果です",
                            "予測者（ predictor ）を登録すると、誰が当たるか予想して楽しめます",
                            "履歴で過去の結果を確認できます",
                        ]
                    },
                    {
                        title: "設定",
                        items: [
                            "テンプレートでスロット構成を保存・読み込みできます",
                            "太陽・月アイコンでライト/ダークを切り替えられます",
                            "表示方式で「カスタム」を選ぶと、盤面のセグメント色をパレットから2〜8色で選べます",
                            "スロット一覧の各項目の色ボタンで、そのスロットだけ盤面の色を指定できます（全表示方式で共通）",
                            "設定パネルで「SEを再生する」のオン/オフを切り替えられます（回転音・的中ファンファーレ）",
                        ]
                    }
                ]
            };
        } else if (path.includes("slot")) {
            return {
                title: "Slot モード",
                icon: <Dices className="text-teal-400" size={24} />,
                description: "順押し・BET・天井・リプレイに対応したスロットです。スピン開始時に全リールの出目が確定し、ストップで順に表示するビデオスロット方式です。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "スピンボタンでリールを回転させます。左→中→右の順にストップボタンで止めてください（順押し）",
                            "スピン開始時に全リールの出目が確定しており、ストップボタンで左から順にその結果が表示されます（ビデオスロット方式）",
                            "プレイヤーを選択し、BET枚数を設定してからスピンできます。役が成立すると配当が残高に加算されます",
                            "リプレイ役が成立するとBETが戻り、次の1回はBETを消費せずにスピンできます",
                        ]
                    },
                    {
                        title: "設定・用語",
                        items: [
                            "理論機械割は現在の図柄確率と配当・ペイラインから計算した期待回収率（％）です",
                            "表示段数で1段または3段を選べます。3段時は3リールでペイライン（1/3/5ライン）を選べます。複数ライン成立時は配当を合算して払い出します",
                            "天井までの回転数を設定すると、その回数消化でボーナス役が1回確定します（0で天井なし）",
                            "ボーナスゲーム数で、ボーナス役（7揃い等）成立時に突入する無料ゲーム数を指定できます（0なら1回払い出しのみ）。BONUS中はBETを消費せずにスピンでき、残りゲーム数が画面上に表示されます",
                            "ART（アナザーリボルビング）をONにすると、ボーナス消化中にボーナス図柄で当たった場合に残りゲーム数を指定数だけ加算できます",
                            "サイドバーの「プレイヤー」タブでプレイヤーの追加・名前・残高・BETの編集ができます。各プレイヤーの「履歴を見る」でそのプレイヤーだけのスピン履歴を表示できます（ガチャのプレイヤー別履歴と同様）",
                            "サイドバーの「リール・図柄」タブで図柄マスタ・表示段数・ペイライン・天井・ボーナスゲーム数・ARTを編集できます。図柄マスタの各図柄はチェックボックスでオン/オフでき、オフにした図柄は抽選・リールから外れます（リール配列内の該当idは自動で別の図柄に置き換わります）。「テンプレート」タブで「1〜7 数字スロット」プリセット（等確率・当たりなし）の一括適用、標準テンプレート（確率）の適用、「均等」ボタンで全図柄を等確率に戻す操作、カスタムテンプレートの保存・読み込みができます。「統計」タブで全員またはプレイヤーを選んでスピン履歴と集計（総BET・総払出・実質機械割・ボーナス/リプレイ/天井回数）を確認できます",
                            "効果音は public/sounds/slot/ に spin・stop・reach・win の mp3 を置くと再生されます。歯車の「効果音を再生する」でオン/オフを、同じく「演出を表示する」でフラッシュ・紙吹雪のON/OFFを切り替えられます",
                        ]
                    }
                ]
            };
        } else {
            // Counter ( /counter )
            return {
                title: "Counter モード",
                icon: <Users className="text-purple-400" size={24} />,
                description: "入室カウント・項目集計を複数同時に行えるカウンターです。テンプレートや目標値で配信・イベントをサポートします。",
                sections: [
                    {
                        title: "基本操作",
                        items: [
                            "カードの中央をタップまたはクリックしてカウントアップします。長押しで連続増加",
                            "左上のメニュー（≡）からテンプレート選択・項目の追加・目標値・色の変更ができます",
                            "「テンプレート」で星座・血液型・47都道府県などあらかじめ用意した構成に切り替えられます",
                            "47都道府県を選ぶと、県の形をした地図（Geolonia の SVG）が表示されます。県をクリックまたはホバーすると増減ボタン（△/▽）が出るので、タップで増減できます。「県名表示」「件数表示」で地図上の県名・件数ラベルをそれぞれオンオフでき、「一覧・ランキング」で人数順の一覧をモーダル表示できます。スマホ・PCどちらでも同じ県形マップで表示されます",
                            "右上の設定（歯車）でカードサイズ・アクセント色・オーブの濃さなどを変更できます",
                            "カードサイズは S/M/L/XL のプリセットに加え、スライダーで50%〜150%の範囲で無段階に変更できます。地図レイアウトでも同じ倍率で表示されます",
                            "プリセットの L または XL、またはスライダーで大きくすると、数字と ±5・±10 や △▽ ボタンが押しやすくなります",
                            "タブレットや PC では、カードサイズが S/M のときも ± と △▽ は押しやすいサイズで表示されます",
                        ]
                    },
                    {
                        title: "結果と共有",
                        items: [
                            "「画像で共有」ボタン（ヘルプの左）で進捗を1枚の画像にし、ダウンロードとX投稿用画面を開けます",
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
                            <div className="p-6 overflow-y-auto scroll-touch" style={{
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
