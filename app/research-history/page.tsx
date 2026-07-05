import { Activity, Database, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { listIntelligenceResearchReports, listRiskResponseResearchReports } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ResearchHistoryPage() {
  const [intelligenceReports, riskReports] = await Promise.all([
    listIntelligenceResearchReports(30),
    listRiskResponseResearchReports(30)
  ]);

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
        <section className="hero compact-hero">
          <span className="hero-kicker"><Database size={16} /> Research Database</span>
          <h1>蓄積された調査結果</h1>
          <p>インテリジェンスリサーチとリスク対応調査を、対象ごと・日付ごとに保存して比較できるようにします。</p>
        </section>

        <section className="history-grid">
          <article className="card history-stat">
            <span><FileText size={17} /> 構造レポート</span>
            <strong>{intelligenceReports.length}</strong>
          </article>
          <article className="card history-stat">
            <span><ShieldCheck size={17} /> リスク対応評価</span>
            <strong>{riskReports.length}</strong>
          </article>
        </section>

        <section className="card section history-section">
          <div className="section-head">
            <h2>インテリジェンスリサーチ</h2>
            <span className="pill">{intelligenceReports.length} reports</span>
          </div>
          {intelligenceReports.length === 0 ? (
            <p className="empty-note">まだ保存された構造レポートはありません。検索窓から対象を調べるとここに蓄積されます。</p>
          ) : (
            <div className="history-list">
              {intelligenceReports.map((report) => (
                <article className="history-item" key={report.id}>
                  <div>
                    <span className="history-date">{report.report_date}</span>
                    <h3>{report.target}</h3>
                    <p>{readReportText(report.report, "executiveSummary") || report.headline}</p>
                  </div>
                  <div className="history-actions">
                    <span className="pill">{readAnalysisLabel(report.analysis_mode)}</span>
                    <Link className="button ghost-button" href={`/?research=${encodeURIComponent(report.target)}`}>再表示</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card section history-section">
          <div className="section-head">
            <h2>リスク対応調査</h2>
            <span className="pill">{riskReports.length} reports</span>
          </div>
          {riskReports.length === 0 ? (
            <p className="empty-note">まだ保存されたリスク対応評価はありません。リスク対応調査を実行するとここに蓄積されます。</p>
          ) : (
            <div className="history-list">
              {riskReports.map((report) => (
                <article className="history-item" key={report.id}>
                  <div>
                    <span className="history-date">{report.report_date}</span>
                    <h3>{report.target}</h3>
                    <p>{report.overall_assessment}</p>
                    <div className="history-meta">
                      <span>{safeLength(report.risks)} risks</span>
                      <span>{safeLength(report.competitors)} competitors</span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <div className="history-score">{report.overall_score}</div>
                    <Link className="button ghost-button" href={`/risk-research?target=${encodeURIComponent(report.target)}`}>詳細</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function readReportText(value: unknown, key: string) {
  if (!value || typeof value !== "object" || !(key in value)) return "";
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : "";
}

function readAnalysisLabel(value: unknown) {
  if (!value || typeof value !== "object" || !("label" in value)) return "保存済み";
  const label = (value as Record<string, unknown>).label;
  return typeof label === "string" ? label : "保存済み";
}

function safeLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}
