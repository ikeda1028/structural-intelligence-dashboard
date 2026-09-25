import {lookup,match,safeUrl,normalize} from './core.mjs';
const $=id=>document.getElementById(id);
const KEY='tla-cocreation-public-v02';
let data, extraSources=[], saved=[], visible=40;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function link(url,text){const a=el('a',text);const safe=safeUrl(url);if(safe){a.href=safe;a.target='_blank';a.rel='noopener noreferrer';}return a;}
function source(id){return [...extraSources,...(data?.sources||[])].find(s=>s.id===id);}
function sourceNode(s){const p=el('p',undefined,'source');if(!s)return p;p.append(link(s.url,s.title||'原資料を見る'));p.append(el('small',`公表：${s.published_at||'未確認'} ／ 収録：${s.retrieved_at||'未確認'}`));return p;}
function labelTags(tags){const p=el('div',undefined,'chips');tags.forEach(t=>p.append(el('span',data.tags[t]?.name||t,'tag')));return p;}
function renderRegistry(){
  const q=normalize($('municipality-search').value), rows=data.municipalities.filter(m=>normalize(m.name+m.prefecture+m.code).includes(q));
  const body=$('municipalities');body.replaceChildren();
  rows.slice(0,visible).forEach(m=>{const tr=el('tr');const count=data.evidence.filter(e=>e.municipality_code===m.code).length;[m.prefecture,m.name,m.code,count?`${count}件の資料あり`:'未調査'].forEach(t=>tr.append(el('td',t)));body.append(tr);});
  $('registry-count').textContent=`${rows.length.toLocaleString()}件中 ${Math.min(visible,rows.length)}件を表示。未調査は「課題なし」ではありません。`;
  $('more').hidden=visible>=rows.length;
}
function renderSaved(){const area=$('saved');area.replaceChildren();if(!saved.length)area.append(el('p','保存した構想はありません。','muted'));saved.forEach(s=>{const p=el('p');p.append(el('strong',s.company+' × '+s.municipality+'：'));p.append(document.createTextNode(s.title));area.append(p);});}
function save(company,item){
  const entry={id:item.id,company:company.name,municipality:item.municipality.name,title:item.evidence.title,source:item.source.url,hypothesis:true,savedAt:new Date().toISOString()};
  const updated=[...saved.filter(s=>s.id!==entry.id),entry].slice(-100);
  try{localStorage.setItem(KEY,JSON.stringify(updated));saved=updated;renderSaved();$('feedback').textContent='構想をこのブラウザに保存しました。サーバーへの送信はしていません。';}catch{$('feedback').textContent='ブラウザに保存できませんでした。プライベートモード等の設定を確認してください。';}
}
function renderCompany(company){
  const root=$('results');root.hidden=false;root.replaceChildren();
  const profile=el('section',undefined,'panel');profile.append(el('p',company.mode==='ai-unverified'?'AI抽出・内容は要確認':'公開情報からの収録プロフィール','eyebrow'),el('h2',company.name),el('p',company.summary));
  if(company.official_url)profile.append(link(company.official_url,'公式サイトを確認する ↗'));
  profile.append(el('p','提供地域・対応量・参加意思・TLAとの紹介経路・法人番号は未確認です。','muted'));
  const resources=el('div',undefined,'resources');company.resources.forEach(r=>{const c=el('article',undefined,'resource');c.append(el('strong',data.tags[r.tag]?.name||r.tag),el('p',r.description),sourceNode(source(r.source_id)));resources.append(c);});profile.append(resources);(company.notes||[]).forEach(n=>profile.append(el('p',n,'muted')));root.append(profile);
  const matches=match(data,company,data.municipalities);root.append(el('h2',`公開資料との接点 ${matches.length}件`));root.append(el('p','資料のある3自治体から表示しています。全国すべての課題との照合ではありません。自治体コード順で表示し、優劣や成功確率は付けません。','muted'));
  if(!matches.length)root.append(el('div','収録資料の範囲では接点が見つかりません。ほかの自治体に機会がない、という意味ではありません。','notice'));
  matches.forEach(m=>{
    const card=el('article',undefined,'panel match');const head=el('div',undefined,'section-head');head.append(el('span',`${m.municipality.prefecture} / ${m.municipality.name}`,'eyebrow'),el('span',m.evidence.status==='existing'?'既存の取組':'計画・方針','badge'));card.append(head,el('h3',m.evidence.title),el('p',m.evidence.summary),sourceNode(m.source),labelTags(m.shared));
    const hyp=el('div',undefined,'hypothesis');hyp.append(el('strong','共創の仮説'),el('p',`${company.name}の公開リソースと、この資料で示される分野に接点があります。既存の取組を確認し、知見共有・利用者支援・実証協力の余地を対話で検証します。`));card.append(hyp);
    card.append(el('h4','実行に向けて確認する役割'),el('p',m.roles.join(' ／ ')),el('h4','補完候補（収録済み組織から）'));
    if(!m.partners.length)card.append(el('p','収録済みプロフィールだけでは補完先を特定できません。未確認の役割が残ります。','muted'));
    m.partners.forEach(p=>{const row=el('div',undefined,'partner');row.append(el('strong',p.name),labelTags(p.tags),el('small','参画・紹介は未確認。対応地域や提供条件の照会候補です。'));p.source_ids.forEach(id=>row.append(sourceNode(source(id))));card.append(row);});
    card.append(el('h4','最初の一歩'),el('p',m.next));const b=el('button','構想をこのブラウザに保存','secondary');b.type='button';b.addEventListener('click',()=>save(company,m));card.append(b);root.append(card);
  });
}
async function search(e){
  e.preventDefault();if(!data)return;const name=$('company-name').value.trim(), officialUrl=$('official-url').value.trim();$('feedback').textContent='';
  if(officialUrl&&!safeUrl(officialUrl)){$('feedback').textContent='公式URLは公開HTTPSサイトを指定してください。';return;}
  const candidates=lookup(data,name);
  if(candidates.length===1){const company=candidates[0];if(officialUrl&&company.official_url&&new URL(officialUrl).hostname.replace(/^www\./,'')!==new URL(company.official_url).hostname.replace(/^www\./,'')){$('feedback').textContent='入力URLと収録企業の公式サイトが異なります。同じ法人か確認してください。';return;}extraSources=[];renderCompany(company);return;}
  if(candidates.length>1){$('feedback').textContent='同名の候補が複数あります。法人を特定してから利用してください。';return;}
  if(!data.researchConfigured){$('feedback').textContent='この企業は未収録です。追加AI調査は管理者の設定待ちです。収録済みの企業名ボタンで照合を試せます。';return;}
  if(!$('research-consent').checked){$('feedback').textContent='詳細設定を開き、企業名・URLの外部AI送信に同意してから実行してください。';return;}
  $('search-button').disabled=true;$('feedback').textContent='公式資料を探索しています。結果はまだ確認済み情報ではありません。';
  try{const r=await fetch('/api/co-creation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,officialUrl,consent:true}),signal:AbortSignal.timeout(60000)});const result=await r.json();if(!r.ok)throw Error(result.error||'追加調査に失敗しました。');extraSources=result.sources;renderCompany(result.company);$('feedback').textContent=result.notice;}
  catch(error){$('feedback').textContent=error.name==='TimeoutError'?'通信がタイムアウトしました。調査枠が消費された可能性があります。':error.message;}
  finally{$('search-button').disabled=false;}
}
$('search-form').addEventListener('submit',search);$('municipality-search').addEventListener('input',()=>{visible=40;if(data)renderRegistry();});$('more').addEventListener('click',()=>{visible+=40;renderRegistry();});
$('export').addEventListener('click',()=>{const b=new Blob([JSON.stringify({version:2,projects:saved},null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='tla-co-creation-projects.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
$('clear').addEventListener('click',()=>{if(!saved.length||!confirm('このブラウザに保存した構想をすべて削除しますか？'))return;try{localStorage.removeItem(KEY);saved=[];renderSaved();}catch{$('feedback').textContent='保存領域にアクセスできません。';}});
try{const p=JSON.parse(localStorage.getItem(KEY)||'[]');saved=Array.isArray(p)?p.filter(x=>x&&typeof x.company==='string'&&typeof x.municipality==='string'&&typeof x.title==='string').slice(-100):[];}catch{saved=[];}renderSaved();
async function init(){
  try{const r=await fetch('/api/co-creation',{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('公開データの読込に失敗しました。');data=await r.json();
    $('municipality-count').textContent=data.municipalities.length.toLocaleString();$('load-state').textContent=data.registryError||'名称台帳は全国を対象としますが、詳細資料は3自治体・9件です。人口・予算の数値統計と全国の議事録分析は未取得です。';
    $('research-state').textContent=data.researchConfigured?'追加AI調査が有効です。全体30回／日、送信元3回／日（UTC）の上限があります。':'追加AI調査は設定待ちです。一般閲覧・収録企業の照合はそのまま利用できます。';
    data.companies.forEach(c=>{const b=el('button',c.aliases[0]||c.name,'chip-button');b.type='button';b.addEventListener('click',()=>{$('company-name').value=c.name;$('official-url').value='';$('search-form').requestSubmit();});$('examples').append(b);});
    data.sources.forEach(s=>$('source-list').append(sourceNode(s)));renderRegistry();$('search-button').disabled=false;
  }catch(error){$('load-state').textContent=error.message+' ページを再読込してください。';}
}
init();
