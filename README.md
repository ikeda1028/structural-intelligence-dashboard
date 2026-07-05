# Structural Intelligence Dashboard MVP

世界規模の政治・経済・思想・テクノロジー・社会・安全保障・教育・環境情報を収集し、構造分析、未来仮説、TLA事業示唆まで生成するためのNext.js MVPです。

## セットアップ

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Supabaseを使う場合は `supabase/migrations/001_initial_schema.sql` と `supabase/migrations/002_research_reports.sql` を実行し、`.env.local` にSupabaseとOpenAIのキーを設定してください。環境変数がない場合、画面はseedデータとサーバープロセス内メモリのデモモードで表示されます。

## ChatGPTレポートを使う

`.env.local` の `OPENAI_SI_API_KEY=` にOpenAI APIキーを入れて、開発サーバーを再起動してください。

```bash
OPENAI_SI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
```

設定後、インテリジェンスリサーチのレポート欄が `ChatGPT生成` に切り替わります。APIキーが未設定、または通信に失敗した場合は、ローカル推定で表示されます。

## 主な機能

- 情報源の一覧、登録、編集、停止
- 初期情報源seed
- RSS優先の手動/cronクロールAPI
- クロールログ保存
- URL正規化、重複判定、本文抽出、言語判定
- OpenAIによる日本語要約、領域分類、重要度、構造分析、未来仮説、TLA示唆生成
- インテリジェンスリサーチ検索
- 対象企業・団体のリスク対応度評価と競合比較
- 調査結果のDB蓄積と履歴一覧

## API

- `GET /api/sources`
- `POST /api/sources`
- `PATCH /api/sources/:id`
- `POST /api/crawl`
- `GET /api/cron/crawl?secret=...`
- `POST /api/analyze`
