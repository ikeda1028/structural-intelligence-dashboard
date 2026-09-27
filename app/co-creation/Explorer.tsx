'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight, ArrowRight, Building2, Landmark, Network, Search, Bookmark, ShieldCheck, Database, FileText} from 'lucide-react';
import {lookup,match,safeUrl} from '../../lib/co-creation/core.mjs';
import styles from './explorer.module.css';
import MunicipalityStatistics from './MunicipalityStatistics';
import {isBaselineStat} from '../../lib/co-creation/statistics.mjs';

type RecordData = Record<string, any>;
const STORE='tla.cocreation.public.v1';
function SourceLink({source}:{source?:RecordData}) {
  const url=safeUrl(source?.url);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{source?.title || '原資料を確認'} ↗</a> : <span>出典未確認</span>;
}
export default function Explorer() {
  const [data,setData]=useState<RecordData|null>(null),[stats,setStats]=useState<RecordData|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [tab,setTab]=useState('match'),[name,setName]=useState(''),[url,setUrl]=useState(''),[consent,setConsent]=useState(false);
  const [company,setCompany]=useState<RecordData|null>(null),[liveSources,setLiveSources]=useState<RecordData[]>([]),[busy,setBusy]=useState(false),[unknown,setUnknown]=useState(false);
  const [pref,setPref]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[selectedMunicipality,setSelectedMunicipality]=useState<RecordData|null>(null),[saved,setSaved]=useState<RecordData[]>([]);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([fetch('/api/co-creation',{signal:controller.signal,cache:'no-store'}),fetch('/co-creation-assets/municipality-stats.json',{signal:controller.signal,cache:'force-cache'})]).then(async ([r,s])=>{if(!r.ok)throw Error('公開データを取得できません。再読込してください。');if(!s.ok)throw Error('自治体統計を取得できません。再読込してください。');return Promise.all([r.json(),s.json()]);}).then(([publicData,statsData])=>{setData(publicData);setStats(statsData);const selectedCode=new URLSearchParams(window.location.search).get('municipality');const selected=publicData.municipalities.find((m:RecordData)=>m.code===selectedCode);if(selected){setSelectedMunicipality(selected);setTab('municipalities');setQuery(selected.name);}}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    try{const items=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(items))setSaved(items.filter(x=>x&&typeof x.id==='string'&&typeof x.company==='string'&&typeof x.title==='string'&&typeof x.municipality==='string'&&typeof x.created==='string').slice(0,100));}catch{setNotice('端末内の保存データを読めませんでした。新しい検索は利用できます。');}
    return ()=>controller.abort();
  },[]);
  const baselineCount=useMemo(()=>stats?Object.values(stats.municipalities).reduce((n:number,m:any)=>Math.max(n,m.stats.filter(isBaselineStat).length),0):null,[stats]);
  const sources=useMemo(()=>new Map([...(data?.sources||[]),...liveSources].map((s:RecordData)=>[s.id,s])),[data,liveSources]);
  const results=useMemo(()=>data&&company?match(data,company,data.municipalities):[],[data,company]);
  const municipalities=useMemo(()=>(data?.municipalities||[]).filter((m:RecordData)=>(!pref||m.pref_code===pref)&&`${m.name}${m.prefecture}${m.code}`.includes(query.trim())),[data,pref,query]);
  const prefectures=useMemo(()=>[...new Map<string,string>((data?.municipalities||[]).map((m:RecordData)=>[m.pref_code,m.prefecture] as [string,string])).entries()].sort(),[data]);
  function selectCompany(value:string) {
    if(!data)return;
    setName(value);setError('');setNotice('');setCompany(null);setLiveSources([]);setUnknown(false);
    const found=lookup(data,value);
    if(found.length===1){setCompany(found[0]);setTab('match');}
    else {setUnknown(true);setNotice(found.length?'同名候補があります。公式URLで対象法人を確認してください。':'収録データにありません。追加AI調査を使う場合は、下の説明と外部送信に同意してください。');}
  }
  async function research() {
    if(!data?.researchConfigured||!consent||busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      const r=await fetch('/api/co-creation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,officialUrl:url||undefined,consent}),signal:AbortSignal.timeout(58000)});
      const body=await r.json();if(!r.ok)throw Error(body.error||'追加調査を完了できませんでした');
      setCompany(body.company);setLiveSources(body.sources);setUnknown(false);setNotice(body.notice);
    }catch(e){setError(e instanceof Error&&e.name==='TimeoutError'?'応答時間を超えました。自動再試行はしません。調査枠は使用済みの場合があります。':e instanceof Error?e.message:'調査に失敗しました');}
    finally{setBusy(false);}
  }
  function saveIdea(r:RecordData) {
    if(!company)return;
    const item={id:r.id,company:company.name,municipality:r.municipality.name,title:r.evidence.title,sourceUrl:r.source.url,created:new Date().toISOString(),status:'構想・未合意'};
    const next=[item,...saved.filter(x=>x.id!==item.id)].slice(0,100);
    try{localStorage.setItem(STORE,JSON.stringify(next));setSaved(next);setNotice('このブラウザに保存しました。運営者や他の利用者には送信していません。');}catch{setError('端末に保存できません。ブラウザの保存設定を確認してください。');}
  }
  function exportIdeas() {
    const blob=new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),ideas:saved},null,2)],{type:'application/json'});
    const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='TLA-共創構想.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  }
  const tagName=(t:string)=>data?.tags[t]?.name||t;
  return <main className={styles.root}>
    <a href="#explore" className={styles.skipLink}>検索・データ閲覧へスキップ</a>
    <header className={styles.header}>
      <a href="/co-creation" className={styles.brand}><span className={styles.mark}>TLA<span>↗</span></span><span>共創OS<small>CO-CREATION INTELLIGENCE</small></span></a>
      <div className={styles.headerNav}><a href="/co-creation-assets/major-municipalities-100.html">自治体リサーチ <ArrowUpRight size={14} aria-hidden="true"/></a><span className={styles.beta}><i aria-hidden="true"/> PUBLIC BETA</span></div>
    </header>
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span aria-hidden="true"/> LOCAL POTENTIAL, SHARED FUTURE.</p>
        <h1 id="hero-title">地域の可能性を、<br/><em>共創の力</em>に。</h1>
        <p className={styles.heroDescription}>自治体の課題と、企業の強み。<br/>公開情報から接点を読み解き、<br className={styles.mobileBreak}/>次のプロジェクトを構想する。</p>
        <div className={styles.heroActions}><a href="#explore" onClick={()=>setTab('match')} className={styles.heroCta}>企業から可能性を探す <ArrowRight size={18} aria-hidden="true"/></a><a href="/co-creation-assets/major-municipalities-100.html" className={styles.heroSecondary}>自治体の調査を見る <ArrowUpRight size={17} aria-hidden="true"/></a></div>
        <p className={styles.heroNote}><ShieldCheck size={14} aria-hidden="true"/> ログイン不要 · 出典付きの公開情報を使用</p>
      </div>
      <div className={styles.constellation} aria-label="自治体の公開資料と企業のリソースを照合し、共創の仮説を検討する流れ">
        <div className={styles.diagramLabel}>THE CO-CREATION FIELD <span>概念図</span></div>
        <div className={styles.orbit} aria-hidden="true"/><div className={styles.orbitInner} aria-hidden="true"/>
        <svg className={styles.connections} viewBox="0 0 480 350" fill="none" aria-hidden="true"><path d="M103 94L240 178L380 84M240 178L132 276M240 178L376 274" stroke="currentColor" strokeDasharray="4 5"/><circle cx="240" cy="178" r="7" fill="currentColor"/></svg>
        <div className={`${styles.fieldNode} ${styles.cityNode}`}><Landmark size={19} aria-hidden="true"/><span>地域の公開資料<small>計画 / 予算 / 統計</small></span></div>
        <div className={`${styles.fieldNode} ${styles.companyNode}`}><Building2 size={19} aria-hidden="true"/><span>企業のリソース<small>技術 / 知見 / 実績</small></span></div>
        <div className={styles.fieldCore}><Network size={26} aria-hidden="true"/><strong>共創の接点</strong><small>CO-CREATION OS</small></div>
        <div className={`${styles.fieldNode} ${styles.roleNode}`}><span className={styles.nodeDot} aria-hidden="true"/><span>役割を補完する<small>企業・NPOの候補</small></span></div>
        <div className={`${styles.fieldNode} ${styles.projectNode}`}><ArrowUpRight size={20} aria-hidden="true"/><span>次の構想へ<small>仮説 / 対話 / 検証</small></span></div>
        <p className={styles.diagramFoot}>公開情報の接点から、実行前の問いをつくる。</p>
      </div>
    </section>
    <section className={styles.metrics} aria-label="データ収録状況">
      {[[data?Number(data.municipalities.length).toLocaleString():'—','自治体','全国の名称・コード台帳'],[baselineCount??'—','項目','自治体ごとの基礎統計'],['100','自治体','主要自治体リサーチの対象'],[data?Object.keys(data.tags).length:'—','分野','企業と地域をつなぐ照合タグ']].map(([n,unit,label])=><div key={String(label)}><div><strong>{n}</strong><span>{unit}</span></div><small>{label}</small></div>)}
    </section>
    <section className={styles.discover} aria-labelledby="discover-title">
      <div className={styles.discoverHeading}><p className={styles.eyebrow}>EXPLORE THE INTELLIGENCE</p><h2 id="discover-title">情報をつなぐ。可能性が見えてくる。</h2></div>
      <div className={styles.entryGrid}>
        <a className={styles.entryCard} href="/co-creation-assets/major-municipalities-100.html"><span className={styles.entryTop}><Landmark size={23} aria-hidden="true"/><span>01 / MUNICIPALITIES</span><ArrowUpRight size={19} aria-hidden="true"/></span><h3>100自治体の現在地</h3><p>予算、政策、DXの進捗。資料の要約と根拠から、地域の実態を読む。</p><span className={styles.entryLink}>自治体リサーチ <ArrowRight size={16} aria-hidden="true"/></span></a>
        <a className={styles.entryCard} href="/co-creation-assets/municipal-companies.html"><span className={styles.entryTop}><Building2 size={23} aria-hidden="true"/><span>02 / COMPANIES</span><ArrowUpRight size={19} aria-hidden="true"/></span><h3>地域を支える企業を知る</h3><p>受託・選定・実証の関係を区別。自治体との実績から企業の強みを探る。</p><span className={styles.entryLink}>企業・実績の一覧 <ArrowRight size={16} aria-hidden="true"/></span></a>
        <a className={styles.entryCard} href="#explore" onClick={()=>setTab('municipalities')}><span className={styles.entryTop}><Database size={23} aria-hidden="true"/><span>03 / OPEN DATA</span><ArrowUpRight size={19} aria-hidden="true"/></span><h3>数字から地域を読み解く</h3><p>人口・産業・財政・暮らし。全国の基礎統計を、年度と出典付きで確認。</p><span className={styles.entryLink}>全国の自治体台帳 <ArrowRight size={16} aria-hidden="true"/></span></a>
      </div>
    </section>
    <section id="explore" className={styles.workbench} aria-labelledby="workbench-title" tabIndex={-1}>
    <div className={styles.workbenchHeading}><div><p className={styles.eyebrow}>YOUR CO-CREATION WORKSPACE</p><h2 id="workbench-title">共創のきっかけを探す</h2></div><span><ShieldCheck size={15} aria-hidden="true"/> 公開情報から、根拠をたどる</span></div>
    <nav className={styles.tabs} aria-label="共創OSの機能">{[{id:'match',label:'企業から探す',icon:Search},{id:'municipalities',label:'自治体台帳',icon:Landmark},{id:'saved',label:`保存した構想 (${saved.length})`,icon:Bookmark},{id:'about',label:'データ・利用上の注意',icon:FileText}].map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>setTab(id)} aria-current={tab===id?'page':undefined}><Icon size={16} aria-hidden="true"/>{label}</button>)}</nav>
    {error&&<div className={styles.error} role="alert">{error}</div>}{notice&&<div className={styles.notice} role="status">{notice}</div>}
    {!data&&<section className={styles.panel} role="status">{error?'取得に失敗しました。ページを再読込してください。':'公開データを読み込んでいます…'}</section>}
    {data&&tab==='match'&&<>
      <section className={`${styles.panel} ${styles.searchPanel}`}><p className={styles.eyebrow}>01 / ORGANIZATION</p><h2>その強みが、地域の力になる。</h2><p className={styles.searchIntro}>企業・団体名から、公開リソースと自治体資料の接点を探します。</p>
        <form onSubmit={e=>{e.preventDefault();selectCompany(name);}} className={styles.search}>
          <label className={styles.grow}><span>企業・団体名</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={120} placeholder="例：フォーバル、ベネッセ、クボタ" required disabled={busy}/></label><button className={styles.primary} disabled={busy}><Search size={17} aria-hidden="true"/> 照合する <ArrowRight size={17} aria-hidden="true"/></button>
        </form>
        <div className={styles.chips}><span className={styles.chipLabel}>収録企業で試す</span>{data.companies.map((c:RecordData)=><button disabled={busy} key={c.id} onClick={()=>selectCompany(c.name)}>{c.aliases[0]||c.name}<ArrowUpRight size={12} aria-hidden="true"/></button>)}</div>
        <p className={styles.matchScope}>この照合で使うデータ：企業・NPO {data.companies.length}組織 / 自治体 {new Set(data.evidence.map((e:RecordData)=>e.municipality_code)).size}団体の資料。上の100自治体リサーチ・企業実績一覧とは収録範囲が異なります。</p>
        {unknown&&<div className={styles.additional}><h3>未収録企業の追加調査</h3><p>{data.researchConfigured?'外部AIで公開情報を調査します。検索結果に含まれた出典を照合し、暫定プロフィールとして表示します。':'追加AI調査は管理者の設定待ちです。上の6組織は、APIキーを入力せずに照合できます。'}</p>
          <label>公式URL（同名企業の識別に使用）<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." maxLength={2048} disabled={busy}/></label>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/>企業名と公式URLをOpenAIに送信することに同意する。個人名・非公開情報は入力しない。</label>
          <p className={styles.small}>追加調査は接続元ごとに1日3回、サービス全体で1日30回まで（UTC日付）。失敗した調査も枠を消費します。調査結果は自動公開・サーバー保存しません。</p>
          <button className={styles.primary} onClick={research} disabled={!data.researchConfigured||!consent||busy}>{busy?'公開情報を調査中…':'追加AI調査を実行'}</button></div>}
      </section>
      {company&&<><section className={styles.panel}><p className={styles.eyebrow}>02 / PUBLIC RESOURCES</p><div className={styles.sectionTitle}><h2>{company.name}</h2><span className={styles.tag}>{company.mode==='ai-unverified'?'AI抽出・要確認':'公開情報の収録プロフィール'}</span></div><p>{company.summary}</p>
        <div className={styles.resourceGrid}>{company.resources.map((r:RecordData,i:number)=><div key={`${r.tag}-${i}`}><span className={styles.tag}>{tagName(r.tag)}</span><h3>{r.description}</h3><SourceLink source={sources.get(r.source_id)}/></div>)}</div>
        <p className={styles.small}>資源の提供可能量・活動地域・参加意思・TLAとの紹介関係は未確認です。</p>{company.notes?.map((n:string)=><p key={n} className={styles.small}>{n}</p>)}</section>
        <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>03 / COLLABORATION HYPOTHESES</p><h2>公開資料との接点 <span className={styles.count}>{results.length}</span></h2></div><p className={styles.small}>自治体コード順 · 優劣や成功確率の順位ではありません</p></div>
        {results.length===0?<section className={styles.panel}>収録済みの資料に接点が見つかりませんでした。共創の可能性がないという意味ではなく、追加調査が必要です。</section>:results.map((r:RecordData)=><article className={styles.panel} key={r.id}>
          <div className={styles.sectionTitle}><h3>{r.municipality.prefecture} / {r.municipality.name}</h3><span className={styles.tag}>{r.evidence.status==='existing'?'既存の取組':'公表された計画'}</span></div><h2>{r.evidence.title}</h2><p>{r.evidence.summary}</p>
          <div className={styles.citation}><SourceLink source={r.source}/><small>公表：{r.source.published_at||'未確認'} · 対象：{r.evidence.period||'原資料で確認'}</small></div>
          <div className={styles.hypothesis}><strong>共創の仮説</strong><p>{r.shared.map(tagName).join('・')}の公開リソースを、上記の取組に活用できるかを照会する。これは新規案件の存在や、相手の参加意思を確認したものではありません。</p></div>
          <div className={styles.twoColumns}><div><h3>実行前に確認する役割</h3><p>{r.roles.join(' / ')}</p><p className={styles.small}>担当者・提供条件・予算・時期は未確認。未登録を不足と断定しません。</p></div><div><h3>補完分野の照会候補</h3>{r.partners.length?r.partners.map((p:RecordData)=><div key={p.id} className={styles.partner}><strong>{p.name}</strong><p>{p.tags.map(tagName).join('・')}</p><SourceLink source={sources.get(p.source_ids[0])}/></div>):<p>収録データ内では特定できません。必要な役割と既存体制の確認が先です。</p>}</div></div>
          <div className={styles.action}><p><strong>最初の一歩</strong><br/>{r.next}</p><button onClick={()=>saveIdea(r)}>{saved.some(x=>x.id===r.id)?'保存済み · 更新':'構想をこの端末に保存'}</button></div>
        </article>)}</>}
    </>}
    {data&&tab==='municipalities'&&<section className={styles.panel}><p className={styles.eyebrow}>NATIONWIDE REGISTRY</p><h2>自治体台帳</h2><div className={styles.search}><label>都道府県<select value={pref} onChange={e=>{setPref(e.target.value);setPage(0);}}><option value="">すべて</option>{prefectures.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label><label className={styles.grow}>自治体名・コード<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="例：三浦市、うるま市、14210"/></label></div><p className={styles.small}>{municipalities.length.toLocaleString()}件。自治体名をクリックすると、統計・収録資料を確認できます。資料未収録は「課題なし」ではありません。政令市の行政区は市全体との重複を避けて除外し、東京23区を含みます。</p>{selectedMunicipality&&<section className={styles.hypothesis} aria-label="自治体の詳細"><div className={styles.sectionTitle}><div><p className={styles.eyebrow}>MUNICIPALITY DETAIL</p><h3>{selectedMunicipality.prefecture} / {selectedMunicipality.name}</h3></div><button type="button" onClick={()=>setSelectedMunicipality(null)}>閉じる</button></div><p><strong>自治体コード：</strong>{selectedMunicipality.code}</p>{(()=>{const items=data.evidence.filter((e:RecordData)=>e.municipality_code===selectedMunicipality.code);return <><MunicipalityStatistics code={selectedMunicipality.code} dataset={stats}/> {items.length?<><p><strong>収録資料：</strong>{items.length}件</p>{items.map((e:RecordData)=><div key={e.id} className={styles.saved}><span className={styles.tag}>{e.status==='existing'?'既存の取組':e.status==='closed'?'終了した募集':'公表された計画'}</span><h3>{e.title}</h3><p>{e.summary}</p><p className={styles.small}>対象：{e.period||'原資料で確認'} · 分野：{e.tags.map((t:string)=>tagName(t)).join('・')}</p><SourceLink source={sources.get(e.source_id)}/></div>)}</>:<><p><strong>企業照合用の詳細資料：</strong>現在の公開β版には未収録</p><p className={styles.small}>上の資料レビューとは別に、企業とのタグ照合へ組み込んだ資料の有無を示しています。未収録は課題や事業がないという意味ではありません。</p></>}</>})()}</section>}<div className={styles.tableWrap}><table><thead><tr><th>コード</th><th>都道府県</th><th>自治体</th><th>資料の収録</th></tr></thead><tbody>{municipalities.slice(page*50,page*50+50).map((m:RecordData)=>{const n=data.evidence.filter((e:RecordData)=>e.municipality_code===m.code).length;return <tr key={m.code}><td>{m.code}</td><td>{m.prefecture}</td><td><button type="button" onClick={()=>setSelectedMunicipality(m)}>{m.name}</button></td><td>{n?`${n}件 · 全文調査ではありません`:'未収録'}</td></tr>;})}</tbody></table></div><div className={styles.pagination}><button disabled={page===0} onClick={()=>setPage(page-1)}>前へ</button><span>{page+1} / {Math.max(1,Math.ceil(municipalities.length/50))}</span><button disabled={(page+1)*50>=municipalities.length} onClick={()=>setPage(page+1)}>次へ</button></div><SourceLink source={sources.get('gsi-master')}/><p className={styles.small}>元データの最終変更：2024年1月9日。2026年の最新台帳との完全突合は未実施。統計出典：総務省統計局「統計でみる市区町村のすがた2026」。</p></section>}
    {data&&tab==='saved'&&<section className={styles.panel}><h2>保存した構想</h2><p>このブラウザだけに保存されます。DAOへの提案・団体への紹介依頼は送信されていません。</p>{saved.length?<><div className={styles.chips}><button onClick={exportIdeas}>JSONで書き出す</button><button onClick={()=>{if(window.confirm('このブラウザの構想をすべて削除しますか？')){try{localStorage.removeItem(STORE);setSaved([]);}catch{setError('削除できませんでした');}}}}>この端末の構想をすべて削除</button></div>{saved.map((x:RecordData)=><article key={x.id} className={styles.saved}><span className={styles.tag}>構想・未合意</span><h3>{x.company} × {x.municipality}</h3><p>{x.title}</p><SourceLink source={{url:x.sourceUrl,title:'根拠となる資料'}}/><small>{x.created.slice(0,10)}</small></article>)}</>:<div className={styles.hypothesis}>企業を照合し、接点のカードから構想を保存してください。</div>}</section>}
    {data&&tab==='about'&&<section className={styles.panel}><h2>データと利用上の注意</h2><h3>公開している範囲</h3><p>自治体名称台帳、全国基礎統計と計算式付きの読み取り、公開資料の要約、企業・NPOの公開プロフィールを使用しています。TLAの非公開人脈、連絡先、牧山式インテリジェンスの内部調査履歴は読み出しません。</p><h3>照合の意味</h3><p>13分野のタグ接点を表示するルールベースの照合です。政策・自治体・担当者の優劣や成功確率は評価しません。終了した募集は照合から除外し、既存協定は既存と表示します。</p><h3>追加AI調査と保存</h3><p>追加調査時のみ、入力した企業名・公式URLをOpenAIへ送信します。APIキーはサーバーの環境変数で管理します。調査結果を他の利用者に自動公開しません。構想の保存先はこのブラウザです。</p><p>追加調査の回数管理には日次の接続元識別子を使用します。生のIPアドレスを本機能のDBに保存せず、日ごとに変わるHMAC値を使用します。回数記録は後続の調査時に8日前以前を削除します。ホスティング事業者のアクセスログは別管理です。</p><h3>公開資料の確認</h3><p>公表日、対象年度、取得日は別項目です。全文PDFや全国の議事録を網羅的に調査したものではありません。予算・調達・現地の状況・参加意思は原資料と当事者に確認してください。</p><h3>出典</h3><div className={styles.sourceList}>{data.sources.map((s:RecordData)=><p key={s.id}><SourceLink source={s}/></p>)}</div><p className={styles.small}>本サービスは原資料の発行者による公式サービス・保証・提携表明ではありません。掲載組織はTLA会員・DAO参加者であることを意味しません。</p></section>}
    </section>
    <div className={styles.scope}><ShieldCheck size={18} aria-hidden="true"/><div><strong>データの範囲を明確に。</strong><p>統計の対象年は項目ごとに異なります。全国の当年度予算・議事録の本文を調査済みという意味ではありません。照合は共創の仮説であり、事業成立や相手の参加意思を保証しません。</p>{data?.registryError&&<p className={styles.error}>{data.registryError}</p>}</div></div>
    <footer className={styles.footer}><div><strong>TLA 共創OS<span>PUBLIC BETA</span></strong><p>公開情報から可能性を探し、実行は当事者の合意から。</p></div><span><a href="/">牧山式インテリジェンス基盤 ↗</a><br/>RESOURCES. CONNECTIONS. POSSIBILITIES.</span></footer>
  </main>;
}
