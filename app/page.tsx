import { Activity, ArrowRight, BadgeCheck, Banknote, Brain, Database, Globe2, Landmark, Layers3, Radio, Search, ShieldCheck, Telescope, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { buildCountryLayer } from "@/lib/country-layer";
import { getEraMovements, getEraThesis, quadrantTable } from "@/lib/era-map";
import { buildIntelligenceResearch } from "@/lib/intelligence-research";
import { listDashboardItems, listSources } from "@/lib/repository";

export default async function Home({ searchParams }: { searchParams?: Promise<{ research?: string }> }) {
  const params = await searchParams;
  const researchQuery = typeof params?.research === "string" ? params.research : "";
  const sources = await listSources();
  const dashboardItems = await listDashboardItems();
  const activeSources = sources.filter((source) => source.is_active);
  const categories = new Set(sources.map((source) => source.category));
  const topSources = sources.slice(0, 7);
  const eraMovements = getEraMovements(sources, dashboardItems as any);
  const leadMovement = eraMovements[0];
  const eraThesis = getEraThesis(dashboardItems as any);
  const countryLayer = buildCountryLayer(sources, dashboardItems as any);
  const intelligenceResearch = await buildIntelligenceResearch(researchQuery, sources, dashboardItems as any);
  const evidenceCoverage = [
    { label: "政治", category: "政治・国際機関" },
    { label: "経済", category: "経済・金融" },
    { label: "思想", category: "思想・社会" },
    { label: "テクノロジー", category: "テクノロジー" }
  ].map((entry) => ({
    ...entry,
    sources: sources.filter((source) => source.category === entry.category),
    signals: (dashboardItems as any[]).filter((item) => item.category === entry.category)
  }));

  return (
    <div className="shell">
      <Header />
      <main className="main">
        <section className="hero">
          <h1>時代がどちらへ動くのかを、構造で見る。</h1>
          <p>
            政治・経済・思想・テクノロジー・社会・安全保障・教育の情報を、
            点のニュースではなく、強まる力、弱まる力、未来仮説、TLAの打ち手として可視化します。
          </p>
        </section>

        <section className="metrics">
          <Metric label="登録情報源" value={sources.length} icon={<Globe2 size={18} />} />
          <Metric label="稼働中" value={activeSources.length} icon={<Radio size={18} />} />
          <Metric label="領域カテゴリ" value={categories.size} icon={<Database size={18} />} />
          <Metric label="最大変化速度" value={leadMovement.observedVelocity} icon={<TrendingUp size={18} />} />
        </section>

        <section className="intelligence-research card section">
          <div className="section-head">
            <h2>インテリジェンスリサーチ</h2>
            <span className="pill">組織・個人の影響構造</span>
          </div>
          <form className="research-form" action="/" method="get">
            <label htmlFor="research">調べたい組織・個人</label>
            <div className="research-input-row">
              <input
                id="research"
                name="research"
                type="search"
                defaultValue={researchQuery}
                placeholder="例: OpenAI、トヨタ、東京都、孫正義、ASEAN企業..."
              />
              <button className="button primary" type="submit">
                <Search size={16} />
                構造を見る
              </button>
            </div>
          </form>
          {intelligenceResearch ? (
            <div className="research-result">
              <div className="research-brief">
                <span>対象</span>
                <h3>{intelligenceResearch.target}</h3>
                <p>{intelligenceResearch.headline}</p>
              </div>
              <section className="power-map-card">
                <div className="degradation-first">
                  <span>最初に見る劣化</span>
                  <p>{intelligenceResearch.powerMap.degradationFirst}</p>
                </div>
                <div className="power-map-head">
                  <div>
                    <span>牧山版四象限</span>
                    <h3>{intelligenceResearch.powerMap.title}</h3>
                  </div>
                  <div className="power-map-scores">
                    <div>
                      <span>団体の力</span>
                      <strong>{intelligenceResearch.powerMap.organizationPower}</strong>
                      <small>{intelligenceResearch.powerMap.organizationPowerLabel}</small>
                    </div>
                    <div>
                      <span>個人への作用</span>
                      <strong>{intelligenceResearch.powerMap.individualExposure}</strong>
                      <small>{intelligenceResearch.powerMap.individualExposureLabel}</small>
                    </div>
                  </div>
                </div>
                <div className="wilber-power-map" aria-label="外側の四つのパワーが団体と個人に作用する構造図">
                  {intelligenceResearch.powerMap.fields.map((field) => (
                    <article
                      className={`power-node power-${field.key}`}
                      key={field.key}
                      style={{ "--power": field.score } as React.CSSProperties}
                    >
                      <div className="power-node-title">
                        <strong>{field.label}</strong>
                        <b>{field.score}</b>
                      </div>
                      <p>{field.pressure}</p>
                    </article>
                  ))}
                  <div className="power-rail rail-top" />
                  <div className="power-rail rail-left" />
                  <div className="power-rail rail-right" />
                  <div className="power-rail rail-bottom" />
                  <div className="collective-node">
                    <span>集団</span>
                    <strong>{intelligenceResearch.target}</strong>
                    <p>{intelligenceResearch.powerMap.collectiveWill}</p>
                    <div className="person-node">
                      <span>個人</span>
                      <small>任意・強制</small>
                    </div>
                  </div>
                </div>
                <div className="power-detail-grid">
                  {intelligenceResearch.powerMap.fields.map((field) => (
                    <article key={`${field.key}-detail`}>
                      <div>
                        <strong>{field.label}</strong>
                        <span>{field.sourceQuadrant}</span>
                      </div>
                      <p>{field.organizationEffect}</p>
                      <small>{field.individualEffect}</small>
                    </article>
                  ))}
                </div>
                <p className="coercive-note">{intelligenceResearch.powerMap.coercivePressure}</p>
              </section>
              <article className="research-report">
                <div className="report-head">
                  <span>レポート</span>
                  <h3>{intelligenceResearch.report.title}</h3>
                  <div className="report-head-actions">
                    <div className="report-mode">
                      <BadgeCheck size={14} />
                      {intelligenceResearch.analysisMode.label}
                      <small>{intelligenceResearch.analysisMode.detail}</small>
                    </div>
                    <Link className="button" href={`/risk-research?target=${encodeURIComponent(intelligenceResearch.target)}`}>
                      <ShieldCheck size={16} />
                      リスク対応調査
                    </Link>
                  </div>
                </div>
                <section>
                  <h4>エグゼクティブサマリー</h4>
                  <p>{intelligenceResearch.report.executiveSummary}</p>
                </section>
                <section>
                  <h4>構造的位置</h4>
                  <p>{intelligenceResearch.report.structuralPosition}</p>
                </section>
                <section>
                  <h4>想定される影響</h4>
                  <ol>
                    {intelligenceResearch.report.impactAssessment.map((impact) => (
                      <li key={impact}>{impact}</li>
                    ))}
                  </ol>
                </section>
                <div className="report-two-column">
                  <section>
                    <h4>機会</h4>
                    <p>{intelligenceResearch.report.opportunity}</p>
                  </section>
                  <section>
                    <h4>リスク</h4>
                    <p>{intelligenceResearch.report.risk}</p>
                  </section>
                </div>
                <div className="report-two-column">
                  <section>
                    <h4>監視ポイント</h4>
                    <ul>
                      {intelligenceResearch.report.watchPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h4>推奨アクション</h4>
                    <ul>
                      {intelligenceResearch.report.recommendation.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </article>
              <div className="research-impact-grid">
                {intelligenceResearch.impactPaths.map((path, index) => (
                  <article key={path}>
                    <span>{index + 1}</span>
                    <p>{path}</p>
                  </article>
                ))}
              </div>
              <div className="research-structure-grid">
                <div className="research-quadrants">
                  {intelligenceResearch.quadrants.map((quadrant) => (
                    <article className={`research-q research-q-${quadrant.label}`} key={quadrant.label}>
                      <div>
                        <strong>{quadrant.label}</strong>
                        <span>{quadrant.relevance}</span>
                      </div>
                      <p>{quadrant.structure}</p>
                      <small>{quadrant.intent}</small>
                    </article>
                  ))}
                </div>
                <div className="research-side">
                  <div>
                    <h3>関係国・地域</h3>
                    <div className="research-country-list">
                      {intelligenceResearch.countries.map((country) => (
                        <span key={country.code}>{country.name}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>次に見る問い</h3>
                    <ul>
                      {intelligenceResearch.recommendedNextSearches.map((query) => (
                        <li key={query}>{query}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="research-evidence">
                <div>
                  <h3>関連ソース</h3>
                  {intelligenceResearch.relatedSources.length === 0 ? (
                    <p>直接一致する登録ソースはまだありません。四象限の基礎ソースから影響構造を推定しています。</p>
                  ) : intelligenceResearch.relatedSources.map(({ source }) => (
                    <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                      <strong>{source.name}</strong>
                      <span>{source.category} / {source.country}</span>
                    </a>
                  ))}
                </div>
                <div>
                  <h3>関連シグナル</h3>
                  {intelligenceResearch.relatedItems.length === 0 ? (
                    <p>この対象名を含む取得済みシグナルはまだありません。クロール後に根拠がここへ増えていきます。</p>
                  ) : intelligenceResearch.relatedItems.map(({ item }) => (
                    <a href={item.url} target="_blank" rel="noreferrer" key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.category || "未分類"} / 重要度 {item.importance_score || "-"}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="research-empty">
              <Search size={18} />
              <p>組織名・個人名を入れると、政治・経済・思想・テクノロジーのどの力に影響されるかを構造化します。</p>
            </div>
          )}
        </section>

        <section className="evidence-coverage card section">
          <div className="section-head">
            <h2>根拠ソース網</h2>
            <form action="/api/crawl" method="post">
              <button className="button primary" type="submit">
                <Zap size={16} />
                四象限クロール
              </button>
            </form>
          </div>
          <div className="coverage-grid">
            {evidenceCoverage.map((entry) => {
              const activeCount = entry.sources.filter((source) => source.is_active).length;
              const rssCount = entry.sources.filter((source) => source.url.includes("rss") || source.url.includes("feed")).length;
              return (
                <article className={`coverage-card coverage-${entry.label}`} key={entry.label}>
                  <span>{entry.label}</span>
                  <strong>{activeCount}</strong>
                  <p>根拠ソース / RSS優先 {rssCount} / 取得シグナル {entry.signals.length}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="country-layer card section">
          <div className="section-head">
            <h2>第二レイヤー: 国別四象限</h2>
            <form action="/api/crawl?layer=country" method="post">
              <button className="button primary" type="submit">
                <Globe2 size={16} />
                国別クロール
              </button>
            </form>
          </div>
          <div className="country-layer-grid">
            {countryLayer.slice(0, 12).map((country) => (
              <article className="country-card" key={country.code}>
                <div className="country-head">
                  <div>
                    <strong>{country.name}</strong>
                    <span>{country.code}</span>
                  </div>
                  <b>{country.totalSources}</b>
                </div>
                <p>{country.thesis}</p>
                <div className="country-quadrants">
                  {country.quadrants.map((quadrant) => (
                    <div className={`country-q country-q-${quadrant.label}`} key={`${country.code}-${quadrant.key}`}>
                      <span>{quadrant.label}</span>
                      <strong>{quadrant.sourceCount}</strong>
                      <small>{quadrant.signalCount} signals</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="era-grid">
          <div className="era-map card section">
            <div className="section-head">
              <h2>時代の重心</h2>
              <span className="pill">構造変化マップ</span>
            </div>
            <p className="thesis">{eraThesis}</p>
            <div className="movement-lanes">
              {eraMovements.map((movement) => (
                <article className="movement" key={movement.domain}>
                  <div className="movement-top">
                    <div>
                      <strong>{movement.domain}</strong>
                      <p>{movement.direction}</p>
                    </div>
                    <span>{movement.observedVelocity}</span>
                  </div>
                  <div className="velocity-track" aria-label={`${movement.domain}の変化速度`}>
                    <div style={{ width: `${movement.observedVelocity}%` }} />
                  </div>
                  <div className="movement-foot">
                    <span>{movement.sourceCount} sources</span>
                    <span>{movement.itemCount} signals</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card section">
            <div className="section-head">
              <h2>読み筋</h2>
              <Telescope size={18} />
            </div>
            <div className="era-focus">
              <span className="focus-label">最も速い変化</span>
              <h3>{leadMovement.domain}</h3>
              <p>{leadMovement.structuralShift}</p>
            </div>
            <div className="force-list">
              <Force title="強まる力" items={["AI前提の組織設計", "地政学を読む教育", "学習成果の証明", "地域単位の実装力"]} />
              <Force title="弱まる力" items={["暗記中心の学習", "単発研修", "東京一極の機会設計", "ニュース消費だけの情報収集"]} />
            </div>
          </div>
        </section>

        <section className="card section horizon-section">
          <div className="section-head">
            <h2>未来仮説タイムライン</h2>
            <Layers3 size={18} />
          </div>
          <div className="horizon-grid">
            {[
              { label: "3か月", field: "near" as const },
              { label: "1年", field: "mid" as const },
              { label: "3年", field: "long" as const }
            ].map((horizon) => (
              <div className="horizon" key={horizon.label}>
                <span>{horizon.label}</span>
                {eraMovements.slice(0, 4).map((movement) => (
                  <article key={`${horizon.label}-${movement.domain}`}>
                    <strong>{movement.domain}</strong>
                    <p>{movement[horizon.field]}</p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="action-river">
          {eraMovements.slice(0, 4).map((movement) => (
            <article className="action-node" key={movement.domain}>
              <span>{movement.domain}</span>
              <ArrowRight size={16} />
              <p>{movement.tlaAction}</p>
            </article>
          ))}
        </section>

        <section className="card section quadrant-section">
          <div className="section-head">
            <h2>四象限サマリー</h2>
            <span className="pill">政治・経済・思想・テクノロジー</span>
          </div>
          <div className="quadrant-visual" aria-label="政治・経済・思想・テクノロジーの四象限マップ">
            <div className="axis-label axis-top">制度・ルール</div>
            <div className="axis-label axis-bottom">価値・能力</div>
            <div className="axis-label axis-left">社会の合意</div>
            <div className="axis-label axis-right">実装の速度</div>
            <div className="center-node">
              <span>時代の重心</span>
              <strong>学び直し続ける社会</strong>
            </div>
            {quadrantTable.map((row) => (
              <article className={`q-card q-${row.quadrant}`} key={`visual-${row.quadrant}`}>
                <div className="q-card-head">
                  <span className="q-icon">{getQuadrantIcon(row.quadrant)}</span>
                  <strong>{row.quadrant}</strong>
                </div>
                <p>{row.currentShift}</p>
                <div className="q-signal">
                  <span>見る</span>
                  <small>{row.watchingSignals}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="quadrant-table-wrap">
            <table className="quadrant-table">
              <thead>
                <tr>
                  <th>象限</th>
                  <th>中心問い</th>
                  <th>いまの動き</th>
                  <th>見るべきシグナル</th>
                  <th>未来仮説</th>
                  <th>TLA示唆</th>
                </tr>
              </thead>
              <tbody>
                {quadrantTable.map((row) => (
                  <tr key={row.quadrant}>
                    <td><strong>{row.quadrant}</strong></td>
                    <td>{row.coreQuestion}</td>
                    <td>{row.currentShift}</td>
                    <td>{row.watchingSignals}</td>
                    <td>{row.futureHypothesis}</td>
                    <td>{row.tlaImplication}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid">
          <div className="card section">
            <div className="section-head">
              <h2>最新インテリジェンス</h2>
              <Link className="button" href="/sources">情報源管理</Link>
            </div>
            <div className="list">
              {dashboardItems.length === 0 ? (
                <EmptyState />
              ) : dashboardItems.map((item: any) => (
                <article className="item" key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{item.summary_ja || item.extracted_text?.slice(0, 160) || "分析待ちの項目です。"}</p>
                  <div className="meta">
                    <span className="pill">{item.category || "未分類"}</span>
                    <span className="pill">重要度 {item.importance_score || "-"}</span>
                    <span className="pill">{item.analysis_status}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card section">
            <div className="section-head">
              <h2>監視中の情報源</h2>
              <form action="/api/crawl" method="post">
                <button className="button primary" type="submit">
                  <Zap size={16} />
                  手動クロール
                </button>
              </form>
            </div>
            <div className="list">
              {topSources.map((source) => (
                <article className="item" key={source.id}>
                  <h3>{source.name}</h3>
                  <p>{source.category} / {source.country} / {source.crawl_frequency}</p>
                  <div className="meta">
                    <span className="pill">信頼度 {source.reliability_score}</span>
                    <span className="pill">{source.is_active ? "active" : "paused"}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
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
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="card metric">
      <span>{icon} {label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Force({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function getQuadrantIcon(quadrant: string) {
  if (quadrant === "政治") return <Landmark size={18} />;
  if (quadrant === "経済") return <Banknote size={18} />;
  if (quadrant === "思想") return <Brain size={18} />;
  if (quadrant === "テクノロジー") return <BadgeCheck size={18} />;
  return <Activity size={18} />;
}

function EmptyState() {
  return (
    <article className="item">
      <h3>まだクロール結果はありません</h3>
      <p>SupabaseとOpenAI APIキーを設定後、手動クロールまたはcron APIから情報収集を開始できます。デモモードでは初期情報源だけが表示されます。</p>
      <div className="meta">
        <span className="pill">pending</span>
        <span className="pill">MVP ready</span>
      </div>
    </article>
  );
}
