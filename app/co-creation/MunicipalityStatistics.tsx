'use client';
import {useMemo} from 'react';
import {analyzeMunicipality,buildPeerIndex,benchmarkFor,readingPoints,num,unitLabel,tableUrl,definitionUrl,isBaselineStat,GROUPS} from '../../lib/co-creation/statistics.mjs';
import reviews from '../../public/co-creation-assets/major100-research.json';
import styles from './statistics.module.css';

type Row = {code:string;label:string;year:string;unit:string;value:unknown;state:string};
type Props = {code:string;dataset:any};
const valueText=(row:Row)=>row.state==='value' ? num(Number(row.value),Number.isInteger(Number(row.value))?0:2)+' '+unitLabel(row.unit) : row.state==='suppressed'?'秘匿（0ではありません）':'データなし（0ではありません）';
function Evidence({rows,formula}:{rows:Row[];formula?:string}) {
  return <details className={styles.evidence}><summary>計算式・元の数値・出典</summary>
    {formula&&<p className={styles.formula}>{formula}</p>}
    <ul>{rows.map(r=><li key={r.code}>{r.label}：<strong>{valueText(r)}</strong>（原表年 {r.year}） <a href={tableUrl(r.code)||undefined} target="_blank" rel="noreferrer">原表 {r.code} ↗</a></li>)}</ul>
    {rows[0]&&<a href={definitionUrl(rows[0].code)} target="_blank" rel="noreferrer">項目の定義・集計範囲 ↗</a>}
  </details>;
}
export default function MunicipalityStatistics({code,dataset}:Props) {
  const m=dataset?.municipalities?.[code];
  const analysis=useMemo(()=>analyzeMunicipality(m),[m]);
  const peers=useMemo(()=>buildPeerIndex(dataset),[dataset]);
  if(!m?.stats?.length) return <p>この自治体の基礎統計は未取得です。</p>;
  const headline=analysis.metrics.filter((s:any)=>['older','single','tax'].includes(s.id));
  const reviewed=(reviews.municipalities as Record<string,any>)[code];
  const baseline:Row[]=m.stats.filter(isBaselineStat);
  const extras:Row[]=m.stats.filter((r:Row)=>!isBaselineStat(r));
  const valid=baseline.filter((r:Row)=>r.state==='value').length;
  return <div className={styles.report} data-statistics-version="meaningful-v1">
    <header className={styles.heading}>
      <div><p className={styles.kicker}>数字を、地域の読み取りへ</p><h3>{m.name}は、どんな地域か</h3></div>
      <a href={'/co-creation?municipality='+code}>この自治体へのリンク</a>
    </header>
    <p className={styles.intro}>人口の構成、暮らしの単位、財源の構成から、事業を検討するときの問いを整理します。以下は収録統計からの計算・読み取りであり、自治体の確定課題や新規案件ではありません。</p>
    <div className={styles.headlines}>
      {headline.map((s:any)=><div key={s.id}><span>{s.title}</span><strong>{s.value===null?'算出不可':num(s.value,1)+'%'}</strong><small>{s.year?'原表年 '+s.year:'対象年未確認'}{s.id==='older'?'・年齢不詳を除く':s.id==='single'?'・一般世帯が分母':'・決算ベース'}</small></div>)}
    </div>
    <section className={styles.takeaways} aria-label="読み取りの要点"><h4>この数字の組み合わせから、何が言えるか</h4>
      {readingPoints(analysis,peers,code).map(point=><div key={point.title}><h5>{point.title}</h5><p>{point.text}</p><p className={styles.note}>検討へのつなぎ方：{point.implication}</p></div>)}
      <small>元の数値・計算式・比較対象は下の各項目で確認できます。</small>
    </section>
    <section className={styles.section} aria-label="人口構成の読み取り"><h4>1. 人口の構成と、増減の方向を分けて読む</h4>
      {analysis.ageStructure ? <div className={styles.age}>
        <p><strong>{analysis.ageStructure.year}年 国勢調査の人口構成</strong> ／ 総人口 {num(analysis.ageStructure.total)}人</p>
        <div className={styles.stack} role="img" aria-label={analysis.ageStructure.segments.map((s:any)=>s.label+num(s.share,1)+'%').join('、')}>
          {analysis.ageStructure.segments.map((s:any,i:number)=><span key={s.label} className={styles['age'+i]} style={{width:s.share+'%'}} />)}
        </div>
        <ul className={styles.legend}>{analysis.ageStructure.segments.map((s:any,i:number)=><li key={s.label}><i className={styles['age'+i]} aria-hidden="true"/><span>{s.label}</span><strong>{num(s.share,1)}%</strong><small>{num(s.value)}人</small></li>)}</ul>
        <p className={styles.note}>この図の分母は総人口です。上の「高齢者の割合」は年齢不詳を除いた人口が分母です。「年齢不詳相当」は総人口から3区分を引いた差として算出しています。</p>
        <Evidence rows={analysis.ageStructure.inputs} formula="各区分 ÷ 同年の国勢調査総人口 × 100"/>
      </div>:<p>人口構成は欠測・年度差・内訳不整合等により算出できません。</p>}
      <div className={styles.flows}>{analysis.balances.map((b:any)=><article key={b.id}>
        <p className={styles.period}>{b.year?'原表年 '+b.year:'対象年未確認'}・別々の期間として読む</p><h5>{b.title}</h5>
        <p className={styles.flowValue}>{b.value===null?'算出不可':(b.value>0?'+':b.value<0?'−':'')+num(Math.abs(b.value))+'人'}</p>
        <p>{b.value===null?b.reason:b.id==='natural'?(b.value<0?'この年の収録値では、死亡数が出生数を上回っています。':b.value>0?'この年の収録値では、出生数が死亡数を上回っています。':'この年の収録値では、出生数と死亡数が同数です。'):(b.value>0?'転入超過です。転入者の年齢・世帯構成を確認すると、住まい・窓口・教育等の検討につながります。':b.value<0?'転出超過です。年齢別の移動と転出先を確認して、就業・住まい等の論点を絞ります。':'収録された転入・転出の差は0です。移動そのものがないとは限りません。')}</p>
        <Evidence rows={b.inputs} formula={b.formula}/>
      </article>)}</div>
      <p className={styles.warning}>出生・死亡と転入・転出は、対象年・集計範囲が違います。2つを足して「人口増減」とは表示しません。転入・転出の差は国外移動等を含む社会増減全体ではありません。また、国勢調査人口と住民基本台帳人口を差し引いて増減率を作りません。</p>
    </section>
    <section className={styles.section} aria-label="事業検討につながる読み取り"><h4>2. 数字から、何を検討するか</h4>
      <p className={styles.note}>比較は同じ人口帯・自治体区分・対象年の収録自治体の中央値です。全国平均や国の類似団体区分ではありません。優劣の採点はしません。</p>
      <div className={styles.insights}>{analysis.metrics.map((s:any)=>{
        const benchmark=benchmarkFor(peers,code,s);
        return <article className={styles.insight} key={s.id}><p className={styles.question}>{s.question}</p><h5>{s.title}</h5>
          <div className={styles.metric}><strong>{s.value===null?'算出不可':num(s.value,s.digits)+s.unit}</strong><span>{s.year?'原表年 '+s.year:'対象年未確認'}</span></div>
          <p>{s.value===null?s.reason:s.meaning}</p>
          {benchmark&&<div className={styles.comparison}><p>比較対象 {benchmark.count}自治体の中央値 <strong>{num(benchmark.median,s.digits)}{s.unit}</strong> ／ 差 {benchmark.delta>0?'+':''}{num(benchmark.delta,s.digits)}{s.unit==='%'?'ポイント':s.unit}</p><details><summary>比較条件と自治体を確認</summary><p>{benchmark.group}。自自治体を除き、同じ計算式・対象年で算出できる自治体のみ。平均値ではなく各自治体の指標の中央値です。制度・地理・行政権限の違いまでは揃えていません。</p><ul>{benchmark.members.map((p:any)=><li key={p.code}>{p.name}：{num(p.value,s.digits)}{s.unit}</li>)}</ul></details></div>}
          {s.value!==null&&<div className={styles.action}><strong>検討につながること（仮説）</strong><p>{s.action}</p><strong>具体的な提案の前に調べること</strong><p>{s.check}</p></div>}
          <p className={styles.note}>{s.caveat}</p><Evidence rows={s.inputs} formula={s.formula}/>
        </article>;
      })}</div>
    </section>
    <section className={styles.bridge}><h4>3. 統計だけでは分からない「予算・実務」を確かめる</h4>
      <p>ここで分かるのは地域の規模・構成です。課題の原因、サービスの不足、DX導入状況、募集中の契約は別の根拠が必要です。</p>
      <ol><li>担当部署の計画・事業評価で、実際に困っている業務を特定する。</li><li>当年度予算の事業名・財源・対象者数を確認し、既存契約と公募状況を照合する。</li><li>民間の役割と検証方法を決める。例：相談の待ち時間、職員の再入力時間、点検精度。</li></ol>
      {reviewed?<p><a href={'/co-creation-assets/major100-research.html#city-'+code}>{m.name}の予算・DX資料レビューを読む →</a><small>別途確認した{reviewed.documents.length}資料の要約。統計指標との因果関係や募集中の案件を保証するものではありません。</small></p>:<p className={styles.note}>この自治体の主要100自治体・資料レビューは未収録です。統計があることと、予算本文を調査済みであることは別です。</p>}
      <p className={styles.note}>「住民1人当たりの費用」は同年度・同じ対象範囲の費用と人口が必要です。2022年度決算を2024年人口で割るなど、収録年が違う数値からは計算しません。利用者単価には、さらに実利用者の分母が必要です。</p>
    </section>
    {extras.length>0&&<p className={styles.note}>別収録の予算等 {extras.length}項目は、全国基礎統計と混ぜずに扱います。{code==='47213'&&<a href="/co-creation-assets/uruma-budget-report.html">うるま市の既存予算レポートを開く</a>}（別収録データは今回再検証していません。）</p>}
    <details className={styles.raw}><summary>元の統計をすべて確認する（{baseline.length}項目・数値あり{valid}項目）</summary>
      <p>出典：{dataset.source}。公表日 {dataset.publication_date} ／ 自治体の名称・区域基準日 {dataset.area_reference_date}。原表年は各項目の観測時点・期間を示し、公表年とは異なります。</p>
      {GROUPS.map(([prefix,title])=>{
        const rows=baseline.filter((r:Row)=>r.code.startsWith(prefix));
        return <details key={prefix}><summary>{title}（{rows.length}項目）</summary><div className={styles.table}><table><thead><tr><th>項目</th><th>値</th><th>原表年</th><th>根拠</th></tr></thead><tbody>{rows.map((r:Row)=><tr key={r.code}><th scope="row">{r.label}</th><td>{valueText(r)}</td><td>{r.year}</td><td><a href={tableUrl(r.code)||undefined} target="_blank" rel="noreferrer">原表 {r.code}</a> ／ <a href={definitionUrl(r.code)} target="_blank" rel="noreferrer">定義</a></td></tr>)}</tbody></table></div></details>;
      })}
      <a href="https://www.stat.go.jp/data/s-sugata/riyou3.html" target="_blank" rel="noreferrer">総務省統計局の利用上の注意 ↗</a>
    </details>
  </div>;
}
