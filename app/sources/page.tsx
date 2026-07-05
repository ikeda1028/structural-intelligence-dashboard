import { Activity, PauseCircle, Plus, Save } from "lucide-react";
import Link from "next/link";
import { listSources } from "@/lib/repository";
import type { CrawlFrequency, SourceType } from "@/lib/types";

const sourceTypes: SourceType[] = ["RSS", "Website", "API", "ThinkTank", "Government", "InternationalOrganization", "Academic", "NewsMedia"];
const frequencies: CrawlFrequency[] = ["hourly", "every_6_hours", "daily", "weekly"];

export default async function SourcesPage() {
  const sources = await listSources();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark"><Activity size={19} /></span>
            <span>Structural Intelligence Dashboard</span>
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
              <h2>登録済み情報源</h2>
              <span className="pill">{sources.length} sources</span>
            </div>
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
                {sources.map((source) => (
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
