import { Activity, Plus, Save } from "lucide-react";
import Link from "next/link";
import type { CrawlFrequency, SourceType } from "@/lib/types";

const sourceTypes: SourceType[] = ["RSS", "Website", "API", "ThinkTank", "Government", "InternationalOrganization", "Academic", "NewsMedia"];
const frequencies: CrawlFrequency[] = ["hourly", "every_6_hours", "daily", "weekly"];
const sourceSummary = [
  { category: "政治・国際機関", count: 518, description: "政府、議会、国際機関、規制、外交、安全保障の動きを監視" },
  { category: "経済・金融", count: 538, description: "財政、統計、中央銀行、投資、貿易、労働市場の変化を監視" },
  { category: "思想・社会", count: 516, description: "教育、労働、文化、価値観、格差、信頼、人口動態を監視" },
  { category: "テクノロジー", count: 524, description: "AI、半導体、サイバー、標準化、研究開発、デジタル政府を監視" }
];

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const totalSources = sourceSummary.reduce((sum, source) => sum + source.count, 0);

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
                <p>情報源は4ジャンルそれぞれ約500件規模で保持しています。全件表は重くなるため、ここではポートフォリオ全体の厚みを確認します。</p>
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
            <p className="source-limit-note">全件の確認や個別停止は、今後フィルタ・検索付きの軽量テーブルとして分離します。</p>
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
