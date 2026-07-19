import { Activity, AlertTriangle, CheckCircle2, PauseCircle, Plus, Save, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { listCrawlLogs, listSources } from "@/lib/repository";
import { isSupabaseAdminConfigured } from "@/lib/supabase";
import type { CrawlFrequency, CrawlLogWithSource, SourceType } from "@/lib/types";

const sourceTypes: SourceType[] = ["RSS", "Website", "API", "ThinkTank", "Government", "InternationalOrganization", "Academic", "NewsMedia"];
const frequencies: CrawlFrequency[] = ["hourly", "every_6_hours", "daily", "weekly"];
const sourceCategories = ["政治・国際機関", "経済・金融", "思想・社会", "テクノロジー"];
const sourceDescriptions: Record<string, string> = {
  "政治・国際機関": "政府、議会、国際機関、規制、外交、安全保障の動きを監視",
  "経済・金融": "財政、統計、中央銀行、投資、貿易、労働市場の変化を監視",
  "思想・社会": "教育、労働、文化、価値観、格差、信頼、人口動態を監視",
  "テクノロジー": "AI、半導体、サイバー、標準化、研究開発、デジタル政府を監視"
};
const pageSize = 100;

export const dynamic = "force-dynamic";

export default async function SourcesPage({ searchParams }: { searchParams?: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const selectedCategory = typeof params?.category === "string" ? params.category : "";
  const sources = await listSources();
  const crawlLogs = await listCrawlLogs(50);
  const totalSources = sources.length;
  const sourceSummary = sourceCategories.map((category) => ({
    category,
    count: sources.filter((source) => source.category === category).length,
    description: sourceDescriptions[category]
  }));
  const normalizedQuery = query.toLowerCase();
  const filteredSources = sources.filter((source) => {
    const matchesCategory = !selectedCategory || source.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    return [
      source.name,
      source.url,
      source.category,
      source.region,
      source.country,
      source.language,
      source.source_type
    ].some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });
  const visibleSources = filteredSources.slice(0, pageSize);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark"><Activity size={19} /></span>
            <span>牧山式インテリジェンスリサーチ</span>
          </Link>
          <nav className="nav">
            <Link href="/">ダッシュボード</Link>
            <Link href="/sources">情報源管理</Link>
            <Link href="/research-history">調査履歴</Link>
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>情報源管理</h1>
          <p>信頼性、領域、地域、巡回頻度を管理し、不要な情報源は停止できます。</p>
        </section>

        <section className="card section crawl-status-card">
          <div className="section-head">
            <div>
              <h2>自動クロール設定</h2>
              <p>Vercel Cronで毎日03:00（日本時間）に `/api/cron/crawl` を自動実行します。</p>
            </div>
            <span className={`status-pill ${isSupabaseAdminConfigured ? "success" : "warning"}`}>
              {isSupabaseAdminConfigured ? "DB永続化 有効" : "DB永続化 未設定"}
            </span>
          </div>
          {!isSupabaseAdminConfigured && (
            <p className="source-limit-note">
              本番環境に `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が揃っていないため、クロールはデモメモリ実行になり、履歴や取得結果が永続保存されません。
            </p>
          )}
        </section>

        <section className="grid">
          <div className="card section">
            <div className="section-head">
              <div>
                <h2>登録済み情報源</h2>
                <p>検索とカテゴリで絞り込み、最大100件だけを表示します。全体の厚みはカテゴリ集計で確認できます。</p>
              </div>
              <span className="pill">{totalSources} sources</span>
            </div>
            <div className="source-summary-grid">
              {sourceSummary.map(({ category, count, description }) => (
                <article key={category}>
                  <span>{category}</span>
                  <strong>{count}</strong>
                  <small>{description}</small>
                </article>
              ))}
            </div>
            <form className="source-filter-form" action="/sources" method="get">
              <div className="field wide">
                <label htmlFor="q">検索</label>
                <input id="q" name="q" type="search" defaultValue={query} placeholder="名称、URL、地域、国、種別で検索" />
              </div>
              <div className="field">
                <label htmlFor="category">カテゴリ</label>
                <select id="category" name="category" defaultValue={selectedCategory}>
                  <option value="">すべて</option>
                  {sourceCategories.map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </div>
              <button className="button primary" type="submit">
                <Search size={16} />
                絞り込み
              </button>
              <Link className="button" href="/sources">リセット</Link>
            </form>
            <p className="source-limit-note">表示中: {visibleSources.length} / 該当 {filteredSources.length} 件</p>
            <table className="source-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>領域</th>
                  <th>地域</th>
                  <th>頻度</th>
                  <th>信頼度</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleSources.map((source) => (
                  <tr key={source.id}>
                    <td><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></td>
                    <td>{source.category}</td>
                    <td>{source.region}</td>
                    <td>{source.crawl_frequency}</td>
                    <td>{source.reliability_score}</td>
                    <td>{source.is_active ? "稼働中" : "停止中"}</td>
                    <td>
                      <form action={`/api/sources/${source.id}`} method="post">
                        <input type="hidden" name="is_active" value={source.is_active ? "false" : "true"} />
                        <button className="button" type="submit" title="稼働状態を切り替え">
                          <PauseCircle size={15} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card section">
            <div className="section-head">
              <h2>新規登録</h2>
              <Plus size={18} />
            </div>
            <form className="form-grid" action="/api/sources" method="post">
              <Field label="名称" name="name" className="wide" required />
              <Field label="URL" name="url" className="wide" required />
              <Select label="種別" name="source_type" options={sourceTypes} />
              <Field label="国" name="country" required />
              <Field label="地域" name="region" required />
              <Field label="言語" name="language" defaultValue="en" required />
              <Field label="カテゴリ" name="category" defaultValue="テクノロジー" required />
              <Field label="信頼度" name="reliability_score" type="number" defaultValue="80" required />
              <Select label="巡回頻度" name="crawl_frequency" options={frequencies} />
              <button className="button primary wide" type="submit">
                <Save size={16} />
                保存
              </button>
            </form>
          </div>
        </section>

        <section className="card section crawl-history-section">
          <div className="section-head">
            <div>
              <h2>クロール履歴とブロック診断</h2>
              <p>取得成功、取得失敗、アクセス拒否・レート制限などの弾かれ疑いを残し、次に打つ対策を判断します。</p>
            </div>
            <span className="pill">{crawlLogs.length} logs</span>
          </div>
          {crawlLogs.length === 0 ? (
            <p className="empty-note">まだクロール履歴はありません。手動クロールまたはcron実行後に、ここへ結果が蓄積されます。</p>
          ) : (
            <table className="source-table crawl-history-table">
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>情報源</th>
                  <th>状態</th>
                  <th>弾かれ判定</th>
                  <th>詳細</th>
                  <th>対策案</th>
                </tr>
              </thead>
              <tbody>
                {crawlLogs.map((log) => {
                  const diagnosis = parseCrawlDiagnosis(log);
                  return (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.started_at)}</td>
                      <td>
                        {log.sources?.url ? (
                          <a href={log.sources.url} target="_blank" rel="noreferrer">{log.sources.name}</a>
                        ) : (
                          log.source_id
                        )}
                        <small>{log.sources ? `${log.sources.category} / ${log.sources.country}` : "source未取得"}</small>
                      </td>
                      <td>{renderStatus(log)}</td>
                      <td>{renderBlockedState(diagnosis.blocked, log.status)}</td>
                      <td>
                        <strong>{diagnosis.label}</strong>
                        <small>{diagnosis.detail}</small>
                      </td>
                      <td>{diagnosis.mitigation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

type CrawlDiagnosisView = {
  label: string;
  detail: string;
  blocked: boolean;
  mitigation: string;
};

function parseCrawlDiagnosis(log: CrawlLogWithSource): CrawlDiagnosisView {
  if (log.status === "success") {
    return {
      label: "取得成功",
      detail: `${log.items_found}件検出 / ${log.items_saved}件保存`,
      blocked: false,
      mitigation: "現状維持。保存0件が続く場合は重複または一覧ページの構造を確認する。"
    };
  }

  if (!log.error_message) {
    return {
      label: "失敗詳細なし",
      detail: "エラー本文が保存されていません。",
      blocked: false,
      mitigation: "再クロールして診断情報を蓄積する。"
    };
  }

  try {
    const parsed = JSON.parse(log.error_message) as Partial<{
      message: string;
      failureType: string;
      blocked: boolean;
      httpStatus: number;
      targetUrl: string;
      mitigation: string;
    }>;
    const label = [
      parsed.failureType ? failureTypeLabel(parsed.failureType) : "取得失敗",
      parsed.httpStatus ? `HTTP ${parsed.httpStatus}` : ""
    ].filter(Boolean).join(" / ");

    return {
      label,
      detail: [parsed.message, parsed.targetUrl].filter(Boolean).join(" - "),
      blocked: Boolean(parsed.blocked),
      mitigation: parsed.mitigation || "エラー文を確認し、公式RSS/API/軽量ページへの差し替えを検討する。"
    };
  } catch {
    return {
      label: "取得失敗",
      detail: log.error_message,
      blocked: /403|401|429|451|forbidden|rate/i.test(log.error_message),
      mitigation: "HTTPステータスと公式サイト構造を確認し、RSS/API/プレス一覧への差し替えを検討する。"
    };
  }
}

function failureTypeLabel(type: string) {
  const labels: Record<string, string> = {
    access_denied: "アクセス拒否",
    rate_limited: "レート制限",
    legal_or_geo_block: "法務・地域ブロック",
    bot_protection: "bot対策",
    not_found: "URL不明",
    server_error: "サーバー障害",
    timeout: "タイムアウト",
    dns_error: "DNSエラー",
    tls_error: "TLSエラー",
    feed_parse_error: "RSS解析失敗",
    fetch_error: "取得失敗"
  };
  return labels[type] ?? type;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderStatus(log: CrawlLogWithSource) {
  if (log.status === "success") {
    return <span className="status-pill success"><CheckCircle2 size={14} />成功</span>;
  }
  if (log.status === "partial") {
    return <span className="status-pill warning"><AlertTriangle size={14} />一部</span>;
  }
  return <span className="status-pill danger"><AlertTriangle size={14} />失敗</span>;
}

function renderBlockedState(blocked: boolean, status: CrawlLogWithSource["status"]) {
  if (blocked) return <span className="status-pill danger"><ShieldAlert size={14} />弾かれ疑い</span>;
  if (status === "success") return <span className="status-pill success">問題なし</span>;
  return <span className="status-pill warning">要確認</span>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, className, ...inputProps } = props;
  return (
    <div className={`field ${className || ""}`}>
      <label htmlFor={inputProps.name}>{label}</label>
      <input id={inputProps.name} {...inputProps} />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
