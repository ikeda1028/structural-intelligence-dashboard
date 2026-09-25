# TLA共創OS 公開β v0.2 / 牧山式インテリジェンスへの追加

## 公開経路

既存の `structural-intelligence-dashboard` に独立した `/co-creation` と `/api/co-creation` を追加します。既存トップページ、クロール、内部リサーチ履歴は変更しません。既存Vercelプロジェクトの実行基盤を使用します。公開先の予定URLは `https://structural-intelligence-dashboard.vercel.app/co-creation` です。URLの存在・配備状態は実際のVercelビルド結果とHTTP応答で確認してください。

## 収録・公開範囲

- 国土地理院 muni.js の全国名称・コード台帳をサーバーで取得し、形式と件数を検証。政令市行政区の重複を避け、東京23区は残します。1,741件はv0.1基準で、実表示件数は取得結果から計算します。取得できなければ3自治体の収録資料だけを表示し、全国分が利用できないことを明記します。
- 詳細資料は三浦市・佐倉市・うるま市の9件の短い要約。6企業・NPO。13分野のタグ照合。終了募集は除外し、既存取組は明示します。
- 全国の予算、議事録、人口数値を収集済みとは表示しません。GSI元データの変更日は2024-01-09。2026年の最新台帳との完全照合は未実施です。
- 非公開のTLA人脈、紹介経路、連絡先、既存Supabaseの研究レポートは読み出しません。公開データの出典は `lib/co-creation/seed.mjs` と画面に表示します。
- 構想はこのブラウザの専用localStorageに保存。旧v0.1の保存データとの自動同期はありません。JSON書出し・端末内削除に対応します。

## 追加AI調査を有効にする手順

収録済み6組織の照合は追加APIキーなしで使用できます。未収録企業のWeb検索付きAI調査は、以下がすべて揃うまで停止します。

1. 既存SupabaseプロジェクトのSQL Editor等、管理者の認証済み環境で `supabase/migrations/20260926_tla_cocreation_quota.sql` を実行します。新しい専用テーブルとRPCだけを作り、既存データやRLSポリシーは変更しません。
2. 既存VercelプロジェクトのEnvironment Variablesで `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`OPENAI_SI_API_KEY`（または `OPENAI_API_KEY`）がサーバー用として設定済みか確認します。秘密値をソースコード、チャット、NEXT_PUBLIC_付き変数へ貼らないでください。
3. 課金・送信条件を確認した上で `TLA_PUBLIC_RESEARCH_ENABLED=1` を追加して再デプロイします。任意の `TLA_CO_CREATION_MODEL` でモデルを指定できます。既定は `gpt-4.1-mini`。既存の一般研究用 `OPENAI_MODEL` は変更しません。
4. 1社で公式URL照合、出典の内容、API利用量、429上限制御を確認します。出典URLの存在確認は、資源の内容や法人番号の独立検証とは違います。

この変更だけではSQLは自動実行されず、環境変数も自動作成されません。実AIとの疎通・SQL実行は別途確認が必要です。設定やDBに問題がある場合、料金を伴うAI呼出しは行わず503を返します。

## 回数制限・個人情報

Supabaseの専用RPCで同時実行を含めて枠を確保します。UTC日付で接続元ごとに3回、全体30回。失敗も枠に含めます。Vercelが設定した接続元ヘッダーを日次HMACへ変換し、生のIPを本機能のDBに保存しません。ヘッダーが得られない場合は共通枠とし、任意の転送ヘッダーを信用して枠を増やしません。次のリクエスト時に8日前以前の枠を消します。ホスト側アクセスログは別管理です。

リクエストは同一Origin、JSON、4KB以内。企業名2〜120文字、公開HTTPS URLのみ、外部送信への同意が必要です。OpenAIへの保存指定はstore:falseですが、プロバイダーのデータ取扱条件は別途確認してください。キーや上流のエラーダンプはブラウザへ返しません。AI結果は自動公開・サーバー保存しません。紹介・応募・メンバー登録は自動送信しません。

回数制限は金額による厳密な支出上限やボット対策の代わりではありません。公開規模に応じてWAF、CAPTCHA、認証、予算アラート、運用責任者・利用規約を追加してください。

## テストと依存関係

`node --test tests/co-creation.test.mjs` : 40件のローカルテストが成功。外部API・DBはテスト用応答に置き換えています。TSXの構文検査済みですが、ローカル環境でNext.jsの完全ビルドやブラウザ実操作は未検証です。Vercelではテスト成功後にNext.jsビルドを行います。

Next.jsとeslint-config-nextを公式の2026-09-22公開版15.5.26へ固定。ローカルからnpmへ接続できないため、この変更時点のpnpm-lock.yamlは再生成されていません。VercelのinstallCommandで `pnpm install --no-frozen-lockfile` を使用し、必要な依存解決を許可しています。管理者はネットワークのある環境で同じコマンドを実行して更新済みlockfileをコミットし、将来はfrozen-lockfileへ戻してください。

既存サービス全体の第三者セキュリティ監査を実施したものではありません。9月30日に予告されている次のセキュリティ更新は、リリース後に別途確認してください。

## ロールバック

追加AI調査だけの停止は `TLA_PUBLIC_RESEARCH_ENABLED` を削除/0にし再デプロイします。コード全体は通常のrevertコミットまたはVercelの認証済み管理画面で既知のデプロイへ戻します。既存テーブルやユーザーデータを削除する必要はありません。mainの履歴をforce pushで巻き戻さないでください。

## 参照

- 既存コード: https://github.com/ikeda1028/structural-intelligence-dashboard
- Vercel Git連携: https://vercel.com/docs/git
- Vercelリクエストヘッダー: https://vercel.com/docs/headers/request-headers
- OpenAI Web検索: https://developers.openai.com/api/docs/guides/tools-web-search
- Next.js公式更新案内: https://nextjs.org/blog
- GSIデータ: https://github.com/gsi-cyberjapan/gsimaps/blob/gh-pages/js/muni.js
- 地理院コンテンツ利用規約: https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
