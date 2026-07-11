import { Activity, PauseCircle, Plus, Save, Search } from "lucide-react";
import Link from "next/link";
import { listSources } from "@/lib/repository";
import type { CrawlFrequency, SourceType } from "@/lib/types";

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
      </main>
    </div>
  );
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
