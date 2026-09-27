import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dir=new URL('../public/co-creation-assets/',import.meta.url);
const read=async n=>readFile(new URL(n,dir),'utf8');
const data=JSON.parse(await read('municipal-companies.json'));
const research=JSON.parse(await read('major100-research.json'));
const cohort=JSON.parse(await read('major-municipalities-100.json'));
const script=await read('municipal-companies.js');
const reportScript=await read('major100-research.js');
const tick=()=>new Promise(r=>setImmediate(r));
async function page(filename='municipal-companies.html',payload=data,hash=''){
 const dom=new JSDOM(await read(filename),{runScripts:'outside-only',url:'https://example.test/co-creation-assets/'+filename+hash});
 dom.window.fetch=async url=>{
   if(String(url).endsWith('municipal-companies.json')){
     if(payload===null)return {ok:false};
     return {ok:true,json:async()=>payload};
   }
   return {ok:true,json:async()=>String(url).endsWith('major100-research.json')?research:cohort};
 };
 dom.window.eval(script);
 if(filename!=='municipal-companies.html')dom.window.eval(reportScript);
 await tick();return dom;
}
test('company extraction has 100 scoped coverage records, with unknowns not erased',()=>{
 assert.deepEqual(Object.keys(data.municipalities).sort(),Object.keys(research.municipalities).sort());
 assert.equal(Object.keys(data.municipalities).length,100);
 for(const [code,c] of Object.entries(data.municipalities)){
  assert.equal(c.name,research.municipalities[code].name);
  assert.deepEqual(c.screened_document_ids,research.municipalities[code].documents.map(d=>d.id));
  assert.match(c.review_note,/全調達/);
  assert.deepEqual(c.relation_ids,data.relations.filter(r=>r.municipality_code===code).map(r=>r.id));
 }
 assert.equal(Object.values(data.municipalities).filter(c=>c.relation_ids.length).length,32);
 assert.equal(data.relations.length,45);
 assert.equal(Object.values(data.companies).filter(c=>c.kind==='company').length,39);
 assert.equal(Object.values(data.companies).filter(c=>c.kind!=='company').length,1);
});
test('every relation has explicit stage, period, source locator and case-based strength',()=>{
 assert.equal(new Set(data.relations.map(r=>r.id)).size,data.relations.length);
 for(const r of data.relations){
  assert.ok(data.companies[r.company_id]&&data.municipalities[r.municipality_code]);
  assert.ok(data.statuses.some(s=>s.code===r.status));
  assert.ok(r.business&&r.period&&r.capability&&r.strength_note&&r.limitation&&r.source_name);
  assert.ok(r.evidence.length);
  for(const e of r.evidence){
   assert.ok(e.title&&e.locator&&e.observation&&e.checked_at);
   assert.equal(new URL(e.url).protocol,'https:');
   const host=new URL(e.url).hostname;
   assert.ok((host.startsWith('www.city.')&&host.endsWith('.jp'))||['www.machidoor.tokyo.jp','www.nishi.or.jp'].includes(host),e.url);
   if(e.document_id){
    const doc=research.municipalities[r.municipality_code].documents.find(d=>d.id===e.document_id);
    assert.equal(doc?.source_url,e.url);
   }
  }
 }
 for(const c of Object.values(data.companies)){
  assert.match(c.id,/^[a-z0-9-]+$/);
  assert.ok(c.name&&c.aliases.length);
  if(c.official_url){assert.equal(new URL(c.official_url).protocol,'https:');assert.ok(c.identity_source.url&&c.identity_source.note);}
 }
});
test('contracts, candidates, providers and agreements remain distinct; false positives are excluded',()=>{
 const cases=id=>data.relations.filter(r=>r.company_id===id);
 assert.equal(cases('fujifilm-system')[0].status,'selected');
 assert.equal(cases('kcb')[0].status,'contracted');
 assert.equal(cases('iac')[0].status,'contracted');
 assert.equal(cases('hpe-japan')[0].status,'contracted');
 assert.equal(cases('funabashi-e')[0].status,'designated_operator');
 assert.equal(cases('acechild')[0].status,'selected');
 assert.equal(cases('bengo4')[0].status,'planned_provider');
 assert.equal(cases('ambirise')[0].status,'planned_provider');
 assert.equal(cases('microsoft-japan')[0].status,'agreement_partner');
 assert.equal(cases('shift')[0].status,'pilot_partner');
 assert.equal(cases('bot-express')[0].status,'operating_provider');
 assert.equal(unique(cases('ntt-data').map(r=>r.municipality_code)).length,2);
 assert.equal(unique(cases('ntt-data-kansai').map(r=>r.municipality_code)).length,2);
 assert.equal(unique(cases('ines').map(r=>r.municipality_code)).length,2);
 assert.equal(cases('murc').length,2);
 assert.equal(unique(cases('murc').map(r=>r.municipality_code)).length,1);
 assert.equal(data.relations.filter(r=>r.status==='contracted').length,12);
 assert.equal(unique(data.relations.filter(r=>r.status==='contracted').map(r=>r.company_id)).length,11);
 for(const forbidden of ['Adobe','ソフトバンク','ugo','DENSO'])assert.ok(!Object.values(data.companies).some(c=>c.name.includes(forbidden)));
});
const unique=a=>[...new Set(a)];
test('company index groups relations by corporate identity and counts unique municipalities',async()=>{
 const dom=await page();try{
  const d=dom.window.document;
  assert.equal(d.querySelectorAll('#company-results tbody tr').length,40);
  assert.match(d.getElementById('company-result-count').textContent,/40企業・団体／32自治体／45件/);
  assert.equal(d.querySelectorAll('.company-coverage li').length,100);
  const filter=d.getElementById('company-status-filter'); filter.value='contracted';filter.dispatchEvent(new dom.window.Event('change'));
  assert.equal(d.querySelectorAll('#company-results tbody tr').length,11);
  assert.match(d.getElementById('company-result-count').textContent,/11企業・団体／4自治体／12件/);
  const search=d.getElementById('company-search'); search.value='つくば 窓口';search.dispatchEvent(new dom.window.Event('input'));
  assert.equal(d.querySelectorAll('#company-results tbody tr').length,2);
  filter.value='selected';filter.dispatchEvent(new dom.window.Event('change'));
  assert.match(d.getElementById('company-results').textContent,/一致する掲載事例はありません/);
  d.querySelector('.company-filters button').click();
  assert.equal(d.querySelectorAll('#company-results tbody tr').length,40);
 }finally{dom.window.close();}
});
test('company deep link opens all its cases, distinguishes aliases and links back',async()=>{
 const dom=await page('municipal-companies.html',data,'#company-murc');try{
  const p=dom.window.document.getElementById('company-profile');
  assert.equal(p.querySelectorAll('.company-case').length,2);
  assert.match(p.textContent,/関係自治体 1 ／ 委託先・構築実績を確認した自治体 1/);
  assert.equal(p.querySelectorAll('a[href$="#city-45201"]').length,2);
  assert.ok(p.querySelector('a[href="https://www.murc.jp/corporate/"]'));
  assert.equal(p.querySelectorAll('.company-case details a').length,2);
 }finally{dom.window.close();}
});
test('all 100 cohort clicks show linked cases or honest unknown, never a silent omission',async()=>{
 const dom=await page('major-municipalities-100.html');try{
  const d=dom.window.document;
  for(const button of [...d.querySelectorAll('#app tbody button')]){
   button.click(); const detail=d.querySelector('#detail .municipality-companies');
   assert.ok(detail);
   const code=d.querySelector('#detail .city').id.slice(5);
   const expected=data.relations.filter(r=>r.municipality_code===code);
   assert.equal(detail.querySelectorAll('.company-case').length,expected.length);
   if(expected.length)for(const r of expected)assert.ok(detail.querySelector('a[href$="#company-'+r.company_id+'"]'));
   else assert.match(detail.textContent,/受託企業が存在しないという意味ではありません/);
  }
 }finally{dom.window.close();}
});
test('full municipal report includes companies independently of future hypotheses',async()=>{
 const dom=await page('major100-research.html');try{
  const d=dom.window.document;
  assert.equal(d.querySelectorAll('.municipality-companies').length,100);
  assert.equal(d.querySelectorAll('.company-case').length,45);
  assert.equal(d.querySelectorAll('.future-value-card .company-case').length,0);
  assert.equal(d.querySelectorAll('.company-case details a[href^="https:"]').length,45);
 }finally{dom.window.close();}
});
test('failed optional company fetch preserves existing municipal reports and reports the failure',async()=>{
 const dom=await page('major100-research.html',null);try{
  assert.equal(dom.window.document.querySelectorAll('.city').length,100);
  assert.equal(dom.window.document.querySelectorAll('.document').length,214);
  assert.match(dom.window.document.querySelector('.municipality-companies').textContent,/読み込めませんでした/);
  assert.doesNotMatch(dom.window.document.querySelector('.municipality-companies').textContent,/受託企業が存在しない/);
 }finally{dom.window.close();}
});
test('unsafe company text and URLs are never executed; malformed payload fails explicitly',async()=>{
 const clone=structuredClone(data);
 clone.companies.kcb.name='<img src=x onerror=alert(1)>';
 clone.companies.kcb.official_url='javascript:alert(1)';
 const dom=await page('municipal-companies.html',clone,'#company-kcb');try{
  assert.equal(dom.window.document.querySelectorAll('img,script[src^="javascript:"],a[href^="javascript:"]').length,0);
  assert.match(dom.window.document.querySelector('#company-profile').textContent,/<img src=x/);
 }finally{dom.window.close();}
 const bad=await page('municipal-companies.html',cohort);try{
  assert.match(bad.window.document.getElementById('companies-app').textContent,/読み込めませんでした/);
 }finally{bad.window.close();}
});
