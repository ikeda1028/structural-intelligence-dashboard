# 公開版への全国名称台帳の同梱（2026-09-26）

既存mainのReact公開画面と追加AIの制限処理を保持したまま、GET `/api/co-creation` を同梱データに切り替えました。公開画面や内部調査DBの取り替えはありません。

- 取得元: https://raw.githubusercontent.com/gsi-cyberjapan/gsimaps/gh-pages/js/muni.js
- 取得: 2026-09-25T17:52:25Z（日本時間9月26日）
- 件数: 1,741市区町村、47都道府県。行政区などの重複・集計対象外を既存parseGsiで除外。
- `lib/co-creation/registry.mjs` は取得データのスナップショットです。現在の総務省全自治体台帳との独立した完全突合は未実施です。元ファイルの確認済み最終変更日は2024-01-09。
- 閲覧時に外部台帳のネットワーク障害があっても名称検索できます。自動差分更新は今回の範囲外。
- 詳細資料の収録は引き続き3自治体9件、企業・NPOは6組織です。人口・予算の数値統計と全国の議事録分析は未取得。
- 追加AIは既存の明示フラグとSupabase quotaが必要で、今回SQLや本番環境変数は変更していません。既定は無効。既存 `docs/CO_CREATION_PUBLIC.md` の有効化手順を参照してください。
- Next.js 15.5.26を含む依存解決結果をpnpm-lock.yamlに反映しました。

`node --test tests/co-creation*.test.mjs` と `pnpm build` をCIで実行します。main反映後の匿名HTTPチェックは、公開HTML・API・台帳件数・収録企業の照合・Next.js静的資産を確認します。これは実AI/Supabaseの課金呼出しや、ブラウザUI操作の完全なE2E試験ではありません。

この変更は、先行してmainに入った公開版との重複を避けて追加したものです。旧バニラHTML試作ブランチは本番画面の置き換えに使いません。
