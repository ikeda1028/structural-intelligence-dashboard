import { Activity, ArrowLeft, ExternalLink, Gauge, SearchCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buildRiskResponseResearch } from "@/lib/risk-response-research";

export default async function RiskResearchPage({ searchParams }: { searchParams?: Promise<{ target?: string }> }) {
  const params = await searchParams;
  const target = typeof params?.target === "string" ? params.target : "";
  const research = await buildRiskResponseResearch(target);

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
        <section className="risk-hero card section">
          <div>
            <Link className="back-link" href={`/?research=${encodeURIComponent(research.target)}`}>
              <ArrowLeft size={15} />
              インテリジェンスリサーチへ戻る
            </Link>
            <h1>{research.target} リスク対応調査</h1>
            <p>{research.overallAssessment}</p>
          </div>
          <div className="risk-score-dial">
            <span>対応度</span>
            <strong>{research.overallScore}</strong>
            <small>{research.analysisMode}</small>
          </div>
        </section>

        <section className="risk-summary-grid">
          <MetricCard label="調査リスク" value={research.risks.length} icon={<SearchCheck size={18} />} />
          <MetricCard label="高対応" value={research.risks.filter((risk) => risk.status === "高い").length} icon={<ShieldCheck size={18} />} />
          <MetricCard label="要追加調査" value={research.risks.filter((risk) => risk.status === "低い" || risk.status === "不明").length} icon={<Gauge size={18} />} />
        </section>

        <section className="card section competitor-section">
          <div className="section-head">
            <h2>競合対応比較</h2>
            <span className="pill">{research.competitors.length} competitors</span>
          </div>
          <div className="competitor-grid">
            <article className="competitor-card target-card">
              <div className="competitor-head">
                <div>
                  <span>対象</span>
                  <strong>{research.target}</strong>
                </div>
                <b>{research.overallScore}</b>
              </div>
              <p>{research.overallAssessment}</p>
            </article>
            {research.competitors.map((competitor) => (
              <article className="competitor-card" key={competitor.name}>
                <div className="competitor-head">
                  <div>
                    <span>{competitor.relationship}</span>
                    <strong>{competitor.name}</strong>
                  </div>
                  <b>{competitor.overallScore}</b>
                </div>
                <div className={`relative-pill relative-${competitor.relativePosition}`}>{competitor.relativePosition}</div>
                <div className="competitor-points">
                  <div>
                    <h3>強み</h3>
                    {competitor.strengths.slice(0, 3).map((item) => <p key={item}>{item}</p>)}
                  </div>
                  <div>
                    <h3>弱み</h3>
                    {competitor.weaknesses.slice(0, 3).map((item) => <p key={item}>{item}</p>)}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {research.competitors.length > 0 ? (
            <div className="competitor-table-wrap">
              <table className="competitor-table">
                <thead>
                  <tr>
                    <th>競合</th>
                    <th>リスク別対応</th>
                    <th>根拠</th>
                  </tr>
                </thead>
                <tbody>
                  {research.competitors.map((competitor) => (
                    <tr key={`${competitor.name}-detail`}>
                      <td>
                        <strong>{competitor.name}</strong>
                        <span>{competitor.overallScore} / {competitor.relativePosition}</span>
                      </td>
                      <td>
                        <div className="risk-score-tags">
                          {competitor.riskScores.slice(0, 5).map((risk) => (
                            <div key={`${competitor.name}-${risk.risk}`}>
                              <span>{risk.risk}</span>
                              <b>{risk.score}</b>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="evidence-links">
                          {competitor.riskScores.flatMap((risk) => risk.evidence).slice(0, 4).map((source) => (
                            source.url ? (
                              <a href={source.url} target="_blank" rel="noreferrer" key={`${competitor.name}-${source.url}`}>
                                <ExternalLink size={13} />
                                {source.title || source.publisher || "根拠ソース"}
                              </a>
                            ) : (
                              <span key={`${competitor.name}-${source.title}`}>{source.title || source.publisher || "根拠ソース"}</span>
                            )
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="card section risk-table-section">
          <div className="section-head">
            <h2>リスク対応度一覧</h2>
            <span className="pill">{research.generatedAt}</span>
          </div>
          <div className="risk-table-wrap">
            <table className="risk-table">
              <thead>
                <tr>
                  <th>リスク</th>
                  <th>領域</th>
                  <th>対応度</th>
                  <th>対応状況</th>
                  <th>根拠</th>
                  <th>不足情報</th>
                </tr>
              </thead>
              <tbody>
                {research.risks.map((risk) => (
                  <tr key={`${risk.risk}-${risk.riskCategory}`}>
                    <td>
                      <strong>{risk.risk}</strong>
                      <p>{risk.whyItMatters}</p>
                    </td>
                    <td><span className="pill">{risk.riskCategory}</span></td>
                    <td>
                      <div className="score-cell">
                        <b>{risk.responseScore}</b>
                        <div className="mini-track"><span style={{ width: `${risk.responseScore}%` }} /></div>
                        <small>{risk.status}</small>
                      </div>
                    </td>
                    <td>
                      <p>{risk.responseSummary}</p>
                      <small>{risk.scoreReason}</small>
                    </td>
                    <td>
                      <div className="evidence-links">
                        {risk.evidence.length === 0 ? (
                          <span>根拠未取得</span>
                        ) : risk.evidence.slice(0, 3).map((source) => (
                          source.url ? (
                            <a href={source.url} target="_blank" rel="noreferrer" key={`${risk.risk}-${source.url}`}>
                              <ExternalLink size={13} />
                              {source.title || source.publisher || "根拠ソース"}
                            </a>
                          ) : (
                            <span key={`${risk.risk}-${source.title}`}>{source.title || source.publisher || "根拠ソース"}</span>
                          )
                        ))}
                      </div>
                    </td>
                    <td><p>{risk.missingEvidence || "追加確認事項なし"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card section">
          <div className="section-head">
            <h2>次に見る問い</h2>
          </div>
          <div className="next-question-grid">
            {research.nextResearchQuestions.map((question) => (
              <article key={question}>{question}</article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <article className="card risk-metric">
      <span>{icon} {label}</span>
      <strong>{value}</strong>
    </article>
  );
}
