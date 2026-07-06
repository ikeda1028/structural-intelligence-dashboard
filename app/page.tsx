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
  const overviewItems = [
    { href: "#research", label: "1. 対象分析", title: "組織・個人の構造を見る", detail: "詳細四象限、社会圧力、社内権力、個人への作用を一枚で読む" },
    { href: "#era", label: "2. 時代構造", title: "世界がどちらへ動くか", detail: "強まる力・弱まる力と、領域ごとの変化速度を見る" },
    { href: "#future-runtime", label: "3. 未来仮説", title: "仮説を時間軸で検証する", detail: "3か月・1年・3年の分岐、トリガー、観測指標を追う" },
    { href: "#country-layer", label: "4. 国別レイヤー", title: "国ごとの四象限を見る", detail: "東南アジア、アフリカ、中南米を含む地域差を比較する" },
    { href: "#sources", label: "5. 根拠データ", title: "情報源とクロール状況を見る", detail: "どの根拠から分析しているか、どこを増やすべきか確認する" }
  ];
  const futureRuntime = eraMovements.slice(0, 4).map((movement, index) => ({
    ...movement,
    trigger: `${movement.signal}状態が続き、${movement.domain}の意思決定が他領域へ波及する`,
    branch: index % 2 === 0
      ? "導入が速い組織と遅い組織の差が開き、先行者が標準を握る"
      : "政策・資金・社会的納得のズレが表面化し、再調整コストが増える",
    indicator: `${movement.sourceCount}情報源 / ${movement.itemCount}シグナル / 速度${movement.observedVelocity}`,
    decision: movement.tlaAction
  }));

  return (
    <div className="shell">
      <Header />
      <main className="main">
        <section className="hero">
          <h1>牧山式インテリジェンスリサーチ</h1>
          <p>
            政治・経済・思想・テクノロジー・社会・安全保障・教育の情報を、
            点のニュースではなく、強まる力、弱まる力、未来仮説、TLAの打ち手として可視化します。
          </p>
        </section>

        <section className="overview-nav" aria-label="全体構成">
          <div className="overview-copy">
            <span>全体構成</span>
            <h2>読みたい観点へすぐ移動できます</h2>
          </div>
          <div className="overview-grid">
            {overviewItems.map((item) => (
              <a className="overview-item" href={item.href} key={item.href}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </a>
            ))}
          </div>
        </section>

        <section className="metrics">
          <Metric label="登録情報源" value={sources.length} icon={<Globe2 size={18} />} />
          <Metric label="稼働中" value={activeSources.length} icon={<Radio size={18} />} />
          <Metric label="領域カテゴリ" value={categories.size} icon={<Database size={18} />} />
          <Metric label="最大変化速度" value={leadMovement.observedVelocity} icon={<TrendingUp size={18} />} />
        </section>

        <section className="intelligence-research card section" id="research">
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
                <div className="relation-research">
                  <div className="relation-head">
                    <div>
                      <span>詳細リサーチ層</span>
                      <h4>外部関係と社内権力の解析</h4>
                    </div>
                    <small>国・政党・規制機関・市場・社内部門を、追加調査すべき関係仮説として表示</small>
                  </div>
                  <div className="scheme-map" aria-label="image2のような精緻な四象限関係スキーム">
                    <svg className="scheme-lines" viewBox="0 0 1200 760" role="img" aria-hidden="true">
                      <path className="scheme-link main-link" d="M600 128 L600 330" />
                      <path className="scheme-link main-link" d="M250 380 L486 380" />
                      <path className="scheme-link main-link" d="M950 380 L714 380" />
                      <path className="scheme-link main-link" d="M600 632 L600 468" />
                      <path className="scheme-link faint-link" d="M600 128 L250 380" />
                      <path className="scheme-link faint-link" d="M600 128 L950 380" />
                      <path className="scheme-link faint-link" d="M250 380 L600 632" />
                      <path className="scheme-link faint-link" d="M950 380 L600 632" />
                    </svg>
                    <div className="scheme-core">
                      <span>集団</span>
                      <strong>{intelligenceResearch.target}</strong>
                      <div className="scheme-person">
                        <b>個人</b>
                        <small>任意・強制</small>
                      </div>
                    </div>
                    {intelligenceResearch.powerMap.fields.map((field) => {
                      const layer = intelligenceResearch.powerMap.relationLayers.find((entry) => entry.quadrant === field.sourceQuadrant);
                      return (
                        <section className={`scheme-power scheme-${field.key}`} key={`scheme-${field.key}`} style={{ "--scheme-power": field.score } as React.CSSProperties}>
                          <div className="scheme-power-head">
                            <span>{field.sourceQuadrant}</span>
                            <strong>{field.label}</strong>
                            <b>{field.score}</b>
                          </div>
                          <p>{field.pressure}</p>
                          <div className="scheme-children">
                            {(layer?.nodes ?? []).filter((node) => node.id !== "target").slice(0, 5).map((node) => (
                              <div className="scheme-child" key={`scheme-child-${field.key}-${node.id}`} style={{ "--child-power": node.score } as React.CSSProperties}>
                                <strong>{node.label}</strong>
                                <span>{node.kind}</span>
                                <small>{node.score}</small>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                    <section className="scheme-internal">
                      <div className="scheme-power-head">
                        <span>社内</span>
                        <strong>部門権力</strong>
                        <b>{intelligenceResearch.powerMap.organizationPower}</b>
                      </div>
                      <div className="scheme-children internal-children">
                        {intelligenceResearch.powerMap.internalPowerCenters.slice(0, 6).map((center) => (
                          <div className="scheme-child" key={`scheme-internal-${center.department}`} style={{ "--child-power": center.power } as React.CSSProperties}>
                            <strong>{center.department}</strong>
                            <span>{center.dominantField}</span>
                            <small>{center.power}</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  <div className="relation-layer-grid">
                    {intelligenceResearch.powerMap.relationLayers.map((layer) => (
                      <article className={`relation-layer relation-${layer.quadrant}`} key={layer.quadrant}>
                        <div className="relation-layer-head">
                          <span>{layer.quadrant}</span>
                          <h5>{layer.title}</h5>
                        </div>
                        <p>{layer.summary}</p>
                        <div className="relation-network">
                          {layer.nodes.slice(0, 7).map((node) => (
                            <div
                              className={`relation-node ${node.id === "target" ? "relation-target" : ""}`}
                              key={node.id}
                              style={{ "--node-power": node.score } as React.CSSProperties}
                            >
                              <strong>{node.label}</strong>
                              <span>{node.kind}</span>
                              <b>{node.score}</b>
                              <small>{node.role}</small>
                            </div>
                          ))}
                        </div>
                        <div className="relation-links">
                          {layer.links.slice(0, 5).map((link) => (
                            <div key={`${layer.quadrant}-${link.from}-${link.to}`} style={{ "--link-power": link.score } as React.CSSProperties}>
                              <span>{link.label}</span>
                              <strong>{link.score}</strong>
                            </div>
                          ))}
                        </div>
                        <ul>
                          {layer.watchQuestions.map((question) => (
                            <li key={question}>{question}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
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
                <div className="internal-power">
                  <div className="relation-head">
                    <div>
                      <span>社内関係図</span>
                      <h4>どの部門がどの力を持つか</h4>
                    </div>
                    <small>外圧が社内の意思決定権限へどう変換されるかを見る</small>
                  </div>
                  <div className="internal-power-grid">
                    {intelligenceResearch.powerMap.internalPowerCenters.map((center) => (
                      <article key={center.department}>
                        <div>
                          <strong>{center.department}</strong>
                          <span>{center.dominantField}</span>
                        </div>
                        <div className="internal-power-meter">
                          <div style={{ width: `${center.power}%` }} />
                        </div>
                        <b>{center.power}</b>
                        <p>{center.influence}</p>
                        <small>{center.risk}</small>
                      </article>
                    ))}
                  </div>
                </div>
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

        <section className="evidence-coverage card section" id="sources">
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

        <section className="country-layer card section" id="country-layer">
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

        <section className="era-grid" id="era">
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

        <section className="card section horizon-section" id="future-runtime">
          <div className="section-head">
            <div>
              <h2>未来仮説ランタイム</h2>
              <p>仮説を固定予測にせず、時間軸・分岐・観測指標で更新していくための実行盤です。</p>
            </div>
            <Layers3 size={18} />
          </div>
          <div className="runtime-grid">
            {futureRuntime.map((runtime) => (
              <article className="runtime-card" key={runtime.domain}>
                <div className="runtime-head">
                  <span>{runtime.domain}</span>
                  <strong>{runtime.observedVelocity}</strong>
                </div>
                <h3>{runtime.direction}</h3>
                <div className="runtime-lanes">
                  <div>
                    <span>現在の構造変化</span>
                    <p>{runtime.structuralShift}</p>
                  </div>
                  <div>
                    <span>発火トリガー</span>
                    <p>{runtime.trigger}</p>
                  </div>
                  <div>
                    <span>分岐シナリオ</span>
                    <p>{runtime.branch}</p>
                  </div>
                </div>
                <div className="runtime-watch">
                  <span>{runtime.indicator}</span>
                  <p>{runtime.decision}</p>
                </div>
              </article>
            ))}
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

        <section className="card section quadrant-section" id="quadrants">
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
          <span>牧山式インテリジェンスリサーチ</span>
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
