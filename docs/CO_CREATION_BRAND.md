# 共創OSへのTLA統合ビジュアルアイデンティティ適用

2026-09-27。既存「TLA統合ビジュアルアイデンティティ制作」のWeb実装・素材を参照。
参照サイト：https://tla-tankyu-leadership-academy.luketesla4.chatgpt.site/

## 再利用した要素

- 既存 `public/tla-logo-canonical.png` を無改変で同梱。TLAの連結ロゴと青いアンダースコアは描き直さない。
- 元サイトと同じ表示方法で画像の余白だけをCSSでクリップ。ロゴ自体の形状・配色・縦横比は維持。
- Paper `#f2efe7` / Ink `#071427` / Blue `#0b64f4` / Muted `#616975`。
- 欧文は元サイトで配信しているGeistとGeist MonoのLatin可変フォントを無改変でコピー。日本語は元サイトと同系統のシステムフォントにフォールバック。
- フォントは自サイトで配信。外部フォントAPIへアクセスせず、同梱のSIL OFL 1.1が適用される。ライセンス出典：https://raw.githubusercontent.com/vercel/geist-font/main/OFL.txt
- 余白、細い罫線、角形ボタン、等幅のセクション番号、Q_から点と線が広がる球状ネットワーク。

## 共創OS向けの調整

ネットワークは元サイトのFibonacci球の構成を静止SVGとして再構成。「地域の資料」「企業のリソース」「共創の仮説」の概念図であり、実際の受託・提携関係や調査件数を描いたものではない。スクリーンリーダー向けにもその範囲を明示。

適用範囲は `/co-creation` とその検索・台帳・保存画面。別URLの詳細リサーチレポートや牧山式インテリジェンス本体のテーマは変更しない。既存データ、API、利用回数制限、外部送信への同意、保存処理は変更しない。

## 素材の参照元

ローカルの `2026-08-31/files-mentioned-by-the-user-tla` にある `app/globals.css`、`app/home.tsx`、`app/network-scene.tsx`、`public/tla-logo-canonical.png`、ビルド済み `_vinext_fonts` を参照。今回の公開物にはロゴ・フォントのみをコピーし、人物写真・名刺の個人連絡先・他の資料は含めない。
